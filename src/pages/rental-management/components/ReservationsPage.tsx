import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';
import { generateReservationReceiptPDF } from '../../../utils/reservationReceiptPdfGenerator';
import DateRangeCalendar from '../../bien-detail/components/DateRangeCalendar';
import ConfirmModal from '../../../components/ui/ConfirmModal';

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
  amount_paid?: number | null;
  status: string;
  source?: string;
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactReservation, setContactReservation] = useState<Reservation | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [sendingContact, setSendingContact] = useState(false);
  const { sendEmail } = useEmail();
  const [ownerName, setOwnerName] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'default' | 'danger' | 'success';
    infoOnly?: boolean;
  } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadProperties();
  }, [userId]);

  useEffect(() => {
    const loadOwnerName = async () => {
      if (!userId) return;
      const { data } = await supabase.from('users_2025_12_01_11_29').select('full_name').eq('id', userId).single();
      setOwnerName(data?.full_name || 'Propriétaire');
    };
    loadOwnerName();
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

      // Filtrer : biens courte durée uniquement (inclure cancelled, filtre appliqué dans l'UI)
      const shortTermRentalPropertyIds = properties.map(p => p.id);
      const filteredReservations = (data || []).filter((reservation: any) =>
        shortTermRentalPropertyIds.includes(reservation.property_id)
      );

      // Marquer automatiquement comme terminées les réservations confirmées dont la date de fin est passée
      const today = new Date().toISOString().split('T')[0];
      const toComplete = filteredReservations.filter((r: any) => r.status === 'confirmed' && r.end_date < today);
      if (toComplete.length > 0) {
        for (const r of toComplete) {
          await supabase.from('reservations').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', r.id);
        }
        filteredReservations.forEach((r: any) => {
          if (r.status === 'confirmed' && r.end_date < today) r.status = 'completed';
        });
      }

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

  const validateForm = (): string | null => {
    if (!form.property_id || !form.guest_name || !form.guest_email || !form.start_date || !form.end_date) {
      return 'Veuillez remplir tous les champs obligatoires';
    }
    const nights = calculateNights(form.start_date, form.end_date);
    if (nights === 0) return 'La date de fin doit être après la date de début';
    if (selectedPropertyMinNights != null && nights < selectedPropertyMinNights) {
      return `Le séjour minimum est de ${selectedPropertyMinNights} nuitée${selectedPropertyMinNights > 1 ? 's' : ''}. Veuillez sélectionner plus de nuits.`;
    }
    const selectedStart = new Date(form.start_date);
    const selectedEnd = new Date(form.end_date);
    const hasConflict = unavailableDates.some((date) => {
      const d = new Date(date);
      return d >= selectedStart && d <= selectedEnd;
    });
    if (hasConflict) return 'Les dates sélectionnées chevauchent des périodes déjà réservées ou indisponibles.';
    const totalAmount = form.total_amount && String(form.total_amount).trim()
      ? parseFloat(String(form.total_amount).replace(/\s/g, '').replace(',', '.'))
      : calculatedAmount;
    if (isNaN(totalAmount) || totalAmount <= 0) return 'Veuillez saisir un montant valide pour la réservation.';
    return null;
  };

  const handleSubmitClick = () => {
    const isPlatform = editingReservation?.source === 'platform';
    if (isPlatform) {
      setConfirmConfig({
        title: 'Confirmer la modification',
        message: `Modifier le statut de cette réservation en "${form.status === 'pending' ? 'En attente' : form.status === 'confirmed' ? 'Confirmée' : form.status === 'cancelled' ? 'Annulée' : 'Terminée'}" ?`,
        onConfirm: () => { setShowConfirmModal(false); doSubmit(); },
      });
      setShowConfirmModal(true);
      return;
    }
    const err = validateForm();
    if (err) {
      setConfirmConfig({ title: 'Erreur', message: err, onConfirm: () => setShowConfirmModal(false), variant: 'danger' });
      setShowConfirmModal(true);
      return;
    }
    setConfirmConfig({
      title: editingReservation ? 'Confirmer la modification' : 'Confirmer l\'ajout',
      message: editingReservation
        ? 'Êtes-vous sûr de vouloir modifier cette réservation ?'
        : 'Êtes-vous sûr de vouloir ajouter cette réservation ?',
      onConfirm: () => {
        setShowConfirmModal(false);
        doSubmit();
      },
    });
    setShowConfirmModal(true);
  };

  const doSubmit = async () => {
    const isPlatform = editingReservation?.source === 'platform';
    if (isPlatform) {
      setActionLoading(true);
      try {
        const { error } = await supabase
          .from('reservations')
          .update({ status: form.status, updated_at: new Date().toISOString() })
          .eq('id', editingReservation!.id);
        if (error) throw error;
        setSuccessMessage('Statut de la réservation mis à jour.');
        setShowSuccessModal(true);
        setShowModal(false);
        setEditingReservation(null);
        await loadReservations();
      } catch (e: any) {
        setConfirmConfig({ title: 'Erreur', message: e?.message || 'Erreur inconnue', onConfirm: () => setShowConfirmModal(false), variant: 'danger', infoOnly: true });
        setShowConfirmModal(true);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    const err = validateForm();
    if (err) return;

    const nights = calculateNights(form.start_date, form.end_date);
    const totalAmount = form.total_amount && String(form.total_amount).trim()
      ? parseFloat(String(form.total_amount).replace(/\s/g, '').replace(',', '.'))
      : calculatedAmount;

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
        status: form.status,
        source: 'owner',
      };

      if (editingReservation) {
        // Ne pas écraser amount_paid lors de la modification (pour gérer le surplus)
        const updateData: any = { ...reservationData, updated_at: new Date().toISOString() };
        delete updateData.amount_paid;
        const { error } = await supabase
          .from('reservations')
          .update(updateData)
          .eq('id', editingReservation.id);

        if (error) throw error;

        try {
          await sendEmail('reservation_modified', {
            guestEmail: form.guest_email,
            guestName: form.guest_name,
            ownerName,
            propertyTitle: properties.find((p: any) => p.id === form.property_id)?.title || 'Bien immobilier',
            startDate: form.start_date,
            endDate: form.end_date,
            nights,
            totalAmount: totalAmount,
            amountPaid: (editingReservation as any).amount_paid ?? 0,
            appUrl: window.location.origin,
          });
        } catch (e) {
          console.warn('Email de modification non envoyé:', e);
        }
        setSuccessMessage('Réservation modifiée avec succès.');
        setShowSuccessModal(true);
      } else {
        const { error } = await supabase
          .from('reservations')
          .insert([reservationData]);

        if (error) throw error;

        try {
          await sendEmail('reservation_created', {
            guestEmail: form.guest_email,
            guestName: form.guest_name,
            ownerName,
            propertyTitle: properties.find((p: any) => p.id === form.property_id)?.title || 'Bien immobilier',
            startDate: form.start_date,
            endDate: form.end_date,
            nights,
            totalAmount: totalAmount,
            isPending: form.status === 'pending',
            appUrl: window.location.origin,
          });
        } catch (e) {
          console.warn('Email de création non envoyé:', e);
        }
        setSuccessMessage('Réservation ajoutée avec succès.');
        setShowSuccessModal(true);
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
      const msg = error.message?.includes('does not exist')
        ? "La table reservations n'existe pas encore. Veuillez créer la table dans Supabase."
        : `Erreur: ${error.message || 'Erreur inconnue'}`;
      setConfirmConfig({
        title: 'Erreur',
        message: msg,
        onConfirm: () => setShowConfirmModal(false),
        variant: 'danger',
        infoOnly: true,
      });
      setShowConfirmModal(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleContactClient = (reservation: Reservation) => {
    setContactReservation(reservation);
    setContactMessage('');
    setShowContactModal(true);
  };

  const handleSendContactMessage = async () => {
    if (!contactReservation || !contactMessage.trim()) return;

    setSendingContact(true);
    try {
      const result = await sendEmail('owner_message_to_guest', {
        guestEmail: contactReservation.guest_email,
        guestName: contactReservation.guest_name,
        ownerName,
        propertyTitle: contactReservation.property_title || 'Votre réservation',
        message: contactMessage.trim(),
        appUrl: window.location.origin,
      });
      if (result.success) {
        setSuccessMessage('Message envoyé au client !');
        setShowSuccessModal(true);
        setShowContactModal(false);
        setContactReservation(null);
        setContactMessage('');
      } else {
        setConfirmConfig({ title: 'Erreur', message: result.error || 'Erreur lors de l\'envoi du message.', onConfirm: () => setShowConfirmModal(false), variant: 'danger', infoOnly: true });
        setShowConfirmModal(true);
      }
    } catch (e: any) {
      console.error('Erreur envoi message client:', e);
      setConfirmConfig({ title: 'Erreur', message: e?.message || 'Erreur inconnue', onConfirm: () => setShowConfirmModal(false), variant: 'danger', infoOnly: true });
      setShowConfirmModal(true);
    } finally {
      setSendingContact(false);
    }
  };

  const handleEdit = (reservation: Reservation) => {
    setEditingReservation(reservation);
    const isPlatform = reservation.source === 'platform';
    // Pour les réservations plateforme, statuts autorisés : annulée ou terminée uniquement
    const initialStatus = isPlatform && !['cancelled', 'completed'].includes(reservation.status)
      ? 'completed'
      : reservation.status;
    setForm({
      property_id: reservation.property_id,
      guest_name: reservation.guest_name,
      guest_email: reservation.guest_email,
      guest_phone: reservation.guest_phone || '',
      start_date: reservation.start_date,
      end_date: reservation.end_date,
      total_amount: String(reservation.total_amount ?? ''),
      status: initialStatus
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

      {/* Filtre par statut */}
      {reservations.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Reservations List */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
        {(() => {
          const filtered = statusFilter === 'all'
            ? reservations
            : reservations.filter((r) => r.status === statusFilter);
          return filtered.length === 0 ? (
          <div className="p-12 text-center">
            <i className="ri-calendar-check-line text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-600 mb-2">
              {reservations.length === 0 ? 'Aucune réservation enregistrée' : 'Aucune réservation pour ce filtre'}
            </p>
            <p className="text-sm text-gray-500">
              {reservations.length === 0 ? 'Ajoutez votre première réservation pour commencer' : 'Changez le filtre pour voir d\'autres réservations'}
            </p>
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
                {filtered.map((reservation) => (
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
                        {reservation.status === 'confirmed' &&
                          (Number(reservation.amount_paid ?? 0) > 0) &&
                          (Number(reservation.amount_paid ?? 0) < Number(reservation.total_amount ?? 0)) && (
                          <div className="mt-1 text-xs text-amber-700">
                            Surplus: {(reservation.total_amount - (reservation.amount_paid ?? 0)).toLocaleString('fr-FR')} FCFA
                          </div>
                        )}
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
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                          {getStatusLabel(reservation.status)}
                        </span>
                        {reservation.status === 'confirmed' &&
                          (Number(reservation.amount_paid ?? 0) > 0) &&
                          (Number(reservation.amount_paid ?? 0) < Number(reservation.total_amount ?? 0)) && (
                          <div className="mt-1 text-xs text-amber-700">
                            Surplus à payer: {(reservation.total_amount - (reservation.amount_paid ?? 0)).toLocaleString('fr-FR')} FCFA
                          </div>
                        )}
                      </div>
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
                              setConfirmConfig({ title: 'Erreur', message: `Erreur lors de la génération du PDF: ${error.message}`, onConfirm: () => setShowConfirmModal(false), variant: 'danger', infoOnly: true });
                              setShowConfirmModal(true);
                            }
                          }}
                          className="p-2 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                          title="Télécharger le récépissé"
                        >
                          <i className="ri-file-download-line text-green-600"></i>
                        </button>
                        <button
                          onClick={() => handleContactClient(reservation)}
                          className="p-2 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          title="Contacter le client"
                        >
                          <i className="ri-mail-send-line text-teal-600"></i>
                        </button>
                        <button
                          onClick={() => handleEdit(reservation)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Modifier"
                        >
                          <i className="ri-edit-line text-blue-600"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        })()}
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
              {editingReservation?.source === 'platform' ? (
                <>
                  <p className="text-sm text-gray-600">
                    Réservation effectuée sur la plateforme. Vous ne pouvez modifier le statut qu'en Annulée ou Terminée.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    >
                      <option value="cancelled">Annulée</option>
                      <option value="completed">Terminée</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
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

              {/* Marquer surplus payé - uniquement pour réservation owner confirmée modifiée avec surplus */}
              {editingReservation &&
                editingReservation.status === 'confirmed' &&
                (Number(editingReservation.amount_paid ?? 0) > 0) &&
                (Number(editingReservation.amount_paid ?? 0) < Number(form.total_amount || editingReservation.total_amount)) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 mb-2">
                    Surplus à payer: <strong>{((Number(form.total_amount || editingReservation.total_amount)) - (Number(editingReservation.amount_paid ?? 0))).toLocaleString('fr-FR')} FCFA</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editingReservation) return;
                      const total = Number(form.total_amount || editingReservation.total_amount);
                      const surplus = (total - (Number(editingReservation.amount_paid ?? 0))).toLocaleString('fr-FR');
                      setConfirmConfig({
                        title: 'Marquer le surplus comme payé',
                        message: `Marquer le surplus de ${surplus} FCFA comme payé par le client ?`,
                        onConfirm: async () => {
                          setShowConfirmModal(false);
                          try {
                            const { error } = await supabase
                              .from('reservations')
                              .update({ amount_paid: total, updated_at: new Date().toISOString() })
                              .eq('id', editingReservation.id);
                            if (error) throw error;
                            setSuccessMessage('Surplus marqué comme payé.');
                            setShowSuccessModal(true);
                            setShowModal(false);
                            setEditingReservation(null);
                            await loadReservations();
                          } catch (e: any) {
                            setConfirmConfig({ title: 'Erreur', message: e?.message || 'Erreur inconnue', onConfirm: () => setShowConfirmModal(false), variant: 'danger', infoOnly: true });
                            setShowConfirmModal(true);
                          }
                        },
                      });
                      setShowConfirmModal(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                  >
                    <i className="ri-money-dollar-circle-line mr-1"></i>
                    Marquer le surplus comme payé
                  </button>
                </div>
              )}

                </>
              )}

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
                  onClick={handleSubmitClick}
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

      {/* Modal Contacter le client */}
      {showContactModal && contactReservation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Contacter le client</h3>
              <button
                onClick={() => { setShowContactModal(false); setContactReservation(null); setContactMessage(''); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Envoyer un message à <strong>{contactReservation.guest_name}</strong> ({contactReservation.guest_email}) concernant la réservation pour <strong>{contactReservation.property_title}</strong>.
            </p>
            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none mb-4"
              placeholder="Votre message..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowContactModal(false); setContactReservation(null); setContactMessage(''); }}
                className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSendContactMessage}
                disabled={!contactMessage.trim() || sendingContact}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingContact ? <i className="ri-loader-4-line animate-spin text-lg"></i> : <i className="ri-mail-send-line"></i>}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales de confirmation et succès */}
      {showConfirmModal && confirmConfig && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          variant={confirmConfig.variant}
          cancelLabel="Annuler"
          confirmLabel={confirmConfig.infoOnly ? 'OK' : 'Confirmer'}
          infoOnly={confirmConfig.infoOnly}
        />
      )}
      {showSuccessModal && (
        <ConfirmModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            loadReservations();
          }}
          title="Succès"
          message={successMessage}
          variant="success"
          infoOnly
        />
      )}
    </div>
  );
}
