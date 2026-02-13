import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase config manquante');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Email');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Méthode non autorisée' });
  }

  const adminEmail = req.headers['x-admin-email'] as string;
  if (!adminEmail) {
    return res.status(401).json({ success: false, error: 'Session admin requise' });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: admin } = await supabase.from('admins').select('id').eq('email', adminEmail).eq('is_active', true).single();
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Admin non authentifié' });
    }

    if (req.method === 'GET') {
      const { action, query } = req.query as { action?: string; query?: string };
      if (action === 'search' && query) {
        const trimmed = String(query).trim();
        const isUuid = UUID_REGEX.test(trimmed);
        const { data } = isUuid
          ? await supabase.from('users_2025_12_01_11_29').select('id, email, full_name').eq('id', trimmed).limit(1)
          : await supabase.from('users_2025_12_01_11_29').select('id, email, full_name').ilike('email', `%${trimmed}%`).limit(5);
        return res.status(200).json({ success: true, users: data || [] });
      }
      if (action === 'list') {
        const { data } = await supabase.from('user_affiliation_settings').select('id, user_id, duration_months, percentage');
        return res.status(200).json({ success: true, settings: data || [] });
      }
      if (action === 'partners-stats') {
        const { data: partners, error: partnersError } = await supabase.rpc('get_admin_affiliation_partners_stats');
        if (partnersError) {
          return res.status(500).json({ success: false, error: partnersError.message });
        }
        const { data: totalsData, error: totalsError } = await supabase.rpc('get_admin_affiliation_totals');
        if (totalsError) {
          return res.status(500).json({ success: false, error: totalsError.message });
        }
        const totals = Array.isArray(totalsData) && totalsData[0] ? totalsData[0] : null;
        return res.status(200).json({
          success: true,
          partners: partners || [],
          totals: totals || {
            total_partners: 0,
            total_affiliates: 0,
            total_commissions: 0,
            total_platform_revenue: 0,
          },
        });
      }
    }

    if (req.method === 'POST') {
      const { action, user_id, duration_months, percentage, id } = req.body || {};

      if (action === 'add' && user_id) {
        const { error } = await supabase.from('user_affiliation_settings').upsert(
          { user_id, duration_months: duration_months ?? null, percentage: percentage ?? null, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.status(200).json({ success: true });
      }

      if (action === 'update' && id !== undefined) {
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (duration_months !== undefined) updates.duration_months = duration_months;
        if (percentage !== undefined) updates.percentage = percentage;
        const { error } = await supabase.from('user_affiliation_settings').update(updates).eq('id', id);
        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.status(200).json({ success: true });
      }

      if (action === 'remove' && id) {
        const { error } = await supabase.from('user_affiliation_settings').delete().eq('id', id);
        if (error) return res.status(400).json({ success: false, error: error.message });
        return res.status(200).json({ success: true });
      }
    }

    return res.status(400).json({ success: false, error: 'Paramètres invalides' });
  } catch (e: unknown) {
    console.error('affiliation-settings error:', e);
    return res.status(500).json({ success: false, error: (e as Error).message });
  }
}
