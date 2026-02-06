import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

/**
 * Cron job pour envoyer des rappels de paiement de loyer
 * S'exécute quotidiennement et envoie un email aux locataires 10 jours avant l'échéance
 * 
 * Configuration dans vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron-rent-payment-reminder",
 *     "schedule": "55 13 * * *" // Tous les jours à 13h55 UTC (14h55 heure de Paris en hiver, 15h55 en été)
 *   }]
 * }
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Vérifier que la requête vient de Vercel Cron (sécurité)
  // Vercel Cron peut être identifié par :
  // 1. Le header x-vercel-signature (si configuré)
  // 2. Le User-Agent qui contient "vercel-cron"
  // 3. Le CRON_SECRET dans le header Authorization (si configuré manuellement)
  
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers['user-agent']?.includes('vercel-cron') || 
                       req.headers['x-vercel-signature'] !== undefined;
  
  // Si CRON_SECRET est défini, vérifier l'authentification
  if (cronSecret) {
    const authHeader = req.headers?.authorization;
    
    // Vérifier si c'est une requête Vercel Cron authentifiée
    if (isVercelCron) {
      // Si c'est Vercel Cron, on accepte (Vercel gère l'authentification)
      console.log('✅ Requête authentifiée depuis Vercel Cron');
    } else if (authHeader === `Bearer ${cronSecret}`) {
      // Si c'est une requête manuelle avec le bon secret, on accepte
      console.log('✅ Requête authentifiée avec CRON_SECRET');
    } else {
      // Sinon, refuser l'accès
      console.warn('⚠️ Tentative d\'accès non autorisée au cron job');
      console.warn(`   User-Agent: ${req.headers['user-agent']}`);
      console.warn(`   Authorization header présent: ${!!authHeader}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    // Si CRON_SECRET n'est pas défini, accepter uniquement les requêtes Vercel Cron
    if (!isVercelCron) {
      console.warn('⚠️ CRON_SECRET non défini et requête non-Vercel détectée');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('✅ Requête Vercel Cron acceptée (CRON_SECRET non défini)');
  }

  try {
    // Initialiser Supabase
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables d\'environnement Supabase manquantes');
      return res.status(500).json({ error: 'Configuration manquante' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Date d'aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date dans 10 jours
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 10);

    console.log(`📅 Recherche des paiements dus le ${targetDate.toISOString().split('T')[0]}`);

    // Récupérer tous les baux actifs avec payment_due_day défini
    const { data: activeLeases, error: leasesError } = await supabase
      .from('leases')
      .select('id, property_02_id, property_id, tenant_id, monthly_rent, payment_due_day, start_date, end_date')
      .eq('status', 'active')
      .not('payment_due_day', 'is', null);

    if (leasesError) {
      console.error('❌ Erreur lors du chargement des baux:', leasesError);
      return res.status(500).json({ error: 'Erreur lors du chargement des baux' });
    }

    if (!activeLeases || activeLeases.length === 0) {
      console.log('✅ Aucun bail actif avec payment_due_day défini');
      return res.json({ 
        success: true, 
        message: 'Aucun bail à traiter',
        processed: 0 
      });
    }

    console.log(`📋 ${activeLeases.length} bail(s) actif(s) trouvé(s)`);

    // Filtrer les baux dont le prochain paiement est dans 10 jours
    const leasesToNotify: any[] = [];

    for (const lease of activeLeases) {
      if (!lease.payment_due_day) continue;

      // Calculer la prochaine date d'échéance basée sur payment_due_day
      const nextDueDate = calculateNextDueDate(today, lease.payment_due_day);

      // Vérifier si cette date correspond à la date cible (dans 10 jours)
      if (nextDueDate.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0]) {
        // Vérifier que le bail est toujours actif (pas expiré)
        const endDate = lease.end_date ? new Date(lease.end_date) : null;
        if (!endDate || nextDueDate <= endDate) {
          leasesToNotify.push(lease);
        }
      }
    }

    console.log(`📧 ${leasesToNotify.length} locataire(s) à notifier`);

    if (leasesToNotify.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Aucun paiement à notifier pour aujourd\'hui',
        processed: 0 
      });
    }

    // Charger les informations des locataires et propriétés
    const tenantIds = [...new Set(leasesToNotify.map(l => l.tenant_id).filter(Boolean))];
    const propertyIds = [...new Set(leasesToNotify.map(l => l.property_02_id || l.property_id).filter(Boolean))];

    const [tenantsResult, propertiesResult] = await Promise.all([
      tenantIds.length > 0
        ? supabase
            .from('tenants')
            .select('id, first_name, last_name, email')
            .in('id', tenantIds)
        : Promise.resolve({ data: [], error: null }),
      propertyIds.length > 0
        ? supabase
            .from('properties_02')
            .select('id, title, address, city')
            .in('id', propertyIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (tenantsResult.error) {
      console.error('❌ Erreur lors du chargement des locataires:', tenantsResult.error);
      return res.status(500).json({ error: 'Erreur lors du chargement des locataires' });
    }

    if (propertiesResult.error) {
      console.error('❌ Erreur lors du chargement des propriétés:', propertiesResult.error);
      return res.status(500).json({ error: 'Erreur lors du chargement des propriétés' });
    }

    const tenantsMap = new Map((tenantsResult.data || []).map((t: any) => [t.id, t]));
    const propertiesMap = new Map((propertiesResult.data || []).map((p: any) => [p.id, p]));

    // Envoyer les emails et créer les quittances si nécessaire
    let successCount = 0;
    let errorCount = 0;
    let receiptCreatedCount = 0;

    for (const lease of leasesToNotify) {
      const tenant = tenantsMap.get(lease.tenant_id);
      const propertyId = lease.property_02_id || lease.property_id;
      const property = propertiesMap.get(propertyId);

      if (!tenant || !tenant.email) {
        console.warn(`⚠️ Locataire introuvable ou sans email pour le bail ${lease.id}`);
        errorCount++;
        continue;
      }

      if (!property) {
        console.warn(`⚠️ Propriété introuvable pour le bail ${lease.id}`);
        errorCount++;
        continue;
      }

      // Calculer la date d'échéance
      const dueDate = calculateNextDueDate(today, lease.payment_due_day);
      const dueDateString = dueDate.toISOString().split('T')[0];

      // Vérifier si une quittance existe déjà pour ce mois
      const { data: existingPayment, error: checkError } = await supabase
        .from('payments')
        .select('id')
        .eq('lease_id', lease.id)
        .eq('due_date', dueDateString)
        .maybeSingle();

      if (checkError) {
        console.error(`❌ Erreur lors de la vérification du paiement pour le bail ${lease.id}:`, checkError);
        errorCount++;
        continue;
      }

      // Créer la quittance si elle n'existe pas
      let paymentId: string | null = null;
      if (!existingPayment) {
        try {
          const { data: newPayment, error: createError } = await supabase
            .from('payments')
            .insert([{
              lease_id: lease.id,
              amount: lease.monthly_rent,
              due_date: dueDateString,
              status: 'pending', // Créer comme impayé
              payment_date: null,
            }])
            .select('id')
            .single();

          if (createError) {
            console.error(`❌ Erreur lors de la création de la quittance pour le bail ${lease.id}:`, createError);
            errorCount++;
            continue;
          }

          paymentId = newPayment.id;
          receiptCreatedCount++;
          console.log(`✅ Quittance créée automatiquement pour le bail ${lease.id} (échéance: ${dueDateString})`);
        } catch (createException: any) {
          console.error(`❌ Exception lors de la création de la quittance pour le bail ${lease.id}:`, createException.message);
          errorCount++;
          continue;
        }
      } else {
        paymentId = existingPayment.id;
        console.log(`ℹ️ Quittance déjà existante pour le bail ${lease.id} (échéance: ${dueDateString})`);
      }

      // Construire l'email
      const emailHtml = buildPaymentReminderEmail({
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        propertyTitle: property.title || 'Bien immobilier',
        propertyAddress: property.address || '',
        propertyCity: property.city || '',
        monthlyRent: lease.monthly_rent,
        dueDate: dueDate.toISOString().split('T')[0],
        daysUntilDue: 10
      });

      const emailText = buildPaymentReminderEmailText({
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        propertyTitle: property.title || 'Bien immobilier',
        propertyAddress: property.address || '',
        propertyCity: property.city || '',
        monthlyRent: lease.monthly_rent,
        dueDate: dueDate.toISOString().split('T')[0],
        daysUntilDue: 10
      });

      // Envoyer l'email directement
      try {
        // Vérifier que les variables d'environnement sont définies
        const zohoUser = process.env.ZOHO_USER || 'contact@mestoits.com';
        const zohoPassword = process.env.ZOHO_PASSWORD;
        
        if (!zohoUser || !zohoPassword) {
          console.error("❌ Variables d'environnement Zoho non définies");
          errorCount++;
          continue;
        }

        // Créer le transporteur Zoho
        const transporter = nodemailer.createTransport({
          host: "smtppro.zoho.eu",
          port: 465,
          secure: true,
          auth: {
            user: zohoUser,
            pass: zohoPassword
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        });

        // Vérifier la connexion
        await transporter.verify();
        console.log('✅ Connexion SMTP Zoho vérifiée');

        // Envoyer l'email
        const info = await transporter.sendMail({
          from: `"Mestoits" <${zohoUser}>`,
          to: tenant.email,
          subject: `Rappel : Paiement de loyer dans 10 jours - ${property.title || 'Bien immobilier'}`,
          html: emailHtml,
          text: emailText,
        });

        console.log(`✅ Email envoyé à ${tenant.email} pour le bail ${lease.id} (MessageId: ${info.messageId})`);
        successCount++;
      } catch (emailError: any) {
        console.error(`❌ Erreur lors de l'envoi à ${tenant.email}:`, emailError.message);
        if (emailError.code) {
          console.error(`   Code d'erreur: ${emailError.code}`);
        }
        errorCount++;
      }
    }

    return res.json({
      success: true,
      message: `Traitement terminé : ${successCount} email(s) envoyé(s), ${receiptCreatedCount} quittance(s) créée(s), ${errorCount} erreur(s)`,
      processed: leasesToNotify.length,
      successCount,
      receiptCreatedCount,
      errorCount
    });

  } catch (error: any) {
    console.error('❌ Erreur dans le cron job:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du traitement',
      details: error.message 
    });
  }
}

/**
 * Calcule la prochaine date d'échéance basée sur payment_due_day
 */
function calculateNextDueDate(today: Date, paymentDueDay: number): Date {
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  // Si le jour d'échéance de ce mois est déjà passé, prendre le mois suivant
  if (currentDay >= paymentDueDay) {
    // Prendre le mois suivant
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    // Gérer les mois avec moins de 31 jours
    const daysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const dueDay = Math.min(paymentDueDay, daysInMonth);
    
    return new Date(nextYear, nextMonth, dueDay);
  } else {
    // Le jour d'échéance de ce mois n'est pas encore passé
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dueDay = Math.min(paymentDueDay, daysInMonth);
    
    return new Date(currentYear, currentMonth, dueDay);
  }
}

/**
 * Construit l'email HTML de rappel de paiement
 */
function buildPaymentReminderEmail(data: {
  tenantName: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  monthlyRent: number;
  dueDate: string;
  daysUntilDue: number;
}): string {
  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .amount-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .amount-box .amount { font-size: 32px; font-weight: bold; color: #d97706; margin: 10px 0; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #d97706; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Rappel de paiement de loyer</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.tenantName}</strong>,</p>
      <p>Nous vous rappelons que votre paiement de loyer arrive à échéance dans <strong>${data.daysUntilDue} jours</strong>.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Détails du paiement</h3>
        <p><strong>Date d'échéance:</strong> ${formatDate(data.dueDate)}</p>
        <p><strong>Jours restants:</strong> ${data.daysUntilDue} jour(s)</p>
      </div>

      <div class="amount-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">Montant à payer</p>
        <div class="amount">${formatPrice(data.monthlyRent)}</div>
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Important :</strong> Veuillez effectuer le paiement avant la date d'échéance pour éviter tout retard et les pénalités associées.
        </p>
      </div>

      <p style="text-align: center;">
        <a href="https://mestoits-v2.vercel.app/mes-locations" class="button">Consulter mes locations</a>
      </p>

      <p>Connectez-vous à votre espace pour consulter les détails et effectuer le paiement en ligne.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Construit l'email texte de rappel de paiement
 */
function buildPaymentReminderEmailText(data: {
  tenantName: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  monthlyRent: number;
  dueDate: string;
  daysUntilDue: number;
}): string {
  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  return `Bonjour ${data.tenantName},

Nous vous rappelons que votre paiement de loyer arrive à échéance dans ${data.daysUntilDue} jours.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}

DÉTAILS DU PAIEMENT:
- Date d'échéance: ${formatDate(data.dueDate)}
- Jours restants: ${data.daysUntilDue} jour(s)
- Montant à payer: ${formatPrice(data.monthlyRent)}

⚠️ Important : Veuillez effectuer le paiement avant la date d'échéance pour éviter tout retard et les pénalités associées.

Connectez-vous à votre espace pour consulter les détails et effectuer le paiement en ligne:
https://mestoits-v2.vercel.app/mes-locations

Cordialement,
L'équipe Mestoits`;
}
