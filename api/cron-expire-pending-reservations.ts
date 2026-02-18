import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron job pour supprimer les réservations temporaires expirées (> 15 min)
 * Libère les plages de dates pour d'autres clients
 *
 * Configuration dans vercel.json - exécution via cron-temps-reel toutes les 5 min.
 */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
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
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Configuration manquante' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: expiredReservations, error: fetchError } = await supabase
      .from('reservations_temp')
      .select('id, guest_email, start_date, end_date, created_at')
      .lt('created_at', fifteenMinutesAgo);

    if (fetchError) {
      console.error('Erreur fetch réservations_temp expirées:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!expiredReservations || expiredReservations.length === 0) {
      return res.status(200).json({ expired: 0, message: 'Aucune réservation temporaire à expirer' });
    }

    const ids = expiredReservations.map((r: any) => r.id);

    const { error: deleteError } = await supabase
      .from('reservations_temp')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('Erreur suppression réservations expirées:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    console.log(`✅ ${ids.length} réservation(s) expirée(s) supprimée(s)`);
    return res.status(200).json({ expired: ids.length });
  } catch (error: any) {
    console.error('Erreur cron-expire-pending-reservations:', error);
    return res.status(500).json({ error: error?.message || 'Erreur inconnue' });
  }
}
