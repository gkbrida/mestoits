import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

interface DefaultSettings {
  durationMonths: number;
  percentage: number;
}

interface UserAffiliationSetting {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  duration_months: number | null;
  percentage: number | null;
}

interface PartnerStats {
  partner_id: string;
  partner_name: string;
  partner_email: string;
  nb_affiliates: number;
  total_commissions: number;
  total_platform_revenue: number;
}

interface AffiliationTotals {
  total_partners: number;
  total_affiliates: number;
  total_commissions: number;
  total_platform_revenue: number;
}

// Toujours utiliser l'API du même domaine (Vercel/api ou proxy dev) - pas le serveur email
const getAdminApiUrl = () => (typeof window !== 'undefined' ? window.location.origin : '') + '/api';

export default function AffiliationTab() {
  const { admin } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<DefaultSettings>({ durationMonths: 12, percentage: 10 });
  const [userSettings, setUserSettings] = useState<UserAffiliationSetting[]>([]);
  const [searchUserId, setSearchUserId] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; full_name: string }[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [partnersStats, setPartnersStats] = useState<PartnerStats[]>([]);
  const [affiliationTotals, setAffiliationTotals] = useState<AffiliationTotals | null>(null);
  const [partnersPage, setPartnersPage] = useState(1);
  const PARTNERS_PER_PAGE = 10;

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [defRes, userRes] = await Promise.all([
        supabase.from('platform_settings').select('key, value').in('key', [
          'affiliation_default_duration_months',
          'affiliation_default_percentage',
        ]),
        supabase
          .from('user_affiliation_settings')
          .select(`
            id,
            user_id,
            duration_months,
            percentage
          `),
      ]);

      const newDefaults: DefaultSettings = { durationMonths: 12, percentage: 10 };
      defRes.data?.forEach((item: { key: string; value: unknown }) => {
        const v = item.value;
        const num = typeof v === 'number' ? v : parseFloat(String(v));
        if (item.key === 'affiliation_default_duration_months') newDefaults.durationMonths = Number.isFinite(num) ? num : 12;
        if (item.key === 'affiliation_default_percentage') newDefaults.percentage = Number.isFinite(num) ? num : 10;
      });
      setDefaults(newDefaults);

      const userIds = [...new Set((userRes.data || []).map((r: { user_id: string }) => r.user_id))];
      const usersMap = new Map<string, { email: string; full_name: string }>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('id, email, full_name')
          .in('id', userIds);
        (usersData || []).forEach((u: { id: string; email?: string; full_name?: string }) => {
          usersMap.set(u.id, { email: u.email || '—', full_name: u.full_name || '—' });
        });
      }
      const items: UserAffiliationSetting[] = (userRes.data || []).map((row: Record<string, unknown>) => {
        const u = usersMap.get(row.user_id as string);
        return {
          id: row.id as string,
          user_id: row.user_id as string,
          user_email: u?.email || '—',
          user_name: u?.full_name || '—',
          duration_months: row.duration_months as number | null,
          percentage: row.percentage as number | null,
        };
      });
      setUserSettings(items);

      if (admin?.email) {
        try {
          const statsRes = await fetch(
            `${getAdminApiUrl()}/admin/affiliation-settings?action=partners-stats`,
            { headers: { 'X-Admin-Email': admin.email } }
          );
          const statsJson = await statsRes.json();
          if (statsJson.success) {
            const rawPartners = statsJson.partners || [];
            const normalized = Array.isArray(rawPartners) ? rawPartners.map((p: Record<string, unknown>) => ({
              partner_id: p.partner_id ?? p.partnerId ?? '',
              partner_name: p.partner_name ?? p.partnerName ?? '—',
              partner_email: p.partner_email ?? p.partnerEmail ?? '—',
              nb_affiliates: Number(p.nb_affiliates ?? p.nbAffiliates ?? 0),
              total_commissions: Number(p.total_commissions ?? p.totalCommissions ?? 0),
              total_platform_revenue: Number(p.total_platform_revenue ?? p.totalPlatformRevenue ?? 0),
            })) : [];
            setPartnersStats(normalized);
            setPartnersPage(1);
            const t = statsJson.totals;
            setAffiliationTotals(t ? {
              total_partners: Number(t.total_partners ?? t.totalPartners ?? 0),
              total_affiliates: Number(t.total_affiliates ?? t.totalAffiliates ?? 0),
              total_commissions: Number(t.total_commissions ?? t.totalCommissions ?? 0),
              total_platform_revenue: Number(t.total_platform_revenue ?? t.totalPlatformRevenue ?? 0),
            } : null);
          }
        } catch (statsErr) {
          console.error('Erreur stats partenaires:', statsErr);
        }
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefaults = async () => {
    try {
      setSaving(true);
      for (const [key, value] of [
        ['affiliation_default_duration_months', defaults.durationMonths],
        ['affiliation_default_percentage', defaults.percentage],
      ] as const) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(
            { key, value: typeof value === 'number' ? value : Number(value) || 0, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          );
        if (error) throw error;
      }
      alert('Valeurs par défaut mises à jour');
    } catch (e: unknown) {
      console.error(e);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const searchUser = async () => {
    if (!searchUserId.trim() || !admin?.email) return;
    try {
      const res = await fetch(
        `${getAdminApiUrl()}/admin/affiliation-settings?action=search&query=${encodeURIComponent(searchUserId.trim())}`,
        { headers: { 'X-Admin-Email': admin.email } }
      );
      const json = await res.json();
      if (!json.success || !json.users?.length) {
        setSearchResults([]);
        return;
      }
      setSearchResults(json.users.map((u: { id: string; email?: string; full_name?: string }) => ({
        id: u.id,
        email: u.email || '—',
        full_name: u.full_name || '—'
      })));
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    }
  };

  const addUserSetting = async (user: { id: string; email: string; full_name: string }) => {
    if (!admin?.email) return;
    const exists = userSettings.some((s) => s.user_id === user.id);
    if (exists) {
      alert('Ce client a déjà des paramètres spécifiques');
      return;
    }
    try {
      const res = await fetch(`${getAdminApiUrl()}/admin/affiliation-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Email': admin.email },
        body: JSON.stringify({
          action: 'add',
          user_id: user.id,
          duration_months: defaults.durationMonths,
          percentage: defaults.percentage,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert('Erreur: ' + (json.error || 'Échec de l\'ajout'));
        return;
      }
      setSearchUserId('');
      setSearchResults([]);
      setAddingUser(false);
      load();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'ajout du client');
    }
  };

  const updateUserSetting = async (
    id: string,
    field: 'duration_months' | 'percentage',
    value: number | null
  ) => {
    if (!admin?.email) return;
    try {
      const res = await fetch(`${getAdminApiUrl()}/admin/affiliation-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Email': admin.email },
        body: JSON.stringify({ action: 'update', id, [field]: value }),
      });
      const json = await res.json();
      if (!json.success) alert('Erreur: ' + (json.error || 'Échec de la mise à jour'));
      else load();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour');
    }
  };

  const removeUserSetting = async (id: string) => {
    if (!confirm('Supprimer les paramètres spécifiques pour ce client ?') || !admin?.email) return;
    try {
      const res = await fetch(`${getAdminApiUrl()}/admin/affiliation-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Email': admin.email },
        body: JSON.stringify({ action: 'remove', id }),
      });
      const json = await res.json();
      if (!json.success) alert('Erreur: ' + (json.error || 'Échec de la suppression'));
      else load();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    );
  }

  const formatPrice = (n: number) => (n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion de l'affiliation</h2>
        <p className="text-gray-600">
          Configurez la durée et le pourcentage d'affiliation. Les valeurs par défaut s'appliquent aux clients sans
          paramètres spécifiques.
        </p>
      </div>

      {/* Statistiques partenaires et totaux */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Partenaires et statistiques</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
              <p className="text-sm text-teal-700 font-medium">Partenaires</p>
              <p className="text-2xl font-bold text-teal-900">{affiliationTotals?.total_partners ?? 0}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-blue-700 font-medium">Clients affiliés</p>
              <p className="text-2xl font-bold text-blue-900">{affiliationTotals?.total_affiliates ?? 0}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
              <p className="text-sm text-amber-700 font-medium">Commissions versées</p>
              <p className="text-2xl font-bold text-amber-900">{formatPrice(affiliationTotals?.total_commissions ?? 0)} F</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
              <p className="text-sm text-green-700 font-medium">Revenus plateforme (affiliés)</p>
              <p className="text-2xl font-bold text-green-900">{formatPrice(affiliationTotals?.total_platform_revenue ?? 0)} F</p>
            </div>
          </div>
        {partnersStats.length === 0 ? (
          <p className="text-gray-500 py-4">Aucun partenaire ayant signé le contrat pour le moment.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-3 font-semibold text-gray-700">Partenaire</th>
                    <th className="py-3 font-semibold text-gray-700">Email</th>
                    <th className="py-3 font-semibold text-gray-700 text-right">Nb affiliés</th>
                    <th className="py-3 font-semibold text-gray-700 text-right">Commissions versées</th>
                    <th className="py-3 font-semibold text-gray-700 text-right">Revenus plateforme</th>
                  </tr>
                </thead>
                <tbody>
                  {partnersStats
                    .slice((partnersPage - 1) * PARTNERS_PER_PAGE, partnersPage * PARTNERS_PER_PAGE)
                    .map((p) => (
                      <tr key={p.partner_id} className="border-b border-gray-100">
                        <td className="py-3 font-medium">{p.partner_name}</td>
                        <td className="py-3 text-gray-600">{p.partner_email}</td>
                        <td className="py-3 text-right">{p.nb_affiliates}</td>
                        <td className="py-3 text-right text-teal-600 font-medium">{formatPrice(p.total_commissions)} F</td>
                        <td className="py-3 text-right text-gray-600">{formatPrice(p.total_platform_revenue)} F</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {partnersStats.length > PARTNERS_PER_PAGE && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Page {partnersPage} sur {Math.ceil(partnersStats.length / PARTNERS_PER_PAGE)} ({partnersStats.length} partenaire{partnersStats.length > 1 ? 's' : ''})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPartnersPage((p) => Math.max(1, p - 1))}
                    disabled={partnersPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={() => setPartnersPage((p) => Math.min(Math.ceil(partnersStats.length / PARTNERS_PER_PAGE), p + 1))}
                    disabled={partnersPage >= Math.ceil(partnersStats.length / PARTNERS_PER_PAGE)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Valeurs par défaut */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Valeurs par défaut (tous les clients)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Durée (mois)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={defaults.durationMonths}
              onChange={(e) => setDefaults((d) => ({ ...d, durationMonths: parseInt(e.target.value, 10) || 12 }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pourcentage (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={defaults.percentage}
              onChange={(e) => setDefaults((d) => ({ ...d, percentage: parseFloat(e.target.value) || 10 }))}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            />
          </div>
        </div>
        <button
          onClick={handleSaveDefaults}
          disabled={saving}
          className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les valeurs par défaut'}
        </button>
      </div>

      {/* Paramètres par client */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres spécifiques par client</h3>
        <p className="text-sm text-gray-600 mb-4">
          Les clients listés ci-dessous ont des valeurs personnalisées. Les autres utilisent les valeurs par défaut.
        </p>

        {!addingUser ? (
          <button
            onClick={() => setAddingUser(true)}
            className="mb-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <i className="ri-add-line mr-2"></i>
            Ajouter un client
          </button>
        ) : (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher un client (email ou ID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchUserId}
                onChange={(e) => {
                  setSearchUserId(e.target.value);
                  setSearchResults([]);
                }}
                placeholder="email@exemple.com ou UUID"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2"
              />
              <button
                onClick={searchUser}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Rechercher
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <span>{u.full_name || '—'} ({u.email})</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addUserSetting(u)}
                        className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setSearchUserId('');
                    setSearchResults([]);
                    setAddingUser(false);
                  }}
                  className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}

        {userSettings.length === 0 ? (
          <p className="text-gray-500 py-4">Aucun client avec des paramètres spécifiques</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-3 font-semibold text-gray-700">Client</th>
                  <th className="py-3 font-semibold text-gray-700">Email</th>
                  <th className="py-3 font-semibold text-gray-700">Durée (mois)</th>
                  <th className="py-3 font-semibold text-gray-700">%</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {userSettings.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="py-3">{s.user_name}</td>
                    <td className="py-3">{s.user_email}</td>
                    <td className="py-3">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={s.duration_months ?? ''}
                        onChange={(e) =>
                          updateUserSetting(s.id, 'duration_months', e.target.value ? parseInt(e.target.value, 10) : null)
                        }
                        placeholder={String(defaults.durationMonths)}
                        className="w-20 rounded border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={s.percentage ?? ''}
                        onChange={(e) =>
                          updateUserSetting(s.id, 'percentage', e.target.value ? parseFloat(e.target.value) : null)
                        }
                        placeholder={String(defaults.percentage)}
                        className="w-20 rounded border border-gray-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => removeUserSetting(s.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
