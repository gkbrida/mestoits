import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Cron temps réel - S'exécute toutes les 5 minutes
 * Regroupe tout ce qui doit s'exécuter plusieurs fois par heure :
 * - Expiration des réservations en attente de paiement (> 15 min)
 */

const ENDPOINTS = ['/api/cron-expire-pending-reservations'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET;
  const userAgent = req.headers?.['user-agent'] || '';
  const xVercelSignature = req.headers?.['x-vercel-signature'];
  const isVercelCron = userAgent.includes('vercel-cron') || xVercelSignature !== undefined;

  if (cronSecret) {
    const authHeader = req.headers?.authorization;
    if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (!isVercelCron) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.VERCEL_BRANCH_URL || 'http://localhost:3000';
  const headers: Record<string, string> = {};
  if (cronSecret) headers['Authorization'] = `Bearer ${cronSecret}`;

  const results: Record<string, { status: number; data?: unknown }> = {};

  for (const path of ENDPOINTS) {
    try {
      const resp = await fetch(`${baseUrl}${path}`, { headers });
      const data = await resp.json().catch(() => ({}));
      results[path] = { status: resp.status, data };
      if (resp.status !== 200) {
        console.error(`❌ ${path}: ${resp.status}`, data);
      } else {
        console.log(`✅ ${path}: OK`, data);
      }
    } catch (err: unknown) {
      console.error(`❌ ${path}:`, err);
      results[path] = { status: 500, data: { error: (err as Error)?.message } };
    }
  }

  const allOk = Object.values(results).every((r) => r.status === 200);
  return res.status(allOk ? 200 : 500).json({ results });
}
