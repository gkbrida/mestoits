import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface RevenusPageProps {
  userId: string;
  onBack: () => void;
}

interface Revenue {
  id: string;
  revenue_type: 'lease' | 'sale' | 'other';
  lease_id?: string;
  property_id?: string;
  property_title?: string;
  lease_title?: string;
  amount: number;
  payment_date?: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method?: string;
  description?: string;
  created_at: string;
}

export default function RevenusPage({ userId, onBack }: RevenusPageProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [leases, setLeases] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [form, setForm] = useState({
    revenue_type: 'lease' as 'lease' | 'sale' | 'other',
    lease_id: '',
    property_id: '',
    amount: '',
    payment_date: '',
    due_date: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue' | 'cancelled',
    payment_method: '',
    description: ''
  });

  useEffect(() => {
    loadLeases();
    loadProperties();
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadRevenues();
    }
  }, [userId]);

  const loadLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select('id, property_id, monthly_rent, start_date, end_date')
        .eq('owner_id', userId)
        .eq('status', 'active');

      if (error) throw error;

      // Enrichir avec les titres des propriétés
      const leasesWithDetails = await Promise.all(
        (data || []).map(async (lease) => {
          const { data: propertyData } = await supabase
            .from('properties_02')
            .select('title')
            .eq('id', lease.property_id)
            .single();

          return {
            ...lease,
            property_title: propertyData?.title || 'Bien'
          };
        })
      );

      setLeases(leasesWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des baux:', error);
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties_02')
        .select('id, title')
        .eq('owner_id', userId)
        .eq('status', 'active')
        .eq('operation_type', 'sale');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
    }
  };

  const loadRevenues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('revenues')
        .select('*')
        .eq('owner_id', userId)
        .order('due_date', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist')) {
          console.warn('La table revenues n\'existe pas encore');
          setRevenues([]);
          return;
        }
        throw error;
      }

      // Enrichir avec les détails des propriétés et baux
      const revenuesWithDetails = await Promise.all(
        (data || []).map(async (revenue) => {
          let propertyTitle = '';
          let leaseTitle = '';

          if (revenue.revenue_type === 'lease' && revenue.lease_id) {
            const { data: leaseData } = await supabase
              .from('leases')
              .select('property_id, monthly_rent')
              .eq('id', revenue.lease_id)
              .single();

            if (leaseData) {
              const { data: propertyData } = await supabase
                .from('properties_02')
                .select('title')
                .eq('id', leaseData.property_id)
                .single();

              propertyTitle = propertyData?.title || 'Bien';
              leaseTitle = `Bail - ${propertyTitle}`;
            }
          } else if (revenue.revenue_type === 'sale' && revenue.property_id) {
            const { data: propertyData } = await supabase
              .from('properties_02')
              .select('title')
              .eq('id', revenue.property_id)
              .single();

            propertyTitle = propertyData?.title || 'Bien';
          }

          return {
            ...revenue,
            property_title: propertyTitle,
            lease_title: leaseTitle
          };
        })
      );

      setRevenues(revenuesWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des revenus:', error);
      setRevenues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.due_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (form.revenue_type === 'lease' && !form.lease_id) {
      alert('Veuillez sélectionner un bail');
      return;
    }

    if (form.revenue_type === 'sale' && !form.property_id) {
      alert('Veuillez sélectionner un bien');
      return;
    }

    setActionLoading(true);
    try {
      const revenueData: any = {
        owner_id: userId,
        revenue_type: form.revenue_type,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        status: form.status,
        payment_method: form.payment_method || null,
        description: form.description || null
      };

      if (form.revenue_type === 'lease') {
        revenueData.lease_id = form.lease_id;
      } else if (form.revenue_type === 'sale') {
        revenueData.property_id = form.property_id;
      }

      if (form.payment_date) {
        revenueData.payment_date = form.payment_date;
        if (form.status === 'pending') {
          revenueData.status = 'paid';
        }
      }

      if (editingRevenue) {
        const { error } = await supabase
          .from('revenues')
          .update(revenueData)
          .eq('id', editingRevenue.id);

        if (error) throw error;
        alert('Revenu modifié avec succès !');
      } else {
        const { error } = await supabase
          .from('revenues')
          .insert([revenueData]);

        if (error) throw error;
        alert('Revenu ajouté avec succès !');
      }

      setShowModal(false);
      setEditingRevenue(null);
      setForm({
        revenue_type: 'lease',
        lease_id: '',
        property_id: '',
        amount: '',
        payment_date: '',
        due_date: '',
        status: 'pending',
        payment_method: '',
        description: ''
      });
      await loadRevenues();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce revenu ?')) return;

    try {
      const { error } = await supabase
        .from('revenues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Revenu supprimé avec succès !');
      await loadRevenues();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleEdit = (revenue: Revenue) => {
    setEditingRevenue(revenue);
    setForm({
      revenue_type: revenue.revenue_type,
      lease_id: revenue.lease_id || '',
      property_id: revenue.property_id || '',
      amount: revenue.amount.toString(),
      payment_date: revenue.payment_date || '',
      due_date: revenue.due_date,
      status: revenue.status,
      payment_method: revenue.payment_method || '',
      description: revenue.description || ''
    });
    setShowModal(true);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      paid: 'Payé',
      overdue: 'En retard',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getRevenueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lease: 'Bail',
      sale: 'Vente',
      other: 'Autre'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="ri-loader-4-line text-5xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-3 md:mb-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Revenus</h2>
            <p className="text-sm md:text-base text-gray-600">Gérez vos revenus (baux, ventes, autres)</p>
          </div>
        </div>
        <div className="md:hidden mt-4">
          <button
            onClick={() => {
              setEditingRevenue(null);
              setForm({
                revenue_type: 'lease',
                lease_id: '',
                property_id: '',
                amount: '',
                payment_date: '',
                due_date: '',
                status: 'pending',
                payment_method: '',
                description: ''
              });
              setShowModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-lg"></i>
            Ajouter un revenu
          </button>
        </div>
        <div className="hidden md:flex items-center justify-end">
          <button
            onClick={() => {
              setEditingRevenue(null);
              setForm({
                revenue_type: 'lease',
                lease_id: '',
                property_id: '',
                amount: '',
                payment_date: '',
                due_date: '',
                status: 'pending',
                payment_method: '',
                description: ''
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-xl"></i>
            Ajouter un revenu
          </button>
        </div>
      </div>

      {/* Revenues List */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
        {revenues.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-money-euro-circle-line text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-600 mb-2">Aucun revenu enregistré</p>
            <p className="text-sm text-gray-500">Ajoutez votre premier revenu pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date d'échéance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date de paiement</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {revenues.map((revenue) => (
                  <tr key={revenue.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{getRevenueTypeLabel(revenue.revenue_type)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {revenue.revenue_type === 'lease' ? revenue.lease_title : revenue.property_title || revenue.description || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {revenue.amount.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(revenue.due_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {revenue.payment_date ? new Date(revenue.payment_date).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(revenue.status)}`}>
                        {getStatusLabel(revenue.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(revenue)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <i className="ri-edit-line text-blue-600"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(revenue.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <i className="ri-delete-bin-line text-red-600"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                {editingRevenue ? 'Modifier le revenu' : 'Ajouter un revenu'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRevenue(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de revenu *</label>
                <select
                  value={form.revenue_type}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      revenue_type: e.target.value as 'lease' | 'sale' | 'other',
                      lease_id: '',
                      property_id: ''
                    });
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                >
                  <option value="lease">Bail</option>
                  <option value="sale">Vente</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              {form.revenue_type === 'lease' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bail *</label>
                  <select
                    value={form.lease_id}
                    onChange={(e) => setForm({ ...form, lease_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Sélectionner un bail</option>
                    {leases.map((lease) => (
                      <option key={lease.id} value={lease.id}>{lease.property_title}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.revenue_type === 'sale' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bien *</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Sélectionner un bien</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>{prop.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant (FCFA) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date d'échéance *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de paiement</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  >
                    <option value="pending">En attente</option>
                    <option value="paid">Payé</option>
                    <option value="overdue">En retard</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Méthode de paiement</label>
                <input
                  type="text"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  placeholder="Espèces, Virement, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  rows={3}
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingRevenue(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      {editingRevenue ? 'Modification...' : 'Ajout...'}
                    </>
                  ) : (
                    editingRevenue ? 'Modifier' : 'Ajouter'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
