import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Type pour le transporter nodemailer
interface Transporter {
  sendMail(options: {
    from?: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<any>;
  verify?(): Promise<void>;
}

/**
 * Cron job pour envoyer des notifications 60 jours avant la fin d'un bail
 * S'exécute quotidiennement
 * 
 * Configuration dans vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron-lease-expiration-reminder",
 *     "schedule": "00 17 * * *" // Tous les jours à 17h00 UTC
 *   }]
 * }
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Vérifier que la requête vient de Vercel Cron (sécurité)
  const cronSecret = process.env.CRON_SECRET;
  const userAgent = req.headers?.['user-agent'] || '';
  const xVercelSignature = req.headers?.['x-vercel-signature'];
  const isVercelCron = userAgent.includes('vercel-cron') || xVercelSignature !== undefined;
  
  if (cronSecret) {
    const authHeader = req.headers?.authorization;
    
    if (isVercelCron) {
      console.log('✅ Requête authentifiée depuis Vercel Cron');
    } else if (authHeader === `Bearer ${cronSecret}`) {
      console.log('✅ Requête authentifiée avec CRON_SECRET');
    } else {
      console.warn('⚠️ Tentative d\'accès non autorisée au cron job');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
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

    // Date dans 60 jours
    const dateIn60Days = new Date(today);
    dateIn60Days.setDate(today.getDate() + 60);

    console.log(`📅 Recherche des baux se terminant dans 60 jours (${dateIn60Days.toISOString().split('T')[0]})`);

    // Récupérer les baux actifs qui se terminent dans 60 jours
    const { data: leases, error: leasesError } = await supabase
      .from('leases')
      .select('id, property_id, property_02_id, owner_id, tenant_id, end_date, status')
      .eq('status', 'active')
      .eq('end_date', dateIn60Days.toISOString().split('T')[0]);

    if (leasesError) {
      console.error('❌ Erreur lors de la récupération des baux:', leasesError);
      return res.status(500).json({ error: 'Erreur lors de la récupération des baux' });
    }

    if (!leases || leases.length === 0) {
      console.log('✅ Aucun bail à notifier aujourd\'hui');
      return res.status(200).json({ 
        success: true, 
        message: 'Aucun bail à notifier',
        processed: 0 
      });
    }

    console.log(`📧 ${leases.length} bail(x) à notifier`);

    // Configuration email Zoho
    const zohoUser = process.env.ZOHO_USER;
    const zohoPassword = process.env.ZOHO_PASSWORD;

    if (!zohoUser || !zohoPassword) {
      console.error("❌ Variables d'environnement Zoho non définies");
      return res.status(500).json({ error: 'Configuration email manquante' });
    }

    const transporter = nodemailer.createTransport({
      host: "smtppro.zoho.eu",
      port: 465,
      secure: true,
      auth: { user: zohoUser, pass: zohoPassword },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    await transporter.verify();

    let processed = 0;
    const appUrl = process.env.VITE_APP_URL || 'https://mestoits.com';

    // Traiter chaque bail
    for (const lease of leases) {
      try {
        // Charger les données nécessaires
        const [propertyData, ownerData, tenantData] = await Promise.all([
          supabase
            .from('properties_02')
            .select('title, address, city')
            .eq('id', lease.property_02_id || lease.property_id)
            .maybeSingle(),
          supabase
            .from('users_2025_12_01_11_29')
            .select('full_name, email')
            .eq('id', lease.owner_id)
            .single(),
          supabase
            .from('tenants')
            .select('first_name, last_name, email')
            .eq('id', lease.tenant_id)
            .single(),
        ]);

        if (propertyData.error || ownerData.error || tenantData.error) {
          console.warn(`⚠️ Erreur lors du chargement des données pour le bail ${lease.id}`);
          continue;
        }

        const property = propertyData.data;
        const owner = ownerData.data;
        const tenant = tenantData.data;

        if (!owner || !tenant) {
          console.warn(`⚠️ Données manquantes pour le bail ${lease.id}`);
          continue;
        }

        // Récupérer l'email du locataire depuis users_2025_12_01_11_29 si disponible
        let tenantEmail = tenant.email;
        let tenantName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Locataire';

        if (tenant.email) {
          const { data: tenantUserData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('full_name, email')
            .eq('email', tenant.email)
            .maybeSingle();

          if (tenantUserData?.full_name) {
            tenantName = tenantUserData.full_name;
            tenantEmail = tenantUserData.email || tenant.email;
          }
        }

        const formatDate = (dateStr: string): string => {
          try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
          } catch {
            return dateStr;
          }
        };

        const propertyInfo = property?.title || property?.address || property?.city
          ? `${property?.title || ''}${property?.address || property?.city ? ` - ${[property.address, property.city].filter(Boolean).join(', ')}` : ''}`
          : 'Bien immobilier';

        // Email au propriétaire
        const ownerEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .warning-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Fin de bail proche</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${owner.full_name}</strong>,</p>
      <p>Nous vous informons que votre contrat de bail arrive à échéance dans <strong>60 jours</strong>.</p>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Bien concerné</h3>
        <p><strong>${propertyInfo}</strong></p>
      </div>
      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: bold;">Date de fin du bail</p>
        <p style="margin: 5px 0 0 0; color: #78350f; font-size: 16px;">${formatDate(lease.end_date)}</p>
      </div>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Informations importantes</h3>
        <p><strong>Locataire :</strong> ${tenantName}</p>
        <p><strong>Date de fin du bail :</strong> ${formatDate(lease.end_date)}</p>
        <p><strong>Jours restants :</strong> 60 jours</p>
      </div>
      <div class="info-box" style="border-left-color: #14b8a6;">
        <h3 style="margin-top: 0; color: #14b8a6;">Actions à prévoir</h3>
        <p>En tant que propriétaire, vous pouvez :</p>
        <ul>
          <li>Clôturer le bail si vous ne souhaitez pas le reconduire</li>
          <li>Laisser le bail se reconduire automatiquement d'un an si aucune action n'est effectuée avant la date de fin</li>
          <li>Contacter votre locataire pour discuter de la reconduction</li>
        </ul>
      </div>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

        const ownerEmailText = `Bonjour ${owner.full_name},

Nous vous informons que votre contrat de bail arrive à échéance dans 60 jours.

Bien concerné: ${propertyInfo}
Locataire: ${tenantName}
Date de fin du bail: ${formatDate(lease.end_date)}
Jours restants: 60 jours

Actions à prévoir:
En tant que propriétaire, vous pouvez :
- Clôturer le bail si vous ne souhaitez pas le reconduire
- Laisser le bail se reconduire automatiquement d'un an si aucune action n'est effectuée avant la date de fin
- Contacter votre locataire pour discuter de la reconduction

Cordialement,
L'équipe Mestoits`;

        // Email au locataire
        const tenantEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .warning-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Fin de bail proche</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Nous vous informons que votre contrat de bail arrive à échéance dans <strong>60 jours</strong>.</p>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Bien concerné</h3>
        <p><strong>${propertyInfo}</strong></p>
      </div>
      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: bold;">Date de fin du bail</p>
        <p style="margin: 5px 0 0 0; color: #78350f; font-size: 16px;">${formatDate(lease.end_date)}</p>
      </div>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Informations importantes</h3>
        <p><strong>Propriétaire :</strong> ${owner.full_name}</p>
        <p><strong>Date de fin du bail :</strong> ${formatDate(lease.end_date)}</p>
        <p><strong>Jours restants :</strong> 60 jours</p>
      </div>
      <div class="info-box" style="border-left-color: #14b8a6;">
        <h3 style="margin-top: 0; color: #14b8a6;">Information importante</h3>
        <p>Si votre propriétaire ne clôture pas le bail avant la date de fin, celui-ci sera automatiquement reconduit d'un an supplémentaire.</p>
        <p>Nous vous recommandons de contacter votre propriétaire pour discuter de la reconduction ou de la fin du bail.</p>
      </div>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

        const tenantEmailText = `Bonjour ${tenantName},

Nous vous informons que votre contrat de bail arrive à échéance dans 60 jours.

Bien concerné: ${propertyInfo}
Propriétaire: ${owner.full_name}
Date de fin du bail: ${formatDate(lease.end_date)}
Jours restants: 60 jours

Information importante:
Si votre propriétaire ne clôture pas le bail avant la date de fin, celui-ci sera automatiquement reconduit d'un an supplémentaire.
Nous vous recommandons de contacter votre propriétaire pour discuter de la reconduction ou de la fin du bail.

Cordialement,
L'équipe Mestoits`;

        // Envoyer les emails
        await Promise.all([
          transporter.sendMail({
            from: `"Mestoits" <${zohoUser}>`,
            to: owner.email,
            subject: `Fin de bail proche - ${propertyInfo}`,
            html: ownerEmailHtml,
            text: ownerEmailText,
          }),
          tenantEmail ? transporter.sendMail({
            from: `"Mestoits" <${zohoUser}>`,
            to: tenantEmail,
            subject: `Fin de bail proche - ${propertyInfo}`,
            html: tenantEmailHtml,
            text: tenantEmailText,
          }) : Promise.resolve(),
        ]);

        processed++;
        console.log(`✅ Notifications envoyées pour le bail ${lease.id}`);
      } catch (error: any) {
        console.error(`❌ Erreur lors du traitement du bail ${lease.id}:`, error);
      }
    }

    console.log(`✅ Traitement terminé: ${processed}/${leases.length} baux notifiés`);

    return res.status(200).json({
      success: true,
      message: `${processed} bail(x) notifié(s)`,
      processed,
      total: leases.length
    });
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'exécution du cron job:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de l\'exécution du cron job',
      details: error.message 
    });
  }
}
