import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { generateReservationReceiptPDF } from '../../../utils/reservationReceiptPdfGenerator';
import DateRangeCalendar from '../../bien-detail/components/DateRangeCalendar';

interface ReservationsPageProps {
  userId: string;
  onBack: () => void;
}

interface Reservation {
  id: string;
  property_id: string;
  property_title?: string;
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

export default function ReservationsPage({ userId, onBack }: ReservationsPageProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [form, setForm] = useState({
    property_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    start_date: '',
    end_date: '',
    total_amount: '',
    status: 'pending'
  });
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [selectedPropertyPrice, setSelectedPropertyPrice] = useState<number | null>(null);
  const [selectedPropertyMinNights, setSelectedPropertyMinNights] = useState<number | null>(null);

  useEffect(() => {
    loadProperties();
  }, [userId]);

  useEffect(() => {
    if (properties.length > 0 || userId) {
      loadReservations();
    }
  }, [userId, properties.length]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties_02')
        .select('id, title, price, min_nights')
        .eq('owner_id', userId)
        .eq('status', 'active')
        .eq('operation_type', 'short-term-rental');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
    }
  };

  const loadUnavailableDates = useCallback(async (propertyId: string, excludeReservationId?: string) => {
    if (!propertyId) {
      setUnavailableDates([]);
      return;
    }
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const dates: string[] = [];

      // 1. Réservations confirmées et en attente (à exclure si on modifie cette réservation)
      const { data: confirmedReservations } = await supabase
        .from('reservations')
        .select('id, start_date, end_date')
        .eq('property_id', propertyId)
        .in('status', ['confirmed', 'pending']);
      (confirmedReservations || []).forEach((r: any) => {
        if (excludeReservationId && r.id === excludeReservationId) return;
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        const current = new Date(start);
        while (current <= end) {
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      });

      // 2. Réservations temporaires (< 15 min)
      const { data: tempReservations } = await supabase
        .from('reservations_temp')
        .select('start_date, end_date, created_at')
        .eq('property_id', propertyId);
      (tempReservations || [])
        .filter((r: any) => r.created_at && new Date(r.created_at) > fifteenMinutesAgo)
        .forEach((r: any) => {
          const start = new Date(r.start_date);
          const end = new Date(r.end_date);
          const current = new Date(start);
          while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
          }
        });

      // 3. Périodes d'indisponibilité manuelles
      const { data: unavailablePeriods } = await supabase
        .from('property_unavailable_periods')
        .select('start_date, end_date')
        .eq('property_id', propertyId);
      (unavailablePeriods || []).forEach((r: any) => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        const current = new Date(start);
        while (current <= end) {
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      });

      setUnavailableDates([...new Set(dates)]);
    } catch (error) {
      console.error('Erreur chargement dates indisponibles:', error);
      setUnavailableDates([]);
    }
  }, []);

  useEffect(() => {
    if (form.property_id) {
      loadUnavailableDates(form.property_id, editingReservation?.id);
      const prop = properties.find((p: any) => p.id === form.property_id);
      setSelectedPropertyPrice(prop?.price ?? null);
      setSelectedPropertyMinNights(prop?.min_nights ?? null);
    } else {
      setUnavailableDates([]);
      setSelectedPropertyPrice(null);
      setSelectedPropertyMinNights(null);
    }
  }, [form.property_id, properties, loadUnavailableDates, editingReservation?.id]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      // Note: Cette table devra être créée dans Supabase si elle n'existe pas
      // Charger uniquement les réservations liées aux biens en location courte durée
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('owner_id', userId)
        .order('start_date', { ascending: false });

      if (error) {
        // Si la table n'existe pas encore, on initialise avec un tableau vide
        if (error.message?.includes('does not exist')) {
          console.warn('La table reservations n\'existe pas encore');
          setReservations([]);
          return;
        }
        throw error;
      }

      // Filtrer : biens courte durée + exclure les réservations qui n'ont pas abouti (cancelled)
      const shortTermRentalPropertyIds = properties.map(p => p.id);
      const filteredReservations = (data || []).filter((reservation: any) => 
        shortTermRentalPropertyIds.includes(reservation.property_id) &&
        ['pending', 'confirmed', 'completed'].includes(reservation.status)
      );

      // Enrichir avec les détails des propriétés
      const reservationsWithDetails = await Promise.all(
        filteredReservations.map(async (reservation) => {
          const property = properties.find(p => p.id === reservation.property_id);
          return { ...reservation, property_title: property?.title || 'N/A' };
        })
      );

      setReservations(reservationsWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des réservations:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const calculatedAmount = form.start_date && form.end_date && selectedPropertyPrice != null
    ? calculateNights(form.start_date, form.end_date) * selectedPropertyPrice
    : 0;

  useEffect(() => {
    if (!editingReservation && form.start_date && form.end_date && selectedPropertyPrice != null) {
      const amt = calculateNights(form.start_date, form.end_date) * selectedPropertyPrice;
      setForm((f) => ({ ...f, total_amount: String(Math.round(amt)) }));
    }
  }, [form.start_date, form.end_date, selectedPropertyPrice, editingReservation]);

  const handleSubmit = async () => {
    if (!form.property_id || !form.guest_name || !form.guest_email || !form.start_date || !form.end_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const nights = calculateNights(form.start_date, form.end_date);
    if (nights === 0) {
      alert('La date de fin doit être après la date de début');
      return;
    }

    if (selectedPropertyMinNights != null && nights < selectedPropertyMinNights) {
      alert(`Le séjour minimum est de ${selectedPropertyMinNights} nuitée${selectedPropertyMinNights > 1 ? 's' : ''}. Veuillez sélectionner plus de nuits.`);
      return;
    }

    const selectedStart = new Date(form.start_date);
    const selectedEnd = new Date(form.end_date);
    const hasConflict = unavailableDates.some((date) => {
      const d = new Date(date);
      return d >= selectedStart && d <= selectedEnd;
    });
    if (hasConflict) {
      alert('Les dates sélectionnées chevauchent des périodes déjà réservées ou indisponibles. Veuillez choisir d\'autres dates.');
      return;
    }

    const totalAmount = form.total_amount && form.total_amount.trim()
      ? parseFloat(form.total_amount.replace(/\s/g, '').replace(',', '.'))
      : calculatedAmount;
    if (isNaN(totalAmount) || totalAmount <= 0) {
      alert('Veuillez saisir un montant valide pour la réservation.');
      return;
    }

    setActionLoading(true);
    try {
      const reservationData: any = {
        property_id: form.property_id,
        owner_id: userId,
        guest_name: form.guest_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone || null,
        start_date: form.start_date,
        end_date: form.end_date,
        nights: nights,
        total_amount: totalAmount,
        status: form.status
      };

      if (editingReservation) {
        const { error } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id);

        if (error) throw error;
        alert('Réservation modifiée avec succès !');
      } else {
        const { error } = await supabase
          .from('reservations')
          .insert([reservationData]);

        if (error) throw error;
        alert('Réservation ajoutée avec succès !');
      }

      setShowModal(false);
      setEditingReservation(null);
      setForm({
        property_id: '',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        start_date: '',
        end_date: '',
        total_amount: '',
        status: 'pending'
      });
      await loadReservations();
    } catch (error: any) {
      console.error('Erreur:', error);
      if (error.message?.includes('does not exist')) {
        alert('La table reservations n\'existe pas encore. Veuillez créer la table dans Supabase.');
      } else {
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (reservation: Reservation) => {
    if (reservation.status === 'cancelled') return;
    if (!confirm(`Êtes-vous sûr de vouloir annuler cette réservation ? L'argent quittera le solde potentiel.`)) return;

    try {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', reservation.id);

      if (error) throw error;
      alert('Réservation annulée.');
      await loadReservations();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };


  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setForm({
      property_id: reservation.property_id,
      guest_name: reservation.guest_name,
      guest_email: reservation.guest_email,
      guest_phone: reservation.guest_phone || '',
      start_date: reservation.start_date,
      end_date: reservation.end_date,
      total_amount: String(reservation.total_amount ?? ''),
      status: reservation.status
    });
    setShowModal(true);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      cancelled: 'Annulée',
      completed: 'Terminée'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      completed: 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Reservations</h2>
            <p className="text-sm md:text-base text-gray-600">Gérez vos réservations de location courte durée</p>
          </div>
        </div>
        <div className="md:hidden mt-4">
          <button
            onClick={() => {
              setEditingReservation(null);
              setForm({
                property_id: '',
                guest_name: '',
                guest_email: '',
                guest_phone: '',
                start_date: '',
                end_date: '',
                total_amount: '',
                status: 'pending'
              });
              setShowModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-lg"></i>
            Ajouter une réservation
          </button>
        </div>
        <div className="hidden md:flex items-center justify-end">
          <button
            onClick={() => {
              setEditingReservation(null);
              setForm({
                property_id: '',
                guest_name: '',
                guest_email: '',
                guest_phone: '',
                start_date: '',
                end_date: '',
                total_amount: '',
                status: 'pending'
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-xl"></i>
            Ajouter une réservation
          </button>
        </div>
      </div>

      {/* Reservations List */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
        {reservations.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-calendar-check-line text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-600 mb-2">Aucune réservation enregistrée</p>
            <p className="text-sm text-gray-500">Ajoutez votre première réservation pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bien</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Client</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Dates</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell">Nuits</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Montant</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell">Statut</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 break-words">{reservation.property_title}</td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900">
                      <div className="break-words">{reservation.guest_name}</div>
                      {reservation.guest_phone && (
                        <div className="text-xs text-gray-500">{reservation.guest_phone}</div>
                      )}
                      <div className="sm:hidden text-xs text-gray-500 mt-1">
                        {new Date(reservation.start_date).toLocaleDateString('fr-FR')} - {new Date(reservation.end_date).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="sm:hidden text-xs text-gray-500">
                        {reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}
                      </div>
                      <div className="sm:hidden mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                          {getStatusLabel(reservation.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                      <div>{new Date(reservation.start_date).toLocaleDateString('fr-FR')}</div>
                      <div className="text-xs text-gray-500">au {new Date(reservation.end_date).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 hidden md:table-cell">{reservation.nights}</td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold text-gray-900">
                      {reservation.total_amount.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                        {getStatusLabel(reservation.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={async () => {
                            try {
                              // Charger les données complètes pour le PDF
                              const [propertyData, ownerData] = await Promise.all([
                                supabase
                                  .from('properties_02')
                                  .select('title, address, city')
                                  .eq('id', reservation.property_id)
                                  .single(),
                                supabase
                                  .from('users_2025_12_01_11_29')
                                  .select('full_name, email, phone')
                                  .eq('id', userId)
                                  .single(),
                              ]);

                              generateReservationReceiptPDF({
                                id: reservation.id,
                                property_title: propertyData.data?.title || reservation.property_title || 'Bien immobilier',
                                property_address: propertyData.data?.address,
                                property_city: propertyData.data?.city,
                                owner_name: ownerData.data?.full_name || 'Propriétaire',
                                owner_email: ownerData.data?.email,
                                owner_phone: ownerData.data?.phone,
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
                            } catch (error: any) {
                              console.error('Erreur lors de la génération du PDF:', error);
                              alert(`Erreur lors de la génération du PDF: ${error.message}`);
                            }
                          }}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                          title="Télécharger le récépissé"
                        >
                          <i className="ri-file-download-line text-green-600"></i>
                        </button>
                        <button
                          onClick={() => handleEdit(reservation)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <i className="ri-edit-line text-blue-600"></i>
                        </button>
                        {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                          <button
                            onClick={() => handleCancel(reservation)}
                            className="p-2 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Annuler la réservation"
                          >
                            <i className="ri-close-circle-line text-amber-600"></i>
                          </button>
                        )}
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
                {editingReservation ? 'Modifier la réservation' : 'Ajouter une réservation'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingReservation(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bien *</label>
                <select
                  value={form.property_id}
                  onChange={(e) => setForm({ ...form, property_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                >
                  <option value="">Sélectionner un bien</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>{prop.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du client *</label>
                  <input
                    type="text"
                    value={form.guest_name}
                    onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Nom complet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={form.guest_email}
                    onChange={(e) => setForm({ ...form, guest_email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  value={form.guest_phone}
                  onChange={(e) => setForm({ ...form, guest_phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  placeholder="+225 XX XX XX XX XX"
                />
              </div>

              {/* Calendrier de sélection des dates */}
              {form.property_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionnez vos dates *</label>
                  {selectedPropertyMinNights != null && form.start_date && form.end_date && calculateNights(form.start_date, form.end_date) < selectedPropertyMinNights && (
                    <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        <i className="ri-alert-line mr-1"></i>
                        Le séjour minimum est de <strong>{selectedPropertyMinNights} nuitée{selectedPropertyMinNights > 1 ? 's' : ''}</strong>.
                      </p>
                    </div>
                  )}
                  <DateRangeCalendar
                    startDate={form.start_date}
                    endDate={form.end_date}
                    onStartDateChange={(date) => {
                      setForm((f) => {
                        const next = { ...f, start_date: date };
                        if (f.end_date && date && new Date(f.end_date) <= new Date(date)) next.end_date = '';
                        return next;
                      });
                    }}
                    onEndDateChange={(date) => setForm((f) => ({ ...f, end_date: date }))}
                    unavailableDates={unavailableDates}
                  />
                </div>
              )}

              {/* Résumé nuits + montant calculé + champ modifiable */}
              {form.start_date && form.end_date && form.property_id && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Prix par nuit</span>
                    <span className="font-semibold">
                      {selectedPropertyPrice != null ? selectedPropertyPrice.toLocaleString('fr-FR') : '—'} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Nombre de nuits</span>
                    <span className="font-semibold">{calculateNights(form.start_date, form.end_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 border-t border-gray-200 pt-2">
                    <span>Montant calculé</span>
                    <span className="font-semibold text-teal-600">{calculatedAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant total (modifiable)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.total_amount}
                      onChange={(e) => setForm({ ...form, total_amount: e.target.value.replace(/[^\d]/g, '') })}
                      placeholder={String(calculatedAmount)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Saisissez le montant final (FCFA). Laissez vide pour utiliser le montant calculé.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                >
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="cancelled">Annulée</option>
                  <option value="completed">Terminée</option>
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingReservation(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading}
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin"></i>
                      {editingReservation ? 'Modification...' : 'Ajout...'}
                    </>
                  ) : (
                    editingReservation ? 'Modifier' : 'Ajouter'
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
