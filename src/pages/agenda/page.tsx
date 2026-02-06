import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEmail } from '../../hooks/useEmail';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

interface CalendarEvent {
  id: string;
  type: 'visit' | 'payment';
  title: string;
  date: Date;
  time?: string;
  amount?: number;
  status?: string;
  propertyAddress?: string;
  visitorName?: string;
  listingId?: string;
  leaseId?: string;
  isOwner?: boolean; // Pour les paiements : true si l'utilisateur est propriétaire, false si locataire
}

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  owner_id: string;
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const { sendEmail } = useEmail();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [formData, setFormData] = useState({
    property_id: '',
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    visit_date: '',
    visit_time: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadEvents(user.id);
      loadProperties();
    }
  }, [currentDate, user]);

  const loadProperties = async () => {
    if (!user) return;
    
    try {
      setLoadingProperties(true);
      const { data, error } = await supabase
        .from('properties')
        .select('id, title, address, city, owner_id')
        .eq('owner_id', user.id)
        .order('title', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (userId: string) => {
    try {
      setLoading(true);
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Récupérer l'email de l'utilisateur connecté pour filtrer les visites par email
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;

      // Construire la condition OR pour les visites
      // Le visiteur peut voir ses visites si :
      // 1. Il est le propriétaire (owner_id = userId)
      // 2. Il est le visiteur avec un compte (visitor_id = userId)
      // 3. Son email correspond à visitor_email (même sans visitor_id renseigné)
      let visitFilter = `owner_id.eq.${userId}`;
      if (userEmail) {
        visitFilter += `,visitor_id.eq.${userId},visitor_email.eq.${userEmail}`;
      } else {
        visitFilter += `,visitor_id.eq.${userId}`;
      }

      // Charger les visites
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          visit_time,
          visitor_name,
          visitor_email,
          status,
          property_id,
          properties (
            id,
            title,
            address,
            owner_id
          )
        `)
        .gte('visit_date', startOfMonth.toISOString().split('T')[0])
        .lte('visit_date', endOfMonth.toISOString().split('T')[0])
        .or(visitFilter);

      if (visitsError) {
        console.error('Erreur lors du chargement des visites:', visitsError);
        throw visitsError;
      }

      // Charger les paiements de loyer depuis la table payments (sans jointure)
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, due_date, amount, status, payment_date, lease_id')
        .gte('due_date', startOfMonth.toISOString().split('T')[0])
        .lte('due_date', endOfMonth.toISOString().split('T')[0]);

      if (paymentsError) {
        console.error('Erreur lors du chargement des paiements:', paymentsError);
        throw paymentsError;
      }

      console.log('📊 Paiements bruts chargés:', payments);
      console.log('📊 Nombre de paiements bruts:', payments?.length || 0);
      
      // Transformer les visites en événements (avant de traiter les paiements)
      const visitEvents: CalendarEvent[] = (visits || []).map((visit: any) => ({
        id: visit.id,
        type: 'visit',
        title: `Visite - ${visit.properties?.title || 'Bien'}`,
        date: new Date(visit.visit_date),
        time: visit.visit_time,
        propertyAddress: visit.properties?.address,
        visitorName: visit.visitor_name,
        listingId: visit.properties?.id,
        status: visit.status,
      }));

      if (!payments || payments.length === 0) {
        console.warn('⚠️ Aucun paiement chargé pour ce mois. Vérifiez les dates et les données.');
        setEvents(visitEvents);
        setLoading(false);
        return;
      }

      // Charger les baux (leases) séparément
      const leaseIds = [...new Set(payments.map((p: any) => p.lease_id).filter(Boolean))];
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('id, property_id, owner_id, tenant_id')
        .in('id', leaseIds);

      if (leasesError) {
        console.error('Erreur lors du chargement des baux:', leasesError);
        throw leasesError;
      }

      // Charger les propriétés séparément
      const propertyIds = [...new Set(leases?.map((l: any) => l.property_id).filter(Boolean) || [])];
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, address, owner_id')
        .in('id', propertyIds);

      if (propertiesError) {
        console.error('Erreur lors du chargement des propriétés:', propertiesError);
        throw propertiesError;
      }

      // Charger les locataires séparément
      const tenantIds = [...new Set(leases?.map((l: any) => l.tenant_id).filter(Boolean) || [])];
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, email, first_name, last_name')
        .in('id', tenantIds);

      if (tenantsError) {
        console.error('Erreur lors du chargement des locataires:', tenantsError);
        throw tenantsError;
      }

      // Créer des Maps pour accès rapide
      const leasesMap = new Map(leases?.map((l: any) => [l.id, l]) || []);
      const propertiesMap = new Map(properties?.map((p: any) => [p.id, p]) || []);
      const tenantsMap = new Map(tenants?.map((t: any) => [t.id, t]) || []);

      // Récupérer les user_id des locataires pour filtrer les paiements
      const tenantEmails = tenants?.map((t: any) => t.email).filter(Boolean) || [];
      let tenantUserIds: string[] = [];
      if (tenantEmails.length > 0) {
        const { data: tenantUsers } = await supabase
          .from('users_2025_12_01_11_29')
          .select('id, email')
          .in('email', tenantEmails);

        if (tenantUsers) {
          tenantUserIds = tenantUsers.map(u => u.id);
        }
      }

      console.log('📊 Debug Agenda - Paiements chargés:', payments?.length || 0);
      console.log('📊 Debug Agenda - User ID:', userId);
      console.log('📊 Debug Agenda - Tenant User IDs:', tenantUserIds);
      console.log('📊 Debug Agenda - Détails paiements:', payments);

      // Transformer les paiements en événements (filtrer par rôle utilisateur)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const paymentEvents: CalendarEvent[] = (payments || [])
        .filter((payment: any) => {
          // Récupérer les données associées depuis les Maps
          const lease = leasesMap.get(payment.lease_id);
          const property = lease ? propertiesMap.get(lease.property_id) : null;
          const tenant = lease ? tenantsMap.get(lease.tenant_id) : null;
          
          // Vérifier si l'utilisateur est propriétaire
          const isOwner = property?.owner_id === userId;
          
          // Vérifier si l'utilisateur est locataire
          const tenantEmail = tenant?.email;
          const isTenant = tenantEmail && tenantUserIds.includes(userId);
          
          // Debug pour chaque paiement
          console.log('🔍 Debug paiement:', {
            paymentId: payment.id,
            leaseId: payment.lease_id,
            hasLease: !!lease,
            hasProperty: !!property,
            ownerId: property?.owner_id,
            userId,
            isOwner,
            tenantEmail,
            tenantUserIds,
            isTenant,
            included: isOwner || isTenant
          });
          
          // Filtrer uniquement les paiements où l'utilisateur est propriétaire ou locataire
          return isOwner || isTenant;
        })
        .map((payment: any) => {
          // Récupérer les données associées depuis les Maps
          const lease = leasesMap.get(payment.lease_id);
          const property = lease ? propertiesMap.get(lease.property_id) : null;
          
          // Vérifier si l'utilisateur est propriétaire pour ce paiement
          const isOwner = property?.owner_id === userId;
          
          // Utiliser due_date de la table payments pour représenter le paiement
          const dueDate = new Date(payment.due_date);
          dueDate.setHours(0, 0, 0, 0);
          
          // Déterminer le statut basé sur la date d'échéance (due_date) et le statut actuel
          let status: 'paid' | 'pending' | 'overdue' = 'pending';
          
          if (payment.status === 'paid') {
            // Si le paiement est marqué comme payé dans la DB
            status = 'paid';
          } else if (payment.status === 'cancelled') {
            // Si le paiement est annulé, on peut le considérer comme pending ou l'exclure
            status = 'pending';
          } else {
            // Si le paiement est en attente (pending), vérifier si la date d'échéance est dépassée
            if (dueDate < today) {
              // La date d'échéance est passée et le paiement n'est pas payé
              status = 'overdue';
            } else {
              // La date d'échéance n'est pas encore atteinte
              status = 'pending';
            }
          }
          
          return {
            id: payment.id,
            type: 'payment' as const,
            title: `Loyer - ${property?.title || 'Bien'}`,
            date: dueDate, // Utiliser due_date comme date de l'événement
            amount: Number(payment.amount) || 0,
            status: status, // Statut calculé basé sur due_date et payment.status
            propertyAddress: property?.address || '',
            leaseId: payment.lease_id, // Stocker le lease_id pour la navigation
            isOwner: isOwner, // Stocker si l'utilisateur est propriétaire
          };
        });

      console.log('📅 Debug Agenda - Visites:', visitEvents.length);
      console.log('📅 Debug Agenda - Paiements filtrés:', paymentEvents.length);
      console.log('📅 Debug Agenda - Total événements:', visitEvents.length + paymentEvents.length);
      console.log('📅 Debug Agenda - Événements paiements:', paymentEvents);
      
      const allEvents = [...visitEvents, ...paymentEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
      console.log('📅 Debug Agenda - Tous les événements triés:', allEvents);
      console.log('📅 Debug Agenda - Événements à afficher:', allEvents.length);
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    return events.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'visit' && event.listingId) {
      // Navigation vers la page de gestion locative avec le bien sélectionné
      navigate(`/gestion-locative?tab=properties&property=${event.listingId}`);
    } else if (event.type === 'payment' && event.leaseId) {
      // Navigation vers la page de gestion locative ou mes locations selon le rôle
      if (event.isOwner) {
        // Propriétaire : aller vers gestion locative avec le bail sélectionné
        navigate(`/gestion-locative?tab=leases&lease=${event.leaseId}`);
      } else {
        // Locataire : aller vers mes locations
        navigate(`/mes-locations?lease=${event.leaseId}`);
      }
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      // Récupérer les informations de la propriété sélectionnée
      const selectedProperty = properties.find(p => p.id === formData.property_id);
      if (!selectedProperty) {
        setError('Veuillez sélectionner un bien');
        setSubmitting(false);
        return;
      }

      // Créer la visite
      const { error: insertError } = await supabase.from('visits').insert({
        property_id: selectedProperty.id,
        visitor_id: null,
        owner_id: selectedProperty.owner_id,
        visitor_name: formData.visitor_name,
        visitor_email: formData.visitor_email,
        visitor_phone: formData.visitor_phone,
        visit_date: formData.visit_date,
        visit_time: formData.visit_time,
        message: formData.notes,
        status: 'confirmed',
      });

      if (insertError) throw insertError;

      // Envoyer un email d'invitation au visiteur
      try {
        const { data: ownerData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email, phone')
          .eq('id', selectedProperty.owner_id)
          .maybeSingle();

        await sendEmail('visite_programmee', {
          visitorEmail: formData.visitor_email,
          visitorName: formData.visitor_name,
          propertyTitle: selectedProperty.title,
          propertyAddress: `${selectedProperty.address}, ${selectedProperty.city}`,
          visitDate: formData.visit_date,
          visitTime: formData.visit_time,
          ownerName: ownerData?.full_name || 'Le propriétaire',
          ownerEmail: ownerData?.email,
          ownerPhone: ownerData?.phone,
          message: formData.notes || undefined,
        });
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailError);
      }

      setSuccess(true);
      setFormData({
        property_id: '',
        visitor_name: '',
        visitor_email: '',
        visitor_phone: '',
        visit_date: '',
        visit_time: '',
        notes: '',
      });
      
      // Recharger les événements pour afficher la nouvelle visite
      setTimeout(() => {
        loadEvents(user.id);
        setShowScheduleForm(false);
      }, 1500);
    } catch (err) {
      console.error('Erreur lors de la planification de la visite:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <i className="ri-loader-4-line text-3xl sm:text-4xl text-teal-600 animate-spin"></i>
            <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement de l'agenda...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Si pas d'utilisateur connecté
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <div className="pt-16 md:pt-24 pb-12 md:pb-20">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 lg:p-12 max-w-[600px] w-full text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <i className="ri-calendar-line text-3xl md:text-4xl text-teal-600 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Mon Agenda</h2>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg mb-6 md:mb-8">
                  Pour accéder à votre agenda, vous devez être connecté à votre compte
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                  <a
                    href="/connexion"
                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-login-box-line text-lg md:text-xl"></i>
                    Se connecter
                  </a>
                  <a
                    href="/inscription"
                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-user-add-line text-lg md:text-xl"></i>
                    Créer un compte
                  </a>
                </div>
                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
                  <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">Pourquoi créer un compte ?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-left">
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Gérer vos visites et rendez-vous</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Suivre vos échéances de paiement</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Organiser votre calendrier</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Recevoir des notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <div className="pt-16 md:pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Mon Agenda</h1>
              <p className="text-sm sm:text-base text-gray-600">Gérez vos visites et échéances de paiement</p>
            </div>
            {!showScheduleForm && (
              <button
                onClick={() => setShowScheduleForm(true)}
                className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-add-circle-line text-lg sm:text-xl"></i>
                Créer une visite
              </button>
            )}
          </div>

        {/* Schedule Visit Form */}
        {showScheduleForm && (
          <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Créer une visite</h3>
              <button
                onClick={() => {
                  setShowScheduleForm(false);
                  setSuccess(false);
                  setError('');
                  setFormData({
                    property_id: '',
                    visitor_name: '',
                    visitor_email: '',
                    visitor_phone: '',
                    visit_date: '',
                    visit_time: '',
                    notes: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <i className="ri-close-line text-xl sm:text-2xl"></i>
              </button>
            </div>

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 text-sm">
                  <i className="ri-check-line"></i>
                  Visite créée avec succès ! Le visiteur recevra un email.
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 text-sm">
                  <i className="ri-error-warning-line"></i>
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleScheduleVisit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bien immobilier *
                </label>
                {loadingProperties ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <i className="ri-loader-4-line animate-spin"></i>
                    Chargement des biens...
                  </div>
                ) : properties.length === 0 ? (
                  <p className="text-sm text-gray-600">Aucun bien disponible. Vous devez avoir au moins un bien pour créer une visite.</p>
                ) : (
                  <select
                    required
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  >
                    <option value="">Sélectionner un bien</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.title} - {property.address}, {property.city}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du visiteur *
                </label>
                <input
                  type="text"
                  required
                  value={formData.visitor_name}
                  onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="Nom complet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.visitor_email}
                  onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="email@exemple.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.visitor_phone}
                  onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.visit_date}
                    onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Heure *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.visit_time}
                    onChange={(e) => setFormData({ ...formData, visit_time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message d'invitation
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm"
                  placeholder="Message personnalisé pour inviter le visiteur..."
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || properties.length === 0}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {submitting ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      Création...
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-line"></i>
                      Créer la visite
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                    setSuccess(false);
                    setError('');
                    setFormData({
                      property_id: '',
                      visitor_name: '',
                      visitor_email: '',
                      visitor_phone: '',
                      visit_date: '',
                      visit_time: '',
                      notes: '',
                    });
                  }}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center justify-center gap-1 sm:gap-2 flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="ri-calendar-line"></i>
              <span className="hidden sm:inline">Vue mensuelle</span>
              <span className="sm:hidden">Mois</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center justify-center gap-1 sm:gap-2 flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <i className="ri-list-check"></i>
              <span className="hidden sm:inline">Vue liste</span>
              <span className="sm:hidden">Liste</span>
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded"></div>
              <span className="text-xs sm:text-sm text-gray-600">Visites</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded"></div>
              <span className="text-xs sm:text-sm text-gray-600">Paiements</span>
            </div>
          </div>
        </div>

        {viewMode === 'month' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4 md:p-6">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h2>
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={previousMonth}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <i className="ri-arrow-left-s-line text-lg sm:text-xl"></i>
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <i className="ri-arrow-right-s-line text-lg sm:text-xl"></i>
                    </button>
                  </div>
                </div>

                {/* Day Names */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 py-1 sm:py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {getDaysInMonth().map((date, index) => {
                    const dayEvents = date ? getEventsForDate(date) : [];
                    const hasVisits = dayEvents.some(e => e.type === 'visit');
                    const hasPayments = dayEvents.some(e => e.type === 'payment');
                    
                    return (
                      <div
                        key={index}
                        onClick={() => date && setSelectedDate(date)}
                        className={`min-h-16 sm:min-h-20 md:min-h-24 p-1 sm:p-2 rounded-lg border transition-all cursor-pointer ${
                          !date
                            ? 'bg-gray-50 border-transparent'
                            : isToday(date)
                            ? 'bg-teal-50 border-teal-500 border-2'
                            : selectedDate && 
                              date.getDate() === selectedDate.getDate() &&
                              date.getMonth() === selectedDate.getMonth()
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {date && (
                          <>
                            <div className={`text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                              isToday(date) ? 'text-teal-600' : 'text-gray-900'
                            }`}>
                              {date.getDate()}
                            </div>
                            <div className="space-y-0.5 sm:space-y-1">
                              {hasVisits && (
                                <div className="w-full h-1 sm:h-1.5 bg-blue-500 rounded-full"></div>
                              )}
                              {hasPayments && (
                                <div className="w-full h-1 sm:h-1.5 bg-orange-500 rounded-full"></div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected Date Events */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 sticky top-4 sm:top-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                  {selectedDate
                    ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}`
                    : 'Sélectionnez une date'}
                </h3>

                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <i className="ri-calendar-check-line text-3xl sm:text-4xl text-gray-300 mb-2"></i>
                    <p className="text-xs sm:text-sm text-gray-500">Aucun événement</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {selectedDateEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={`p-3 sm:p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all ${
                          event.type === 'visit'
                            ? 'bg-blue-50 border-blue-500 hover:bg-blue-100'
                            : 'bg-orange-50 border-orange-500 hover:bg-orange-100'
                        }`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${
                            event.type === 'visit' ? 'bg-blue-500' : 'bg-orange-500'
                          }`}>
                            <i className={`${
                              event.type === 'visit' ? 'ri-eye-line' : 'ri-money-euro-circle-line'
                            } text-white text-base sm:text-lg`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">
                              {event.title}
                            </h4>
                            {event.time && (
                              <p className="text-[10px] sm:text-xs text-gray-600 mb-1">
                                <i className="ri-time-line mr-1"></i>
                                {event.time}
                              </p>
                            )}
                            {event.propertyAddress && (
                              <p className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">
                                <i className="ri-map-pin-line mr-1"></i>
                                {event.propertyAddress}
                              </p>
                            )}
                            {event.visitorName && (
                              <p className="text-[10px] sm:text-xs text-gray-600 mb-1">
                                <i className="ri-user-line mr-1"></i>
                                {event.visitorName}
                              </p>
                            )}
                            {event.amount && (
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-2">
                                {event.amount.toLocaleString('fr-FR')} FCFA
                              </p>
                            )}
                            {event.status && (
                              <span className={`inline-block px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium mt-2 ${
                                // Statuts pour les paiements
                                event.type === 'payment' && event.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : event.type === 'payment' && event.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : event.type === 'payment' && event.status === 'overdue'
                                  ? 'bg-red-100 text-red-700'
                                  // Statuts pour les visites
                                  : event.type === 'visit' && event.status === 'confirmed'
                                  ? 'bg-green-100 text-green-700'
                                  : event.type === 'visit' && event.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : event.type === 'visit' && event.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : event.type === 'visit' && event.status === 'completed'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {event.type === 'payment' 
                                  ? (event.status === 'paid' ? 'Payé' : event.status === 'pending' ? 'En attente' : 'En retard')
                                  : event.type === 'visit'
                                  ? (event.status === 'confirmed' ? 'Confirmée' : event.status === 'pending' ? 'En attente' : event.status === 'cancelled' ? 'Annulée' : event.status === 'completed' ? 'Effectuée' : event.status)
                                  : event.status}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                Tous les événements - {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
                <button
                  onClick={previousMonth}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap text-xs sm:text-sm"
                >
                  <i className="ri-arrow-left-s-line"></i>
                  Mois précédent
                </button>
                <button
                  onClick={nextMonth}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap text-xs sm:text-sm"
                >
                  Mois suivant
                  <i className="ri-arrow-right-s-line"></i>
                </button>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <i className="ri-calendar-check-line text-4xl sm:text-5xl md:text-6xl text-gray-300 mb-3 sm:mb-4"></i>
                <p className="text-sm sm:text-base md:text-lg text-gray-500">Aucun événement ce mois-ci</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {events.map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => handleEventClick(event)}
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg flex-shrink-0 ${
                        event.type === 'visit' ? 'bg-blue-500' : 'bg-orange-500'
                      }`}>
                        <i className={`${
                          event.type === 'visit' ? 'ri-eye-line' : 'ri-money-euro-circle-line'
                        } text-white text-lg sm:text-xl`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between mb-2 gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-1">
                              {event.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                              <i className="ri-calendar-line mr-1"></i>
                              {event.date.toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                              {event.time && ` à ${event.time}`}
                            </p>
                          </div>
                          {event.amount && (
                            <div className="text-left sm:text-right">
                              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                {event.amount.toLocaleString('fr-FR')} FCFA
                              </p>
                            </div>
                          )}
                        </div>
                        {event.propertyAddress && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">
                            <i className="ri-map-pin-line mr-1"></i>
                            {event.propertyAddress}
                          </p>
                        )}
                        {event.visitorName && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2">
                            <i className="ri-user-line mr-1"></i>
                            {event.visitorName}
                          </p>
                        )}
                        {event.status && (
                          <span className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                            // Statuts pour les paiements
                            event.type === 'payment' && event.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : event.type === 'payment' && event.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : event.type === 'payment' && event.status === 'overdue'
                              ? 'bg-red-100 text-red-700'
                              // Statuts pour les visites
                              : event.type === 'visit' && event.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : event.type === 'visit' && event.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : event.type === 'visit' && event.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : event.type === 'visit' && event.status === 'completed'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {event.type === 'payment' 
                              ? (event.status === 'paid' ? 'Payé' : event.status === 'pending' ? 'En attente' : 'En retard')
                              : event.type === 'visit'
                              ? (event.status === 'confirmed' ? 'Confirmée' : event.status === 'pending' ? 'En attente' : event.status === 'cancelled' ? 'Annulée' : event.status === 'completed' ? 'Effectuée' : event.status)
                              : event.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
