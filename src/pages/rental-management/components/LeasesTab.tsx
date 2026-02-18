import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import LeaseDetailView from './LeaseDetailView';
import LeaseContractPreview from '../../../components/LeaseContractPreview';
import LeaseContractArticlesEditor, { getDefaultContractArticles, type ContractArticlesState } from '../../../components/LeaseContractArticlesEditor';
import { sanitizeContractArticlesForDb } from '../../../utils/leaseContractArticles';
import { useEmail } from '../../../hooks/useEmail';
interface Lease {
  id: string;
  property_id: string;
  property_title: string;
  property_address: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  tenant_phone: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  status: 'pending_signature' | 'active' | 'expired' | 'terminated';
  created_at: string;
}


interface LeasesTabProps {
  leaseId?: string | null;
}

export default function LeasesTab({ leaseId }: LeasesTabProps) {
  const { sendEmail } = useEmail();
  const [searchParams, setSearchParams] = useSearchParams();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLease, setSelectedLease] = useState<any>(null);
  const [selectedLeaseForMessage, setSelectedLeaseForMessage] = useState<any>(null);
  const [selectedLeaseForDelete, setSelectedLeaseForDelete] = useState<any>(null);
  const [selectedLeaseForTerminate, setSelectedLeaseForTerminate] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showCreateLeaseModal, setShowCreateLeaseModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [contractArticles, setContractArticles] = useState<ContractArticlesState>(getDefaultContractArticles());
  const [bailleurLuEtApprouve, setBailleurLuEtApprouve] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [availableTenants, setAvailableTenants] = useState<any[]>([]);
  const [ownerData, setOwnerData] = useState<{ full_name?: string; company_address?: string; phone?: string; email?: string } | null>(null);
  const [leaseFormData, setLeaseFormData] = useState({
    property_id: '',
    tenant_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    security_deposit: '',
    advance_rent_amount: '',
    payment_due_day: '5',
    additional_notes: ''
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadLeases();
      loadAvailableProperties();
      loadAvailableTenants();
      loadOwnerData();
    }
  }, [userId]);

  const loadOwnerData = async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('users_2025_12_01_11_29')
        .select('full_name, company_address, phone, email')
        .eq('id', userId)
        .maybeSingle();
      setOwnerData(data || null);
    } catch (error) {
      console.error('Erreur lors du chargement du propriétaire:', error);
    }
  };

  // Ouvrir automatiquement LeaseDetailView si leaseId est fourni
  useEffect(() => {
    if (leaseId && leases.length > 0) {
      const lease = leases.find(l => l.id === leaseId);
      if (lease) {
        setSelectedLease(lease);
      }
    }
  }, [leaseId, leases]);

  // Préremplir le loyer mensuel, le dépôt de garantie et l'avance sur loyer quand un bien est sélectionné
  useEffect(() => {
    if (leaseFormData.property_id && availableProperties.length > 0) {
      const selectedProperty = availableProperties.find(p => p.id === leaseFormData.property_id);
      if (selectedProperty) {
        setLeaseFormData(prev => ({
          ...prev,
          monthly_rent: selectedProperty.price ? selectedProperty.price.toString() : prev.monthly_rent,
          security_deposit: selectedProperty.deposit_months ? (selectedProperty.deposit_months * selectedProperty.price).toString() : prev.security_deposit.toString(),
          advance_rent_amount: selectedProperty.advance_months ? (selectedProperty.advance_months * selectedProperty.price).toString() : prev.advance_rent_amount.toString(),
        }));
      }
    }
  }, [leaseFormData.property_id, availableProperties]);

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

  const loadAvailableProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties_02')
        .select('id, title, address, city, price, deposit_months, advance_months, property_type, surface_area, bedrooms, features')
        .eq('owner_id', userId)
        .eq('operation_type', 'rental') // Uniquement les biens en location longue durée
        .or('status.eq.active,status.eq.available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableProperties(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
    }
  };

  const loadAvailableTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, email, phone, profession, identity_document')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableTenants(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des locataires:', error);
    }
  };

  const loadLeases = async () => {
    try {
      setLoading(true);
      // Charger les baux sans relation pour éviter les problèmes de foreign key
      const { data: leasesData, error: leasesError } = await supabase
        .from('leases')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (leasesError) throw leasesError;

      // Charger les propriétés et locataires séparément
      // Gérer à la fois property_id (anciens baux) et property_02_id (nouveaux baux)
      const propertyIds = [...new Set((leasesData || []).map((l: any) => l.property_02_id || l.property_id).filter(Boolean))];
      const tenantIds = [...new Set((leasesData || []).map((l: any) => l.tenant_id).filter(Boolean))];

      const [propertiesResult, tenantsResult] = await Promise.all([
        propertyIds.length > 0
          ? supabase
              .from('properties_02')
              .select('id, title, address, city')
              .in('id', propertyIds)
          : Promise.resolve({ data: [], error: null }),
        tenantIds.length > 0
          ? supabase
              .from('tenants')
              .select('id, first_name, last_name, email, phone')
              .in('id', tenantIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      const propertiesMap = new Map((propertiesResult.data || []).map((p: any) => [p.id, p]));
      const tenantsMap = new Map((tenantsResult.data || []).map((t: any) => [t.id, t]));

      const formattedLeases: Lease[] = (leasesData || []).map((lease: any) => {
        // Utiliser property_02_id en priorité, sinon property_id pour compatibilité avec les anciens baux
        const propertyId = lease.property_02_id || lease.property_id;
        const property = propertiesMap.get(propertyId);
        const tenant = tenantsMap.get(lease.tenant_id);
        
        return {
          id: lease.id,
          property_id: propertyId,
          property_title: property?.title || 'Bien inconnu',
          property_address: property
            ? `${property.address || ''}, ${property.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Adresse inconnue'
            : 'Adresse inconnue',
          tenant_id: lease.tenant_id,
          tenant_name: tenant
            ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Locataire inconnu'
            : 'Locataire inconnu',
          tenant_email: tenant?.email || '',
          tenant_phone: tenant?.phone || '',
          start_date: lease.start_date,
          end_date: lease.end_date,
          monthly_rent: lease.monthly_rent,
          security_deposit: lease.security_deposit,
          status: lease.status,
          created_at: lease.created_at,
        };
      });

      setLeases(formattedLeases);
    } catch (error) {
      console.error('Erreur lors du chargement des baux:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLease = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    if (lease) {
      setSelectedLeaseForDelete(lease);
      setShowDeleteModal(true);
    }
  };

  const handleCloseLease = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    if (lease) {
      setSelectedLeaseForTerminate(lease);
      setShowTerminateModal(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedLeaseForDelete) return;

    // Empêcher la suppression si le bail est actif
    if (selectedLeaseForDelete.status === 'active') {
      alert('Impossible de supprimer un bail actif. Veuillez d\'abord clôturer le bail.');
      setShowDeleteModal(false);
      setSelectedLeaseForDelete(null);
      return;
    }

    setActionLoading(true);
    try {
      // Si le bail est en attente de signature, envoyer un email au locataire avant suppression
      const shouldNotifyTenant = selectedLeaseForDelete.status === 'pending_signature';
      
      if (shouldNotifyTenant) {
        try {
          // Récupérer les informations du locataire
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('email, first_name, last_name')
            .eq('id', selectedLeaseForDelete.tenant_id)
            .maybeSingle();

          // Récupérer les informations du propriétaire
          const { data: ownerData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('full_name')
            .eq('id', userId)
            .maybeSingle();

          // Récupérer les informations de la propriété
          const { data: propertyData } = await supabase
            .from('properties_02')
            .select('title, address, city')
            .eq('id', selectedLeaseForDelete.property_id)
            .maybeSingle();

          if (!tenantError && tenantData && tenantData.email) {
            const tenantName = tenantData.first_name && tenantData.last_name
              ? `${tenantData.first_name} ${tenantData.last_name}`
              : 'Locataire';
            
            const ownerName = ownerData?.full_name || 'Propriétaire';
            const propertyTitle = propertyData?.title || selectedLeaseForDelete.property_title || 'Bien immobilier';
            const propertyAddress = propertyData?.address || '';
            const propertyCity = propertyData?.city || '';

            const emailResult = await sendEmail('bail_annule', {
              tenantEmail: tenantData.email,
              tenantName,
              ownerName,
              propertyTitle,
              propertyAddress,
              propertyCity,
              appUrl: window.location.origin,
            });

            if (!emailResult.success) {
              console.error('Erreur lors de l\'envoi de l\'email au locataire:', emailResult.error);
            }
          }
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email au locataire:', emailError);
          // Ne pas bloquer la suppression si l'email échoue
        }
      }

      const { error } = await supabase
        .from('leases')
        .delete()
        .eq('id', selectedLeaseForDelete.id)
        .eq('owner_id', userId);

      if (error) throw error;

      setLeases(prev => prev.filter(l => l.id !== selectedLeaseForDelete.id));
      setShowDeleteModal(false);
      setSelectedLeaseForDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Une erreur est survenue lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!selectedLeaseForTerminate) return;

    setActionLoading(true);
    try {
      // Mettre à jour le statut du bail à 'terminated'
      const { error: leaseError } = await supabase
        .from('leases')
        .update({ status: 'terminated' })
        .eq('id', selectedLeaseForTerminate.id)
        .eq('owner_id', userId);

      if (leaseError) throw leaseError;

      // Mettre à jour le statut de la propriété à 'active' ou 'available'
      if (selectedLeaseForTerminate.property_id) {
        const { error: propertyError } = await supabase
          .from('properties_02')
          .update({ status: 'active' })
          .eq('id', selectedLeaseForTerminate.property_id)
          .eq('owner_id', userId);

        if (propertyError) {
          console.error('Erreur lors de la mise à jour du statut de la propriété:', propertyError);
          // Ne pas bloquer la clôture si la mise à jour de la propriété échoue
        }
      }

      // Récupérer les informations du locataire et du propriétaire pour l'email
      try {
        // Récupérer les informations du locataire
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('email, first_name, last_name')
          .eq('id', selectedLeaseForTerminate.tenant_id)
          .maybeSingle();

        // Récupérer les informations du propriétaire
        const { data: ownerData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name')
          .eq('id', userId)
          .maybeSingle();

        // Récupérer les informations de la propriété
        const { data: propertyData } = await supabase
          .from('properties_02')
          .select('title, address, city')
          .eq('id', selectedLeaseForTerminate.property_id)
          .maybeSingle();

        if (!tenantError && tenantData && tenantData.email) {
          const tenantName = tenantData.first_name && tenantData.last_name
            ? `${tenantData.first_name} ${tenantData.last_name}`
            : 'Locataire';
          
          const ownerName = ownerData?.full_name || 'Propriétaire';
          const propertyTitle = propertyData?.title || selectedLeaseForTerminate.property_title || 'Bien immobilier';
          const propertyAddress = propertyData?.address || '';
          const propertyCity = propertyData?.city || '';
          const endDate = selectedLeaseForTerminate.end_date || '';
          const closureDate = new Date().toISOString();

          const emailResult = await sendEmail('bail_cloture', {
            tenantEmail: tenantData.email,
            tenantName,
            ownerName,
            propertyTitle,
            propertyAddress,
            propertyCity,
            endDate,
            closureDate,
            appUrl: window.location.origin,
          });

          if (!emailResult.success) {
            console.error('Erreur lors de l\'envoi de l\'email au locataire:', emailResult.error);
          }
        }
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email au locataire:', emailError);
        // Ne pas bloquer la clôture si l'email échoue
      }

      await loadLeases();
      setShowTerminateModal(false);
      setSelectedLeaseForTerminate(null);
    } catch (error) {
      console.error('Erreur lors de la clôture:', error);
      alert('Une erreur est survenue lors de la clôture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !leaseFormData.property_id || !leaseFormData.tenant_id) return;

    if (!bailleurLuEtApprouve) {
      alert('Veuillez cocher la case "Lu et approuvé" pour confirmer que vous avez lu et approuvé le contrat.');
      return;
    }

    const confirmer = window.confirm(
      'En cliquant sur OK, vous signez électroniquement le contrat de bail et celui-ci sera transmis à votre locataire pour signature.\n\nConfirmez-vous cette action ?'
    );
    if (!confirmer) return;

    // Validation : la date de fin ne peut pas être antérieure à la date de début
    if (leaseFormData.start_date && leaseFormData.end_date) {
      const startDate = new Date(leaseFormData.start_date);
      const endDate = new Date(leaseFormData.end_date);
      
      if (endDate < startDate) {
        alert('La date de fin de location ne peut pas être antérieure à la date de début.');
        return;
      }
    }

    setActionLoading(true);
    try {
      // Récupérer les informations du locataire et du bien avant la création
      const [tenantData, propertyData, ownerData] = await Promise.all([
        supabase
          .from('tenants')
          .select('first_name, last_name, email')
          .eq('id', leaseFormData.tenant_id)
          .single(),
        supabase
          .from('properties_02')
          .select('title, address, city, property_type')
          .eq('id', leaseFormData.property_id)
          .single(),
        supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email, phone, company_name')
          .eq('id', userId)
          .single()
      ]);

      if (tenantData.error) throw tenantData.error;
      if (propertyData.error) throw propertyData.error;
      if (ownerData.error) throw ownerData.error;

      // Créer le bail
      const { error } = await supabase
        .from('leases')
        .insert([{
          property_02_id: leaseFormData.property_id, // Référence vers properties_02
          owner_id: userId,
          tenant_id: leaseFormData.tenant_id,
          start_date: leaseFormData.start_date,
          end_date: leaseFormData.end_date,
          monthly_rent: parseFloat(leaseFormData.monthly_rent),
          security_deposit: parseFloat(leaseFormData.security_deposit),
          advance_rent_amount: leaseFormData.advance_rent_amount ? parseFloat(leaseFormData.advance_rent_amount) : null,
          payment_due_day: leaseFormData.payment_due_day ? parseInt(leaseFormData.payment_due_day) : null,
          status: 'pending_signature',
          contract_articles: sanitizeContractArticlesForDb(contractArticles),
          additional_notes: leaseFormData.additional_notes || null,
        }]);

      if (error) throw error;

      // Mettre à jour le statut de la propriété à 'rented' pour indiquer qu'elle est louée
      const { error: propertyUpdateError } = await supabase
        .from('properties_02')
        .update({ status: 'rented' })
        .eq('id', leaseFormData.property_id)
        .eq('owner_id', userId);

      if (propertyUpdateError) {
        console.error('Erreur lors de la mise à jour du statut de la propriété:', propertyUpdateError);
        // Ne pas bloquer la création du bail si la mise à jour de la propriété échoue
      }

      setShowCreateLeaseModal(false);
      setContractArticles(getDefaultContractArticles());
      setBailleurLuEtApprouve(false);
      setLeaseFormData({
        property_id: '',
        tenant_id: '',
        start_date: '',
        end_date: '',
        monthly_rent: '',
        security_deposit: '',
        advance_rent_amount: '',
        payment_due_day: '5',
        additional_notes: ''
      });
      await loadLeases();

      // Envoyer l'email d'invitation au locataire
      if (tenantData.data?.email && propertyData.data && ownerData.data) {
        const emailResult = await sendEmail('invitation_bail', {
          tenantEmail: tenantData.data.email,
          tenantName: `${tenantData.data.first_name} ${tenantData.data.last_name}`,
          ownerName: ownerData.data.full_name || 'Propriétaire',
          ownerEmail: ownerData.data.email || '',
          ownerPhone: ownerData.data.phone || '',
          ownerCompany: ownerData.data.company_name || null,
          propertyTitle: propertyData.data.title,
          propertyAddress: propertyData.data.address || '',
          propertyCity: propertyData.data.city || '',
          propertyType: propertyData.data.property_type || '',
          monthlyRent: parseFloat(leaseFormData.monthly_rent),
          startDate: leaseFormData.start_date,
          endDate: leaseFormData.end_date,
        });

        if (emailResult.success) {
          alert('Location créée avec succès ! Un email d\'invitation à signer le contrat de bail a été envoyé au locataire.');
        } else {
          alert(`Location créée avec succès !\n\n⚠️ L'email d'invitation n'a pas pu être envoyé.\nErreur: ${emailResult.error || 'Erreur inconnue'}`);
        }
      } else {
        alert('Location créée avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du bail:', error);
      alert(`Une erreur est survenue lors de la création du bail: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedLeaseForMessage || !messageContent.trim()) return;

    setActionLoading(true);
    try {
      // Envoyer le message via Supabase
      // Récupérer l'email et le nom du locataire depuis la table tenants
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('email, first_name, last_name')
        .eq('id', selectedLeaseForMessage.tenant_id)
        .single();

      if (tenantError) throw tenantError;
      if (!tenantData) throw new Error('Locataire non trouvé');

      // Chercher l'utilisateur correspondant par email dans users_2025_12_01_11_29
      const { data: userData, error: userError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name')
        .eq('email', tenantData.email)
        .single();

      if (userError || !userData) {
        alert('Le locataire n\'a pas de compte utilisateur. Impossible d\'envoyer un message.');
        setActionLoading(false);
        return;
      }

      // Envoyer le message avec l'ID utilisateur trouvé
      const { error } = await supabase.from('messages_2025_12_01_11_29').insert({
        sender_id: userId,
        receiver_id: userData.id,
        content: messageContent.trim(), // Utiliser 'content' au lieu de 'message'
        property_id: selectedLeaseForMessage.property_id,
        read: false,
      });

      if (error) throw error;

      // Récupérer les informations de l'expéditeur
      const { data: senderData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('full_name')
        .eq('id', userId)
        .single();

      // Envoyer un email de notification au destinataire
      const tenantName = userData.full_name || `${tenantData.first_name} ${tenantData.last_name}`;
      const senderName = senderData?.full_name || 'Votre propriétaire';
      
      const emailResult = await sendEmail('nouveau_message', {
        receiverEmail: tenantData.email,
        receiverName: tenantName,
        senderName: senderName,
        propertyTitle: selectedLeaseForMessage.property_title,
        messagePreview: messageContent.trim(),
        appUrl: window.location.origin,
      });

      if (emailResult.success) {
        alert('Message envoyé avec succès ! Un email de notification a été envoyé au destinataire.');
      } else {
        alert(`Message envoyé avec succès !\n\n⚠️ L'email de notification n'a pas pu être envoyé.\nErreur: ${emailResult.error || 'Erreur inconnue'}`);
      }
      setShowMessageModal(false);
      setSelectedLeaseForMessage(null);
      setMessageContent('');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Une erreur est survenue lors de l\'envoi du message');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      pending_signature: { label: 'En attente de signature', color: 'bg-yellow-100 text-yellow-700' },
      active: { label: 'Actif', color: 'bg-green-100 text-green-700' },
      expired: { label: 'Expiré', color: 'bg-red-100 text-red-700' },
      terminated: { label: 'Clôturé', color: 'bg-gray-100 text-gray-700' },
    };
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const filteredLeases = leases.filter(lease => {
    const matchesSearch = 
      lease.property_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.property_address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lease.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leases.length,
    pending_signature: leases.filter(l => l.status === 'pending_signature').length,
    active: leases.filter(l => l.status === 'active').length,
    expired: leases.filter(l => l.status === 'expired').length,
    terminated: leases.filter(l => l.status === 'terminated').length,
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

  if (selectedLease) {
    return (
      <LeaseDetailView
        lease={selectedLease}
        onBack={() => {
          setSelectedLease(null);
          // Nettoyer le paramètre lease de l'URL
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('lease');
          setSearchParams(newParams);
        }}
      />
    );
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Total</span>
            <i className="ri-file-list-3-line text-lg md:text-xl lg:text-2xl text-gray-400 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">En attente</span>
            <i className="ri-time-line text-lg md:text-xl lg:text-2xl text-yellow-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-yellow-600">{stats.pending_signature}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Actifs</span>
            <i className="ri-checkbox-circle-line text-lg md:text-xl lg:text-2xl text-green-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Expirés</span>
            <i className="ri-error-warning-line text-lg md:text-xl lg:text-2xl text-red-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-red-600">{stats.expired}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Clôturés</span>
            <i className="ri-close-circle-line text-lg md:text-xl lg:text-2xl text-gray-400 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-600">{stats.terminated}</div>
        </div>
      </div>

      {/* Filters & Search with Add Button */}
      <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <i className="ri-search-line absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un bail..."
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending_signature">En attente de signature</option>
            <option value="active">Actif</option>
            <option value="expired">Expiré</option>
            <option value="terminated">Clôturé</option>
          </select>
          <button
            onClick={() => setShowCreateLeaseModal(true)}
            className="px-4 md:px-6 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 md:gap-2 w-full md:w-auto justify-center"
          >
            <i className="ri-add-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
            <span className="hidden sm:inline">Créer une location</span>
            <span className="sm:hidden">Créer</span>
          </button>
        </div>
      </div>

      {/* Leases List */}
      {filteredLeases.length === 0 ? (
        <div className="bg-white rounded-lg md:rounded-xl p-8 md:p-12 text-center">
          <i className="ri-file-list-3-line text-4xl md:text-5xl lg:text-6xl text-gray-300 mb-3 md:mb-4"></i>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Aucun bail trouvé</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Aucun bail ne correspond à vos critères de recherche'
              : 'Vous n\'avez pas encore de bail enregistré'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateLeaseModal(true)}
              className="px-5 md:px-6 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-2"
            >
              <i className="ri-add-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
              Créer votre première location
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredLeases.map((lease) => {
            const statusInfo = getStatusLabel(lease.status);
            const daysRemaining = getDaysRemaining(lease.end_date);
            const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
            
            return (
              <div
                key={lease.id}
                onClick={() => {
                  setSelectedLease(lease);
                  // Mettre à jour l'URL avec le paramètre lease
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('lease', lease.id);
                  setSearchParams(newParams);
                }}
                className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-3 md:mb-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 break-words">{lease.property_title}</h3>
                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${statusInfo.color} flex-shrink-0`}>
                        {statusInfo.label}
                      </span>
                      {isExpiringSoon && (
                        <span className="px-2 md:px-3 py-0.5 md:py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] md:text-xs font-semibold flex-shrink-0">
                          Expire dans {daysRemaining} jours
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-xs md:text-sm mb-2 md:mb-3 flex items-center gap-2">
                      <i className="ri-map-pin-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
                      <span className="truncate">{lease.property_address}</span>
                    </p>
                  </div>
                  <div className="text-left md:text-right flex-shrink-0">
                    <div className="text-xl md:text-2xl font-bold text-teal-600 mb-1">
                      {formatPrice(lease.monthly_rent)}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">par mois</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3 md:mb-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Locataire</div>
                    <div className="font-semibold text-gray-900 text-sm md:text-base">{lease.tenant_name}</div>
                    <div className="text-xs md:text-sm text-gray-600 truncate">{lease.tenant_email}</div>
                    <div className="text-xs md:text-sm text-gray-600">{lease.tenant_phone}</div>
                  </div>
                  <div>
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Période du bail</div>
                    <div className="font-semibold text-gray-900 text-xs md:text-sm">
                      {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 mt-2">Dépôt de garantie</div>
                    <div className="font-semibold text-gray-900 text-sm md:text-base">{formatPrice(lease.security_deposit)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedLeaseForMessage(lease);
                      setShowMessageModal(true);
                    }}
                    className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded-md md:rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Envoyer un message</span>
                    <span className="sm:hidden">Message</span>
                  </button>
                  {lease.status === 'active' && (
                    <button
                      onClick={() => handleCloseLease(lease.id)}
                      className="px-3 md:px-4 py-1.5 md:py-2 bg-orange-600 text-white rounded-md md:rounded-lg text-xs md:text-sm font-medium hover:bg-orange-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Clôturer
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteLease(lease.id)}
                    disabled={lease.status === 'active'}
                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      lease.status === 'active'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title={lease.status === 'active' ? 'Impossible de supprimer un bail actif. Clôturez-le d\'abord.' : 'Supprimer'}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lease Modal */}
      {showCreateLeaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-[900px] w-full p-4 md:p-6 lg:p-8 my-4 md:my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                Créer une nouvelle location
              </h3>
              <button
                onClick={() => {
                  setShowCreateLeaseModal(false);
                  setContractArticles(getDefaultContractArticles());
                  setBailleurLuEtApprouve(false);
                }}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl md:text-2xl w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex gap-2 md:gap-3">
                <i className="ri-information-line text-blue-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-0.5"></i>
                <div className="text-xs md:text-sm text-blue-800">
                  <p className="font-semibold mb-1">Comment créer une location ?</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Sélectionnez un bien disponible</li>
                    <li>Choisissez ou ajoutez un locataire</li>
                    <li>Définissez les conditions du bail</li>
                    <li>Personnalisez les articles du contrat si nécessaire</li>
                    <li>Un email d'invitation sera envoyé au locataire</li>
                  </ol>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateLease} className="space-y-4 md:space-y-6">
              {/* Property Selection */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Bien à louer <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={leaseFormData.property_id}
                  onChange={(e) => setLeaseFormData({ ...leaseFormData, property_id: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                >
                  <option value="">Sélectionnez un bien</option>
                  {availableProperties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.title} - {prop.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tenant Selection */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Locataire <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={leaseFormData.tenant_id}
                  onChange={(e) => setLeaseFormData({ ...leaseFormData, tenant_id: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer mb-2"
                >
                  <option value="">Sélectionnez un locataire</option>
                  {availableTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name} - {tenant.email}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] md:text-xs text-gray-500">
                  Si le locataire n'existe pas, ajoutez-le d'abord dans l'onglet "Locataires"
                </p>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={leaseFormData.start_date}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      // Si la date de fin existe et devient antérieure à la nouvelle date de début, la réinitialiser
                      if (leaseFormData.end_date && newStartDate) {
                        const startDate = new Date(newStartDate);
                        const endDate = new Date(leaseFormData.end_date);
                        if (endDate < startDate) {
                          setLeaseFormData({ ...leaseFormData, start_date: newStartDate, end_date: '' });
                        } else {
                          setLeaseFormData({ ...leaseFormData, start_date: newStartDate });
                        }
                      } else {
                        setLeaseFormData({ ...leaseFormData, start_date: newStartDate });
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={leaseFormData.start_date || undefined}
                    value={leaseFormData.end_date}
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      // Validation immédiate : si la date de fin est antérieure à la date de début, on ne met pas à jour
                      if (leaseFormData.start_date && newEndDate) {
                        const startDate = new Date(leaseFormData.start_date);
                        const endDate = new Date(newEndDate);
                        if (endDate < startDate) {
                          alert('La date de fin ne peut pas être antérieure à la date de début.');
                          return;
                        }
                      }
                      setLeaseFormData({ ...leaseFormData, end_date: newEndDate });
                    }}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  {leaseFormData.start_date && leaseFormData.end_date && new Date(leaseFormData.end_date) < new Date(leaseFormData.start_date) && (
                    <p className="text-red-500 text-[10px] md:text-xs mt-1">La date de fin doit être postérieure à la date de début.</p>
                  )}
                </div>
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                    Loyer mensuel (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="250000"
                    value={leaseFormData.monthly_rent}
                    onChange={(e) => setLeaseFormData({ ...leaseFormData, monthly_rent: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                    Dépôt de garantie (FCFA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="500000"
                    value={leaseFormData.security_deposit}
                    onChange={(e) => setLeaseFormData({ ...leaseFormData, security_deposit: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  {leaseFormData.monthly_rent && leaseFormData.security_deposit && parseFloat(leaseFormData.security_deposit) > 2 * parseFloat(leaseFormData.monthly_rent) && (
                    <p className="text-amber-600 text-[10px] md:text-xs mt-1 font-medium">
                      ⚠️ Ces montants sont légalement limités à 2 mois de loyer.
                    </p>
                  )}
                </div>
              </div>

              {/* Advance Rent and Payment Due Day */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                    Montant d'avance sur loyer (FCFA)
                  </label>
                  <input
                    type="number"
                    placeholder="250000"
                    value={leaseFormData.advance_rent_amount}
                    onChange={(e) => setLeaseFormData({ ...leaseFormData, advance_rent_amount: e.target.value })}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                    Montant payé par le locataire lors de la signature du bail
                  </p>
                  {leaseFormData.monthly_rent && leaseFormData.advance_rent_amount && parseFloat(leaseFormData.advance_rent_amount) > 2 * parseFloat(leaseFormData.monthly_rent) && (
                    <p className="text-amber-600 text-[10px] md:text-xs mt-1 font-medium">
                      ⚠️ Ces montants sont légalement limités à 2 mois de loyer.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                    Jour d'échéance de paiement <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    placeholder="5"
                    value={leaseFormData.payment_due_day}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Validation : seulement les nombres entre 1 et 31
                      if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
                        setLeaseFormData({ ...leaseFormData, payment_due_day: value });
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  <p className="text-[10px] md:text-xs text-gray-500 mt-1">
                    Jour du mois où le locataire doit payer (1-31)
                  </p>
                </div>
              </div>

              {/* Articles du contrat (modifiables) */}
              <div className="border-t border-gray-200 pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <i className="ri-file-text-line text-xl md:text-2xl text-teal-600 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"></i>
                  <h4 className="text-base md:text-lg font-bold text-gray-900">Articles du contrat (modifiables)</h4>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mb-3">
                  Les 17 articles sont modifiables. Les valeurs dynamiques (loyer, adresse, etc.) sont insérées automatiquement.
                </p>
                <LeaseContractArticlesEditor
                  contractArticles={contractArticles}
                  onChange={setContractArticles}
                  replacements={{
                    property_address: (() => {
                      const p = availableProperties.find((pr) => pr.id === leaseFormData.property_id);
                      return p?.address || '—';
                    })(),
                    property_city: (() => {
                      const p = availableProperties.find((pr) => pr.id === leaseFormData.property_id);
                      return p?.city ? `, ${p.city}` : '';
                    })(),
                    consistance: (() => {
                      const p = availableProperties.find((pr) => pr.id === leaseFormData.property_id);
                      if (!p) return '—';
                      const type = p.property_type === 'apartment' ? 'Appartement' : p.property_type === 'villa' ? 'Villa' : p.property_type === 'house' ? 'Maison' : 'Appartement/Villa';
                      const parts = [type, p.bedrooms ? `${p.bedrooms} pièce(s)` : '', p.surface_area ? `${p.surface_area} m²` : ''].filter(Boolean);
                      return parts.join(', ') || '—';
                    })(),
                    equipments: leaseFormData.additional_notes?.trim() || (() => {
                      const p = availableProperties.find((pr) => pr.id === leaseFormData.property_id);
                      const f = p?.features;
                      return (Array.isArray(f) ? f.join(', ') : f) || '—';
                    })(),
                    duration_years: leaseFormData.start_date && leaseFormData.end_date
                      ? (() => {
                          const d1 = new Date(leaseFormData.start_date);
                          const d2 = new Date(leaseFormData.end_date);
                          const years = Math.round((d2.getTime() - d1.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                          return years >= 1 ? `${years} an(s)` : '1 an';
                        })()
                      : '—',
                    start_date: leaseFormData.start_date ? new Date(leaseFormData.start_date).toLocaleDateString('fr-FR') : '—',
                    monthly_rent: leaseFormData.monthly_rent ? Number(leaseFormData.monthly_rent).toLocaleString('fr-FR') : '0',
                    payment_due_day: leaseFormData.payment_due_day || '5',
                    advance_amount: leaseFormData.advance_rent_amount ? Number(leaseFormData.advance_rent_amount).toLocaleString('fr-FR') : '0',
                    deposit_amount: leaseFormData.security_deposit ? Number(leaseFormData.security_deposit).toLocaleString('fr-FR') : '0',
                  }}
                />
              </div>

              {/* Aperçu du contrat */}
              <div className="border-t border-gray-200 pt-4 md:pt-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <i className="ri-file-list-3-line text-xl md:text-2xl text-teal-600 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"></i>
                  <h4 className="text-base md:text-lg font-bold text-gray-900">Aperçu du contrat</h4>
                </div>
                <LeaseContractPreview
                  data={{
                    owner: ownerData || undefined,
                    tenant: leaseFormData.tenant_id ? availableTenants.find((t) => t.id === leaseFormData.tenant_id) || undefined : undefined,
                    property: leaseFormData.property_id ? availableProperties.find((p) => p.id === leaseFormData.property_id) || undefined : undefined,
                    lease: {
                      start_date: leaseFormData.start_date || undefined,
                      end_date: leaseFormData.end_date || undefined,
                      monthly_rent: leaseFormData.monthly_rent || undefined,
                      security_deposit: leaseFormData.security_deposit || undefined,
                      advance_rent_amount: leaseFormData.advance_rent_amount || undefined,
                      payment_due_day: leaseFormData.payment_due_day || '5',
                      additional_notes: leaseFormData.additional_notes || undefined,
                      contract_articles: contractArticles,
                    },
                  }}
                  maxHeight="max-h-64 sm:max-h-72"
                  showBailleurLuEtApprouve={bailleurLuEtApprouve}
                />
              </div>

              

              {/* Additional Notes */}
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Notes additionnelles
                </label>
                <textarea
                  rows={3}
                  placeholder="Conditions particulières, équipements inclus, etc."
                  value={leaseFormData.additional_notes}
                  onChange={(e) => setLeaseFormData({ ...leaseFormData, additional_notes: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-xs md:text-sm"
                />
              </div>

              {/* Lu et approuvé - Bailleur */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl">
                <input
                  type="checkbox"
                  id="bailleur-lu-approuve"
                  checked={bailleurLuEtApprouve}
                  onChange={(e) => setBailleurLuEtApprouve(e.target.checked)}
                  className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="bailleur-lu-approuve" className="text-sm text-gray-800 cursor-pointer select-none">
                  Je déclare avoir lu et approuvé le présent contrat de bail.
                </label>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-3 md:pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateLeaseModal(false);
                    setContractArticles(getDefaultContractArticles());
                    setBailleurLuEtApprouve(false);
                    setLeaseFormData({
                      property_id: '',
                      tenant_id: '',
                      start_date: '',
                      end_date: '',
                      monthly_rent: '',
                      security_deposit: '',
                      advance_rent_amount: '',
                      payment_due_day: '5',
                      additional_notes: ''
                    });
                  }}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                      Création...
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                      Créer la location
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedLeaseForDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-[500px] w-full p-6 md:p-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <i className="ri-delete-bin-line text-2xl md:text-3xl text-red-600 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center"></i>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2 md:mb-3">
              Supprimer ce bail ?
            </h3>
            {selectedLeaseForDelete.status === 'active' ? (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6">
                <div className="flex gap-2 md:gap-3">
                  <i className="ri-error-warning-line text-yellow-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-0.5"></i>
                  <p className="text-xs md:text-sm text-yellow-900">
                    <strong>Impossible de supprimer un bail actif.</strong> Veuillez d'abord clôturer le bail avant de pouvoir le supprimer.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm md:text-base text-gray-600 text-center mb-6 md:mb-8">
                Cette action est irréversible. Le bail pour "{selectedLeaseForDelete.property_title}" sera définitivement supprimé.
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedLeaseForDelete(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
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

      {/* Terminate Modal */}
      {showTerminateModal && selectedLeaseForTerminate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-[500px] w-full p-6 md:p-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
              <i className="ri-close-circle-line text-2xl md:text-3xl text-orange-600 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center"></i>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-2 md:mb-3">
              Clôturer ce bail ?
            </h3>
            <p className="text-sm md:text-base text-gray-600 text-center mb-6 md:mb-8">
              Le bail pour "{selectedLeaseForTerminate.property_title}" sera marqué comme clôturé. Cette action peut être annulée ultérieurement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={() => {
                  setShowTerminateModal(false);
                  setSelectedLeaseForTerminate(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleTerminate}
                disabled={actionLoading}
                className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-orange-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-orange-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    Clôture...
                  </>
                ) : (
                  'Clôturer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && selectedLeaseForMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-[600px] w-full p-5 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                Envoyer un message
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedLeaseForMessage(null);
                  setMessageContent('');
                }}
                className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl md:text-2xl w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"></i>
              </button>
            </div>
            <div className="mb-4 md:mb-6">
              <div className="text-xs md:text-sm text-gray-600 mb-1">À</div>
              <div className="font-semibold text-gray-900 text-sm md:text-base">{selectedLeaseForMessage.tenant_name}</div>
              <div className="text-xs md:text-sm text-gray-600 truncate">{selectedLeaseForMessage.tenant_email}</div>
            </div>
            <div className="mb-4 md:mb-6">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Concernant</div>
              <div className="font-semibold text-gray-900 text-sm md:text-base break-words">{selectedLeaseForMessage.property_title}</div>
            </div>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={5}
              maxLength={500}
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-xs md:text-sm mb-2"
            />
            <div className="text-[10px] md:text-xs text-gray-500 mb-4 md:mb-6">
              {messageContent.length}/500 caractères
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setSelectedLeaseForMessage(null);
                  setMessageContent('');
                }}
                disabled={actionLoading}
                className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-gray-100 text-gray-700 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSendMessage}
                disabled={actionLoading || !messageContent.trim()}
                className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    Envoi...
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-fill w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    Envoyer
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
