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
        const { data: tempData } = await supabaseAdmin
          .from('reservations_temp')
          .select('id')
          .like('notes', `%Référence PayDunya: ${referenceNumber}%`)
          .maybeSingle();

        if (tempData) {
          reservationId = tempData.id;
          console.log(`✅ Réservation temporaire trouvée par référence: ${reservationId}`);
        }
      }
    }

    if (paymentType === 'reservation_payment' && reservationId) {
      console.log(`🔄 Transfert réservation_temp ${reservationId} → reservations...`);

      const { data: tempData, error: fetchError } = await supabaseAdmin
        .from('reservations_temp')
        .select('property_id, owner_id, guest_name, guest_email, guest_phone, start_date, end_date, nights, total_amount')
        .eq('id', reservationId)
        .single();

      if (fetchError || !tempData) {
        console.error('❌ Réservation temporaire introuvable:', fetchError);
        return res.status(500).json({
          success: false,
          error: 'Réservation temporaire introuvable'
        });
      }

      const { data: newReservation, error: insertError } = await supabaseAdmin
        .from('reservations')
        .insert([{
          property_id: tempData.property_id,
          owner_id: tempData.owner_id,
          guest_name: tempData.guest_name,
          guest_email: tempData.guest_email,
          guest_phone: tempData.guest_phone || null,
          start_date: tempData.start_date,
          end_date: tempData.end_date,
          nights: tempData.nights,
          total_amount: tempData.total_amount,
          status: 'confirmed',
          notes: `Référence PayDunya: ${referenceNumber} - Paiement confirmé le ${new Date().toISOString()}`,
        }])
        .select('id')
        .single();

      if (insertError || !newReservation) {
        console.error('❌ Erreur insertion reservations:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Erreur lors de la création de la réservation'
        });
      }

      await supabaseAdmin.from('reservations_temp').delete().eq('id', reservationId);
      const confirmedId = newReservation.id;
      console.log(`✅ Réservation ${confirmedId} créée avec succès`);

      try {
        const { data: guestUser } = await supabaseAdmin
          .from('users_2025_12_01_11_29')
          .select('id')
          .eq('email', tempData.guest_email)
          .maybeSingle();

        const { processCommission } = await import('./utils/commissionHandler');
        await processCommission(
          'reservation',
          confirmedId,
          guestUser?.id || null,
          parseFloat(String(tempData.total_amount))
        );
      } catch (commissionError) {
        console.error('⚠️ Erreur lors du traitement de la commission:', commissionError);
      }

      try {
        const reservationData = { ...tempData, id: confirmedId };

        if (reservationData) {
          const { data: ownerData } = await supabaseAdmin
            .from('users_2025_12_01_11_29')
            .select('full_name, email, phone')
            .eq('id', reservationData.owner_id)
            .single();

          const { data: propertyData } = await supabaseAdmin
            .from('properties_02')
            .select('title')
            .eq('id', reservationData.property_id)
            .single();

          if (ownerData?.email) {
            const formatDate = (dateString: string) => {
              return new Date(dateString).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });
            };

            const formatPrice = (amount: number) => {
              return new Intl.NumberFormat('fr-FR').format(amount);
            };

            const confirmationMessage = `Bonjour ${ownerData.full_name || 'Propriétaire'},

La réservation pour votre bien "${propertyData?.title || 'Bien immobilier'}" a été confirmée suite au paiement effectué.

Détails de la réservation confirmée :
- Client : ${reservationData.guest_name}
- Email : ${reservationData.guest_email}
${reservationData.guest_phone ? `- Téléphone : ${reservationData.guest_phone}` : ''}
- Dates : Du ${formatDate(reservationData.start_date)} au ${formatDate(reservationData.end_date)}
- Nombre de nuits : ${reservationData.nights}
- Montant total : ${formatPrice(parseFloat(reservationData.total_amount))} FCFA
- Statut : Confirmée

La réservation est maintenant confirmée et le paiement a été reçu.

Cordialement,
L'équipe Mestoits`;

            // Construire l'email HTML
            const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">✅ Réservation confirmée</h1>
    </div>
    <div class="content">
      <p>Bonjour ${ownerData.full_name || 'Propriétaire'},</p>
      <p>La réservation pour votre bien "${propertyData?.title || 'Bien immobilier'}" a été confirmée suite au paiement effectué.</p>

      <div class="property-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Détails de la réservation confirmée</h3>
        <p><strong>Client :</strong> ${reservationData.guest_name}</p>
        <p><strong>Email :</strong> <a href="mailto:${reservationData.guest_email}">${reservationData.guest_email}</a></p>
        ${reservationData.guest_phone ? `<p><strong>Téléphone :</strong> <a href="tel:${reservationData.guest_phone}">${reservationData.guest_phone}</a></p>` : ''}
        <p><strong>Dates :</strong> Du ${formatDate(reservationData.start_date)} au ${formatDate(reservationData.end_date)}</p>
        <p><strong>Nombre de nuits :</strong> ${reservationData.nights}</p>
        <p><strong>Montant total :</strong> ${formatPrice(parseFloat(reservationData.total_amount))} FCFA</p>
        <p><strong>Statut :</strong> Confirmée</p>
      </div>

      <p>La réservation est maintenant confirmée et le paiement a été reçu.</p>

      <div class="footer">
        <p>Cet email a été envoyé depuis la plateforme Mestoits</p>
        <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
      </div>
    </div>
  </div>
</body>
</html>`;

            // Appeler l'API d'envoi d'email
            const emailApiUrl = process.env.VITE_EMAIL_API_URL || process.env.EMAIL_API_URL || '/api';
            const emailResponse = await fetch(`${emailApiUrl}/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: ownerData.email,
                subject: `Réservation confirmée pour votre bien: ${propertyData?.title || 'Bien immobilier'} - Mestoits`,
                html: emailHtml,
                text: confirmationMessage,
              }),
            });

            if (emailResponse.ok) {
              console.log(`✅ Email de confirmation envoyé au propriétaire ${ownerData.email}`);
            } else {
              const errorData = await emailResponse.json().catch(() => ({ error: 'Erreur inconnue' }));
              console.error('⚠️ Erreur lors de l\'envoi de l\'email de confirmation:', errorData);
            }
          }
        }
      } catch (emailError: any) {
        console.error('⚠️ Erreur lors de l\'envoi de l\'email de confirmation au propriétaire:', emailError.message);
        // Ne pas bloquer le callback si l'email échoue
      }

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

        // Traiter la commission
        try {
          const { data: paymentData } = await supabaseAdmin
            .from('installment_payments')
            .select('amount, installment_plan_id')
            .eq('id', paymentId)
            .single();

          if (paymentData) {
            const { data: planData } = await supabaseAdmin
              .from('installment_plans')
              .select('tenant_id')
              .eq('id', paymentData.installment_plan_id)
              .single();

            const { processCommission } = await import('./utils/commissionHandler');
            await processCommission(
              'installment_payment',
              paymentId,
              planData?.tenant_id || null,
              parseFloat(paymentData.amount)
            );
          }
        } catch (commissionError) {
          console.error('⚠️ Erreur lors du traitement de la commission:', commissionError);
          // Ne pas bloquer le callback si la commission échoue
        }

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

        // Traiter la commission
        try {
          const { data: paymentData } = await supabaseAdmin
            .from('payments')
            .select('amount, tenant_id')
            .eq('id', paymentId)
            .single();

          if (paymentData) {
            const { processCommission } = await import('./utils/commissionHandler');
            await processCommission(
              'rent_payment',
              paymentId,
              paymentData.tenant_id || null,
              parseFloat(paymentData.amount)
            );
          }
        } catch (commissionError) {
          console.error('⚠️ Erreur lors du traitement de la commission:', commissionError);
          // Ne pas bloquer le callback si la commission échoue
        }

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

