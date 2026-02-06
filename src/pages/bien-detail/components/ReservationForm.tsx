import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import DateRangeCalendar from './DateRangeCalendar';

interface ReservationFormProps {
  propertyId: string;
  price: number;
  propertyTitle?: string;
  ownerId?: string;
}

export default function ReservationForm({ propertyId, price, propertyTitle, ownerId }: ReservationFormProps) {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [minNights, setMinNights] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
    loadUnavailableDates();
    loadPropertyDetails();
  }, [propertyId]);

  const loadPropertyDetails = async () => {
    try {
      const { data: propertyData, error } = await supabase
        .from('properties_02')
        .select('min_nights')
        .eq('id', propertyId)
        .single();

      if (error) {
        console.error('Erreur lors du chargement des détails de la propriété:', error);
        return;
      }

      if (propertyData?.min_nights) {
        setMinNights(propertyData.min_nights);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails de la propriété:', error);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        // Charger les données utilisateur
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('email, full_name, phone')
          .eq('id', user.id)
          .single();
        setUserData(userData);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadUnavailableDates = async () => {
    try {
      // Charger les réservations en attente et confirmées pour ce bien
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('start_date, end_date')
        .eq('property_id', propertyId)
        .in('status', ['pending', 'confirmed']);

      if (error) {
        console.error('Erreur lors du chargement des réservations:', error);
        return;
      }

      // Extraire toutes les dates entre start_date et end_date pour chaque réservation
      const dates: string[] = [];
      reservations?.forEach((reservation) => {
        const start = new Date(reservation.start_date);
        const end = new Date(reservation.end_date);
        const currentDate = new Date(start);
        
        while (currentDate <= end) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });

      // Supprimer les doublons
      setUnavailableDates([...new Set(dates)]);
    } catch (error) {
      console.error('Erreur lors du chargement des dates indisponibles:', error);
    }
  };

  // Calculer le nombre de nuits
  const calculateNights = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Calculer le coût total
  const calculateTotal = () => {
    const nights = calculateNights();
    return nights * price;
  };

  // Formater le prix
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  const handleReserve = async () => {
    if (!isAuthenticated) {
      // Rediriger vers la page de connexion avec un retour vers cette page
      navigate(`/connexion?redirect=/bien/${propertyId}`);
      return;
    }

    if (!startDate || !endDate) {
      alert('Veuillez sélectionner une plage de dates');
      return;
    }

    const nights = calculateNights();
    if (nights === 0) {
      alert('La date de fin doit être après la date de début');
      return;
    }

    // Vérifier que les dates sélectionnées ne chevauchent pas avec des réservations existantes
    const selectedStart = new Date(startDate);
    const selectedEnd = new Date(endDate);
    const hasConflict = unavailableDates.some(date => {
      const conflictDate = new Date(date);
      return conflictDate >= selectedStart && conflictDate <= selectedEnd;
    });

    if (hasConflict) {
      alert('Les dates sélectionnées sont déjà réservées. Veuillez choisir d\'autres dates.');
      return;
    }

    if (!userData) {
      alert('Erreur: Impossible de récupérer vos informations. Veuillez réessayer.');
      return;
    }

    setPaymentLoading(true);

    try {
      // Récupérer l'owner_id si non fourni
      let finalOwnerId = ownerId;
      if (!finalOwnerId) {
        const { data: propertyData } = await supabase
          .from('properties_02')
          .select('owner_id')
          .eq('id', propertyId)
          .single();
        finalOwnerId = propertyData?.owner_id;
      }

      if (!finalOwnerId) {
        throw new Error('Impossible de déterminer le propriétaire du bien');
      }

      // Créer la réservation dans Supabase
      const totalAmount = calculateTotal();
      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          property_id: propertyId,
          owner_id: finalOwnerId,
          guest_name: userData.full_name || 'Client',
          guest_email: userData.email,
          guest_phone: userData.phone || '',
          start_date: startDate,
          end_date: endDate,
          nights: nights,
          total_amount: totalAmount,
          status: 'pending'
        }])
        .select()
        .single();

      if (reservationError) {
        throw new Error(`Erreur lors de la création de la réservation: ${reservationError.message}`);
      }

      // Créer la demande de paiement PayDunya
      const apiUrl = '/api/create-reservation-payment';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalAmount,
          propertyId: propertyId,
          propertyTitle: propertyTitle || 'Bien immobilier',
          guestEmail: userData.email,
          guestName: userData.full_name || 'Client',
          guestPhone: userData.phone || '',
          startDate: startDate,
          endDate: endDate,
          nights: nights.toString(),
          reservationId: reservationData.id,
          origin: window.location.origin,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la demande de paiement');
      }

      // Afficher un message de succès
      alert(`Réservation créée avec succès ! Un SMS avec le code de paiement PayDunya a été envoyé à ${userData.phone || userData.email}. Veuillez confirmer le paiement pour finaliser votre réservation.`);
      
      // Recharger les dates indisponibles
      await loadUnavailableDates();
      
      // Réinitialiser les dates sélectionnées
      setStartDate('');
      setEndDate('');

    } catch (error: any) {
      console.error('Erreur lors de la réservation:', error);
      alert(`Erreur: ${error.message || 'Une erreur est survenue lors de la réservation'}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  const nights = calculateNights();
  const total = calculateTotal();

  if (loading) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="text-center py-4">
          <i className="ri-loader-4-line text-2xl text-teal-600 animate-spin"></i>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 max-h-[calc(100vh-8rem)] overflow-y-auto lg:overflow-y-auto">
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
        Réserver ce bien
      </h3>

      <div className="space-y-4">
        {/* Calendrier de sélection de dates */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Sélectionnez vos dates <span className="text-red-500">*</span>
          </label>
          <DateRangeCalendar
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => {
              setStartDate(date);
              // Réinitialiser la date de fin si elle est avant la nouvelle date de début
              if (endDate && date && new Date(endDate) <= new Date(date)) {
                setEndDate('');
              }
            }}
            onEndDateChange={setEndDate}
            unavailableDates={unavailableDates}
          />
        </div>

        

        {/* Avertissement si le nombre de nuits est insuffisant */}
        {nights > 0 && minNights && nights < minNights && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs sm:text-sm text-yellow-800">
              <i className="ri-alert-line mr-1"></i>
              Le séjour minimum est de <strong>{minNights} nuitée{minNights > 1 ? 's' : ''}</strong>. 
              Vous avez sélectionné {nights} nuitée{nights > 1 ? 's' : ''}.
            </p>
          </div>
        )}

        {/* Résumé du calcul */}
        {nights > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Prix par nuit</span>
              <span className="font-semibold">{formatPrice(price)} FCFA</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Nombre de nuits</span>
              <span className="font-semibold">{nights} nuit{nights > 1 ? 's' : ''}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span className="text-teal-600">{formatPrice(total)} FCFA</span>
              </div>
            </div>
          </div>
        )}

        {/* Bouton de réservation */}
        <button
          onClick={handleReserve}
          disabled={!startDate || !endDate || nights === 0 || paymentLoading || (minNights !== null && nights < minNights)}
          className={`w-full px-6 py-4 rounded-lg font-semibold text-white transition-colors ${
            !startDate || !endDate || nights === 0 || paymentLoading || (minNights !== null && nights < minNights)
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >
          {paymentLoading ? (
            <span className="flex items-center justify-center gap-2">
              <i className="ri-loader-4-line animate-spin"></i>
              Traitement en cours...
            </span>
          ) : !isAuthenticated ? (
            <span className="flex items-center justify-center gap-2">
              <i className="ri-login-box-line"></i>
              Se connecter pour réserver
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <i className="ri-calendar-check-line"></i>
              Réserver maintenant
            </span>
          )}
        </button>

        {!isAuthenticated && (
          <p className="text-xs text-gray-500 text-center">
            Vous devez être connecté pour effectuer une réservation
          </p>
        )}
      </div>
    </div>
  );
}
