import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

  try {
    // PayDunya envoie les données via POST en format application/x-www-form-urlencoded
    // Les données sont dans la clé "data"
    console.log('═══════════════════════════════════════════════════════');
    console.log('📞 CALLBACK PAYDUNYA REÇU');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Body complet:', JSON.stringify(req.body, null, 2));
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('═══════════════════════════════════════════════════════');

    // PayDunya peut envoyer les données de différentes manières :
    // 1. Dans req.body.data (format x-www-form-urlencoded)
    // 2. Directement dans req.body (format JSON)
    let callbackData: any = null;

    if (req.body.data) {
      // Format x-www-form-urlencoded avec clé "data"
      try {
        callbackData = typeof req.body.data === 'string' 
          ? JSON.parse(req.body.data) 
          : req.body.data;
      } catch (e) {
        callbackData = req.body.data;
      }
    } else {
      // Format JSON direct
      callbackData = req.body;
    }

    console.log('📦 Données callback extraites:', JSON.stringify(callbackData, null, 2));

    if (!callbackData) {
      console.error('❌ Données de callback manquantes');
      return res.status(400).json({
        success: false,
        error: 'Données de callback manquantes'
      });
    }

    // Extraire les informations du callback PayDunya
    // PayDunya envoie généralement :
    // - reference_number : référence de la demande de paiement
    // - status : statut du paiement
    // - response_code : code de réponse ('00' = succès)
    // - response_text : texte de réponse
    const referenceNumber = callbackData.reference_number || callbackData.data?.reference_number;
    const status = callbackData.status || callbackData.data?.status;
    const responseCode = callbackData.response_code || callbackData.data?.response_code;
    const responseText = callbackData.response_text || callbackData.data?.response_text;

    console.log('📊 Informations extraites:');
    console.log('   • Reference Number:', referenceNumber);
    console.log('   • Status:', status);
    console.log('   • Response Code:', responseCode);
    console.log('   • Response Text:', responseText);

    // Vérifier le statut du paiement
    // PayDunya utilise '00' comme code de succès
    const isPaid = responseCode === '00' || status === 'completed' || status === 'paid' || status === 'success';

    if (!isPaid) {
      console.log('⚠️ Paiement non approuvé:', { responseCode, status });
      return res.status(200).json({
        success: true,
        message: `Paiement non approuvé (code: ${responseCode}, statut: ${status}), pas de mise à jour`
      });
    }

    // Pour récupérer le paymentId, on doit le chercher dans les métadonnées ou via la référence
    // PayDunya ne retourne pas toujours les métadonnées dans le callback
    // On va devoir chercher le paiement par référence ou utiliser une autre méthode
    
    // Option 1: Si PayDunya retourne les métadonnées dans le callback
    const metadata = callbackData.metadata || callbackData.data?.metadata || {};
    const paymentType = metadata.type || 'rent_payment'; // Par défaut, paiement de loyer
    let paymentId = metadata.paymentId || metadata.payment_id;
    let reservationId = metadata.reservationId || metadata.reservation_id;

    console.log('📊 Type de paiement détecté:', paymentType);
    console.log('   • PaymentId:', paymentId);
    console.log('   • ReservationId:', reservationId);

    // Option 2: Si pas de métadonnées, on doit chercher le paiement par référence
    // Pour cela, on peut stocker la référence dans Supabase lors de la création
    // ou utiliser une table de mapping référence -> paymentId/reservationId

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Variables d\'environnement Supabase manquantes');
      return res.status(500).json({
        success: false,
        error: 'Configuration Supabase manquante'
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (!paymentId && !reservationId && referenceNumber) {
      console.log('⚠️ IDs non trouvés dans les métadonnées, recherche par référence...');
      
      // Chercher le paiement par transaction_id (où on stockera la référence)
      const { data: paymentData } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('transaction_id', referenceNumber)
        .eq('status', 'pending')
        .maybeSingle();

      if (paymentData) {
        paymentId = paymentData.id;
        console.log(`✅ Paiement trouvé par référence: ${paymentId}`);
      } else {
        // Chercher la réservation par notes (où on stocke la référence PayDunya)
        const { data: reservationData } = await supabaseAdmin
          .from('reservations')
          .select('id')
          .like('notes', `%Référence PayDunya: ${referenceNumber}%`)
          .eq('status', 'pending')
          .maybeSingle();

        if (reservationData) {
          reservationId = reservationData.id;
          console.log(`✅ Réservation trouvée par référence: ${reservationId}`);
        }
      }
    }

    // Traiter selon le type de paiement
    if (paymentType === 'reservation_payment' && reservationId) {
      // Mettre à jour la réservation
      console.log(`🔄 Mise à jour de la réservation ${reservationId}...`);
      
      const { error: updateError } = await supabaseAdmin
        .from('reservations')
        .update({
          status: 'confirmed',
          notes: `Référence PayDunya: ${referenceNumber} - Paiement confirmé le ${new Date().toISOString()}`,
        })
        .eq('id', reservationId);

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour de la réservation:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la mise à jour de la réservation'
        });
      }

      console.log(`✅ Réservation ${reservationId} mise à jour avec succès`);
      return res.status(200).json({
        success: true,
        message: 'Réservation confirmée avec succès'
      });
    } else if (paymentId) {
      // Vérifier si c'est un paiement échelonné ou un paiement de loyer
      // D'abord, vérifier dans installment_payments
      const { data: installmentPayment } = await supabaseAdmin
        .from('installment_payments')
        .select('id, installment_plan_id')
        .eq('id', paymentId)
        .eq('status', 'pending')
        .maybeSingle();

      if (installmentPayment) {
        // C'est un paiement échelonné
        console.log(`🔄 Mise à jour du paiement échelonné ${paymentId}...`);
        
        const { error: updateError } = await supabaseAdmin
          .from('installment_payments')
          .update({
            status: 'paid',
            payment_date: new Date().toISOString().split('T')[0], // Date seulement pour installment_payments
            payment_method: 'mobile_money',
            notes: `Référence PayDunya: ${referenceNumber}`,
          })
          .eq('id', paymentId);

        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour du paiement échelonné:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du paiement échelonné'
          });
        }

        console.log(`✅ Paiement échelonné ${paymentId} mis à jour avec succès`);
        return res.status(200).json({
          success: true,
          message: 'Paiement échelonné mis à jour avec succès'
        });
      } else {
        // C'est un paiement de loyer
        console.log(`🔄 Mise à jour du paiement de loyer ${paymentId}...`);
        
        const { error: updateError } = await supabaseAdmin
          .from('payments')
          .update({
            status: 'paid',
            payment_date: new Date().toISOString(),
            payment_method: 'mobile_money',
            transaction_id: referenceNumber,
          })
          .eq('id', paymentId);

        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour du paiement:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du paiement'
          });
        }

        console.log(`✅ Paiement ${paymentId} mis à jour avec succès`);
        return res.status(200).json({
          success: true,
          message: 'Paiement mis à jour avec succès'
        });
      }
    } else {
      console.error('❌ Aucun ID trouvé. Impossible de mettre à jour.');
      console.error('   • Reference Number:', referenceNumber);
      console.error('   • Metadata:', JSON.stringify(metadata, null, 2));
      console.error('   • Payment Type:', paymentType);
      return res.status(400).json({
        success: false,
        error: 'PaymentId ou ReservationId non trouvé dans les métadonnées ou par référence'
      });
    }

  } catch (error: any) {
    console.error("❌ Erreur lors du traitement du callback PayDunya:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message || "Erreur lors du traitement du callback",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

