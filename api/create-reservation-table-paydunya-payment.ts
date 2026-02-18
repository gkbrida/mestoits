import type { VercelRequest, VercelResponse } from '@vercel/node';
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
    const { reservationId, guestEmail, guestPhone, origin } = req.body;
    if (!reservationId || !guestEmail || !origin) {
      return res.status(400).json({
        success: false,
        error: 'reservationId, guestEmail et origin requis',
      });
    }

    const paydunyaMasterKey = process.env.PAYDUNYA_MASTER_KEY;
    const paydunyaPrivateKey = process.env.PAYDUNYA_PRIVATE_KEY;
    const paydunyaToken = process.env.PAYDUNYA_TOKEN;

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaToken) {
      return res.status(500).json({
        success: false,
        error: 'Configuration PayDunya manquante',
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ success: false, error: 'Configuration Supabase manquante' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: reservation, error: resErr } = await supabase
      .from('reservations')
      .select('id, property_id, guest_email, guest_name, guest_phone, start_date, end_date, nights, total_amount, amount_paid, status, notes')
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

    const phone = guestPhone || reservation.guest_phone;
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Numéro de téléphone requis pour le paiement Mobile Money',
      });
    }

    const amountInXOF = Math.round(amountToPay);
    const paydunyaApiUrl = process.env.PAYDUNYA_API_URL || 'https://app.paydunya.com';

    const paymentRequestResponse = await fetch(`${paydunyaApiUrl}/api/v1/dmp-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
        'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
        'PAYDUNYA-TOKEN': paydunyaToken,
      },
      body: JSON.stringify({
        recipient_email: guestEmail,
        amount: amountInXOF,
        support_fees: 0,
        send_notification: 1,
        metadata: {
          reservationId,
          paymentType,
          type: 'reservation_table_payment',
        },
      }),
    });

    const responseText = await paymentRequestResponse.text();
    let paymentRequestData: any;
    try {
      paymentRequestData = JSON.parse(responseText);
    } catch {
      return res.status(500).json({
        success: false,
        error: `Réponse PayDunya invalide: ${responseText.substring(0, 150)}`,
      });
    }

    const responseCode = paymentRequestData.response_code;
    const responseTextMsg = paymentRequestData.response_text || paymentRequestData.message;

    if (responseCode && responseCode !== '00') {
      if (responseCode === '1001') {
        return res.status(400).json({
          success: false,
          error: 'Votre compte PayDunya nécessite une validation KYC. Connectez-vous à app.paydunya.com pour compléter la vérification.',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Erreur PayDunya (${responseCode}): ${responseTextMsg || 'Erreur inconnue'}`,
      });
    }

    const referenceNumber = paymentRequestData.reference_number || paymentRequestData.data?.reference_number;
    if (!referenceNumber) {
      return res.status(500).json({
        success: false,
        error: 'Référence de paiement non reçue de PayDunya',
      });
    }

    const existingNotes = (reservation as any).notes || '';
    const newNotes = existingNotes
      ? `${existingNotes}\nRéférence PayDunya: ${referenceNumber}`
      : `Référence PayDunya: ${referenceNumber}`;

    await supabase
      .from('reservations')
      .update({ notes: newNotes, updated_at: new Date().toISOString() })
      .eq('id', reservationId);

    return res.status(200).json({
      success: true,
      referenceNumber,
      message: 'Demande de paiement Mobile Money créée. Un SMS avec le code a été envoyé à votre numéro.',
      requiresSMSConfirmation: true,
    });
  } catch (error: any) {
    console.error('Erreur create-reservation-table-paydunya-payment:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur serveur',
    });
  }
}
