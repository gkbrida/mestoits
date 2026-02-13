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

/**
 * Récupère les paramètres d'affiliation effectifs pour un parrain
 */
export async function getAffiliationSettings(userId: string): Promise<AffiliationSettings> {
  try {
    const { data, error } = await supabase.rpc('get_affiliation_effective_settings', {
      referrer_uuid: userId,
    });

    if (error || !data || data.length === 0) {
      return { durationMonths: 12, percentage: 10, isDefault: true };
    }

    const row = data[0] as { duration_months?: number; percentage?: number };
    return {
      durationMonths: Number(row?.duration_months ?? 12),
      percentage: Number(row?.percentage ?? 10),
      isDefault: true,
    };
  } catch {
    return { durationMonths: 12, percentage: 10, isDefault: true };
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
    return [];
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
