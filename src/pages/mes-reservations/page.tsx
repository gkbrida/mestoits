import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEmail } from '../../hooks/useEmail';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import { generateReservationReceiptPDF } from '../../utils/reservationReceiptPdfGenerator';

interface Reservation {
  id: string;
  property_id: string;
  property_title?: string;
  property_address?: string;
  property_city?: string;
  owner_id: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  start_date: string;
  end_date: string;
  nights: number;
  total_amount: number;
  amount_paid?: number | null;
  status: string;
  created_at: string;
  arrival_signaled_at?: string | null;
  arrival_reminder_sent_at?: string | null;
}

export default function MesReservationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<{ name?: string; email?: string; phone?: string } | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReservationForPayment, setSelectedReservationForPayment] = useState<Reservation | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'paydunya'>('stripe');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [signalingArrival, setSignalingArrival] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { sendEmail } = useEmail();

  const amountToPay = (r: Reservation) => {
    if (r.status === 'pending') return r.total_amount;
    return Math.max(0, r.total_amount - (r.amount_paid ?? 0));
  };
  const hasPaymentToMake = (r: Reservation) =>
    (r.status === 'pending' && r.total_amount > 0) ||
    (r.status === 'confirmed' && (r.amount_paid ?? 0) > 0 && (r.amount_paid ?? 0) < r.total_amount);

  // Réservation commencée = date du jour >= date d'arrivée
  const isReservationStarted = (startDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return today >= start;
  };

  const showArrivalButton = (r: Reservation) =>
    r.status === 'confirmed' &&
    isReservationStarted(r.start_date) &&
    new Date(r.end_date) >= new Date() && // pas encore terminée
    !r.arrival_signaled_at;

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userEmail) {
      loadReservations();
    }
  }, [userEmail]);

  // Gestion du retour de paiement Stripe (mes-reservations?payment=success&reservation=xxx&session_id=yyy)
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  useEffect(() => {
    const payment = searchParams.get('payment');
    const reservationId = searchParams.get('reservation');
    const sessionId = searchParams.get('session_id');
    if (payment === 'cancelled') {
      setSearchParams({});
      return;
    }
    if (payment === 'success' && reservationId && sessionId && !paymentProcessed && userEmail) {
      setPaymentProcessed(true);
      (async () => {
        try {
          const apiUrl = import.meta.env.VITE_EMAIL_API_URL || '/api';
          const res = await fetch(`${apiUrl}/confirm-reservation-table-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationId, sessionId }),
          });
          const data = await res.json().catch(() => ({}));
          if (data.success) {
            await loadReservations();
            alert('Paiement enregistré avec succès !');
          } else {
            alert(data.error || 'Erreur lors de la confirmation du paiement.');
          }
        } catch (e: any) {
          alert('Erreur: ' + (e?.message || 'Erreur inconnue'));
        } finally {
          setSearchParams({});
        }
      })();
    }
  }, [searchParams, setSearchParams, paymentProcessed, userEmail]);

  // Quand les réservations sont chargées : envoyer le rappel au locataire si le bouton apparaît
  useEffect(() => {
    if (!reservations.length) return;

    const sendReminders = async () => {
      for (const r of reservations) {
        if (!showArrivalButton(r) || r.arrival_reminder_sent_at) continue;

        try {
          const result = await sendEmail('arrival_reminder', {
            guestEmail: r.guest_email,
            guestName: r.guest_name,
            propertyTitle: r.property_title || 'Bien immobilier',
            appUrl: window.location.origin,
          });

          if (result.success) {
            await supabase
              .from('reservations')
              .update({ arrival_reminder_sent_at: new Date().toISOString() })
              .eq('id', r.id);
          }
        } catch (e) {
          console.error('Erreur envoi rappel arrivée:', e);
        }
      }
    };

    sendReminders();
  }, [reservations]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('email, phone')
          .eq('id', user.id)
          .single();
        
        if (userData?.email) {
          setUserEmail(userData.email);
          setUserPhone(userData.phone || '');
        }
      } else {
        const returnUrl = '/mes-reservations' + (window.location.search || '');
        navigate(`/connexion?redirect=${encodeURIComponent(returnUrl)}`, { replace: true });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
    }
  };

  const loadReservations = async () => {
    try {
      setLoading(true);
      
      // Charger toutes les réservations (filtre appliqué dans l'UI)
      const { data: reservationsData, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('guest_email', userEmail)
        .in('status', ['pending', 'confirmed', 'cancelled', 'completed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des réservations:', error);
        setReservations([]);
        return;
      }

      // Marquer automatiquement comme terminées les réservations confirmées dont la date de fin est passée
      const today = new Date().toISOString().split('T')[0];
      for (const r of reservationsData || []) {
        if (r.status === 'confirmed' && r.end_date < today) {
          await supabase.from('reservations').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', r.id);
        }
      }
      const normalizedData = (reservationsData || []).map((r: any) =>
        r.status === 'confirmed' && r.end_date < today ? { ...r, status: 'completed' } : r
      );

      // Enrichir avec les données de la propriété et du propriétaire
      const enrichedReservations = await Promise.all(
        normalizedData.map(async (reservation) => {
          // Charger les données de la propriété
          const { data: propertyData } = await supabase
            .from('properties_02')
            .select('title, address, city')
            .eq('id', reservation.property_id)
            .single();

          // Charger les données du propriétaire
          const { data: ownerData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('full_name, email, phone')
            .eq('id', reservation.owner_id)
            .single();

          return {
            ...reservation,
            property_title: propertyData?.title,
            property_address: propertyData?.address,
            property_city: propertyData?.city,
            owner_name: ownerData?.full_name,
            owner_email: ownerData?.email,
            owner_phone: ownerData?.phone,
          };
        })
      );

      setReservations(enrichedReservations);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleContactOwner = (owner: { name?: string; email?: string; phone?: string }) => {
    setSelectedOwner(owner);
    setShowContactModal(true);
    setMessage('');
  };

  const handleSendMessage = async () => {
    if (!selectedOwner || !message.trim()) {
      alert('Veuillez saisir un message');
      return;
    }

    setSendingMessage(true);
    try {
      // Récupérer l'ID de l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer les informations de l'utilisateur actuel (nom)
      const { data: currentUserData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Récupérer l'ID du propriétaire
      const { data: ownerData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name')
        .eq('email', selectedOwner.email)
        .single();

      if (!ownerData) {
        throw new Error('Propriétaire introuvable');
      }

      // Trouver la réservation correspondante pour obtenir le titre de la propriété
      const reservation = reservations.find(r => 
        r.owner_email === selectedOwner.email
      );

      // Créer le message dans la table messages
      const { error: messageError } = await supabase
        .from('messages_2025_12_01_11_29')
        .insert([{
          sender_id: user.id,
          receiver_id: ownerData.id,
          content: message,
          read: false,
        }]);

      if (messageError) {
        throw messageError;
      }

      // Envoyer un email au propriétaire pour l'informer du nouveau message
      if (selectedOwner.email) {
        try {
          await sendEmail('nouveau_message', {
            receiverEmail: selectedOwner.email,
            receiverName: selectedOwner.name || ownerData.full_name || 'Propriétaire',
            senderName: currentUserData?.full_name || 'Client',
            propertyTitle: reservation?.property_title,
            messagePreview: message.substring(0, 150),
            appUrl: window.location.origin,
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email au propriétaire:', emailError);
          // Ne pas bloquer l'envoi du message si l'email échoue
        }
      }

      alert('Message envoyé avec succès ! Le propriétaire a été informé par email.');
      setShowContactModal(false);
      setMessage('');
      setSelectedOwner(null);
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(`Erreur lors de l'envoi du message: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  const openPaymentModal = (e: React.MouseEvent, reservation: Reservation) => {
    e.stopPropagation();
    setSelectedReservationForPayment(reservation);
    setSelectedPaymentMethod('stripe');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedReservationForPayment) return;

    const phone = selectedReservationForPayment.guest_phone || userPhone;
    if (selectedPaymentMethod === 'paydunya' && !phone?.trim()) {
      alert('Numéro de téléphone requis pour le paiement Mobile Money. Veuillez le renseigner dans votre profil.');
      return;
    }

    setProcessingPayment(true);
    try {
      const apiUrl = import.meta.env.VITE_EMAIL_API_URL || '/api';
      const amount = amountToPay(selectedReservationForPayment);

      if (selectedPaymentMethod === 'stripe') {
        const res = await fetch(`${apiUrl}/create-reservation-table-payment-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: selectedReservationForPayment.id,
            guestEmail: userEmail,
            origin: window.location.origin,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.success && data.url) {
          window.location.href = data.url;
          return;
        }
        throw new Error(data.error || 'Erreur lors de la création de la session de paiement.');
      } else {
        const res = await fetch(`${apiUrl}/create-reservation-table-paydunya-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservationId: selectedReservationForPayment.id,
            guestEmail: userEmail,
            guestPhone: phone,
            origin: window.location.origin,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.success) {
          alert(
            'Demande de paiement Mobile Money envoyée ! Un SMS avec le code a été envoyé. Complétez le paiement puis actualisez la page.'
          );
          setShowPaymentModal(false);
          setSelectedReservationForPayment(null);
          await loadReservations();
        } else {
          throw new Error(data.error || 'Erreur lors de la création du paiement.');
        }
      }
    } catch (err: any) {
      console.error('Erreur paiement:', err);
      alert('Erreur: ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      cancelled: 'Annulée',
      completed: 'Terminée',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  const handleSignalArrival = async (e: React.MouseEvent, reservation: Reservation) => {
    e.stopPropagation();
    if (signalingArrival) return;

    setSignalingArrival(reservation.id);
    try {
      const { error } = await supabase
        .from('reservations')
        .update({ arrival_signaled_at: new Date().toISOString() })
        .eq('id', reservation.id);

      if (error) throw error;

      if (reservation.owner_email) {
        await sendEmail('arrival_signaled', {
          ownerEmail: reservation.owner_email,
          ownerName: reservation.owner_name || 'Propriétaire',
          guestName: reservation.guest_name,
          guestEmail: reservation.guest_email,
          propertyTitle: reservation.property_title || 'Bien immobilier',
          startDate: reservation.start_date,
          signaledAt: new Date().toISOString(),
        });
      }

      alert('Arrivée signalée ! Le propriétaire a été informé par email.');
      await loadReservations();
    } catch (err: any) {
      console.error('Erreur signalement arrivée:', err);
      alert(`Erreur : ${err.message || 'Erreur inconnue'}`);
    } finally {
      setSignalingArrival(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes réservations</h1>
            <p className="text-gray-600">Gérez vos réservations de location courte durée</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <i className="ri-calendar-line text-6xl text-gray-400 mb-4"></i>
              <p className="text-gray-600 text-lg mb-2">Aucune réservation pour le moment</p>
              <p className="text-gray-500 text-sm">Vos réservations de location courte durée apparaîtront ici</p>
            </div>
          ) : (
            <>
            {/* Filtre par statut */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { value: 'all', label: 'Toutes' },
                { value: 'pending', label: 'En attente' },
                { value: 'confirmed', label: 'Confirmées' },
                { value: 'cancelled', label: 'Annulées' },
                { value: 'completed', label: 'Terminées' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {(() => {
                const filteredReservations = statusFilter === 'all' ? reservations : reservations.filter((r) => r.status === statusFilter);
                return filteredReservations.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600">Aucune réservation pour ce filtre</p>
                  </div>
                ) : (
                  filteredReservations.map((reservation) => (
                <div 
                  key={reservation.id} 
                  onClick={() => navigate(`/bien/${reservation.property_id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 break-words">
                        {reservation.property_title || 'Bien immobilier'}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 break-words">
                        {reservation.property_address && reservation.property_city 
                          ? `${reservation.property_address}, ${reservation.property_city}`
                          : 'Adresse non disponible'}
                      </p>
                    </div>
                    <div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(reservation.status)}`}>
                        {getStatusLabel(reservation.status)}
                      </span>
                      {reservation.status === 'confirmed' &&
                        (reservation.amount_paid ?? 0) > 0 &&
                        (reservation.amount_paid ?? 0) < reservation.total_amount && (
                        <div className="mt-1 text-xs text-amber-700">
                          Surplus à payer: {formatPrice(reservation.total_amount - (reservation.amount_paid ?? 0))} FCFA
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Arrivée:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatDate(reservation.start_date)}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Départ:</span>
                      <span className="ml-2 font-medium text-gray-900">{formatDate(reservation.end_date)}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Nombre de nuits:</span>
                      <span className="ml-2 font-medium text-gray-900">{reservation.nights}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Montant total:</span>
                      <span className="ml-2 font-semibold text-teal-600">{formatPrice(reservation.total_amount)} FCFA</span>
                    </div>
                    {(reservation.amount_paid ?? 0) > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Montant payé:</span>
                        <span className="ml-2 font-medium text-green-600">{formatPrice(reservation.amount_paid ?? 0)} FCFA</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 gap-3">
                    <div className="text-sm text-gray-600">
                      <span>Propriétaire: </span>
                      <span className="font-medium text-gray-900">{reservation.owner_name || 'Non disponible'}</span>
                      {reservation.status === 'confirmed' && reservation.owner_phone && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-500">Tél: </span>
                          <a 
                            href={`tel:${reservation.owner_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700"
                          >
                            {reservation.owner_phone}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hasPaymentToMake(reservation) && (
                        <button
                          onClick={(e) => openPaymentModal(e, reservation)}
                          className="px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"
                        >
                          <i className="ri-bank-card-line text-sm sm:text-base"></i>
                          Payer {formatPrice(amountToPay(reservation))} FCFA
                        </button>
                      )}
                      {showArrivalButton(reservation) && (
                        <button
                          onClick={(e) => handleSignalArrival(e, reservation)}
                          disabled={!!signalingArrival}
                          className="px-3 sm:px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {signalingArrival === reservation.id ? (
                            <>
                              <i className="ri-loader-4-line animate-spin text-sm sm:text-base"></i>
                              Envoi...
                            </>
                          ) : (
                            <>
                              <i className="ri-home-heart-line text-sm sm:text-base"></i>
                              Signaler mon arrivée
                            </>
                          )}
                        </button>
                      )}
                      {reservation.status !== 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateReservationReceiptPDF({
                              id: reservation.id,
                              property_title: reservation.property_title || 'Bien immobilier',
                              property_address: reservation.property_address,
                              property_city: reservation.property_city,
                              owner_name: reservation.owner_name || 'Propriétaire',
                              owner_email: reservation.owner_email,
                              owner_phone: reservation.owner_phone,
                              guest_name: reservation.guest_name,
                              guest_email: reservation.guest_email,
                              guest_phone: reservation.guest_phone,
                              start_date: reservation.start_date,
                              end_date: reservation.end_date,
                              nights: reservation.nights,
                              total_amount: reservation.total_amount,
                              status: reservation.status,
                              created_at: reservation.created_at,
                            });
                          }}
                          className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"
                        >
                          <i className="ri-file-download-line text-sm sm:text-base"></i>
                          <span>Télécharger le récépissé</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContactOwner({
                            name: reservation.owner_name,
                            email: reservation.owner_email,
                            phone: reservation.owner_phone,
                          });
                        }}
                        className="px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"
                      >
                        <i className="ri-message-3-line text-sm sm:text-base"></i>
                        <span>Contacter</span>
                      </button>
                    </div>
                  </div>
                </div>
                  ))
                );
              })()}
            </div>
            </>
          )}
        </div>
      </main>

      {/* Modal de paiement */}
      {showPaymentModal && selectedReservationForPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Paiement</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedReservationForPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="mb-4 space-y-2">
              <p className="text-sm text-gray-600">
                <strong>{selectedReservationForPayment.property_title || 'Bien immobilier'}</strong>
              </p>
              <p className="text-lg font-semibold text-teal-600">
                Montant: {formatPrice(amountToPay(selectedReservationForPayment))} FCFA
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700">Mode de paiement</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('stripe')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPaymentMethod === 'stripe'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <i className="ri-bank-card-line text-2xl text-teal-600 mb-2"></i>
                  <div className="font-medium text-gray-900">Carte bancaire</div>
                  <div className="text-xs text-gray-600">Stripe</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('paydunya')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedPaymentMethod === 'paydunya'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <i className="ri-smartphone-line text-2xl text-amber-600 mb-2"></i>
                  <div className="font-medium text-gray-900">Mobile Money</div>
                  <div className="text-xs text-gray-600">PayDunya</div>
                </button>
              </div>
              {selectedPaymentMethod === 'paydunya' && (
                <p className="text-xs text-amber-700">
                  Un SMS avec le code de paiement sera envoyé à votre numéro.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedReservationForPayment(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    Redirection...
                  </>
                ) : (
                  'Payer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de contact */}
      {showContactModal && selectedOwner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Contacter le propriétaire</h3>
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setSelectedOwner(null);
                  setMessage('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="mb-4 space-y-2">
              <div>
                <span className="text-sm text-gray-600">Nom: </span>
                <span className="font-medium text-gray-900">{selectedOwner.name || 'Non disponible'}</span>
              </div>
              {selectedOwner.email && (
                <div>
                  <span className="text-sm text-gray-600">Email: </span>
                  <span className="font-medium text-gray-900">{selectedOwner.email}</span>
                </div>
              )}
              {selectedOwner.phone && (
                <div>
                  <span className="text-sm text-gray-600">Téléphone: </span>
                  <span className="font-medium text-gray-900">{selectedOwner.phone}</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Écrivez votre message ici..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setSelectedOwner(null);
                  setMessage('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendingMessage}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingMessage ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
