import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  user_type: 'individual' | 'professional';
  plan_type: string;
  price: number;
  currency: string;
  features: {
    can_publish: boolean;
    can_access_rental_management: boolean;
    can_access_directory: boolean;
  };
  restrictions: {
    max_properties_per_period: number | null;
    period_days: number | null;
  } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditingPlan extends Partial<SubscriptionPlan> {
  id: string;
}

export default function SubscriptionsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [editingPlan, setEditingPlan] = useState<EditingPlan | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('user_type', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des plans:', err);
      alert('Erreur lors du chargement des plans d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      is_active: plan.is_active
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: editingPlan.name,
          description: editingPlan.description || null,
          price: editingPlan.price || 0,
          is_active: editingPlan.is_active ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPlan.id);

      if (error) throw error;

      setShowModal(false);
      setEditingPlan(null);
      await loadPlans();
      alert('Plan d\'abonnement mis à jour avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la sauvegarde:', err);
      alert('Erreur lors de la sauvegarde du plan d\'abonnement');
    } finally {
      setSaving(false);
    }
  };

  const getPlanTypeLabel = (planType: string) => {
    const labels: Record<string, string> = {
      'free': 'Gratuit',
      'publish_only': 'Publication uniquement',
      'directory_only': 'Annuaire uniquement',
      'properties_only': 'Publication uniquement',
      'full_access': 'Accès complet'
    };
    return labels[planType] || planType;
  };

  const getUserTypeLabel = (userType: string) => {
    return userType === 'individual' ? 'Particulier' : 'Professionnel';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
        <p className="mt-4 text-gray-600">Chargement des plans d'abonnement...</p>
      </div>
    );
  }

  const individualPlans = plans.filter(p => p.user_type === 'individual');
  const professionalPlans = plans.filter(p => p.user_type === 'professional');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des abonnements</h2>
        <p className="text-gray-600">Configurez les plans d'abonnement pour les particuliers et les professionnels</p>
      </div>

      {/* Plans Particuliers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-user-line text-teal-600"></i>
          Plans Particuliers
        </h3>
        <div className="space-y-4">
          {individualPlans.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun plan disponible</p>
          ) : (
            individualPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      {plan.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>{' '}
                        <span className="font-medium">{getPlanTypeLabel(plan.plan_type)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Prix:</span>{' '}
                        <span className="font-medium">
                          {plan.price.toLocaleString('fr-FR')} {plan.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Publication:</span>{' '}
                        <span className="font-medium">
                          {plan.features.can_publish ? (
                            <span className="text-green-600">✓ Autorisée</span>
                          ) : (
                            <span className="text-red-600">✗ Non autorisée</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Gestion locative:</span>{' '}
                        <span className="font-medium">
                          {plan.features.can_access_rental_management ? (
                            <span className="text-green-600">✓ Accès</span>
                          ) : (
                            <span className="text-red-600">✗ Pas d'accès</span>
                          )}
                        </span>
                      </div>
                      {plan.restrictions?.max_properties_per_period !== null && (
                        <div>
                          <span className="text-gray-500">Limite:</span>{' '}
                          <span className="font-medium">
                            {plan.restrictions.max_properties_per_period} annonce(s) /{' '}
                            {plan.restrictions.period_days} jours
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="ml-4 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-edit-line"></i>
                    Modifier
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Plans Professionnels */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <i className="ri-building-line text-teal-600"></i>
          Plans Professionnels
        </h3>
        <div className="space-y-4">
          {professionalPlans.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun plan disponible</p>
          ) : (
            professionalPlans.map((plan) => (
              <div
                key={plan.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      {plan.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Actif
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          Inactif
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>{' '}
                        <span className="font-medium">{getPlanTypeLabel(plan.plan_type)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Prix:</span>{' '}
                        <span className="font-medium">
                          {plan.price.toLocaleString('fr-FR')} {plan.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Publication:</span>{' '}
                        <span className="font-medium">
                          {plan.features.can_publish ? (
                            <span className="text-green-600">✓ Autorisée</span>
                          ) : (
                            <span className="text-red-600">✗ Non autorisée</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Gestion locative:</span>{' '}
                        <span className="font-medium">
                          {plan.features.can_access_rental_management ? (
                            <span className="text-green-600">✓ Accès</span>
                          ) : (
                            <span className="text-red-600">✗ Pas d'accès</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Annuaire:</span>{' '}
                        <span className="font-medium">
                          {plan.features.can_access_directory ? (
                            <span className="text-green-600">✓ Présent</span>
                          ) : (
                            <span className="text-red-600">✗ Absent</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="ml-4 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-2"
                  >
                    <i className="ri-edit-line"></i>
                    Modifier
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal d'édition */}
      {showModal && editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Modifier le plan d'abonnement</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPlan(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nom du plan
                </label>
                <input
                  type="text"
                  value={editingPlan.name || ''}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  value={editingPlan.description || ''}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Prix (FCFA)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingPlan.price || 0}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      price: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.is_active ?? true}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, is_active: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Plan actif
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPlan(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <i className="ri-save-line"></i>
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
