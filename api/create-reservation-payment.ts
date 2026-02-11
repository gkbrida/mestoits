import type { VercelRequest, VercelResponse } from '@vercel/node';
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
    res.status(200).json({});
    return;
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
      guestPhone,
      startDate,
      endDate,
      nights,
      reservationId,
      origin 
    } = req.body;

    // Validation
    if (!amount || !propertyId || !propertyTitle || !guestEmail || !guestPhone || !startDate || !endDate || !nights || !origin) {
      return res.status(400).json({
        success: false,
        error: "Paramètres manquants: amount, propertyId, propertyTitle, guestEmail, guestPhone, startDate, endDate, nights et origin sont requis"
      });
    }

    // Vérifier que les clés PayDunya sont définies
    const paydunyaMasterKey = process.env.PAYDUNYA_MASTER_KEY;
    const paydunyaPrivateKey = process.env.PAYDUNYA_PRIVATE_KEY;
    const paydunyaToken = process.env.PAYDUNYA_TOKEN;

    if (!paydunyaMasterKey || !paydunyaPrivateKey || !paydunyaToken) {
      console.error("❌ Clés PayDunya manquantes");
      return res.status(500).json({
        success: false,
        error: "Configuration PayDunya manquante"
      });
    }

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
    }

    // PayDunya utilise le montant en XOF directement (pas de conversion en centimes)
    const amountInXOF = Math.round(amountNumber);

    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 CRÉATION D\'UNE DEMANDE DE PAIEMENT PAYDUNYA POUR RÉSERVATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Client: ${guestEmail}`);
    console.log(`📱 Téléphone: ${guestPhone}`);
    console.log(`💰 Montant: ${amountNumber} XOF (${amountInXOF} XOF)`);
    console.log(`📅 Dates: ${startDate} au ${endDate} (${nights} nuits)`);
    console.log(`🌐 Origin reçu: ${origin}`);
    console.log(`🏠 Propriété: ${propertyTitle}`);
    console.log(`📋 Property ID: ${propertyId}`);
    console.log(`📋 Reservation ID: ${reservationId || 'NON FOURNI'}`);

    // Construire les URLs de retour
    const successUrl = `${origin}/bien/${propertyId}?payment=success&reservation=${reservationId || ''}&method=paydunya`;
    const cancelUrl = `${origin}/bien/${propertyId}?payment=cancelled&reservation=${reservationId || ''}&method=paydunya`;
    const callbackUrl = `${origin}/api/paydunya-callback`;

    console.log(`✅ Success URL: ${successUrl}`);
    console.log(`❌ Cancel URL: ${cancelUrl}`);
    console.log(`📞 Callback URL: ${callbackUrl}`);
    console.log('═══════════════════════════════════════════════════════');

    // Déterminer l'URL de l'API selon l'environnement
    const paydunyaApiUrl = process.env.PAYDUNYA_API_URL || 'https://app.paydunya.com';
    
    console.log('🌐 PayDunya API URL:', paydunyaApiUrl);
    console.log('🔑 Clés présentes:', {
      masterKey: !!paydunyaMasterKey,
      privateKey: !!paydunyaPrivateKey,
      token: !!paydunyaToken
    });

    // Créer la demande de paiement PayDunya (DMP API)
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
        support_fees: 0, // 0 = le marchand paie les frais, 1 = le client paie les frais
        send_notification: 1, // Envoyer une notification par email/SMS
        // Métadonnées personnalisées
        metadata: {
          propertyId: propertyId,
          propertyTitle: propertyTitle,
          guestName: guestName || 'Client',
          guestPhone: guestPhone,
          startDate: startDate,
          endDate: endDate,
          nights: nights.toString(),
          reservationId: reservationId || '',
          type: 'reservation_payment',
        },
      }),
    });

    const responseText = await paymentRequestResponse.text();
    console.log('📡 Réponse brute création demande de paiement:', responseText);
    console.log('   • Status:', paymentRequestResponse.status);
    console.log('   • StatusText:', paymentRequestResponse.statusText);

    let paymentRequestData;
    try {
      paymentRequestData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Erreur parsing JSON réponse:', e);
      throw new Error(`Réponse invalide de PayDunya: ${responseText.substring(0, 200)}`);
    }

    console.log('📦 Réponse complète création demande de paiement:', JSON.stringify(paymentRequestData, null, 2));

    // PayDunya utilise des codes de réponse :
    // - "00" = succès
    // - "1001" = KYC non validé
    // - Autres codes = erreurs diverses
    const responseCode = paymentRequestData.response_code;
    const responseText_msg = paymentRequestData.response_text || paymentRequestData.message;

    // Vérifier si c'est une erreur (code différent de "00")
    if (responseCode && responseCode !== '00') {
      console.error('❌ Erreur PayDunya:', {
        code: responseCode,
        message: responseText_msg,
        fullResponse: paymentRequestData
      });

      // Gestion spécifique de l'erreur KYC
      if (responseCode === '1001') {
        throw new Error(`Votre compte PayDunya nécessite une validation KYC avant d'utiliser le service. Veuillez vous connecter à votre compte PayDunya (https://app.paydunya.com) et compléter la vérification KYC. Code: ${responseCode}`);
      }

      // Autres erreurs
      throw new Error(`Erreur PayDunya (code: ${responseCode}): ${responseText_msg || 'Erreur inconnue'}`);
    }

    // Si le statut HTTP n'est pas OK et que le code de réponse n'est pas "00", c'est une erreur
    if (!paymentRequestResponse.ok && responseCode && responseCode !== '00') {
      console.error('❌ Erreur HTTP création demande de paiement PayDunya:', responseText);
      throw new Error(`Erreur ${paymentRequestResponse.status}: ${responseText_msg || responseText}`);
    }

    // PayDunya retourne une référence de paiement (reference_number) en cas de succès
    const referenceNumber = paymentRequestData.reference_number || 
                           paymentRequestData.data?.reference_number;

    if (!referenceNumber) {
      console.error('❌ Structure de réponse inattendue:', JSON.stringify(paymentRequestData, null, 2));
      throw new Error(`Référence de paiement non reçue de PayDunya. Code: ${responseCode}, Message: ${responseText_msg}`);
    }

    console.log(`✅ Demande de paiement PayDunya créée: ${referenceNumber}`);

    // Stocker la référence dans la réservation Supabase pour faciliter le callback
    if (reservationId) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseServiceRoleKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // Mettre à jour la réservation avec la référence PayDunya (si un champ existe pour ça)
          // Pour l'instant, on peut stocker dans notes ou créer un champ transaction_id
          await supabaseAdmin
            .from('reservations')
            .update({
              notes: `Référence PayDunya: ${referenceNumber}`,
            })
            .eq('id', reservationId);

          console.log(`✅ Référence PayDunya stockée dans la réservation: ${reservationId}`);
        } catch (error) {
          console.error('⚠️ Erreur lors du stockage de la référence:', error);
          // Ne pas bloquer la réponse si le stockage échoue
        }
      }
    }

    // PayDunya envoie un SMS au client avec un code de paiement
    return res.status(200).json({
      success: true,
      referenceNumber: referenceNumber,
      message: "Demande de paiement PayDunya créée avec succès. Un SMS avec le code de paiement a été envoyé au client.",
      requiresSMSConfirmation: true
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de la création de la demande de paiement PayDunya:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de la création de la demande de paiement PayDunya",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
