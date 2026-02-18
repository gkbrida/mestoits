import type { VercelRequest, VercelResponse } from '@vercel/node';

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
      month, 
      propertyTitle, 
      tenantEmail, 
      tenantName, 
      tenantPhone,
      leaseId,
      paymentId,
      origin 
    } = req.body;

    // Validation
    if (!amount || !month || !propertyTitle || !tenantEmail || !leaseId || !origin || !tenantPhone) {
      return res.status(400).json({
        success: false,
        error: "Paramètres manquants: amount, month, propertyTitle, tenantEmail, tenantPhone, leaseId et origin sont requis"
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

    // PayDunya utilise le montant en XOF directement (pas de conversion en centimes)
    const amountInXOF = Math.round(amountNumber);

    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 CRÉATION D\'UNE DEMANDE DE PAIEMENT PAYDUNYA');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Locataire: ${tenantEmail}`);
    console.log(`📱 Téléphone: ${tenantPhone}`);
    console.log(`💰 Montant: ${amountNumber} XOF (${amountInXOF} XOF) - Période: ${month}`);
    console.log(`🌐 Origin reçu: ${origin}`);
    console.log(`🏠 Propriété: ${propertyTitle}`);
    console.log(`📋 Lease ID: ${leaseId}`);
    console.log(`💳 Payment ID: ${paymentId || 'NON FOURNI'}`);

    // Construire les URLs de retour
    const successUrl = `${origin}/mes-locations?payment=success&lease=${leaseId}&paymentId=${paymentId || ''}&method=paydunya`;
    const cancelUrl = `${origin}/mes-locations?payment=cancelled&lease=${leaseId}&method=paydunya`;
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
    // PayDunya envoie un SMS au client avec un code de paiement
    const paymentRequestResponse = await fetch(`${paydunyaApiUrl}/api/v1/dmp-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': paydunyaMasterKey,
        'PAYDUNYA-PRIVATE-KEY': paydunyaPrivateKey,
        'PAYDUNYA-TOKEN': paydunyaToken,
      },
      body: JSON.stringify({
        recipient_email: tenantEmail,
        amount: amountInXOF,
        support_fees: 0, // 0 = le marchand paie les frais, 1 = le client paie les frais
        send_notification: 1, // Envoyer une notification par email/SMS
        // Métadonnées personnalisées (si supportées)
        metadata: {
          month: month,
          propertyTitle: propertyTitle,
          tenantName: tenantName || 'Locataire',
          tenantPhone: tenantPhone,
          leaseId: leaseId,
          paymentId: paymentId || '',
          type: 'rent_payment',
        },
      }),
    });

    const responseText = await paymentRequestResponse.text();
    console.log('📡 Réponse brute création demande de paiement:', responseText);
    console.log('   • Status:', paymentRequestResponse.status);
    console.log('   • StatusText:', paymentRequestResponse.statusText);
    console.log('   • Headers:', Object.fromEntries(paymentRequestResponse.headers.entries()));

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
    // Le client recevra un SMS avec un code pour confirmer le paiement
    const referenceNumber = paymentRequestData.reference_number || 
                           paymentRequestData.data?.reference_number;

    if (!referenceNumber) {
      console.error('❌ Structure de réponse inattendue:', JSON.stringify(paymentRequestData, null, 2));
      throw new Error(`Référence de paiement non reçue de PayDunya. Code: ${responseCode}, Message: ${responseText_msg}`);
    }

    console.log(`✅ Demande de paiement PayDunya créée: ${referenceNumber}`);

    // Stocker la référence dans le paiement Supabase pour faciliter le callback
    if (paymentId) {
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

          // Vérifier si c'est une échéance (payment_installment_payments)
          const { data: installmentRow } = await supabaseAdmin
            .from('payment_installment_payments')
            .select('id')
            .eq('id', paymentId)
            .maybeSingle();

          if (installmentRow) {
            await supabaseAdmin
              .from('payment_installment_payments')
              .update({ transaction_id: referenceNumber })
              .eq('id', paymentId);
            console.log(`✅ Référence PayDunya stockée dans l'échéance: ${paymentId}`);
          } else {
            await supabaseAdmin
              .from('payments')
              .update({ transaction_id: referenceNumber })
              .eq('id', paymentId);
            console.log(`✅ Référence PayDunya stockée dans le paiement: ${paymentId}`);
          }
        } catch (error) {
          console.error('⚠️ Erreur lors du stockage de la référence:', error);
          // Ne pas bloquer la réponse si le stockage échoue
        }
      }
    }

    // PayDunya envoie un SMS au client avec un code de paiement
    // Le client doit utiliser ce code pour confirmer le paiement
    // On retourne la référence pour suivi, mais le paiement sera confirmé via callback IPN

    return res.status(200).json({
      success: true,
      referenceNumber: referenceNumber,
      message: "Demande de paiement PayDunya créée avec succès. Un SMS avec le code de paiement a été envoyé au client.",
      // Note: PayDunya ne redirige pas vers une page de paiement comme Stripe/FedaPay
      // Le client reçoit un SMS et doit confirmer le paiement via son téléphone
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

