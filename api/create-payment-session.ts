import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

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
      month, 
      propertyTitle, 
      tenantEmail, 
      tenantName, 
      leaseId,
      paymentId,
      origin 
    } = req.body;

    // Validation
    if (!amount || !month || !propertyTitle || !tenantEmail || !leaseId || !origin) {
      return res.status(400).json({
        success: false,
        error: "Paramètres manquants: amount, month, propertyTitle, tenantEmail, leaseId et origin sont requis"
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
    console.log('💳 CRÉATION D\'UNE SESSION DE PAIEMENT STRIPE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Locataire: ${tenantEmail}`);
    console.log(`💰 Montant: ${amountNumber} € - Période: ${month}`);
    console.log(`📊 Montant original reçu: ${amount} (type: ${typeof amount})`);
    console.log(`🌐 Origin reçu: ${origin}`);
    console.log(`🏠 Propriété: ${propertyTitle}`);
    console.log(`📋 Lease ID: ${leaseId}`);
    console.log(`💳 Payment ID: ${paymentId || 'NON FOURNI'}`);
    
    if (!paymentId) {
      console.warn('⚠️ ATTENTION: paymentId non fourni! Le paiement ne pourra pas être mis à jour automatiquement.');
    }

    // Vérifier si c'est un paiement d'échéance (payment_installment_payments)
    let isInstallmentPayment = false;
    if (paymentId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseServiceRoleKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });
          
          const { data: installmentPayment } = await supabaseAdmin
            .from('payment_installment_payments')
            .select('id')
            .eq('id', paymentId)
            .maybeSingle();
          
          isInstallmentPayment = !!installmentPayment;
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la vérification du type de paiement:', error);
        // Continuer avec le comportement par défaut (paiement de loyer)
      }
    }

    // Construire les URLs de retour - toujours mes-locations (loyer ou échéance de loyer)
    const successUrl = `${origin}/mes-locations?payment=success&lease=${leaseId}&paymentId=${paymentId || ''}`;
    const cancelUrl = `${origin}/mes-locations?payment=cancelled&lease=${leaseId}`;
    
    console.log(`✅ Success URL: ${successUrl}`);
    console.log(`❌ Cancel URL: ${cancelUrl}`);
    console.log(`📊 Type de paiement: ${isInstallmentPayment ? 'Échelonné' : 'Loyer'}`);
    console.log('═══════════════════════════════════════════════════════');

    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Loyer ${month}`,
              description: `Paiement du loyer pour ${propertyTitle}`,
            },
            unit_amount: Math.round(amountNumber * 100), // Montant en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: tenantEmail,
      metadata: {
        month: month,
        propertyTitle: propertyTitle,
        tenantName: tenantName || 'Locataire',
        leaseId: leaseId,
        paymentId: paymentId || '',
        type: isInstallmentPayment ? 'installment_payment' : 'rent_payment',
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

