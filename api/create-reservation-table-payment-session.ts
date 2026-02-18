import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  try {
    const { reservationId, guestEmail, origin } = req.body;
    if (!reservationId || !guestEmail || !origin) {
      return res.status(400).json({
        success: false,
        error: 'reservationId, guestEmail et origin requis',
      });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ success: false, error: 'Configuration Stripe manquante' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Configuration Supabase manquante' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: reservation, error: resErr } = await supabase
      .from('reservations')
      .select('id, property_id, guest_email, guest_name, guest_phone, start_date, end_date, nights, total_amount, amount_paid, status')
      .eq('id', reservationId)
      .single();

    if (resErr || !reservation) {
      return res.status(400).json({ success: false, error: 'Réservation introuvable' });
    }
    if (reservation.guest_email?.toLowerCase() !== guestEmail?.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Cette réservation ne vous appartient pas' });
    }

    let amountToPay = Number(reservation.total_amount || 0);
    const amountPaid = Number(reservation.amount_paid ?? 0);
    const paymentType = reservation.status === 'pending' ? 'full' : 'surplus';

    if (reservation.status === 'pending') {
      if (amountToPay <= 0) {
        return res.status(400).json({ success: false, error: 'Montant invalide' });
      }
    } else if (reservation.status === 'confirmed') {
      amountToPay = Math.max(0, amountToPay - amountPaid);
      if (amountToPay <= 0) {
        return res.status(400).json({ success: false, error: 'Aucun surplus à payer' });
      }
    } else {
      return res.status(400).json({ success: false, error: 'Réservation non payable dans cet état' });
    }

    const { data: property } = await supabase
      .from('properties_02')
      .select('title')
      .eq('id', reservation.property_id)
      .single();

    const propertyTitle = property?.title || 'Bien immobilier';

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-11-20.acacia' });
    const successUrl = `${origin}/mes-reservations?payment=success&reservation=${reservationId}`;
    const cancelUrl = `${origin}/mes-reservations?payment=cancelled&reservation=${reservationId}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: paymentType === 'full' ? `Réservation - ${propertyTitle}` : `Surplus - ${propertyTitle}`,
              description: `${reservation.start_date} au ${reservation.end_date} (${reservation.nights} nuit${reservation.nights > 1 ? 's' : ''})`,
            },
            unit_amount: Math.round(amountToPay * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: guestEmail,
      metadata: {
        reservationId,
        paymentType,
        type: 'reservation_table_payment',
      },
    });

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Erreur create-reservation-table-payment-session:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Erreur serveur' });
  }
}
