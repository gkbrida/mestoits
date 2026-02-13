import { supabase } from '../lib/supabase';

export interface AffiliationSettings {
  durationMonths: number;
  percentage: number;
  isDefault: boolean;
}

export interface AffiliationRevenueRow {
  affiliate_id: string;
  affiliate_name: string;
  affiliate_created_at: string;
  year_month: string;
  subscription_revenue: number;
  commission_revenue: number;
  total_revenue: number;
  affiliate_percentage: number;
  affiliate_earnings: number;
}

function parseSettingValue(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Récupère les paramètres d'affiliation effectifs pour un parrain
 * Depuis platform_settings et user_affiliation_settings (pas de valeurs en dur)
 */
export async function getAffiliationSettings(userId: string): Promise<AffiliationSettings> {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_affiliation_effective_settings', {
      referrer_uuid: userId,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const row = rpcData[0] as { duration_months?: number; percentage?: number };
      return {
        durationMonths: Number(row?.duration_months ?? 0) || 0,
        percentage: Number(row?.percentage ?? 0) || 0,
        isDefault: true,
      };
    }

    const { data: platformData } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['affiliation_default_duration_months', 'affiliation_default_percentage']);

    const settingsMap = new Map<string, number>();
    (platformData || []).forEach((item: { key: string; value: unknown }) => {
      settingsMap.set(item.key, parseSettingValue(item.value));
    });

    let durationMonths = settingsMap.get('affiliation_default_duration_months') ?? 0;
    let percentage = settingsMap.get('affiliation_default_percentage') ?? 0;

    const { data: userData } = await supabase
      .from('user_affiliation_settings')
      .select('duration_months, percentage')
      .eq('user_id', userId)
      .maybeSingle();

    if (userData) {
      const u = userData as { duration_months?: number | null; percentage?: number | null };
      if (u.duration_months != null) durationMonths = parseSettingValue(u.duration_months);
      if (u.percentage != null) percentage = parseSettingValue(u.percentage);
    }

    return {
      durationMonths,
      percentage,
      isDefault: !userData,
    };
  } catch (e) {
    console.error('Erreur getAffiliationSettings:', e);
    const { data } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['affiliation_default_duration_months', 'affiliation_default_percentage']);
    const m = new Map<string, number>();
    (data || []).forEach((item: { key: string; value: unknown }) => {
      m.set(item.key, parseSettingValue(item.value));
    });
    return {
      durationMonths: m.get('affiliation_default_duration_months') ?? 0,
      percentage: m.get('affiliation_default_percentage') ?? 0,
      isDefault: true,
    };
  }
}

/**
 * Récupère les revenus par affilié et par mois pour un parrain
 */
export async function getAffiliationRevenuesByAffiliate(
  referrerId: string,
  year?: number,
  month?: number
): Promise<AffiliationRevenueRow[]> {
  const params: Record<string, unknown> = { referrer_uuid: referrerId };
  if (year != null && month != null) {
    params.year_val = year;
    params.month_val = month;
  } else {
    params.year_val = null;
    params.month_val = null;
  }

  const { data, error } = await supabase.rpc('get_affiliation_revenues_by_affiliate', params);

  if (error) {
    console.error('Erreur lors du chargement des revenus d\'affiliation:', error);
    throw new Error(error.message || 'Erreur RPC affiliation');
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    affiliate_id: row.affiliate_id as string,
    affiliate_name: (row.affiliate_name as string) || 'Utilisateur',
    affiliate_created_at: row.affiliate_created_at as string,
    year_month: row.year_month as string,
    subscription_revenue: Number(row.subscription_revenue ?? 0),
    commission_revenue: Number(row.commission_revenue ?? 0),
    total_revenue: Number(row.total_revenue ?? 0),
    affiliate_percentage: Number(row.affiliate_percentage ?? 0),
    affiliate_earnings: Number(row.affiliate_earnings ?? 0),
  }));
}
