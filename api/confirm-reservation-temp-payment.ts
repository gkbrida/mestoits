import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * API pour confirmer un paiement de réservation temporaire (reservations_temp → reservations).
 * Utilisée après un paiement Stripe réussi pour transférer la réservation côté serveur,
 * en contournant les problèmes RLS et en garantissant les types de données.
 */
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
    if (!reservationId) {
      return res.status(400).json({ success: false, error: 'reservationId requis' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Supabase non configuré' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Vérifier le paiement Stripe si sessionId fourni
    if (sessionId) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (stripeKey) {
        const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
        let session = await stripe.checkout.sessions.retrieve(sessionId);

        // Retry une fois si paiement pas encore propagé (race condition Stripe)
        if (session.payment_status !== 'paid') {
          await new Promise((r) => setTimeout(r, 2000));
          session = await stripe.checkout.sessions.retrieve(sessionId);
        }
        if (session.payment_status !== 'paid') {
          console.error('❌ Stripe payment_status:', session.payment_status);
          return res.status(400).json({ success: false, error: 'Paiement non encore confirmé. Veuillez patienter quelques secondes et rafraîchir la page.' });
        }

        const metaType = String(session.metadata?.type || '');
        const metaReservationId = String(session.metadata?.reservationId || '');
        const reservationIdStr = String(reservationId);
        if (metaType !== 'reservation_payment' || (metaReservationId && metaReservationId !== reservationIdStr)) {
          console.error('❌ Stripe metadata mismatch:', { metaType, metaReservationId, reservationIdStr });
          return res.status(400).json({ success: false, error: 'Session de paiement invalide pour cette réservation. Vérifiez que vous n\'avez pas ouvert plusieurs onglets.' });
        }
      }
    }
    // Si pas de sessionId (ex: PayDunya géré par callback), on fait confiance au fait que l'utilisateur arrive avec payment=success

    // 2. Récupérer la réservation temporaire
    const { data: tempData, error: fetchError } = await supabase
      .from('reservations_temp')
      .select('property_id, owner_id, guest_name, guest_email, guest_phone, start_date, end_date, nights, total_amount')
      .eq('id', reservationId)
      .single();

    if (fetchError || !tempData) {
      console.error('❌ Réservation temporaire introuvable:', fetchError);
      return res.status(404).json({
        success: false,
        error: 'Réservation temporaire introuvable. Si vous avez payé par Mobile Money, votre réservation a peut-être déjà été confirmée. Consultez la page Mes réservations.',
      });
    }

    // 3. Vérifier qu'elle n'existe pas déjà dans reservations (éviter doublon)
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('property_id', tempData.property_id)
      .eq('guest_email', tempData.guest_email)
      .eq('start_date', tempData.start_date)
      .eq('end_date', tempData.end_date)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (existing) {
      await supabase.from('reservations_temp').delete().eq('id', reservationId);
      return res.status(200).json({
        success: true,
        reservationId: existing.id,
        message: 'Réservation déjà confirmée',
      });
    }

    // 4. Insérer dans reservations (types explicites pour éviter erreurs)
    const totalAmount = parseFloat(String(tempData.total_amount));
    const nights = parseInt(String(tempData.nights), 10);

    const { data: newReservation, error: insertError } = await supabase
      .from('reservations')
      .insert([{
        property_id: tempData.property_id,
        owner_id: tempData.owner_id,
        guest_name: String(tempData.guest_name),
        guest_email: String(tempData.guest_email),
        guest_phone: tempData.guest_phone || null,
        start_date: String(tempData.start_date),
        end_date: String(tempData.end_date),
        nights: isNaN(nights) ? 1 : nights,
        total_amount: isNaN(totalAmount) ? 0 : totalAmount,
        amount_paid: isNaN(totalAmount) ? 0 : totalAmount,
        status: 'confirmed',
        source: 'platform',
      }])
      .select('id')
      .single();

    if (insertError || !newReservation) {
      console.error('❌ Erreur insertion reservations:', insertError);
      return res.status(500).json({
        success: false,
        error: insertError?.message || 'Erreur lors de la création de la réservation',
      });
    }

    // 5. Supprimer la réservation temporaire
    await supabase.from('reservations_temp').delete().eq('id', reservationId);

    const confirmedId = newReservation.id;

    // 6. Traiter la commission
    try {
      const { processCommission } = await import('./utils/commissionHandler');
      await processCommission(
        'reservation',
        confirmedId,
        null,
        totalAmount
      );
    } catch (commissionError) {
      console.error('⚠️ Erreur commission:', commissionError);
    }

    return res.status(200).json({
      success: true,
      reservationId: confirmedId,
      reservation: {
        id: confirmedId,
        property_id: tempData.property_id,
        owner_id: tempData.owner_id,
        guest_name: tempData.guest_name,
        guest_email: tempData.guest_email,
        guest_phone: tempData.guest_phone,
        start_date: tempData.start_date,
        end_date: tempData.end_date,
        nights: tempData.nights,
        total_amount: tempData.total_amount,
      },
      message: 'Réservation confirmée',
    });
  } catch (error: any) {
    console.error('Erreur confirm-reservation-temp-payment:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur serveur',
    });
  }
}
