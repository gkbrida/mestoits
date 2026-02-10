import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';
interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string;
  property?: string;
  rentAmount?: string;
  leaseStart?: string;
  status?: string;
}

export default function TenantsTab() {
  const navigate = useNavigate();
  const { sendEmail } = useEmail();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [tenantUserId, setTenantUserId] = useState<string | null>(null);
  const [tenantPropertyId, setTenantPropertyId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [tenantForm, setTenantForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadTenants();
    }
  }, [userId]);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadTenants = async () => {
    try {
      setLoading(true);
      
      // Charger les locataires
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Charger les baux actifs séparément pour éviter l'erreur 406
      const tenantIds = (tenantsData || []).map((t: any) => t.id);
      let leasesData: any[] = [];
      
      if (tenantIds.length > 0) {
        const { data: leases, error: leasesError } = await supabase
          .from('leases')
          .select('property_id, tenant_id, monthly_rent, start_date, end_date')
          .in('tenant_id', tenantIds)
          .eq('status', 'active')
          .eq('owner_id', userId);

        if (leasesError) {
          console.error('Erreur lors du chargement des baux:', leasesError);
        } else {
          leasesData = leases || [];
        }
      }

      // Charger les propriétés séparément
      const propertyIds = [...new Set(leasesData.map((l: any) => l.property_id).filter(Boolean))];
      let propertiesMap = new Map();
      
      if (propertyIds.length > 0) {
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties_02')
          .select('id, title, address, city')
          .in('id', propertyIds);

        if (propertiesError) {
          console.error('Erreur lors du chargement des propriétés:', propertiesError);
        } else {
          (propertiesData || []).forEach((prop: any) => {
            propertiesMap.set(prop.id, prop);
          });
        }
      }

      // Créer une map des baux par tenant_id
      const leasesMap = new Map();
      leasesData.forEach((lease: any) => {
        const tenantId = lease.tenant_id;
        if (!leasesMap.has(tenantId)) {
          leasesMap.set(tenantId, lease);
        }
      });

      // Enrichir les locataires avec les informations des baux et propriétés
      const enrichedTenants = (tenantsData || []).map((tenant: any) => {
        const lease = leasesMap.get(tenant.id);
        const property = lease ? propertiesMap.get(lease.property_id) : null;

        return {
          ...tenant,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          property: property
            ? `${property.title} - ${property.city}`
            : 'Aucun bien',
          rentAmount: lease ? `${lease.monthly_rent.toLocaleString()} FCFA` : '-',
          leaseStart: lease?.start_date
            ? new Date(lease.start_date).toLocaleDateString('fr-FR')
            : '-',
          status: lease ? 'active' : 'inactive'
        };
      });

      setTenants(enrichedTenants);
    } catch (error) {
      console.error('Erreur lors du chargement des locataires:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTenant = async () => {
    if (!userId) return;

    setActionLoading(true);
    try {
      // Créer le locataire
      const { error } = await supabase
        .from('tenants')
        .insert([{
          owner_id: userId,
          first_name: tenantForm.firstName,
          last_name: tenantForm.lastName,
          email: tenantForm.email,
          phone: tenantForm.phone,
          birth_date: tenantForm.birthDate || null,
          address: tenantForm.address || null,
        }]);

      if (error) throw error;

      // Charger les informations du propriétaire pour l'email
      const { data: ownerData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('full_name, email, phone, company_name')
        .eq('id', userId)
        .single();

      setShowAddModal(false);
      setTenantForm({ firstName: '', lastName: '', email: '', phone: '', birthDate: '', address: '' });
      await loadTenants();

      // Envoyer l'email de notification au locataire
      if (tenantForm.email && ownerData) {
        const emailResult = await sendEmail('invitation_locataire', {
          tenantEmail: tenantForm.email,
          tenantName: `${tenantForm.firstName} ${tenantForm.lastName}`,
          ownerName: ownerData.full_name || 'Propriétaire',
          ownerEmail: ownerData.email || '',
          ownerPhone: ownerData.phone || '',
          ownerCompany: ownerData.company_name || null,
        });

        if (emailResult.success) {
          alert('Locataire ajouté avec succès ! Un email de notification a été envoyé.');
        } else {
          alert(`Locataire ajouté avec succès !\n\n⚠️ L'email n'a pas pu être envoyé.\nErreur: ${emailResult.error || 'Erreur inconnue'}`);
        }
      } else {
        alert('Locataire ajouté avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout du locataire:', error);
      alert(`Une erreur est survenue lors de l'ajout du locataire: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTenant = async () => {
    if (!selectedTenant || !userId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          first_name: tenantForm.firstName,
          last_name: tenantForm.lastName,
          email: tenantForm.email,
          phone: tenantForm.phone,
          birth_date: tenantForm.birthDate || null,
          address: tenantForm.address || null,
        })
        .eq('id', selectedTenant.id)
        .eq('owner_id', userId);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedTenant(null);
      await loadTenants();
    } catch (error) {
      console.error('Erreur lors de la modification du locataire:', error);
      alert('Une erreur est survenue lors de la modification du locataire');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant || !userId) return;

    // Vérifier si le locataire a au moins un bail actif
    try {
      const { data: activeLeases, error: leasesError } = await supabase
        .from('leases')
        .select('id, property_id')
        .eq('tenant_id', selectedTenant.id)
        .eq('owner_id', userId)
        .eq('status', 'active');

      if (leasesError) {
        console.error('Erreur lors de la vérification des baux:', leasesError);
        alert('Erreur lors de la vérification des baux actifs');
        return;
      }

      if (activeLeases && activeLeases.length > 0) {
        alert(`Impossible de supprimer ce locataire. Il a ${activeLeases.length} bail${activeLeases.length > 1 ? 'x' : ''} actif${activeLeases.length > 1 ? 's' : ''}. Veuillez d'abord clôturer ${activeLeases.length > 1 ? 'ces baux' : 'ce bail'} avant de supprimer le locataire.`);
        setShowDeleteModal(false);
        setSelectedTenant(null);
        return;
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des baux:', error);
      alert('Erreur lors de la vérification des baux actifs');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', selectedTenant.id)
        .eq('owner_id', userId);

      if (error) throw error;

      setShowDeleteModal(false);
      setSelectedTenant(null);
      await loadTenants();
      alert('Locataire supprimé avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du locataire:', error);
      alert('Une erreur est survenue lors de la suppression du locataire');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTenantForm({
      firstName: tenant.first_name || '',
      lastName: tenant.last_name || '',
      email: tenant.email,
      phone: tenant.phone || '',
      birthDate: tenant.birth_date || '',
      address: tenant.address || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowDeleteModal(true);
  };

  const handleContactTenant = async (tenant: Tenant) => {
    if (!userId || !tenant.email) {
      alert('Impossible de contacter ce locataire : informations manquantes.');
      return;
    }

    try {
      // Chercher l'utilisateur correspondant par email dans users_2025_12_01_11_29
      const { data: userData, error: userError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name')
        .eq('email', tenant.email)
        .single();

      if (userError || !userData) {
        alert('Le locataire n\'a pas de compte utilisateur. Impossible d\'envoyer un message.\n\nVeuillez inviter le locataire à créer un compte sur mestoits.com pour pouvoir communiquer avec lui.');
        return;
      }

      // Trouver le property_id associé au locataire (via les baux actifs)
      let propertyId: string | null = null;
      const { data: leaseData } = await supabase
        .from('leases')
        .select('property_id')
        .eq('tenant_id', tenant.id)
        .eq('owner_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (leaseData && leaseData.property_id) {
        propertyId = leaseData.property_id;
      }

      // Vérifier si une conversation existe déjà (messages envoyés ou reçus)
      const { data: existingMessages1 } = await supabase
        .from('messages_2025_12_01_11_29')
        .select('id, property_id')
        .eq('sender_id', userId)
        .eq('receiver_id', userData.id)
        .limit(1);

      const { data: existingMessages2 } = await supabase
        .from('messages_2025_12_01_11_29')
        .select('id, property_id')
        .eq('sender_id', userData.id)
        .eq('receiver_id', userId)
        .limit(1);

      const hasExistingConversation = (existingMessages1 && existingMessages1.length > 0) || 
                                      (existingMessages2 && existingMessages2.length > 0);

      // Si une conversation existe, rediriger vers la page de messagerie
      if (hasExistingConversation) {
        navigate('/messages');
      } else {
        // Sinon, ouvrir une popup pour écrire un message
        setSelectedTenant(tenant);
        setTenantUserId(userData.id);
        setTenantPropertyId(propertyId);
        setMessageContent('');
        setShowMessageModal(true);
      }
    } catch (error: any) {
      console.error('Erreur lors de la préparation du contact:', error);
      alert('Une erreur est survenue lors de l\'ouverture de la conversation.');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTenant || !tenantUserId || !messageContent.trim()) {
      alert('Veuillez saisir un message.');
      return;
    }

    setActionLoading(true);
    try {
      // Envoyer le message
      const { error: messageError } = await supabase
        .from('messages_2025_12_01_11_29')
        .insert({
          sender_id: userId,
          receiver_id: tenantUserId,
          content: messageContent.trim(),
          property_id: tenantPropertyId,
          read: false,
        });

      if (messageError) throw messageError;

      // Récupérer les informations de l'expéditeur et du destinataire pour l'email
      const [senderResult, receiverResult] = await Promise.all([
        supabase
          .from('users_2025_12_01_11_29')
          .select('full_name')
          .eq('id', userId)
          .single(),
        supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email')
          .eq('id', tenantUserId)
          .single(),
      ]);

      // Envoyer un email de notification au destinataire
      if (receiverResult.data && receiverResult.data.email) {
        const senderName = senderResult.data?.full_name || 'Votre propriétaire';
        const receiverName = receiverResult.data.full_name || `${selectedTenant.first_name} ${selectedTenant.last_name}`;
        
        const emailResult = await sendEmail('nouveau_message', {
          receiverEmail: receiverResult.data.email,
          receiverName: receiverName,
          senderName: senderName,
          propertyTitle: null, // Pas de titre de bien spécifique ici
          messagePreview: messageContent.trim().substring(0, 100),
          appUrl: window.location.origin,
        });

        if (!emailResult.success) {
          console.warn('Email de notification non envoyé:', emailResult.error);
        }
      }

      // Fermer le modal et rediriger vers la page de messagerie
      setShowMessageModal(false);
      setSelectedTenant(null);
      setTenantUserId(null);
      setTenantPropertyId(null);
      setMessageContent('');
      navigate('/messages');
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Une erreur est survenue lors de l\'envoi du message.');
    } finally {
      setActionLoading(false);
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Mes locataires</h2>
          <p className="text-sm md:text-base text-gray-600 mt-1">Gérez vos locataires et leurs informations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto"
        >
          <i className="ri-user-add-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
          <span className="hidden sm:inline">Ajouter un locataire</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {/* Tenants List */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-lg md:rounded-2xl shadow-sm p-8 md:p-12 text-center">
          <i className="ri-user-line text-4xl md:text-5xl lg:text-6xl text-gray-300 mb-3 md:mb-4"></i>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Aucun locataire</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">Commencez par ajouter votre premier locataire</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-user-add-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
            Ajouter un locataire
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg md:rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-900">Locataire</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-900">Contact</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-900 hidden lg:table-cell">Bien loué</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-900">Loyer</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-900 hidden md:table-cell">Début bail</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-bold text-gray-900">Statut</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-right text-xs md:text-sm font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((tenant) => {
                  const firstName = tenant.first_name || '';
                  const lastName = tenant.last_name || '';
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-full font-bold text-xs md:text-sm">
                            {firstName[0] || '?'}{lastName[0] || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-xs md:text-sm truncate">{firstName} {lastName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <p className="text-xs md:text-sm text-gray-900 truncate">{tenant.email}</p>
                        <p className="text-xs md:text-sm text-gray-600">{tenant.phone || '-'}</p>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden lg:table-cell">
                        <p className="text-xs md:text-sm text-gray-900 truncate">{tenant.property || 'Aucun bien'}</p>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <p className="text-xs md:text-sm font-bold text-teal-600">{tenant.rentAmount || '-'}</p>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 hidden md:table-cell">
                        <p className="text-xs md:text-sm text-gray-900">{tenant.leaseStart || '-'}</p>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                          tenant.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tenant.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center justify-end gap-1 md:gap-2">
                          <button
                            onClick={() => handleEdit(tenant)}
                            className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 hover:bg-gray-100 rounded-md md:rounded-lg transition-colors cursor-pointer"
                            title="Modifier"
                          >
                            <i className="ri-edit-line text-base md:text-lg text-gray-600"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(tenant)}
                            disabled={tenant.status === 'active'}
                            className={`flex items-center justify-center w-8 h-8 md:w-9 md:h-9 hover:bg-gray-100 rounded-md md:rounded-lg transition-colors ${
                              tenant.status === 'active' ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                            }`}
                            title={tenant.status === 'active' ? 'Impossible de supprimer un locataire avec un bail actif' : 'Supprimer'}
                          >
                            <i className="ri-delete-bin-line text-base md:text-lg text-red-600"></i>
                          </button>
                          <button
                            onClick={() => handleContactTenant(tenant)}
                            className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 hover:bg-gray-100 rounded-md md:rounded-lg transition-colors cursor-pointer"
                            title="Envoyer un message"
                          >
                            <i className="ri-message-3-line text-base md:text-lg text-gray-600"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">Ajouter un locataire</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl md:text-2xl"></i>
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Prénom</label>
                  <input
                    type="text"
                    value={tenantForm.firstName}
                    onChange={(e) => setTenantForm({ ...tenantForm, firstName: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Nom</label>
                  <input
                    type="text"
                    value={tenantForm.lastName}
                    onChange={(e) => setTenantForm({ ...tenantForm, lastName: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Email</label>
                <input
                  type="email"
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                  placeholder="email@exemple.com"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={tenantForm.phone}
                  onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Date de naissance</label>
                <input
                  type="date"
                  value={tenantForm.birthDate}
                  onChange={(e) => setTenantForm({ ...tenantForm, birthDate: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Adresse</label>
                <textarea
                  value={tenantForm.address}
                  onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors resize-none text-sm md:text-base"
                  placeholder="Adresse complète"
                ></textarea>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3 md:pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 border-2 border-gray-200 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddTenant}
                  disabled={actionLoading}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                      Ajout...
                    </>
                  ) : (
                    'Ajouter le locataire'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">Modifier le locataire</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl md:text-2xl"></i>
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Prénom</label>
                  <input
                    type="text"
                    value={tenantForm.firstName}
                    onChange={(e) => setTenantForm({ ...tenantForm, firstName: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Nom</label>
                  <input
                    type="text"
                    value={tenantForm.lastName}
                    onChange={(e) => setTenantForm({ ...tenantForm, lastName: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Email</label>
                <input
                  type="email"
                  value={tenantForm.email}
                  onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={tenantForm.phone}
                  onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-sm md:text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3 md:pt-4">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 border-2 border-gray-200 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEditTenant}
                  disabled={actionLoading}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer les modifications'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-[500px] w-full p-6 md:p-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <i className="ri-delete-bin-line text-2xl md:text-3xl text-red-600 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center"></i>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2 md:mb-3">
              Supprimer ce locataire ?
            </h3>
            <p className="text-sm md:text-base text-gray-600 text-center mb-6 md:mb-8">
              Cette action est irréversible. Le locataire "{selectedTenant.first_name || ''} {selectedTenant.last_name || ''}" sera définitivement supprimé.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedTenant(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteTenant}
                disabled={actionLoading}
                className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-red-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    Suppression...
                  </>
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                Envoyer un message à {selectedTenant.first_name} {selectedTenant.last_name}
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedTenant(null);
                  setTenantUserId(null);
                  setTenantPropertyId(null);
                  setMessageContent('');
                }}
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl md:text-2xl"></i>
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Message
                </label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={6}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors resize-none text-sm md:text-base"
                  placeholder="Écrivez votre message ici..."
                ></textarea>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3 md:pt-4">
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setSelectedTenant(null);
                    setTenantUserId(null);
                    setTenantPropertyId(null);
                    setMessageContent('');
                  }}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 border-2 border-gray-200 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={actionLoading || !messageContent.trim()}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                      Envoyer le message
                    </>
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
