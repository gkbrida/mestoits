import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

/**
 * Cron job pour envoyer des rappels de réservation
 * S'exécute quotidiennement et envoie des emails aux clients et propriétaires
 * 
 * Configuration dans vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron-reservation-reminder",
 *     "schedule": "40 16 * * *" // Tous les jours à 16h40 UTC (17h40 heure de Paris en hiver, 18h40 en été)
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

    // Dates cibles pour les différents rappels
    const dateIn3Days = new Date(today);
    dateIn3Days.setDate(today.getDate() + 3); // 3 jours avant le début de la réservation
    
    const dateToday = new Date(today); // Jour J (fin de réservation)

    console.log(`📅 Recherche des réservations pour les dates:`);
    console.log(`   - Début dans 3 jours: ${dateIn3Days.toISOString().split('T')[0]}`);
    console.log(`   - Fin aujourd'hui (Jour J): ${dateToday.toISOString().split('T')[0]}`);

    // Récupérer les réservations confirmées qui commencent dans 3 jours
    const { data: reservationsStartingSoon, error: startError } = await supabase
      .from('reservations')
      .select('id, property_id, owner_id, guest_name, guest_email, guest_phone, start_date, end_date, nights, total_amount, status')
      .eq('status', 'confirmed')
      .eq('start_date', dateIn3Days.toISOString().split('T')[0]);

    if (startError) {
      console.error('❌ Erreur lors du chargement des réservations qui commencent:', startError);
      return res.status(500).json({ error: 'Erreur lors du chargement des réservations' });
    }

    // Récupérer les réservations confirmées qui se terminent aujourd'hui
    const { data: reservationsEndingToday, error: endError } = await supabase
      .from('reservations')
      .select('id, property_id, owner_id, guest_name, guest_email, guest_phone, start_date, end_date, nights, total_amount, status')
      .eq('status', 'confirmed')
      .eq('end_date', dateToday.toISOString().split('T')[0]);

    if (endError) {
      console.error('❌ Erreur lors du chargement des réservations qui se terminent:', endError);
      return res.status(500).json({ error: 'Erreur lors du chargement des réservations' });
    }

    const totalReservations = (reservationsStartingSoon || []).length + (reservationsEndingToday || []).length;

    console.log(`📋 Réservations à traiter:`);
    console.log(`   - Début dans 3 jours: ${(reservationsStartingSoon || []).length}`);
    console.log(`   - Fin aujourd'hui: ${(reservationsEndingToday || []).length}`);

    if (totalReservations === 0) {
      return res.json({ 
        success: true, 
        message: 'Aucune réservation à notifier pour aujourd\'hui',
        processed: 0 
      });
    }

    // Charger les informations des propriétés et propriétaires
    const allReservations = [...(reservationsStartingSoon || []), ...(reservationsEndingToday || [])];
    const propertyIds = [...new Set(allReservations.map(r => r.property_id).filter(Boolean))];
    const ownerIds = [...new Set(allReservations.map(r => r.owner_id).filter(Boolean))];

    const [propertiesResult, ownersResult] = await Promise.all([
      propertyIds.length > 0
        ? supabase
            .from('properties_02')
            .select('id, title, address, city, check_in_time, check_out_time')
            .in('id', propertyIds)
        : Promise.resolve({ data: [], error: null }),
      ownerIds.length > 0
        ? supabase
            .from('users_2025_12_01_11_29')
            .select('id, full_name, email, phone')
            .in('id', ownerIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (propertiesResult.error) {
      console.error('❌ Erreur lors du chargement des propriétés:', propertiesResult.error);
      return res.status(500).json({ error: 'Erreur lors du chargement des propriétés' });
    }

    if (ownersResult.error) {
      console.error('❌ Erreur lors du chargement des propriétaires:', ownersResult.error);
      return res.status(500).json({ error: 'Erreur lors du chargement des propriétaires' });
    }

    const propertiesMap = new Map((propertiesResult.data || []).map((p: any) => [p.id, p]));
    const ownersMap = new Map((ownersResult.data || []).map((o: any) => [o.id, o]));

    // Configurer Nodemailer (même configuration que pour les loyers)
    const zohoUser = process.env.ZOHO_USER || 'contact@mestoits.com';
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

    // Traiter chaque catégorie
    const [resultStartingSoon, resultEndingToday] = await Promise.all([
      processStartingSoonReminders(reservationsStartingSoon || [], propertiesMap, ownersMap, transporter),
      processEndingTodayReminders(reservationsEndingToday || [], propertiesMap, ownersMap, transporter)
    ]);

    const totalProcessed = resultStartingSoon + resultEndingToday;

    return res.json({
      success: true,
      message: 'Rappels de réservation traités',
      processed: totalProcessed,
      details: {
        startingSoonReminders: resultStartingSoon,
        endingTodayReminders: resultEndingToday
      }
    });
  } catch (error: any) {
    console.error('❌ Erreur lors du traitement des rappels:', error);
    return res.status(500).json({ 
      error: 'Erreur lors du traitement des rappels',
      message: error.message 
    });
  }
}

/**
 * Traite les rappels pour les réservations qui commencent dans 3 jours
 */
async function processStartingSoonReminders(
  reservations: any[],
  propertiesMap: Map<string, any>,
  ownersMap: Map<string, any>,
  transporter: nodemailer.Transporter
): Promise<number> {
  let processed = 0;

  for (const reservation of reservations) {
    try {
      if (!reservation.guest_email) {
        console.warn(`⚠️ Email client manquant pour la réservation ${reservation.id}`);
        continue;
      }

      const property = propertiesMap.get(reservation.property_id);
      const owner = ownersMap.get(reservation.owner_id);

      if (!property) {
        console.warn(`⚠️ Propriété introuvable pour la réservation ${reservation.id}`);
        continue;
      }

      if (!owner || !owner.email) {
        console.warn(`⚠️ Propriétaire introuvable ou email manquant pour la réservation ${reservation.id}`);
        continue;
      }

      const propertyTitle = property.title || 'Bien immobilier';
      const propertyAddress = property.address || '';
      const propertyCity = property.city || '';
      const checkInTime = property.check_in_time || '14:00';
      const ownerName = owner.full_name || 'Le propriétaire';
      const ownerEmail = owner.email;
      const ownerPhone = owner.phone || '';

      // Email au client
      const guestEmailHtml = buildGuestStartingSoonEmail({
        guestName: reservation.guest_name,
        ownerName,
        ownerEmail,
        ownerPhone,
        propertyTitle,
        propertyAddress,
        propertyCity,
        checkInTime,
        startDate: reservation.start_date,
        endDate: reservation.end_date,
        nights: reservation.nights,
        totalAmount: parseFloat(reservation.total_amount)
      });

      const guestEmailText = buildGuestStartingSoonEmailText({
        guestName: reservation.guest_name,
        ownerName,
        ownerEmail,
        ownerPhone,
        propertyTitle,
        propertyAddress,
        propertyCity,
        checkInTime,
        startDate: reservation.start_date,
        endDate: reservation.end_date,
        nights: reservation.nights,
        totalAmount: parseFloat(reservation.total_amount)
      });

      // Email au propriétaire
      const ownerEmailHtml = buildOwnerStartingSoonEmail({
        ownerName,
        guestName: reservation.guest_name,
        guestEmail: reservation.guest_email,
        guestPhone: reservation.guest_phone || '',
        propertyTitle,
        propertyAddress,
        propertyCity,
        startDate: reservation.start_date,
        endDate: reservation.end_date,
        nights: reservation.nights,
        totalAmount: parseFloat(reservation.total_amount)
      });

      const ownerEmailText = buildOwnerStartingSoonEmailText({
        ownerName,
        guestName: reservation.guest_name,
        guestEmail: reservation.guest_email,
        guestPhone: reservation.guest_phone || '',
        propertyTitle,
        propertyAddress,
        propertyCity,
        startDate: reservation.start_date,
        endDate: reservation.end_date,
        nights: reservation.nights,
        totalAmount: parseFloat(reservation.total_amount)
      });

      const zohoUser = process.env.ZOHO_USER || 'contact@mestoits.com';

      // Envoyer l'email au client
      await transporter.sendMail({
        from: `"Mestoits" <${zohoUser}>`,
        to: reservation.guest_email,
        subject: `Rappel: Votre réservation commence dans 3 jours - ${propertyTitle}`,
        html: guestEmailHtml,
        text: guestEmailText,
      });

      // Envoyer l'email au propriétaire
      await transporter.sendMail({
        from: `"Mestoits" <${zohoUser}>`,
        to: ownerEmail,
        subject: `Rappel: Réservation qui commence dans 3 jours - ${propertyTitle}`,
        html: ownerEmailHtml,
        text: ownerEmailText,
      });

      console.log(`✅ Emails envoyés pour la réservation ${reservation.id} (début dans 3 jours)`);
      processed++;
    } catch (error: any) {
      console.error(`❌ Erreur lors du traitement de la réservation ${reservation.id}:`, error);
    }
  }

  return processed;
}

/**
 * Traite les rappels pour les réservations qui se terminent aujourd'hui
 */
async function processEndingTodayReminders(
  reservations: any[],
  propertiesMap: Map<string, any>,
  ownersMap: Map<string, any>,
  transporter: nodemailer.Transporter
): Promise<number> {
  let processed = 0;

  for (const reservation of reservations) {
    try {
      if (!reservation.guest_email) {
        console.warn(`⚠️ Email client manquant pour la réservation ${reservation.id}`);
        continue;
      }

      const property = propertiesMap.get(reservation.property_id);
      const owner = ownersMap.get(reservation.owner_id);

      if (!property) {
        console.warn(`⚠️ Propriété introuvable pour la réservation ${reservation.id}`);
        continue;
      }

      if (!owner || !owner.email) {
        console.warn(`⚠️ Propriétaire introuvable ou email manquant pour la réservation ${reservation.id}`);
        continue;
      }

      const propertyTitle = property.title || 'Bien immobilier';
      const propertyAddress = property.address || '';
      const propertyCity = property.city || '';
      const checkOutTime = property.check_out_time || '11:00';
      const ownerName = owner.full_name || 'Le propriétaire';
      const ownerEmail = owner.email;
      const ownerPhone = owner.phone || '';

      // Email au client
      const guestEmailHtml = buildGuestEndingTodayEmail({
        guestName: reservation.guest_name,
        ownerName,
        ownerEmail,
        ownerPhone,
        propertyTitle,
        propertyAddress,
        propertyCity,
        checkOutTime,
        endDate: reservation.end_date
      });

      const guestEmailText = buildGuestEndingTodayEmailText({
        guestName: reservation.guest_name,
        ownerName,
        ownerEmail,
        ownerPhone,
        propertyTitle,
        propertyAddress,
        propertyCity,
        checkOutTime,
        endDate: reservation.end_date
      });

      // Email au propriétaire
      const ownerEmailHtml = buildOwnerEndingTodayEmail({
        ownerName,
        guestName: reservation.guest_name,
        guestEmail: reservation.guest_email,
        guestPhone: reservation.guest_phone || '',
        propertyTitle,
        propertyAddress,
        propertyCity,
        endDate: reservation.end_date
      });

      const ownerEmailText = buildOwnerEndingTodayEmailText({
        ownerName,
        guestName: reservation.guest_name,
        guestEmail: reservation.guest_email,
        guestPhone: reservation.guest_phone || '',
        propertyTitle,
        propertyAddress,
        propertyCity,
        endDate: reservation.end_date
      });

      const zohoUser = process.env.ZOHO_USER || 'contact@mestoits.com';

      // Envoyer l'email au client
      await transporter.sendMail({
        from: `"Mestoits" <${zohoUser}>`,
        to: reservation.guest_email,
        subject: `Rappel: Votre réservation se termine aujourd'hui - ${propertyTitle}`,
        html: guestEmailHtml,
        text: guestEmailText,
      });

      // Envoyer l'email au propriétaire
      await transporter.sendMail({
        from: `"Mestoits" <${zohoUser}>`,
        to: ownerEmail,
        subject: `Rappel: Réservation qui se termine aujourd'hui - ${propertyTitle}`,
        html: ownerEmailHtml,
        text: ownerEmailText,
      });

      console.log(`✅ Emails envoyés pour la réservation ${reservation.id} (fin aujourd'hui)`);
      processed++;
    } catch (error: any) {
      console.error(`❌ Erreur lors du traitement de la réservation ${reservation.id}:`, error);
    }
  }

  return processed;
}

/**
 * Construit l'email HTML pour le client - réservation qui commence dans 3 jours
 */
function buildGuestStartingSoonEmail(data: {
  guestName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  checkInTime: string;
  startDate: string;
  endDate: string;
  nights: number;
  totalAmount: number;
}): string {
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '14:00';
    // Si le format est HH:mm:ss, prendre seulement HH:mm
    return timeStr.substring(0, 5);
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const contactInfo = data.ownerPhone
    ? `Email: ${data.ownerEmail || 'Non renseigné'}<br>Téléphone: ${data.ownerPhone}`
    : `Email: ${data.ownerEmail || 'Non renseigné'}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
    .highlight-box { background: #f0fdfa; border: 2px solid #14b8a6; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Votre réservation approche</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.guestName}</strong>,</p>
      <p>Nous vous rappelons que votre réservation commence dans <strong>3 jours</strong>.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Détails de votre réservation</h3>
        <p><strong>Date d'arrivée:</strong> ${formatDate(data.startDate)}</p>
        <p><strong>Heure d'arrivée:</strong> ${formatTime(data.checkInTime)}</p>
        <p><strong>Date de départ:</strong> ${formatDate(data.endDate)}</p>
        <p><strong>Nombre de nuits:</strong> ${data.nights}</p>
        <p><strong>Montant total:</strong> ${formatPrice(data.totalAmount)}</p>
      </div>

      <div class="highlight-box">
        <p style="margin: 0; color: #374151; font-size: 14px;">Votre séjour commence dans</p>
        <p style="margin: 10px 0; color: #14b8a6; font-size: 24px; font-weight: bold;">3 jours</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations du propriétaire</h3>
        <p><strong>Nom:</strong> ${data.ownerName}</p>
        <p><strong>Contact:</strong><br>${contactInfo}</p>
      </div>

      <p>Nous vous attendons avec plaisir ! Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter ${data.ownerName} aux coordonnées indiquées ci-dessus.</p>
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
 * Construit l'email texte pour le client - réservation qui commence dans 3 jours
 */
function buildGuestStartingSoonEmailText(data: {
  guestName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  checkInTime: string;
  startDate: string;
  endDate: string;
  nights: number;
  totalAmount: number;
}): string {
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '14:00';
    return timeStr.substring(0, 5);
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  return `Bonjour ${data.guestName},

Nous vous rappelons que votre réservation commence dans 3 jours.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}

DÉTAILS DE VOTRE RÉSERVATION:
- Date d'arrivée: ${formatDate(data.startDate)}
- Heure d'arrivée: ${formatTime(data.checkInTime)}
- Date de départ: ${formatDate(data.endDate)}
- Nombre de nuits: ${data.nights}
- Montant total: ${formatPrice(data.totalAmount)}

Votre séjour commence dans 3 jours.

INFORMATIONS DU PROPRIÉTAIRE:
- Nom: ${data.ownerName}
- Email: ${data.ownerEmail || 'Non renseigné'}
${data.ownerPhone ? `- Téléphone: ${data.ownerPhone}` : ''}

Nous vous attendons avec plaisir ! Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter ${data.ownerName} aux coordonnées indiquées ci-dessus.

Cordialement,
L'équipe Mestoits`;
}

/**
 * Construit l'email HTML pour le propriétaire - réservation qui commence dans 3 jours
 */
function buildOwnerStartingSoonEmail(data: {
  ownerName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  startDate: string;
  endDate: string;
  nights: number;
  totalAmount: number;
}): string {
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const guestContact = [];
  if (data.guestEmail) guestContact.push(`Email: ${data.guestEmail}`);
  if (data.guestPhone) guestContact.push(`Téléphone: ${data.guestPhone}`);

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
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
    .highlight-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Réservation qui commence dans 3 jours</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.ownerName}</strong>,</p>
      <p>Nous vous informons qu'une réservation de votre bien commence dans <strong>3 jours</strong>.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Détails de la réservation</h3>
        <p><strong>Client:</strong> ${data.guestName}</p>
        ${guestContact.length > 0 ? `<p><strong>Contact:</strong><br>${guestContact.join('<br>')}</p>` : ''}
        <p><strong>Date d'arrivée:</strong> ${formatDate(data.startDate)}</p>
        <p><strong>Date de départ:</strong> ${formatDate(data.endDate)}</p>
        <p><strong>Nombre de nuits:</strong> ${data.nights}</p>
        <p><strong>Montant total:</strong> ${formatPrice(data.totalAmount)}</p>
      </div>

      <div class="highlight-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">La réservation commence dans</p>
        <p style="margin: 10px 0; color: #d97706; font-size: 24px; font-weight: bold;">3 jours</p>
      </div>

      <p>Veuillez vous assurer que le bien est prêt pour l'arrivée du client.</p>
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
 * Construit l'email texte pour le propriétaire - réservation qui commence dans 3 jours
 */
function buildOwnerStartingSoonEmailText(data: {
  ownerName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  startDate: string;
  endDate: string;
  nights: number;
  totalAmount: number;
}): string {
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const guestContact = [];
  if (data.guestEmail) guestContact.push(`Email: ${data.guestEmail}`);
  if (data.guestPhone) guestContact.push(`Téléphone: ${data.guestPhone}`);

  return `Bonjour ${data.ownerName},

Nous vous informons qu'une réservation de votre bien commence dans 3 jours.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}

DÉTAILS DE LA RÉSERVATION:
- Client: ${data.guestName}
${guestContact.length > 0 ? `- Contact:\n  ${guestContact.join('\n  ')}` : ''}
- Date d'arrivée: ${formatDate(data.startDate)}
- Date de départ: ${formatDate(data.endDate)}
- Nombre de nuits: ${data.nights}
- Montant total: ${formatPrice(data.totalAmount)}

La réservation commence dans 3 jours.

Veuillez vous assurer que le bien est prêt pour l'arrivée du client.

Cordialement,
L'équipe Mestoits`;
}

/**
 * Construit l'email HTML pour le client - réservation qui se termine aujourd'hui
 */
function buildGuestEndingTodayEmail(data: {
  guestName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  checkOutTime: string;
  endDate: string;
}): string {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '11:00';
    return timeStr.substring(0, 5);
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const contactInfo = data.ownerPhone
    ? `Email: ${data.ownerEmail || 'Non renseigné'}<br>Téléphone: ${data.ownerPhone}`
    : `Email: ${data.ownerEmail || 'Non renseigné'}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
    .warning-box { background: #fef2f2; border: 2px solid #fecaca; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Votre réservation se termine aujourd'hui</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.guestName}</strong>,</p>
      <p>Nous vous rappelons que votre réservation se termine <strong>aujourd'hui</strong>.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #991b1b; font-size: 18px; font-weight: bold;">Date de départ</p>
        <p style="margin: 10px 0; color: #dc2626; font-size: 24px; font-weight: bold;">${formatDate(data.endDate)}</p>
        <p style="margin: 5px 0; color: #7f1d1d; font-size: 14px;">Heure de départ: ${formatTime(data.checkOutTime)}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #ef4444;">Informations importantes</h3>
        <p>Veuillez vous assurer de libérer le bien avant <strong>${formatTime(data.checkOutTime)}</strong> aujourd'hui.</p>
        <p>Merci de laisser le bien dans l'état où vous l'avez trouvé.</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations du propriétaire</h3>
        <p><strong>Nom:</strong> ${data.ownerName}</p>
        <p><strong>Contact:</strong><br>${contactInfo}</p>
      </div>

      <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter ${data.ownerName} aux coordonnées indiquées ci-dessus.</p>
      <p>Nous espérons que votre séjour s'est bien passé !</p>
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
 * Construit l'email texte pour le client - réservation qui se termine aujourd'hui
 */
function buildGuestEndingTodayEmailText(data: {
  guestName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  checkOutTime: string;
  endDate: string;
}): string {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '11:00';
    return timeStr.substring(0, 5);
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  return `Bonjour ${data.guestName},

Nous vous rappelons que votre réservation se termine aujourd'hui.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}

DATE DE DÉPART:
- Date: ${formatDate(data.endDate)}
- Heure de départ: ${formatTime(data.checkOutTime)}

Veuillez vous assurer de libérer le bien avant ${formatTime(data.checkOutTime)} aujourd'hui.
Merci de laisser le bien dans l'état où vous l'avez trouvé.

INFORMATIONS DU PROPRIÉTAIRE:
- Nom: ${data.ownerName}
- Email: ${data.ownerEmail || 'Non renseigné'}
${data.ownerPhone ? `- Téléphone: ${data.ownerPhone}` : ''}

Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter ${data.ownerName} aux coordonnées indiquées ci-dessus.

Nous espérons que votre séjour s'est bien passé !

Cordialement,
L'équipe Mestoits`;
}

/**
 * Construit l'email HTML pour le propriétaire - réservation qui se termine aujourd'hui
 */
function buildOwnerEndingTodayEmail(data: {
  ownerName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  endDate: string;
}): string {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const guestContact = [];
  if (data.guestEmail) guestContact.push(`Email: ${data.guestEmail}`);
  if (data.guestPhone) guestContact.push(`Téléphone: ${data.guestPhone}`);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
    .warning-box { background: #fef2f2; border: 2px solid #fecaca; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Réservation qui se termine aujourd'hui</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.ownerName}</strong>,</p>
      <p>Nous vous informons qu'une réservation de votre bien se termine <strong>aujourd'hui</strong>.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #991b1b; font-size: 18px; font-weight: bold;">Date de départ</p>
        <p style="margin: 10px 0; color: #dc2626; font-size: 24px; font-weight: bold;">${formatDate(data.endDate)}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #ef4444;">Détails de la réservation</h3>
        <p><strong>Client:</strong> ${data.guestName}</p>
        ${guestContact.length > 0 ? `<p><strong>Contact:</strong><br>${guestContact.join('<br>')}</p>` : ''}
        <p><strong>Date de départ:</strong> ${formatDate(data.endDate)}</p>
      </div>

      <p>Le client devrait libérer le bien aujourd'hui. Vous pouvez préparer l'état des lieux de sortie.</p>
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
 * Construit l'email texte pour le propriétaire - réservation qui se termine aujourd'hui
 */
function buildOwnerEndingTodayEmailText(data: {
  ownerName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  endDate: string;
}): string {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const guestContact = [];
  if (data.guestEmail) guestContact.push(`Email: ${data.guestEmail}`);
  if (data.guestPhone) guestContact.push(`Téléphone: ${data.guestPhone}`);

  return `Bonjour ${data.ownerName},

Nous vous informons qu'une réservation de votre bien se termine aujourd'hui.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}

DATE DE DÉPART:
- Date: ${formatDate(data.endDate)}

DÉTAILS DE LA RÉSERVATION:
- Client: ${data.guestName}
${guestContact.length > 0 ? `- Contact:\n  ${guestContact.join('\n  ')}` : ''}
- Date de départ: ${formatDate(data.endDate)}

Le client devrait libérer le bien aujourd'hui. Vous pouvez préparer l'état des lieux de sortie.

Cordialement,
L'équipe Mestoits`;
}
