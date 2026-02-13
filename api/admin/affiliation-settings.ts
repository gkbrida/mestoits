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
        let partners: unknown[] = [];
        let totals: { total_partners: number; total_affiliates: number; total_commissions: number; total_platform_revenue: number } = {
          total_partners: 0, total_affiliates: 0, total_commissions: 0, total_platform_revenue: 0,
        };

        const { data: partnersData, error: partnersError } = await supabase.rpc('get_admin_affiliation_partners_stats');
        const { data: totalsData, error: totalsError } = await supabase.rpc('get_admin_affiliation_totals');

        if (partnersError || totalsError) {
          try {
            console.warn('RPC partners-stats/totals échoué, fallback requêtes directes:', partnersError?.message || totalsError?.message);
            const { data: signedContracts, error: contractsErr } = await supabase
              .from('partnership_contracts')
              .select('user_id')
              .not('signed_at', 'is', null);
            if (contractsErr) {
              console.warn('partnership_contracts inaccessible:', contractsErr.message);
            }
          const partnerIds = (signedContracts || []).map((r: { user_id: string }) => r.user_id);
          const totalPartners = partnerIds.length;

          if (totalPartners > 0) {
            const { count: affiliatesCount } = await supabase
              .from('users_2025_12_01_11_29')
              .select('*', { count: 'exact', head: true })
              .in('affiliated_by', partnerIds);

            const { data: partnerUsers } = await supabase
              .from('users_2025_12_01_11_29')
              .select('id, full_name, email')
              .in('id', partnerIds);

            let totalCommissions = 0;
            let totalPlatformRevenue = 0;
            for (const pid of partnerIds) {
              const { data: rev } = await supabase.rpc('get_affiliation_revenues_by_affiliate', {
                referrer_uuid: pid,
                year_val: null,
                month_val: null,
              });
              if (Array.isArray(rev)) {
                for (const row of rev as { affiliate_earnings?: number; total_revenue?: number }[]) {
                  totalCommissions += Number(row?.affiliate_earnings ?? 0);
                  totalPlatformRevenue += Number(row?.total_revenue ?? 0);
                }
              }
            }

            for (const u of partnerUsers || []) {
              const { count: nbAff } = await supabase
                .from('users_2025_12_01_11_29')
                .select('*', { count: 'exact', head: true })
                .eq('affiliated_by', u.id);
              const { data: rev } = await supabase.rpc('get_affiliation_revenues_by_affiliate', {
                referrer_uuid: u.id,
                year_val: null,
                month_val: null,
              });
              let tcomm = 0;
              let trev = 0;
              if (Array.isArray(rev)) {
                for (const row of rev as { affiliate_earnings?: number; total_revenue?: number }[]) {
                  tcomm += Number(row?.affiliate_earnings ?? 0);
                  trev += Number(row?.total_revenue ?? 0);
                }
              }
              partners.push({
                partner_id: u.id,
                partner_name: u.full_name || '—',
                partner_email: u.email || '—',
                nb_affiliates: nbAff ?? 0,
                total_commissions: tcomm,
                total_platform_revenue: trev,
              });
            }
            totals = {
              total_partners: totalPartners,
              total_affiliates: affiliatesCount ?? 0,
              total_commissions: totalCommissions,
              total_platform_revenue: totalPlatformRevenue,
            };
          } else {
            totals = { total_partners: 0, total_affiliates: 0, total_commissions: 0, total_platform_revenue: 0 };
          }
          } catch (fallbackErr) {
            console.error('Fallback partners-stats erreur:', fallbackErr);
          }
        } else {
          partners = partnersData || [];
          if (Array.isArray(totalsData) && totalsData[0]) {
            const t = totalsData[0] as Record<string, unknown>;
            totals = {
              total_partners: Number(t?.total_partners ?? 0),
              total_affiliates: Number(t?.total_affiliates ?? 0),
              total_commissions: Number(t?.total_commissions ?? 0),
              total_platform_revenue: Number(t?.total_platform_revenue ?? 0),
            };
          }
        }
        return res.status(200).json({ success: true, partners, totals });
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
