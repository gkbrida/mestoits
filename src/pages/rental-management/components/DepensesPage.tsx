import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface DepensesPageProps {
  userId: string;
  onBack: () => void;
}

interface Expense {
  id: string;
  property_id?: string;
  lease_id?: string;
  property_title?: string;
  lease_title?: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url?: string;
  notes?: string;
  created_at: string;
}

export default function DepensesPage({ userId, onBack }: DepensesPageProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [form, setForm] = useState({
    property_id: '',
    lease_id: '',
    category: 'maintenance',
    description: '',
    amount: '',
    expense_date: '',
    receipt_file: null as File | null,
    notes: ''
  });

  useEffect(() => {
    loadProperties();
    loadLeases();
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadExpenses();
    }
  }, [userId]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties_02')
        .select('id, title')
        .eq('owner_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
    }
  };

  const loadLeases = async () => {
    try {
      const { data, error } = await supabase
        .from('leases')
        .select('id, property_id, monthly_rent')
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

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('owner_id', userId)
        .order('expense_date', { ascending: false });

      if (error) {
        if (error.message?.includes('does not exist')) {
          console.warn('La table expenses n\'existe pas encore');
          setExpenses([]);
          return;
        }
        throw error;
      }

      // Enrichir avec les détails des propriétés et baux
      const expensesWithDetails = await Promise.all(
        (data || []).map(async (expense) => {
          let propertyTitle = '';
          let leaseTitle = '';

          if (expense.property_id) {
            const { data: propertyData } = await supabase
              .from('properties_02')
              .select('title')
              .eq('id', expense.property_id)
              .single();

            propertyTitle = propertyData?.title || 'Bien';
          }

          if (expense.lease_id) {
            const { data: leaseData } = await supabase
              .from('leases')
              .select('property_id')
              .eq('id', expense.lease_id)
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
          }

          return {
            ...expense,
            property_title: propertyTitle,
            lease_title: leaseTitle
          };
        })
      );

      setExpenses(expensesWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des dépenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      setUploadingReceipt(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de la facture:', error);
      alert(`Erreur lors de l'upload: ${error.message || 'Erreur inconnue'}`);
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.description || !form.amount || !form.expense_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setActionLoading(true);
    try {
      let receiptUrl = null;
      if (form.receipt_file) {
        receiptUrl = await uploadReceipt(form.receipt_file);
        if (!receiptUrl) {
          setActionLoading(false);
          return;
        }
      }

      const expenseData: any = {
        owner_id: userId,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount),
        expense_date: form.expense_date,
        notes: form.notes || null,
        receipt_url: receiptUrl
      };

      if (form.property_id) {
        expenseData.property_id = form.property_id;
      }

      if (form.lease_id) {
        expenseData.lease_id = form.lease_id;
      }

      if (editingExpense) {
        // Si on modifie et qu'il y a une nouvelle facture, remplacer l'ancienne
        if (receiptUrl && editingExpense.receipt_url) {
          // Optionnel: supprimer l'ancienne facture du storage
        }
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
        alert('Dépense modifiée avec succès !');
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;
        alert('Dépense ajoutée avec succès !');
      }

      setShowModal(false);
      setEditingExpense(null);
      setForm({
        property_id: '',
        lease_id: '',
        category: 'maintenance',
        description: '',
        amount: '',
        expense_date: '',
        receipt_file: null,
        notes: ''
      });
      await loadExpenses();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Dépense supprimée avec succès !');
      await loadExpenses();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      property_id: expense.property_id || '',
      lease_id: expense.lease_id || '',
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      receipt_file: null,
      notes: expense.notes || ''
    });
    setShowModal(true);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      maintenance: 'Maintenance',
      repair: 'Réparation',
      utilities: 'Services publics',
      insurance: 'Assurance',
      taxes: 'Taxes',
      management: 'Gestion',
      other: 'Autre'
    };
    return labels[category] || category;
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Dépenses</h2>
            <p className="text-sm md:text-base text-gray-600">Gérez vos dépenses immobilières</p>
          </div>
        </div>
        <div className="md:hidden mt-4">
          <button
            onClick={() => {
              setEditingExpense(null);
              setForm({
                property_id: '',
                lease_id: '',
                category: 'maintenance',
                description: '',
                amount: '',
                expense_date: '',
                receipt_file: null,
                notes: ''
              });
              setShowModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-lg"></i>
            Ajouter une dépense
          </button>
        </div>
        <div className="hidden md:flex items-center justify-end">
          <button
            onClick={() => {
              setEditingExpense(null);
              setForm({
                property_id: '',
                lease_id: '',
                category: 'maintenance',
                description: '',
                amount: '',
                expense_date: '',
                receipt_file: null,
                notes: ''
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-xl"></i>
            Ajouter une dépense
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
        {expenses.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-wallet-line text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-600 mb-2">Aucune dépense enregistrée</p>
            <p className="text-sm text-gray-500">Ajoutez votre première dépense pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Catégorie</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bien/Bail</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Facture</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{getCategoryLabel(expense.category)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {expense.lease_title || expense.property_title || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {expense.amount.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(expense.expense_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      {expense.receipt_url ? (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:text-teal-700 cursor-pointer"
                        >
                          <i className="ri-file-line text-lg"></i>
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <i className="ri-edit-line text-blue-600"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
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
                {editingExpense ? 'Modifier la dépense' : 'Ajouter une dépense'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingExpense(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="repair">Réparation</option>
                  <option value="utilities">Services publics</option>
                  <option value="insurance">Assurance</option>
                  <option value="taxes">Taxes</option>
                  <option value="management">Gestion</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  placeholder="Description de la dépense"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bien (optionnel)</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm({ ...form, property_id: e.target.value, lease_id: '' })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Aucun</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>{prop.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bail (optionnel)</label>
                  <select
                    value={form.lease_id}
                    onChange={(e) => setForm({ ...form, lease_id: e.target.value, property_id: '' })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    disabled={!!form.property_id}
                  >
                    <option value="">Aucun</option>
                    {leases.map((lease) => (
                      <option key={lease.id} value={lease.id}>{lease.property_title}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Facture/Reçu {editingExpense?.receipt_url && '(actuel)'}
                </label>
                {editingExpense?.receipt_url && (
                  <div className="mb-2">
                    <a
                      href={editingExpense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-700 text-sm flex items-center gap-2"
                    >
                      <i className="ri-file-line"></i>
                      Voir la facture actuelle
                    </a>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setForm({ ...form, receipt_file: e.target.files?.[0] || null })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                />
                {uploadingReceipt && (
                  <p className="text-sm text-gray-500 mt-2">
                    <i className="ri-loader-4-line animate-spin"></i> Upload en cours...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  rows={3}
                  placeholder="Notes supplémentaires..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading || uploadingReceipt}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading || uploadingReceipt ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      {editingExpense ? 'Modification...' : 'Ajout...'}
                    </>
                  ) : (
                    editingExpense ? 'Modifier' : 'Ajouter'
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
