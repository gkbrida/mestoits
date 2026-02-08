import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

/**
 * Cron job pour envoyer des rappels de paiement échelonné
 * S'exécute quotidiennement et envoie des emails aux payeurs et créateurs
 * 
 * Configuration dans vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron-installment-payment-reminder",
 *     "schedule": "35 16 * * *" // Tous les jours à 16h35 UTC (17h35 heure de Paris en hiver, 18h35 en été)
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
    const dateIn10Days = new Date(today);
    dateIn10Days.setDate(today.getDate() + 10);
    
    const dateIn5Days = new Date(today);
    dateIn5Days.setDate(today.getDate() + 5);
    
    const dateToday = new Date(today); // Jour J
    
    const dateYesterday = new Date(today);
    dateYesterday.setDate(today.getDate() - 1); // J-1 (pour vérifier les impayés)

    console.log(`📅 Recherche des paiements échelonnés pour les dates:`);
    console.log(`   - 10 jours avant: ${dateIn10Days.toISOString().split('T')[0]}`);
    console.log(`   - 5 jours avant: ${dateIn5Days.toISOString().split('T')[0]}`);
    console.log(`   - Jour J: ${dateToday.toISOString().split('T')[0]}`);
    console.log(`   - J+1 (impayés): ${dateYesterday.toISOString().split('T')[0]}`);

    // Récupérer tous les plans de paiement échelonnés actifs
    const { data: activePlans, error: plansError } = await supabase
      .from('installment_plans')
      .select('id, property_id, owner_id, total_amount, installment_amount, frequency, payment_due_day, payer_email, payer_first_name, payer_last_name, payer_phone, status')
      .eq('status', 'active');

    if (plansError) {
      console.error('❌ Erreur lors du chargement des plans:', plansError);
      return res.status(500).json({ error: 'Erreur lors du chargement des plans' });
    }

    if (!activePlans || activePlans.length === 0) {
      console.log('✅ Aucun plan de paiement échelonné actif');
      return res.json({ 
        success: true, 
        message: 'Aucun plan à traiter',
        processed: 0 
      });
    }

    console.log(`📋 ${activePlans.length} plan(s) actif(s) trouvé(s)`);

    // Récupérer toutes les échéances en attente pour ces plans
    const planIds = activePlans.map(p => p.id);
    const { data: allPayments, error: paymentsError } = await supabase
      .from('installment_payments')
      .select('id, installment_plan_id, installment_number, due_date, amount, status')
      .in('installment_plan_id', planIds)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (paymentsError) {
      console.error('❌ Erreur lors du chargement des échéances:', paymentsError);
      return res.status(500).json({ error: 'Erreur lors du chargement des échéances' });
    }

    if (!allPayments || allPayments.length === 0) {
      console.log('✅ Aucune échéance en attente');
      return res.json({ 
        success: true, 
        message: 'Aucune échéance à traiter',
        processed: 0 
      });
    }

    // Catégoriser les échéances selon les dates
    const payments10DaysBefore: any[] = [];
    const payments5DaysBefore: any[] = [];
    const paymentsToday: any[] = [];
    const paymentsOverdue: any[] = []; // J+1 impayés

    const dateIn10DaysStr = dateIn10Days.toISOString().split('T')[0];
    const dateIn5DaysStr = dateIn5Days.toISOString().split('T')[0];
    const dateTodayStr = dateToday.toISOString().split('T')[0];
    const dateYesterdayStr = dateYesterday.toISOString().split('T')[0];

    for (const payment of allPayments) {
      const dueDateStr = payment.due_date;

      if (dueDateStr === dateIn10DaysStr) {
        payments10DaysBefore.push(payment);
      } else if (dueDateStr === dateIn5DaysStr) {
        payments5DaysBefore.push(payment);
      } else if (dueDateStr === dateTodayStr) {
        paymentsToday.push(payment);
      } else if (dueDateStr === dateYesterdayStr) {
        // Vérifier que le paiement n'est toujours pas payé
        paymentsOverdue.push(payment);
      }
    }

    console.log(`📧 Échéances à traiter:`);
    console.log(`   - 10 jours avant: ${payments10DaysBefore.length}`);
    console.log(`   - 5 jours avant: ${payments5DaysBefore.length}`);
    console.log(`   - Jour J: ${paymentsToday.length}`);
    console.log(`   - J+1 impayés: ${paymentsOverdue.length}`);

    const totalPayments = payments10DaysBefore.length + payments5DaysBefore.length + paymentsToday.length + paymentsOverdue.length;
    
    if (totalPayments === 0) {
      return res.json({ 
        success: true, 
        message: 'Aucune échéance à notifier pour aujourd\'hui',
        processed: 0 
      });
    }

    // Créer un map pour accéder rapidement aux plans
    const plansMap = new Map(activePlans.map(p => [p.id, p]));

    // Charger les informations des propriétés et propriétaires
    const propertyIds = [...new Set(activePlans.map(p => p.property_id).filter(Boolean))];
    const ownerIds = [...new Set(activePlans.map(p => p.owner_id).filter(Boolean))];

    const [propertiesResult, ownersResult] = await Promise.all([
      propertyIds.length > 0
        ? supabase
            .from('properties_02')
            .select('id, title, address, city, surface_area, rooms')
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
    // Note: Pour les paiements échelonnés, les échéances sont déjà créées lors de la création du plan
    // donc pas besoin de créer une "quittance" supplémentaire
    const [result10Days, result5Days, resultToday, resultOverdue] = await Promise.all([
      processPayerReminders(payments10DaysBefore, plansMap, propertiesMap, ownersMap, transporter, 10),
      processPayerReminders(payments5DaysBefore, plansMap, propertiesMap, ownersMap, transporter, 5),
      processPayerReminders(paymentsToday, plansMap, propertiesMap, ownersMap, transporter, 0),
      processOwnerNotifications(paymentsOverdue, plansMap, propertiesMap, ownersMap, transporter)
    ]);

    const totalProcessed = result10Days + result5Days + resultToday + resultOverdue;

    return res.json({
      success: true,
      message: 'Rappels de paiement échelonné traités',
      processed: totalProcessed,
      details: {
        reminders10Days: result10Days,
        reminders5Days: result5Days,
        remindersToday: resultToday,
        overdueNotifications: resultOverdue
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
 * Traite les rappels pour les payeurs
 */
async function processPayerReminders(
  payments: any[],
  plansMap: Map<string, any>,
  propertiesMap: Map<string, any>,
  ownersMap: Map<string, any>,
  transporter: nodemailer.Transporter,
  daysUntilDue: number
): Promise<number> {
  let processed = 0;

  for (const payment of payments) {
    try {
      const plan = plansMap.get(payment.installment_plan_id);
      if (!plan || !plan.payer_email) {
        console.warn(`⚠️ Plan introuvable ou email payeur manquant pour l'échéance ${payment.id}`);
        continue;
      }

      // Vérifier que le paiement n'est pas déjà payé (double vérification)
      const { data: currentPayment } = await createClient(
        process.env.VITE_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
        .from('installment_payments')
        .select('status')
        .eq('id', payment.id)
        .single();

      if (currentPayment?.status === 'paid') {
        console.log(`⏭️ Paiement ${payment.id} déjà payé, skip`);
        continue;
      }

      const property = propertiesMap.get(plan.property_id);
      const owner = ownersMap.get(plan.owner_id);

      const payerName = `${plan.payer_first_name || ''} ${plan.payer_last_name || ''}`.trim() || 'Payeur';
      const propertyTitle = property?.title || 'Bien immobilier';
      const propertyAddress = property?.address || '';
      const propertyCity = property?.city || '';
      const ownerName = owner?.full_name || 'Le créateur';
      const ownerEmail = owner?.email || '';
      const ownerPhone = owner?.phone || '';

      // Construire l'email
      const subject = daysUntilDue === 10
        ? `Rappel: Échéance de paiement dans 10 jours - ${propertyTitle}`
        : daysUntilDue === 5
        ? `Rappel: Échéance de paiement dans 5 jours - ${propertyTitle}`
        : `Rappel: Échéance de paiement aujourd'hui - ${propertyTitle}`;

      const emailHtml = buildPayerReminderEmail({
        payerName,
        ownerName,
        ownerEmail,
        ownerPhone,
        propertyTitle,
        propertyAddress,
        propertyCity,
        installmentAmount: parseFloat(payment.amount),
        installmentNumber: payment.installment_number,
        dueDate: payment.due_date,
        daysUntilDue,
        totalAmount: parseFloat(plan.total_amount),
        numberOfInstallments: plan.number_of_installments
      });

      const emailText = buildPayerReminderEmailText({
        payerName,
        ownerName,
        ownerEmail,
        ownerPhone,
        propertyTitle,
        propertyAddress,
        propertyCity,
        installmentAmount: parseFloat(payment.amount),
        installmentNumber: payment.installment_number,
        dueDate: payment.due_date,
        daysUntilDue,
        totalAmount: parseFloat(plan.total_amount),
        numberOfInstallments: plan.number_of_installments
      });

      // Envoyer l'email
      await transporter.sendMail({
        from: `"Mestoits" <${process.env.ZOHO_USER}>`,
        to: plan.payer_email,
        subject,
        html: emailHtml,
        text: emailText,
      });

      console.log(`✅ Email envoyé au payeur pour l'échéance ${payment.id} (${daysUntilDue} jours)`);
      processed++;
    } catch (error: any) {
      console.error(`❌ Erreur lors du traitement de l'échéance ${payment.id}:`, error);
    }
  }

  return processed;
}

/**
 * Traite les notifications pour les créateurs (propriétaires) concernant les paiements impayés
 */
async function processOwnerNotifications(
  payments: any[],
  plansMap: Map<string, any>,
  propertiesMap: Map<string, any>,
  ownersMap: Map<string, any>,
  transporter: nodemailer.Transporter
): Promise<number> {
  let processed = 0;

  for (const payment of payments) {
    try {
      const plan = plansMap.get(payment.installment_plan_id);
      if (!plan) {
        console.warn(`⚠️ Plan introuvable pour l'échéance ${payment.id}`);
        continue;
      }

      // Vérifier que le paiement n'est toujours pas payé
      const { data: currentPayment } = await createClient(
        process.env.VITE_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
        .from('installment_payments')
        .select('status')
        .eq('id', payment.id)
        .single();

      if (currentPayment?.status === 'paid') {
        console.log(`⏭️ Paiement ${payment.id} maintenant payé, skip`);
        continue;
      }

      const property = propertiesMap.get(plan.property_id);
      const owner = ownersMap.get(plan.owner_id);

      if (!owner || !owner.email) {
        console.warn(`⚠️ Propriétaire introuvable ou email manquant pour le plan ${plan.id}`);
        continue;
      }

      const payerName = `${plan.payer_first_name || ''} ${plan.payer_last_name || ''}`.trim() || 'Payeur';
      const propertyTitle = property?.title || 'Bien immobilier';
      const propertyAddress = property?.address || '';
      const propertyCity = property?.city || '';

      // Construire l'email
      const emailHtml = buildOverduePaymentEmailToOwner({
        ownerName: owner.full_name || 'Propriétaire',
        payerName,
        payerEmail: plan.payer_email || '',
        payerPhone: plan.payer_phone || '',
        propertyTitle,
        propertyAddress,
        propertyCity,
        installmentAmount: parseFloat(payment.amount),
        installmentNumber: payment.installment_number,
        dueDate: payment.due_date
      });

      const emailText = buildOverduePaymentEmailToOwnerText({
        ownerName: owner.full_name || 'Propriétaire',
        payerName,
        payerEmail: plan.payer_email || '',
        payerPhone: plan.payer_phone || '',
        propertyTitle,
        propertyAddress,
        propertyCity,
        installmentAmount: parseFloat(payment.amount),
        installmentNumber: payment.installment_number,
        dueDate: payment.due_date
      });

      // Envoyer l'email
      const zohoUser = process.env.ZOHO_USER || 'contact@mestoits.com';
      await transporter.sendMail({
        from: `"Mestoits" <${zohoUser}>`,
        to: owner.email,
        subject: `Paiement échelonné impayé - ${propertyTitle}`,
        html: emailHtml,
        text: emailText,
      });

      console.log(`✅ Email envoyé au créateur pour l'échéance impayée ${payment.id}`);
      processed++;
    } catch (error: any) {
      console.error(`❌ Erreur lors du traitement de l'échéance impayée ${payment.id}:`, error);
    }
  }

  return processed;
}

/**
 * Construit l'email HTML de rappel pour le payeur
 */
function buildPayerReminderEmail(data: {
  payerName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  installmentAmount: number;
  installmentNumber: number;
  dueDate: string;
  daysUntilDue: number;
  totalAmount: number;
  numberOfInstallments: number;
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

  const daysText = data.daysUntilDue === 0
    ? 'aujourd\'hui'
    : data.daysUntilDue === 1
    ? 'demain'
    : `dans ${data.daysUntilDue} jours`;

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
    .amount-box { background: #f0fdfa; border: 2px solid #14b8a6; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .amount-box .amount { font-size: 32px; font-weight: bold; color: #14b8a6; margin: 10px 0; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Rappel de paiement échelonné</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.payerName}</strong>,</p>
      <p>Nous vous rappelons qu'une échéance de votre plan de paiement échelonné arrive ${daysText}.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Détails de l'échéance</h3>
        <p><strong>Échéance n°:</strong> ${data.installmentNumber} / ${data.numberOfInstallments}</p>
        <p><strong>Date d'échéance:</strong> ${formatDate(data.dueDate)}</p>
      </div>

      <div class="amount-box">
        <p style="margin: 0; color: #374151; font-size: 14px;">Montant à payer</p>
        <div class="amount">${formatPrice(data.installmentAmount)}</div>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations du créateur</h3>
        <p><strong>Nom:</strong> ${data.ownerName}</p>
        <p><strong>Contact:</strong><br>${contactInfo}</p>
      </div>

      ${data.daysUntilDue === 0 ? `
      <div class="warning-box">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Important :</strong> Cette échéance est due aujourd'hui. Veuillez effectuer le paiement dès que possible.
        </p>
      </div>
      ` : ''}

      <p>Veuillez effectuer le paiement avant la date d'échéance pour éviter tout retard.</p>
      <p>Si vous avez des questions, n'hésitez pas à contacter ${data.ownerName} aux coordonnées indiquées ci-dessus.</p>
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
 * Construit l'email texte de rappel pour le payeur
 */
function buildPayerReminderEmailText(data: {
  payerName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  installmentAmount: number;
  installmentNumber: number;
  dueDate: string;
  daysUntilDue: number;
  totalAmount: number;
  numberOfInstallments: number;
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

  const daysText = data.daysUntilDue === 0
    ? 'aujourd\'hui'
    : data.daysUntilDue === 1
    ? 'demain'
    : `dans ${data.daysUntilDue} jours`;

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  return `Bonjour ${data.payerName},

Nous vous rappelons qu'une échéance de votre plan de paiement échelonné arrive ${daysText}.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}

DÉTAILS DE L'ÉCHÉANCE:
- Échéance n°: ${data.installmentNumber} / ${data.numberOfInstallments}
- Date d'échéance: ${formatDate(data.dueDate)}
- Montant à payer: ${formatPrice(data.installmentAmount)}

INFORMATIONS DU CRÉATEUR:
- Nom: ${data.ownerName}
- Email: ${data.ownerEmail || 'Non renseigné'}
${data.ownerPhone ? `- Téléphone: ${data.ownerPhone}` : ''}

${data.daysUntilDue === 0 ? '⚠️ Important : Cette échéance est due aujourd\'hui. Veuillez effectuer le paiement dès que possible.\n\n' : ''}Veuillez effectuer le paiement avant la date d'échéance pour éviter tout retard.

Si vous avez des questions, n'hésitez pas à contacter ${data.ownerName} aux coordonnées indiquées ci-dessus.

Cordialement,
L'équipe Mestoits`;
}

/**
 * Construit l'email HTML pour notifier le créateur d'un paiement impayé
 */
function buildOverduePaymentEmailToOwner(data: {
  ownerName: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  installmentAmount: number;
  installmentNumber: number;
  dueDate: string;
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

  const payerContact = [];
  if (data.payerEmail) payerContact.push(`Email: ${data.payerEmail}`);
  if (data.payerPhone) payerContact.push(`Téléphone: ${data.payerPhone}`);

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
    .warning-box .amount { font-size: 32px; font-weight: bold; color: #dc2626; margin: 10px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Paiement échelonné impayé</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.ownerName}</strong>,</p>
      <p>Nous vous informons qu'une échéance de paiement échelonné n'a pas été payée à la date d'échéance.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #ef4444;">Détails de l'échéance impayée</h3>
        <p><strong>Échéance n°:</strong> ${data.installmentNumber}</p>
        <p><strong>Date d'échéance:</strong> ${formatDate(data.dueDate)}</p>
        <p><strong>Payeur:</strong> ${data.payerName}</p>
        ${payerContact.length > 0 ? `<p><strong>Contact du payeur:</strong><br>${payerContact.join('<br>')}</p>` : ''}
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #991b1b; font-size: 14px;">Montant impayé</p>
        <div class="amount">${formatPrice(data.installmentAmount)}</div>
      </div>

      <p>Veuillez contacter le payeur pour régulariser cette situation.</p>
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
 * Construit l'email texte pour notifier le créateur d'un paiement impayé
 */
function buildOverduePaymentEmailToOwnerText(data: {
  ownerName: string;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  installmentAmount: number;
  installmentNumber: number;
  dueDate: string;
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

  const payerContact = [];
  if (data.payerEmail) payerContact.push(`Email: ${data.payerEmail}`);
  if (data.payerPhone) payerContact.push(`Téléphone: ${data.payerPhone}`);

  return `Bonjour ${data.ownerName},

Nous vous informons qu'une échéance de paiement échelonné n'a pas été payée à la date d'échéance.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}

DÉTAILS DE L'ÉCHÉANCE IMPAYÉE:
- Échéance n°: ${data.installmentNumber}
- Date d'échéance: ${formatDate(data.dueDate)}
- Payeur: ${data.payerName}
${payerContact.length > 0 ? `- Contact du payeur:\n  ${payerContact.join('\n  ')}` : ''}
- Montant impayé: ${formatPrice(data.installmentAmount)}

Veuillez contacter le payeur pour régulariser cette situation.

Cordialement,
L'équipe Mestoits`;
}
