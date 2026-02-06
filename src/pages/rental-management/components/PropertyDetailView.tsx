import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';
import { usePropertyTypes } from '../../../hooks/usePropertyTypes';
import DateRangeCalendar from '../../bien-detail/components/DateRangeCalendar';

interface Property {
  id: string;
  title: string;
  description?: string;
  price: number;
  offer_type?: string; // Gardé pour compatibilité avec PropertiesTab qui passe encore offer_type
  operation_type?: string; // Type d'opération (sale, rental, short-term-rental)
  property_type: string;
  address: string;
  city: string;
  surface_area: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: string[];
  status: 'available' | 'rented' | 'maintenance' | 'active' | 'inactive' | 'sold';
  owner_id: string;
  views_count?: number;
  favorites_count?: number;
}

interface Visit {
  id: string;
  property_id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_phone: string;
  visit_date: string;
  visit_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  message?: string; // La table visits utilise 'message' et non 'notes'
  created_at: string;
}

interface PropertyDetailViewProps {
  property: Property;
  onBack: () => void;
}

export default function PropertyDetailView({ property, onBack }: PropertyDetailViewProps) {
  const { sendEmail } = useEmail();
  const { getPropertyTypeLabel } = usePropertyTypes();
  const [fullProperty, setFullProperty] = useState<Property | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [conversationsCount, setConversationsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState<string>('');
  const [unavailableStartDate, setUnavailableStartDate] = useState('');
  const [unavailableEndDate, setUnavailableEndDate] = useState('');
  const [unavailablePeriods, setUnavailablePeriods] = useState<Array<{id: string, start_date: string, end_date: string}>>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [savingUnavailable, setSavingUnavailable] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formData, setFormData] = useState({
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
    loadFullProperty();
  }, [property.id]);

  useEffect(() => {
    if (fullProperty) {
      loadVisits();
      loadConversationsCount();
      // Charger le nom de la ville depuis localities
      if (fullProperty.city) {
        loadCityName(fullProperty.city);
      }
      // Charger les périodes d'indisponibilité pour les locations courte durée
      if ((fullProperty as any).operation_type === 'short-term-rental') {
        loadUnavailablePeriods();
      }
    }
  }, [fullProperty?.id]);

  const loadFullProperty = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties_02')
        .select('*, views_count, favorites_count')
        .eq('id', property.id)
        .single();

      if (error) throw error;
      setFullProperty(data);
    } catch (error) {
      console.error('Erreur lors du chargement de la propriété:', error);
      // Utiliser les données de property en fallback
      setFullProperty(property as Property);
    } finally {
      setLoading(false);
    }
  };

  const loadVisits = async () => {
    if (!fullProperty) return;
    
    try {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('property_id', fullProperty.id)
        .order('visit_date', { ascending: true });

      if (error) throw error;
      setVisits(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des visites:', error);
    }
  };

  const loadConversationsCount = async () => {
    if (!fullProperty) return;
    
    try {
      // Charger tous les messages liés à ce bien
      const { data: messagesData, error } = await supabase
        .from('messages_2025_12_01_11_29')
        .select('sender_id, receiver_id')
        .eq('property_id', fullProperty.id);

      if (error) throw error;

      // Compter les conversations distinctes (groupées par autre utilisateur)
      // Une conversation = un utilisateur distinct qui a échangé avec le propriétaire
      const conversationsSet = new Set<string>();
      
      messagesData?.forEach((msg) => {
        // Identifier l'autre utilisateur (celui qui n'est pas le propriétaire)
        const otherUserId = msg.sender_id === fullProperty.owner_id 
          ? msg.receiver_id 
          : msg.sender_id;
        
        if (otherUserId) {
          conversationsSet.add(otherUserId);
        }
      });

      setConversationsCount(conversationsSet.size);
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de conversations:', error);
    }
  };

  const loadCityName = async (commune: string) => {
    try {
      const { data, error } = await supabase
        .from('localities')
        .select('villes')
        .eq('commune', commune)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors du chargement de la ville:', error);
        setCityName(commune);
        return;
      }

      if (data && data.villes) {
        setCityName(data.villes);
      } else {
        setCityName(commune);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la ville:', error);
      setCityName(commune);
    }
  };

  const loadUnavailablePeriods = async () => {
    if (!fullProperty) return;
    
    try {
      // Charger les périodes d'indisponibilité
      const { data: periods, error: periodsError } = await supabase
        .from('property_unavailable_periods')
        .select('id, start_date, end_date')
        .eq('property_id', fullProperty.id)
        .order('start_date', { ascending: true });

      if (periodsError) throw periodsError;

      setUnavailablePeriods(periods || []);

      // Charger aussi les réservations confirmées et en attente
      const { data: reservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('start_date, end_date')
        .eq('property_id', fullProperty.id)
        .in('status', ['pending', 'confirmed']);

      if (reservationsError) {
        console.error('Erreur lors du chargement des réservations:', reservationsError);
        return;
      }

      // Combiner toutes les dates indisponibles
      const allDates: string[] = [];
      
      // Ajouter les dates des périodes d'indisponibilité
      periods?.forEach((period) => {
        const start = new Date(period.start_date);
        const end = new Date(period.end_date);
        const currentDate = new Date(start);
        
        while (currentDate <= end) {
          allDates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      // Ajouter les dates des réservations
      reservations?.forEach((reservation) => {
        const start = new Date(reservation.start_date);
        const end = new Date(reservation.end_date);
        const currentDate = new Date(start);
        
        while (currentDate <= end) {
          allDates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      // Supprimer les doublons
      setUnavailableDates([...new Set(allDates)]);
    } catch (error) {
      console.error('Erreur lors du chargement des périodes d\'indisponibilité:', error);
    }
  };

  const handleSaveUnavailablePeriod = async () => {
    if (!fullProperty || !unavailableStartDate || !unavailableEndDate) {
      setError('Veuillez sélectionner une plage de dates');
      return;
    }

    const start = new Date(unavailableStartDate);
    const end = new Date(unavailableEndDate);

    if (end < start) {
      setError('La date de fin doit être après la date de début');
      return;
    }

    setSavingUnavailable(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { error: insertError } = await supabase
        .from('property_unavailable_periods')
        .insert({
          property_id: fullProperty.id,
          owner_id: user.id,
          start_date: unavailableStartDate,
          end_date: unavailableEndDate,
        });

      if (insertError) throw insertError;

      // Recharger les périodes d'indisponibilité
      await loadUnavailablePeriods();
      
      // Réinitialiser le formulaire
      setUnavailableStartDate('');
      setUnavailableEndDate('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde de la période d\'indisponibilité:', error);
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setSavingUnavailable(false);
    }
  };

  const handleDeleteUnavailablePeriod = async (periodId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette période d\'indisponibilité ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('property_unavailable_periods')
        .delete()
        .eq('id', periodId);

      if (error) throw error;

      // Recharger les périodes d'indisponibilité
      await loadUnavailablePeriods();
    } catch (error) {
      console.error('Erreur lors de la suppression de la période d\'indisponibilité:', error);
      setError('Erreur lors de la suppression');
    }
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullProperty) return;
    
    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      // Le propriétaire planifie la visite, donc le statut est 'confirmed' dès le départ
      const { error: insertError } = await supabase.from('visits').insert({
        property_id: fullProperty.id,
        visitor_id: null, // Le visiteur n'a pas forcément de compte
        owner_id: fullProperty.owner_id,
        visitor_name: formData.visitor_name,
        visitor_email: formData.visitor_email,
        visitor_phone: formData.visitor_phone,
        visit_date: formData.visit_date,
        visit_time: formData.visit_time,
        message: formData.notes,
        status: 'confirmed', // Confirmée directement puisque c'est le propriétaire qui invite
      });

      if (insertError) throw insertError;

      // Envoyer un email d'invitation au visiteur
      try {
        // Récupérer les informations du propriétaire
        const { data: ownerData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email, phone')
          .eq('id', fullProperty.owner_id)
          .maybeSingle();

        await sendEmail('visite_programmee', {
          visitorEmail: formData.visitor_email,
          visitorName: formData.visitor_name,
          propertyTitle: fullProperty.title,
          propertyAddress: `${fullProperty.address}, ${fullProperty.city}`,
          visitDate: formData.visit_date,
          visitTime: formData.visit_time,
          ownerName: ownerData?.full_name || 'Le propriétaire',
          ownerEmail: ownerData?.email,
          ownerPhone: ownerData?.phone,
          message: formData.notes || undefined,
        });
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailError);
        // Ne pas bloquer la création de la visite si l'email échoue
      }

      setSuccess(true);
      setFormData({
        visitor_name: '',
        visitor_email: '',
        visitor_phone: '',
        visit_date: '',
        visit_time: '',
        notes: '',
      });
      loadVisits();
    } catch (err) {
      console.error('Erreur lors de la planification de la visite:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateVisitStatus = async (visitId: string, status: string) => {
    try {
      // Récupérer les détails de la visite avant la mise à jour
      const { data: visitData, error: fetchError } = await supabase
        .from('visits')
        .select('*')
        .eq('id', visitId)
        .single();

      if (fetchError) throw fetchError;

      // Mettre à jour le statut
      const { error } = await supabase
        .from('visits')
        .update({ status })
        .eq('id', visitId);

      if (error) throw error;

      // Si la visite est annulée, envoyer un email au visiteur
      if (status === 'cancelled' && visitData) {
        try {
          // Récupérer les informations du propriétaire et du bien
          const { data: ownerData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('full_name, email, phone')
            .eq('id', fullProperty?.owner_id || '')
            .maybeSingle();

          const { data: propertyData } = await supabase
            .from('properties_02')
            .select('title, address, city')
            .eq('id', visitData.property_id)
            .maybeSingle();

          await sendEmail('visite_annulee', {
            visitorEmail: visitData.visitor_email,
            visitorName: visitData.visitor_name,
            propertyTitle: propertyData?.title || 'Le bien',
            propertyAddress: propertyData ? `${propertyData.address}, ${propertyData.city}` : '',
            visitDate: visitData.visit_date,
            visitTime: visitData.visit_time,
            ownerName: ownerData?.full_name || 'Le propriétaire',
            ownerEmail: ownerData?.email,
            ownerPhone: ownerData?.phone,
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email d\'annulation:', emailError);
          // Ne pas bloquer la mise à jour si l'email échoue
        }
      }

      loadVisits();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      alert('Une erreur est survenue lors de la mise à jour du statut de la visite.');
    }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    available: { label: 'Disponible', color: 'bg-green-100 text-green-700' },
    rented: { label: 'Loué', color: 'bg-blue-100 text-blue-700' },
    maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
    active: { label: 'Actif', color: 'bg-green-100 text-green-700' },
    inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-700' },
    sold: { label: 'Vendu', color: 'bg-purple-100 text-purple-700' },
  };

  const visitStatusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
    confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700' },
    completed: { label: 'Terminée', color: 'bg-gray-100 text-gray-700' },
  };

  if (loading || !fullProperty) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="ri-loader-4-line text-5xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const displayImages = fullProperty.images && fullProperty.images.length > 0
    ? fullProperty.images
    : [
        `https://readdy.ai/api/search-image?query=Modern%20${fullProperty.property_type}%20property%20exterior%20with%20elegant%20architecture%2C%20bright%20natural%20lighting%2C%20simple%20clean%20background%20showcasing%20beautiful%20residential%20real%20estate&width=1200&height=800&seq=propdet${fullProperty.id}1&orientation=landscape`,
        `https://readdy.ai/api/search-image?query=Spacious%20${fullProperty.property_type}%20living%20room%20with%20modern%20furniture%2C%20large%20windows%2C%20natural%20light%2C%20simple%20clean%20background&width=1200&height=800&seq=propdet${fullProperty.id}2&orientation=landscape`,
        `https://readdy.ai/api/search-image?query=Contemporary%20${fullProperty.property_type}%20kitchen%20with%20modern%20appliances%2C%20bright%20lighting%2C%20simple%20background&width=1200&height=800&seq=propdet${fullProperty.id}3&orientation=landscape`,
      ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base text-gray-700 hover:text-teal-600 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
          <span className="hidden sm:inline">Retour aux propriétés</span>
          <span className="sm:hidden">Retour</span>
        </button>
        <span className={`px-3 md:px-4 py-1 md:py-2 rounded-full text-xs md:text-sm font-semibold ${statusLabels[fullProperty.status]?.color || statusLabels.available.color}`}>
          {statusLabels[fullProperty.status]?.label || 'Disponible'}
        </span>
      </div>

      {/* Property Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - Images and Details */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Image Gallery */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm overflow-hidden">
            <div className="relative h-[250px] md:h-[350px] lg:h-[400px] bg-gray-100">
              <img
                src={displayImages[currentImageIndex]}
                alt={`Photo ${currentImageIndex + 1}`}
                className="w-full h-full object-cover object-top"
              />
              {displayImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all cursor-pointer"
                  >
                    <i className="ri-arrow-left-s-line text-lg md:text-xl text-gray-900 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all cursor-pointer"
                  >
                    <i className="ri-arrow-right-s-line text-lg md:text-xl text-gray-900 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                  </button>
                  <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 px-2 md:px-3 py-1 md:py-1.5 bg-black/70 backdrop-blur-sm text-white text-xs md:text-sm rounded-md md:rounded-lg">
                    {currentImageIndex + 1} / {displayImages.length}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Property Info */}
          <div className="bg-white rounded-lg md:rounded-xl shadow-sm p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 break-words">{fullProperty.title}</h1>
                <div className="flex items-center gap-2 text-sm md:text-base text-gray-600 mb-2 md:mb-3">
                  <i className="ri-map-pin-line text-base md:text-lg w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0"></i>
                  <span className="truncate">
                    {cityName || fullProperty.city}
                    {fullProperty.address && `, ${fullProperty.address}`}
                  </span>
                </div>
                <span className="inline-block px-2 md:px-3 py-0.5 md:py-1 bg-gray-100 text-gray-700 text-xs md:text-sm font-medium rounded-full">
                  {getPropertyTypeLabel(fullProperty.property_type)}
                </span>
              </div>
              <div className="text-left md:text-right flex-shrink-0">
                <div className="text-2xl md:text-3xl font-bold text-teal-600 mb-1">
                  {new Intl.NumberFormat('fr-FR').format(fullProperty.price)} FCFA
                </div>
                <div className="text-xs md:text-sm text-gray-600">
                  {fullProperty.operation_type === 'sale' ? 'Vente' : fullProperty.operation_type === 'short-term-rental' ? '/nuit' : '/mois'}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-teal-50 rounded-full mx-auto mb-1 md:mb-2">
                  <i className="ri-ruler-line text-lg md:text-xl text-teal-600 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                </div>
                <div className="text-lg md:text-xl font-bold text-gray-900">{fullProperty.surface_area}</div>
                <div className="text-xs md:text-sm text-gray-600">m²</div>
              </div>
              {fullProperty.bedrooms && (
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-teal-50 rounded-full mx-auto mb-1 md:mb-2">
                    <i className="ri-hotel-bed-line text-lg md:text-xl text-teal-600 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                  </div>
                  <div className="text-lg md:text-xl font-bold text-gray-900">{fullProperty.bedrooms}</div>
                  <div className="text-xs md:text-sm text-gray-600">Chambres</div>
                </div>
              )}
              {fullProperty.bathrooms && (
                <div className="text-center">
                  <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-teal-50 rounded-full mx-auto mb-1 md:mb-2">
                    <i className="ri-drop-line text-lg md:text-xl text-teal-600 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                  </div>
                  <div className="text-lg md:text-xl font-bold text-gray-900">{fullProperty.bathrooms}</div>
                  <div className="text-xs md:text-sm text-gray-600">Salles de bain</div>
                </div>
              )}
            </div>

            {/* Stats (Views, Favorites & Conversations) */}
            {(fullProperty.views_count !== undefined || fullProperty.favorites_count !== undefined || conversationsCount > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 pt-3 md:pt-4 border-t border-gray-200">
                {fullProperty.views_count !== undefined && (
                  <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-blue-50 rounded-full flex-shrink-0">
                      <i className="ri-eye-line text-base md:text-lg text-blue-600 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="text-base md:text-lg font-bold text-gray-900">
                        {new Intl.NumberFormat('fr-FR').format(fullProperty.views_count || 0)}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-600">Vues</div>
                    </div>
                  </div>
                )}
                {fullProperty.favorites_count !== undefined && (
                  <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-red-50 rounded-full flex-shrink-0">
                      <i className="ri-heart-line text-base md:text-lg text-red-600 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="text-base md:text-lg font-bold text-gray-900">
                        {new Intl.NumberFormat('fr-FR').format(fullProperty.favorites_count || 0)}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-600">Favoris</div>
                    </div>
                  </div>
                )}
                {conversationsCount > 0 && (
                  <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-purple-50 rounded-full flex-shrink-0">
                      <i className="ri-message-3-line text-base md:text-lg text-purple-600 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="text-base md:text-lg font-bold text-gray-900">
                        {new Intl.NumberFormat('fr-FR').format(conversationsCount)}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-600">Conversations</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {fullProperty.description && (
            <div className="bg-white rounded-lg md:rounded-xl shadow-sm p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Description</h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                {fullProperty.description}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Schedule Visit / Unavailable Calendar */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6 space-y-4 md:space-y-6">
            {/* Pour les locations courte durée : Calendrier d'indisponibilité */}
            {(fullProperty as any)?.operation_type === 'short-term-rental' ? (
              <div className="bg-white rounded-lg md:rounded-xl shadow-sm p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Marquer une indisponibilité</h3>

                {success && (
                  <div className="mb-3 md:mb-4 p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 text-xs md:text-sm">
                      <i className="ri-check-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      Période d'indisponibilité enregistrée avec succès !
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-3 md:mb-4 p-2 md:p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 text-xs md:text-sm">
                      <i className="ri-error-warning-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      {error}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <DateRangeCalendar
                    startDate={unavailableStartDate}
                    endDate={unavailableEndDate}
                    onStartDateChange={setUnavailableStartDate}
                    onEndDateChange={setUnavailableEndDate}
                    unavailableDates={unavailableDates}
                  />

                  {unavailableStartDate && unavailableEndDate && (
                    <button
                      onClick={handleSaveUnavailablePeriod}
                      disabled={savingUnavailable}
                      className="w-full flex items-center justify-center gap-2 px-5 md:px-6 py-3 md:py-4 bg-teal-600 text-white rounded-lg text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingUnavailable ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                          Indisponible
                        </>
                      )}
                    </button>
                  )}

                  {unavailablePeriods.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm md:text-base font-semibold text-gray-900 mb-3">Périodes d'indisponibilité</h4>
                      <div className="space-y-2">
                        {unavailablePeriods.map((period) => (
                          <div key={period.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-xs md:text-sm text-gray-700">
                              {new Date(period.start_date).toLocaleDateString('fr-FR')} - {new Date(period.end_date).toLocaleDateString('fr-FR')}
                            </span>
                            <button
                              onClick={() => handleDeleteUnavailablePeriod(period.id)}
                              className="text-red-600 hover:text-red-700 cursor-pointer"
                              title="Supprimer"
                            >
                              <i className="ri-delete-bin-line text-sm md:text-base w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg md:rounded-xl shadow-sm p-4 md:p-6">
                <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Inviter à une visite</h3>

                {success && (
                  <div className="mb-3 md:mb-4 p-2 md:p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 text-xs md:text-sm">
                      <i className="ri-check-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      Invitation envoyée avec succès ! Le visiteur recevra un email.
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-3 md:mb-4 p-2 md:p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-800 text-xs md:text-sm">
                      <i className="ri-error-warning-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      {error}
                    </div>
                  </div>
                )}

                <form onSubmit={handleScheduleVisit} className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Nom du visiteur *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.visitor_name}
                      onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm"
                      placeholder="Nom complet"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.visitor_email}
                      onChange={(e) => setFormData({ ...formData, visitor_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm"
                      placeholder="email@exemple.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Téléphone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.visitor_phone}
                      onChange={(e) => setFormData({ ...formData, visitor_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.visit_date}
                      onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Heure *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.visit_time}
                      onChange={(e) => setFormData({ ...formData, visit_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      Message d'invitation
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-xs md:text-sm"
                      placeholder="Message personnalisé pour inviter le visiteur..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg text-xs md:text-sm font-semibold hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  >
                    {submitting ? (
                      <>
                        <i className="ri-loader-4-line animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                        Planification...
                      </>
                    ) : (
                      <>
                        <i className="ri-send-plane-line w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                        Envoyer l'invitation
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visits List */}
      <div className="bg-white rounded-lg md:rounded-xl shadow-sm p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Visites planifiées</h2>

        {loading ? (
          <div className="text-center py-6 md:py-8">
            <i className="ri-loader-4-line text-2xl md:text-3xl text-teal-600 animate-spin"></i>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-6 md:py-8">
            <i className="ri-calendar-line text-4xl md:text-5xl text-gray-300 mb-2 md:mb-3"></i>
            <p className="text-sm md:text-base text-gray-600">Aucune visite planifiée pour ce bien</p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className="border border-gray-200 rounded-lg p-3 md:p-4 hover:border-teal-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-2 md:mb-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base break-words">{visit.visitor_name}</h3>
                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${visitStatusLabels[visit.status].color} flex-shrink-0`}>
                        {visitStatusLabels[visit.status].label}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs md:text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <i className="ri-calendar-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
                        <span className="break-words">{new Date(visit.visit_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="ri-time-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
                        {visit.visit_time}
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="ri-mail-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
                        <span className="truncate">{visit.visitor_email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="ri-phone-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
                        {visit.visitor_phone}
                      </div>
                    </div>
                    {visit.message && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs md:text-sm text-gray-700 break-words">
                        {visit.message}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {visit.status === 'confirmed' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-3 border-t border-gray-100">
                    <button
                      onClick={() => updateVisitStatus(visit.id, 'completed')}
                      className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-gray-100 text-gray-700 rounded-md md:rounded-lg text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-check-double-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      <span className="hidden sm:inline">Marquer comme effectuée</span>
                      <span className="sm:hidden">Effectuée</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Êtes-vous sûr de vouloir annuler cette visite ? Le visiteur sera informé par email.')) {
                          updateVisitStatus(visit.id, 'cancelled');
                        }
                      }}
                      className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-red-100 text-red-700 rounded-md md:rounded-lg text-xs md:text-sm font-medium hover:bg-red-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-close-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      Annuler
                    </button>
                  </div>
                )}
                {visit.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-3 border-t border-gray-100">
                    <button
                      onClick={() => updateVisitStatus(visit.id, 'cancelled')}
                      className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 bg-red-100 text-red-700 rounded-md md:rounded-lg text-xs md:text-sm font-medium hover:bg-red-200 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-close-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
