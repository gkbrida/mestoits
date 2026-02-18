import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };

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
    const { reservationId, sessionId } = req.body;
    if (!reservationId || !sessionId) {
      return res.status(400).json({ success: false, error: 'reservationId et sessionId requis' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ success: false, error: 'Stripe non configuré' });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, error: 'Paiement non confirmé' });
    }
    if (session.metadata?.type !== 'reservation_table_payment' || session.metadata?.reservationId !== reservationId) {
      return res.status(400).json({ success: false, error: 'Session invalide' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Supabase non configuré' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: resa } = await supabase.from('reservations').select('id, status, total_amount, amount_paid').eq('id', reservationId).single();
    if (!resa) {
      return res.status(404).json({ success: false, error: 'Réservation introuvable' });
    }

    const amountPaid = Number(resa.amount_paid ?? 0);
    const totalAmount = Number(resa.total_amount ?? 0);
    const amountJustPaid = session.amount_total ? session.amount_total / 100 : totalAmount - amountPaid;
    const newAmountPaid = amountPaid + amountJustPaid;

    const updateData: Record<string, any> = {
      amount_paid: Math.min(newAmountPaid, totalAmount),
      updated_at: new Date().toISOString(),
    };
    if (resa.status === 'pending') {
      updateData.status = 'confirmed';
    }

    const { error } = await supabase.from('reservations').update(updateData).eq('id', reservationId);
    if (error) throw error;

    if (resa.status === 'pending') {
      try {
        const { processCommission } = await import('./utils/commissionHandler');
        await processCommission('reservation', reservationId, null, totalAmount);
      } catch (_) {}
    }

    return res.status(200).json({ success: true, message: 'Paiement enregistré' });
  } catch (error: any) {
    console.error('Erreur confirm-reservation-table-payment:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Erreur serveur' });
  }
}
