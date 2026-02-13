import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

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

export default function AffiliationTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaults, setDefaults] = useState<DefaultSettings>({ durationMonths: 12, percentage: 10 });
  const [userSettings, setUserSettings] = useState<UserAffiliationSetting[]>([]);
  const [searchUserId, setSearchUserId] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [addingUser, setAddingUser] = useState(false);

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
            { key, value: value.toString(), updated_at: new Date().toISOString() },
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
    if (!searchUserId.trim()) return;
    const { data } = await supabase
      .from('users_2025_12_01_11_29')
      .select('id, email, full_name')
      .or(`id.eq.${searchUserId.trim()},email.ilike.%${searchUserId.trim()}%`)
      .limit(1)
      .maybeSingle();
    setSearchResult(data || null);
  };

  const addUserSetting = async () => {
    if (!searchResult) return;
    const exists = userSettings.some((s) => s.user_id === searchResult.id);
    if (exists) {
      alert('Ce client a déjà des paramètres spécifiques');
      return;
    }
    const { error } = await supabase.from('user_affiliation_settings').insert({
      user_id: searchResult.id,
      duration_months: defaults.durationMonths,
      percentage: defaults.percentage,
    });
    if (error) {
      alert('Erreur: ' + error.message);
      return;
    }
    setSearchUserId('');
    setSearchResult(null);
    setAddingUser(false);
    load();
  };

  const updateUserSetting = async (
    id: string,
    field: 'duration_months' | 'percentage',
    value: number | null
  ) => {
    const { error } = await supabase
      .from('user_affiliation_settings')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) alert('Erreur: ' + error.message);
    else load();
  };

  const removeUserSetting = async (id: string) => {
    if (!confirm('Supprimer les paramètres spécifiques pour ce client ?')) return;
    const { error } = await supabase.from('user_affiliation_settings').delete().eq('id', id);
    if (error) alert('Erreur: ' + error.message);
    else load();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion de l'affiliation</h2>
        <p className="text-gray-600">
          Configurez la durée et le pourcentage d'affiliation. Les valeurs par défaut s'appliquent aux clients sans
          paramètres spécifiques.
        </p>
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
                  setSearchResult(null);
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
            {searchResult && (
              <div className="mt-3 flex items-center justify-between p-3 bg-white rounded border">
                <span>{searchResult.full_name || '—'} ({searchResult.email})</span>
                <div className="flex gap-2">
                  <button
                    onClick={addUserSetting}
                    className="px-3 py-1 bg-teal-600 text-white rounded text-sm"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setSearchUserId('');
                      setSearchResult(null);
                      setAddingUser(false);
                    }}
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
                  >
                    Annuler
                  </button>
                </div>
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
