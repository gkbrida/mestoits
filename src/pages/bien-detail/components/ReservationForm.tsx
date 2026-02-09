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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'paydunya'>('stripe');
  const [processingPayment, setProcessingPayment] = useState(false);

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

    // Vérifier le nombre minimal de nuits
    if (minNights !== null && nights < minNights) {
      alert(`Le séjour minimum est de ${minNights} nuitée${minNights > 1 ? 's' : ''}. Veuillez sélectionner plus de nuits.`);
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

      // Récupérer les informations du propriétaire pour l'envoi de SMS
      const { data: ownerData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('full_name, email, phone')
        .eq('id', finalOwnerId)
        .single();

      // Envoyer un SMS au propriétaire pour l'informer de la nouvelle réservation
      if (ownerData?.phone) {
        try {
          const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api';
          const formatDate = (dateString: string) => {
            return new Date(dateString).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
          };

          const smsMessage = `Nouvelle réservation pour "${propertyTitle || 'votre bien'}": ${userData.full_name || 'Client'} du ${formatDate(startDate)} au ${formatDate(endDate)} (${nights} nuit${nights > 1 ? 's' : ''}). Montant: ${formatPrice(totalAmount)} FCFA.`;

          const smsResponse = await fetch(`${EMAIL_API_URL}/send-sms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: ownerData.phone,
              message: smsMessage,
              sender: 'Mestoits',
              campaignName: 'Nouvelle réservation',
            }),
          });

          if (smsResponse.ok) {
            console.log('✅ SMS envoyé au propriétaire avec succès');
          } else {
            console.error('⚠️ Erreur lors de l\'envoi du SMS au propriétaire');
          }
        } catch (smsError) {
          console.error('⚠️ Erreur lors de l\'envoi du SMS au propriétaire:', smsError);
          // Ne pas bloquer la réservation si l'envoi de SMS échoue
        }
      }

      // Stocker les données de réservation et ouvrir le modal de paiement
      setSelectedReservation({
        id: reservationData.id,
        totalAmount,
        nights,
        startDate,
        endDate,
      });
      setShowPaymentModal(true);
      setPaymentLoading(false);

    } catch (error: any) {
      console.error('Erreur lors de la réservation:', error);
      alert(`Erreur: ${error.message || 'Une erreur est survenue lors de la réservation'}`);
      setPaymentLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedReservation || !userData) return;

    setProcessingPayment(true);
    try {
      // Vérifier que le numéro de téléphone est présent pour PayDunya
      if (selectedPaymentMethod === 'paydunya' && !userData.phone) {
        throw new Error('Numéro de téléphone requis pour le paiement Mobile Money. Veuillez compléter votre profil.');
      }

      // Déterminer l'URL de l'API selon la méthode de paiement
      const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api';
      const apiUrl = selectedPaymentMethod === 'paydunya' 
        ? `${EMAIL_API_URL}/create-reservation-payment`
        : `${EMAIL_API_URL}/create-reservation-payment-session`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedReservation.totalAmount,
          propertyId: propertyId,
          propertyTitle: propertyTitle || 'Bien immobilier',
          guestEmail: userData.email,
          guestName: userData.full_name || 'Client',
          guestPhone: userData.phone || '',
          startDate: selectedReservation.startDate,
          endDate: selectedReservation.endDate,
          nights: selectedReservation.nights.toString(),
          reservationId: selectedReservation.id,
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

      // PayDunya envoie un SMS au client avec un code de paiement
      if (result.requiresSMSConfirmation) {
        alert(`✅ Demande de paiement créée avec succès !\n\nUn SMS avec le code de paiement a été envoyé au numéro ${userData.phone}.\n\nVeuillez suivre les instructions dans le SMS pour confirmer le paiement.`);
        setShowPaymentModal(false);
        setProcessingPayment(false);
        // Recharger les dates indisponibles
        await loadUnavailableDates();
        // Réinitialiser les dates sélectionnées
        setStartDate('');
        setEndDate('');
      } else if (result.url) {
        // Pour Stripe, rediriger vers la page de paiement
        window.location.href = result.url;
      } else {
        throw new Error('Réponse inattendue du serveur de paiement');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du paiement:', error);
      alert(`Erreur lors de la création du paiement: ${error.message || 'Erreur inconnue'}`);
      setProcessingPayment(false);
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

      {/* Payment Modal */}
      {showPaymentModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Confirmer le paiement</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentMethod('stripe');
                }}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
              >
                <i className="ri-close-line text-xl sm:text-2xl"></i>
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg md:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Période</span>
                  <span className="font-medium text-gray-900 text-right break-words ml-2">
                    {new Date(selectedReservation.startDate).toLocaleDateString('fr-FR')} - {new Date(selectedReservation.endDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Nombre de nuits</span>
                  <span className="font-medium text-gray-900 text-right break-words ml-2">{selectedReservation.nights}</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Bien</span>
                  <span className="font-medium text-gray-900 text-right break-words ml-2">{propertyTitle || 'Bien immobilier'}</span>
                </div>
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200">
                  <span className="text-base sm:text-lg font-bold text-gray-900">Montant total</span>
                  <span className="text-xl sm:text-2xl font-bold text-teal-600">{formatPrice(selectedReservation.totalAmount)} FCFA</span>
                </div>
              </div>
            </div>

            {/* Sélection de la méthode de paiement */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3">
                Choisir le mode de paiement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPaymentMethod('stripe')}
                  className={`p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPaymentMethod === 'stripe'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'stripe'
                        ? 'border-teal-500 bg-teal-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'stripe' && (
                        <i className="ri-check-line text-white text-xs"></i>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Carte bancaire</div>
                    </div>
                    <i className="ri-bank-card-line text-xl text-gray-400"></i>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('paydunya')}
                  className={`p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPaymentMethod === 'paydunya'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'paydunya'
                        ? 'border-teal-500 bg-teal-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'paydunya' && (
                        <i className="ri-check-line text-white text-xs"></i>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Mobile Money</div>
                    </div>
                    <i className="ri-smartphone-line text-xl text-gray-400"></i>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg md:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex gap-2 sm:gap-3">
                <i className="ri-information-line text-blue-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0 mt-0.5"></i>
                <p className="text-xs sm:text-sm text-blue-900">
                  {selectedPaymentMethod === 'stripe' 
                    ? 'Vous allez être redirigé vers notre plateforme de paiement sécurisée Stripe. Votre réservation sera confirmée après le paiement.'
                    : 'Un SMS avec un code de paiement vous sera envoyé sur votre numéro de téléphone. Suivez les instructions dans le SMS pour confirmer le paiement par Mobile Money. Votre réservation sera confirmée après le paiement.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPaymentMethod('stripe');
                }}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-200 text-gray-700 rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {processingPayment ? (
                  <>
                    <i className="ri-loader-4-line text-lg sm:text-xl animate-spin w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    <span className="hidden sm:inline">
                      {selectedPaymentMethod === 'stripe' ? 'Redirection vers Stripe...' : 'Création de la demande de paiement...'}
                    </span>
                    <span className="sm:hidden">Redirection...</span>
                  </>
                ) : (
                  <>
                    {selectedPaymentMethod === 'stripe' ? (
                      <>
                        <i className="ri-bank-card-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                        Payer avec Stripe
                      </>
                    ) : (
                      <>
                        <i className="ri-smartphone-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                        Payer avec PayDunya
                      </>
                    )}
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
