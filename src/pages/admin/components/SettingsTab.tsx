import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function SettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restrictionsEnabled, setRestrictionsEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'subscription_restrictions_enabled')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRestrictionsEnabled(data.value as boolean);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des paramètres:', err);
      alert('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'subscription_restrictions_enabled',
          value: restrictionsEnabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      alert('Paramètres mis à jour avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
        <p className="mt-4 text-gray-600">Chargement des paramètres...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Paramètres de la plateforme</h2>
        <p className="text-gray-600">Configurez les restrictions et fonctionnalités de la plateforme</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Restrictions d'abonnement */}
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <i className="ri-shield-check-line text-teal-600"></i>
                  Restrictions d'abonnement
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Activez ou désactivez les restrictions basées sur les abonnements. 
                  Si désactivé, tous les utilisateurs auront un accès complet à la plateforme.
                </p>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restrictionsEnabled}
                      onChange={(e) => setRestrictionsEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {restrictionsEnabled ? 'Restrictions activées' : 'Restrictions désactivées'}
                    </span>
                  </label>
                </div>
                {restrictionsEnabled ? (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <i className="ri-information-line mr-2"></i>
                      Les restrictions sont activées. Les utilisateurs seront limités selon leur plan d'abonnement.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <i className="ri-alert-line mr-2"></i>
                      Les restrictions sont désactivées. Tous les utilisateurs ont un accès complet à la plateforme.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                Enregistrement...
              </>
            ) : (
              <>
                <i className="ri-save-line"></i>
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
