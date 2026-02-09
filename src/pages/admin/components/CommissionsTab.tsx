import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface CommissionSettings {
  commission_reservation_rate: number;
  commission_rent_rate: number;
  commission_installment_rate: number;
}

export default function CommissionsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CommissionSettings>({
    commission_reservation_rate: 5.0,
    commission_rent_rate: 3.0,
    commission_installment_rate: 3.0
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'commission_reservation_rate',
          'commission_rent_rate',
          'commission_installment_rate'
        ]);

      if (error) throw error;

      const newSettings: CommissionSettings = {
        commission_reservation_rate: 5.0,
        commission_rent_rate: 3.0,
        commission_installment_rate: 3.0
      };

      data?.forEach((item) => {
        if (item.key === 'commission_reservation_rate') {
          newSettings.commission_reservation_rate = parseFloat(item.value as string);
        } else if (item.key === 'commission_rent_rate') {
          newSettings.commission_rent_rate = parseFloat(item.value as string);
        } else if (item.key === 'commission_installment_rate') {
          newSettings.commission_installment_rate = parseFloat(item.value as string);
        }
      });

      setSettings(newSettings);
    } catch (err: any) {
      console.error('Erreur lors du chargement des paramètres:', err);
      alert('Erreur lors du chargement des paramètres de commission');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Mettre à jour chaque taux
      const updates = [
        {
          key: 'commission_reservation_rate',
          value: settings.commission_reservation_rate
        },
        {
          key: 'commission_rent_rate',
          value: settings.commission_rent_rate
        },
        {
          key: 'commission_installment_rate',
          value: settings.commission_installment_rate
        }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert({
            key: update.key,
            value: update.value.toString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      alert('Taux de commission mis à jour avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde des taux de commission');
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des commissions</h2>
        <p className="text-gray-600">Configurez les taux de commission pour chaque type de transaction</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Taux commission réservations */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <i className="ri-calendar-check-line text-teal-600"></i>
                  Réservations de location courte durée
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Commission prélevée sur chaque réservation confirmée
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.commission_reservation_rate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commission_reservation_rate: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <span className="text-lg font-semibold text-gray-700">%</span>
            </div>
          </div>

          {/* Taux commission loyers */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <i className="ri-home-line text-teal-600"></i>
                  Paiements de loyer
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Commission prélevée sur chaque paiement de loyer
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.commission_rent_rate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commission_rent_rate: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <span className="text-lg font-semibold text-gray-700">%</span>
            </div>
          </div>

          {/* Taux commission paiements échelonnés */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <i className="ri-calendar-todo-line text-teal-600"></i>
                  Paiements échelonnés
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Commission prélevée sur chaque paiement échelonné
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.commission_installment_rate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commission_installment_rate: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <span className="text-lg font-semibold text-gray-700">%</span>
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
