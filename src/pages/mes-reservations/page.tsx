import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  status: string;
  created_at: string;
}

export default function MesReservationsPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<{ name?: string; email?: string; phone?: string } | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { sendEmail } = useEmail();

  useEffect(() => {
    loadUserEmail();
  }, []);

  useEffect(() => {
    if (userEmail) {
      loadReservations();
    }
  }, [userEmail]);

  const loadUserEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('email')
          .eq('id', user.id)
          .single();
        
        if (userData?.email) {
          setUserEmail(userData.email);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'email:', error);
    }
  };

  const loadReservations = async () => {
    try {
      setLoading(true);
      
      // Charger uniquement les réservations confirmées ou complétées (les pending sont dans reservations_temp)
      const { data: reservationsData, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('guest_email', userEmail)
        .in('status', ['confirmed', 'completed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des réservations:', error);
        setReservations([]);
        return;
      }

      // Enrichir avec les données de la propriété et du propriétaire
      const enrichedReservations = await Promise.all(
        (reservationsData || []).map(async (reservation) => {
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

  const handleCancelReservation = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowCancelModal(true);
  };

  const confirmCancelReservation = async () => {
    if (!selectedReservation) return;

    setCancelling(true);
    try {
      // Supprimer la réservation (n'a pas abouti)
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', selectedReservation.id);

      if (deleteError) {
        throw deleteError;
      }

      // Envoyer un email au propriétaire pour l'informer de l'annulation
      if (selectedReservation.owner_email) {
        try {
          await sendEmail('contact_annonce', {
            ownerEmail: selectedReservation.owner_email,
            ownerName: selectedReservation.owner_name || 'Propriétaire',
            visitorName: selectedReservation.guest_name,
            visitorEmail: selectedReservation.guest_email,
            propertyTitle: selectedReservation.property_title || 'Bien immobilier',
            propertyAddress: selectedReservation.property_address && selectedReservation.property_city
              ? `${selectedReservation.property_address}, ${selectedReservation.property_city}`
              : '',
            message: `Bonjour ${selectedReservation.owner_name || 'Propriétaire'},

Nous vous informons que ${selectedReservation.guest_name} a annulé sa réservation pour votre bien "${selectedReservation.property_title || 'Bien immobilier'}".

Détails de la réservation annulée:
- Dates: Du ${formatDate(selectedReservation.start_date)} au ${formatDate(selectedReservation.end_date)}
- Nombre de nuits: ${selectedReservation.nights}
- Montant: ${formatPrice(selectedReservation.total_amount)} FCFA

Cordialement,
L'équipe Mestoits`,
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email au propriétaire:', emailError);
          // Ne pas bloquer l'annulation si l'email échoue
        }
      }

      alert('Réservation annulée avec succès. Le propriétaire a été informé.');
      setShowCancelModal(false);
      setSelectedReservation(null);
      // Recharger les réservations
      await loadReservations();
    } catch (error: any) {
      console.error('Erreur lors de l\'annulation de la réservation:', error);
      alert(`Erreur lors de l'annulation: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setCancelling(false);
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
            <div className="space-y-4">
              {reservations.map((reservation) => (
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
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(reservation.status)}`}>
                      {getStatusLabel(reservation.status)}
                    </span>
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
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal d'annulation */}
      {showCancelModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Annuler la réservation</h3>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedReservation(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-4">
                Êtes-vous sûr de vouloir annuler cette réservation ? Cette action est irréversible.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Bien: </span>
                  <span className="font-medium text-gray-900">{selectedReservation.property_title || 'Bien immobilier'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Dates: </span>
                  <span className="font-medium text-gray-900">
                    {formatDate(selectedReservation.start_date)} - {formatDate(selectedReservation.end_date)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Montant: </span>
                  <span className="font-medium text-gray-900">{formatPrice(selectedReservation.total_amount)} FCFA</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedReservation(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={cancelling}
              >
                Retour
              </button>
              <button
                onClick={confirmCancelReservation}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
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
