import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Cron job pour envoyer un email 3 jours avant la fin d'un abonnement payant
 * Rappelle au client de renouveler et propose le lien vers la page abonnements
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

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
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (!isVercelCron) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Configuration manquante' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const dateStr = in3Days.toISOString().split('T')[0];

    const { data: subs, error } = await supabase
      .from('user_subscriptions')
      .select('id, user_id, plan_id, end_date')
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .eq('end_date', dateStr);

    if (error) {
      console.error('Erreur fetch abonnements:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!subs || subs.length === 0) {
      return res.status(200).json({ reminder: 0, message: 'Aucun abonnement à rappeler' });
    }

    const zohoUser = process.env.ZOHO_USER;
    const zohoPassword = process.env.ZOHO_PASSWORD;
    if (!zohoUser || !zohoPassword) {
      return res.status(500).json({ error: 'Configuration email manquante' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtppro.zoho.eu',
      port: 465,
      secure: true,
      auth: { user: zohoUser, pass: zohoPassword },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    const appUrl = process.env.VITE_APP_URL || 'https://mestoits.com';
    const renewUrl = `${appUrl}/abonnements`;

    const formatDate = (d: string) =>
      new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    let sent = 0;
    for (const sub of subs) {
      try {
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email')
          .eq('id', sub.user_id)
          .single();

        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('name, price')
          .eq('id', sub.plan_id)
          .single();

        if (!userData?.email || !planData) continue;

        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);color:white;padding:24px;text-align:center;border-radius:10px 10px 0 0;">
      <h1 style="margin:0;">Renouvellement d'abonnement</h1>
    </div>
    <div style="background:#f9fafb;padding:24px;border-radius:0 0 10px 10px;">
      <p>Bonjour <strong>${userData.full_name || 'Client'}</strong>,</p>
      <p>Votre abonnement <strong>${planData.name || 'Mestoits'}</strong> expire dans <strong>3 jours</strong>, le <strong>${formatDate(sub.end_date)}</strong>.</p>
      <p>Pour continuer à bénéficier de tous les avantages de votre plan sans interruption, renouvelez dès maintenant.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${renewUrl}" style="display:inline-block;padding:12px 24px;background:#f97316;color:white;text-decoration:none;font-weight:bold;border-radius:8px;">Payer le mois suivant</a>
      </div>
      <p style="color:#6b7280;font-size:14px;">Si vous ne renouvelez pas, votre abonnement prendra fin à la date indiquée.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
  </div>
</body>
</html>`;

        await transporter.sendMail({
          from: `"Mestoits" <${zohoUser}>`,
          to: userData.email,
          subject: `Votre abonnement expire dans 3 jours - ${planData.name || 'Mestoits'}`,
          html,
        });

        sent++;
        console.log(`✅ Rappel envoyé à ${userData.email} pour abonnement ${sub.id}`);
      } catch (err: any) {
        console.error(`Erreur envoi rappel abonnement ${sub.id}:`, err);
      }
    }

    return res.status(200).json({ reminder: sent, total: subs.length });
  } catch (err: any) {
    console.error('Erreur cron rappel abonnement:', err);
    return res.status(500).json({ error: err?.message || 'Erreur inconnue' });
  }
}
