import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).end();
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée'
    });
  }

  try {
    const { 
      amount, 
      propertyId,
      propertyTitle, 
      guestEmail, 
      guestName, 
      startDate,
      endDate,
      nights,
      reservationId,
      origin 
    } = req.body;

    // Validation
    if (!amount || !propertyId || !propertyTitle || !guestEmail || !startDate || !endDate || !nights || !origin) {
      return res.status(400).json({
        success: false,
        error: "Paramètres manquants: amount, propertyId, propertyTitle, guestEmail, startDate, endDate, nights et origin sont requis"
      });
    }

    // Vérifier que la clé Stripe est définie
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error("❌ Clé secrète Stripe non définie");
      return res.status(500).json({
        success: false,
        error: "Configuration Stripe manquante"
      });
    }

    // Initialiser Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Valider et convertir le montant en nombre
    const amountNumber = typeof amount === 'string' 
      ? parseFloat(amount.replace(/[^\d,.]/g, '').replace(',', '.')) 
      : Number(amount);
    
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        success: false,
        error: `Montant invalide: ${amount}. Le montant doit être un nombre positif.`
      });
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 CRÉATION D\'UNE SESSION DE PAIEMENT STRIPE POUR RÉSERVATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Client: ${guestEmail}`);
    console.log(`💰 Montant: ${amountNumber} €`);
    console.log(`📅 Dates: ${startDate} au ${endDate} (${nights} nuits)`);
    console.log(`🌐 Origin reçu: ${origin}`);
    console.log(`🏠 Propriété: ${propertyTitle}`);
    console.log(`📋 Property ID: ${propertyId}`);
    console.log(`📋 Reservation ID: ${reservationId || 'NON FOURNI'}`);
    
    // Vérifier que la réservation est encore payable (pending et < 15 min)
    if (reservationId) {
      const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: reservation, error: resError } = await supabase
          .from('reservations')
          .select('id, status, created_at')
          .eq('id', reservationId)
          .single();
        if (resError || !reservation) {
          return res.status(400).json({
            success: false,
            error: 'Réservation introuvable ou invalide.'
          });
        }
        if (reservation.status !== 'pending') {
          return res.status(400).json({
            success: false,
            error: 'Cette réservation n\'est plus disponible pour le paiement (délai dépassé ou déjà traitée).'
          });
        }
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (new Date(reservation.created_at) < fifteenMinutesAgo) {
          return res.status(400).json({
            success: false,
            error: 'Le délai de paiement (15 minutes) est dépassé. La réservation a été libérée. Veuillez recommencer.'
          });
        }
      }
    } else {
      console.warn('⚠️ ATTENTION: reservationId non fourni! La réservation ne pourra pas être mise à jour automatiquement.');
    }

    // Construire les URLs de retour
    const successUrl = `${origin}/bien/${propertyId}?payment=success&reservation=${reservationId || ''}`;
    const cancelUrl = `${origin}/bien/${propertyId}?payment=cancelled&reservation=${reservationId || ''}`;
    
    console.log(`✅ Success URL: ${successUrl}`);
    console.log(`❌ Cancel URL: ${cancelUrl}`);
    console.log('═══════════════════════════════════════════════════════');

    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Réservation - ${propertyTitle}`,
              description: `Réservation du ${startDate} au ${endDate} (${nights} nuit${nights > 1 ? 's' : ''})`,
            },
            unit_amount: Math.round(amountNumber * 100), // Montant en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: guestEmail,
      metadata: {
        propertyId: propertyId,
        propertyTitle: propertyTitle,
        guestName: guestName || 'Client',
        startDate: startDate,
        endDate: endDate,
        nights: nights.toString(),
        reservationId: reservationId || '',
        type: 'reservation_payment',
      },
    });

    console.log(`✅ Session Stripe créée avec succès! SessionId: ${session.id}`);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: "Session de paiement créée avec succès"
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la création de la session Stripe:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de la création de la session de paiement",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
