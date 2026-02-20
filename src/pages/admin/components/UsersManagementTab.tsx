import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import UserActivityDetail from './UserActivityDetail';
import { useEmail } from '../../../hooks/useEmail';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  user_type: 'individual' | 'professional';
  company_name: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_certified: boolean | null;
  status: string | null;
  professional_documents: any;
  created_at: string;
}

export default function UsersManagementTab() {
  const { sendEmail } = useEmail();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'all' | 'individual' | 'professional'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForActivity, setUserForActivity] = useState<User | null>(null);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let query = supabase.from('users_2025_12_01_11_29').select('*').order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('user_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(userId);
      const { error } = await supabase
        .from('users_2025_12_01_11_29')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      alert(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyDocument = async (userId: string, documentType: string, status: 'verified' | 'rejected') => {
    try {
      setActionLoading(userId + '-' + documentType);
      const user = users.find((u) => u.id === userId);
      if (!user || !user.professional_documents) return;

      const updatedDocuments = {
        ...user.professional_documents,
        [documentType]: {
          ...user.professional_documents[documentType],
          status,
        },
      };

      const { error } = await supabase
        .from('users_2025_12_01_11_29')
        .update({ professional_documents: updatedDocuments })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, professional_documents: updatedDocuments });
      }

      // Envoyer un email de notification au professionnel
      try {
        const documentLabels: Record<string, string> = {
          professional_card: 'Carte professionnelle',
          rcs_extract: 'Extrait RCS',
          id_card: "Pièce d'identité",
          insurance_certificate: 'Assurance RC Pro',
        };

        const documentName = documentLabels[documentType] || documentType;
        const professionalName = user.full_name || user.company_name || 'Cher professionnel';

        if (status === 'verified') {
          // Email de validation
          await sendEmail('document_professionnel_valide', {
            professionalEmail: user.email,
            professionalName,
            documentName,
          });
        } else if (status === 'rejected') {
          // Email de rejet
          await sendEmail('document_professionnel_rejete', {
            professionalEmail: user.email,
            professionalName,
            documentName,
            appUrl: window.location.origin,
          });
        }
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
        // Ne pas bloquer la validation/rejet si l'email échoue
      }
    } catch (err: any) {
      console.error('Erreur lors de la vérification du document:', err);
      alert(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCertifyProfessional = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading('certify-' + userId);
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const newCertifiedStatus = !currentStatus;
      const { error } = await supabase
        .from('users_2025_12_01_11_29')
        .update({ is_certified: newCertifiedStatus })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();

      // Envoyer un email de notification au professionnel si il est certifié
      if (newCertifiedStatus) {
        try {
          const professionalName = user.full_name || user.company_name || 'Cher professionnel';
          const companyName = user.company_name || user.full_name || '';

          await sendEmail('professionnel_certifie', {
            professionalEmail: user.email,
            professionalName,
            companyName,
            appUrl: window.location.origin,
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
          // Ne pas bloquer la certification si l'email échoue
        }
      }
    } catch (err: any) {
      console.error('Erreur lors de la certification:', err);
      alert(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Fonction pour vérifier si un professionnel a des documents en attente
  const hasPendingDocuments = (user: User): boolean => {
    if (user.user_type !== 'professional' || !user.professional_documents) {
      return false;
    }
    const docs = user.professional_documents as Record<string, any>;
    return Object.values(docs).some((doc: any) => doc && doc.status === 'pending');
  };

  const filteredUsers = users
    .filter((user) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          user.email.toLowerCase().includes(search) ||
          user.full_name?.toLowerCase().includes(search) ||
          user.company_name?.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .sort((a, b) => {
      // Mettre en premier les professionnels avec documents en attente
      const aHasPending = hasPendingDocuments(a);
      const bHasPending = hasPendingDocuments(b);
      
      if (aHasPending && !bHasPending) return -1;
      if (!aHasPending && bHasPending) return 1;
      
      // Ensuite trier par date de création (plus récent en premier)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      under_review: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
      verified: { label: 'Vérifié', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800' },
    };
    const statusInfo = statusMap[status || ''] || { label: 'Non défini', color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-sm text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Rechercher par email, nom ou entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilter('individual')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'individual'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Particuliers
            </button>
            <button
              onClick={() => setFilter('professional')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'professional'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Professionnels
            </button>
          </div>
        </div>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  État
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                const hasPending = hasPendingDocuments(user);
                const rowClassName = hasPending 
                  ? 'hover:bg-gray-50 bg-yellow-50 border-l-4 border-yellow-400'
                  : 'hover:bg-gray-50';
                return (
                  <tr 
                    key={user.id} 
                    className={`${rowClassName} cursor-pointer`}
                    onClick={() => setUserForActivity(user)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {hasPending && (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                            <i className="ri-time-line mr-1"></i>
                            Documents en attente
                          </span>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name || 'Sans nom'}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          {user.company_name && (
                            <div className="text-xs text-gray-400">{user.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.user_type === 'professional'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.user_type === 'professional' ? 'Professionnel' : 'Particulier'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.user_type === 'professional' ? getStatusBadge(user.status) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.is_active ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUserForActivity(user)}
                        className="px-3 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium hover:bg-teal-200 transition-colors"
                      >
                        Activité
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        disabled={actionLoading === user.id}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50`}
                      >
                        {actionLoading === user.id ? (
                          <i className="ri-loader-4-line animate-spin"></i>
                        ) : user.is_active ? (
                          'Désactiver'
                        ) : (
                          'Activer'
                        )}
                      </button>
                      {user.user_type === 'professional' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDocumentsModal(true);
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                          >
                            Documents
                          </button>
                          <button
                            onClick={() => handleCertifyProfessional(user.id, user.is_certified || false)}
                            disabled={actionLoading === 'certify-' + user.id}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              user.is_certified
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                            } disabled:opacity-50`}
                          >
                            {actionLoading === 'certify-' + user.id ? (
                              <i className="ri-loader-4-line animate-spin"></i>
                            ) : user.is_certified ? (
                              'Décertifier'
                            ) : (
                              'Certifier'
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>

      {userForActivity && (
        <UserActivityDetail user={userForActivity} onClose={() => setUserForActivity(null)} />
      )}

      {/* Modal de documents professionnels */}
      {showDocumentsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Documents professionnels - {selectedUser.full_name || selectedUser.email}
              </h3>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-6">
              {selectedUser.professional_documents ? (
                <div className="space-y-4">
                  {['professional_card', 'rcs_extract', 'id_card', 'insurance_certificate'].map((docType) => {
                    const doc = selectedUser.professional_documents[docType];
                    const docLabels: Record<string, string> = {
                      professional_card: 'Carte professionnelle',
                      rcs_extract: 'Extrait RCS',
                      id_card: "Pièce d'identité",
                      insurance_certificate: 'Assurance RC Pro',
                    };
                    return (
                      <div key={docType} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{docLabels[docType]}</h4>
                          {doc && (
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                doc.status === 'verified'
                                  ? 'bg-green-100 text-green-800'
                                  : doc.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {doc.status === 'verified'
                                ? 'Vérifié'
                                : doc.status === 'rejected'
                                ? 'Rejeté'
                                : 'En attente'}
                            </span>
                          )}
                        </div>
                        {doc && doc.url ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <i className="ri-file-line text-gray-400"></i>
                              <span className="text-sm text-gray-700">{doc.name}</span>
                              <span className="text-xs text-gray-500">({doc.size})</span>
                            </div>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                            >
                              <i className="ri-external-link-line"></i>
                              Voir le document
                            </a>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleVerifyDocument(selectedUser.id, docType, 'verified')}
                                disabled={actionLoading === selectedUser.id + '-' + docType}
                                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === selectedUser.id + '-' + docType ? (
                                  <i className="ri-loader-4-line animate-spin"></i>
                                ) : (
                                  'Valider'
                                )}
                              </button>
                              <button
                                onClick={() => handleVerifyDocument(selectedUser.id, docType, 'rejected')}
                                disabled={actionLoading === selectedUser.id + '-' + docType}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                              >
                                {actionLoading === selectedUser.id + '-' + docType ? (
                                  <i className="ri-loader-4-line animate-spin"></i>
                                ) : (
                                  'Rejeter'
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Document non fourni</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun document professionnel disponible</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

