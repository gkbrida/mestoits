import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { generateInstallmentPaymentReceiptPDF } from '../../../utils/installmentPaymentReceiptPdfGenerator';


interface PaiementEchelonnePageProps {
  userId: string;
  onBack: () => void;
}

interface InstallmentPlan {
  id: string;
  property_id: string;
  property_title?: string;
  property_location?: string;
  property_surface?: number;
  property_rooms?: number;
  total_amount: number;
  number_of_installments: number;
  installment_amount: number;
  start_date: string;
  frequency: string;
  payment_due_day?: number | null;
  status: string;
  payer_first_name?: string;
  payer_last_name?: string;
  payer_birth_date?: string;
  payer_phone?: string;
  payer_email?: string;
  payer_address?: string;
  payments: InstallmentPayment[];
}

interface InstallmentPayment {
  id: string;
  installment_plan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  payment_date?: string;
  status: string;
}

export default function PaiementEchelonnePage({ userId, onBack }: PaiementEchelonnePageProps) {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    property_id: '',
    total_amount: '',
    first_payment_type: 'none' as 'none' | 'percentage' | 'fixed',
    first_payment_value: '',
    number_of_installments: '',
    start_date: '',
    frequency: 'monthly',
    payment_due_day: '',
    payer_first_name: '',
    payer_last_name: '',
    payer_birth_date: '',
    payer_phone: '',
    payer_email: '',
    payer_address: ''
  });

  useEffect(() => {
    loadProperties();
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadPlans();
    }
  }, [userId]);

  const loadProperties = async () => {
    try {
      // Charger tous les biens en vente
      const { data: allProperties, error: propertiesError } = await supabase
        .from('properties_02')
        .select('id, title, address, city, surface_area, rooms, price')
        .eq('owner_id', userId)
        .eq('status', 'active')
        .eq('operation_type', 'sale');

      if (propertiesError) throw propertiesError;

      // Charger les biens déjà en paiement échelonné actif
      const existingPlansResult = await supabase
        .from('installment_plans')
        .select('property_id')
        .eq('owner_id', userId)
        .eq('status', 'active');

      const existingPlans = existingPlansResult.error && existingPlansResult.error.message?.includes('does not exist')
        ? []
        : (existingPlansResult.data || []);

      const excludedPropertyIds = new Set(existingPlans.map((p: any) => p.property_id));
      
      // Filtrer pour exclure les biens déjà en paiement échelonné
      const availableProperties = (allProperties || []).filter(p => !excludedPropertyIds.has(p.id));
      
      setProperties(availableProperties);
    } catch (error) {
      console.error('Erreur lors du chargement des biens:', error);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      // Note: Cette table devra être créée dans Supabase si elle n'existe pas
      // Charger tous les plans de l'utilisateur
      const { data: plansData, error: plansError } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('owner_id', userId)
        .order('start_date', { ascending: false });

      if (plansError) {
        if (plansError.message?.includes('does not exist')) {
          console.warn('La table installment_plans n\'existe pas encore');
          setPlans([]);
          return;
        }
        throw plansError;
      }

      // Charger les paiements et détails des propriétés pour chaque plan
      // Vérifier directement que chaque bien est en vente lors du chargement
      const plansWithPayments = await Promise.all(
        (plansData || []).map(async (plan) => {
          // Vérifier que le bien est en vente
          const { data: propertyCheck } = await supabase
            .from('properties_02')
            .select('operation_type')
            .eq('id', plan.property_id)
            .single();

          // Ne charger que les plans liés aux biens en vente
          if (!propertyCheck || propertyCheck.operation_type !== 'sale') {
            return null;
          }
          const { data: paymentsData } = await supabase
            .from('installment_payments')
            .select('*')
            .eq('installment_plan_id', plan.id)
            .order('installment_number', { ascending: true });

          // Charger les détails complets de la propriété
          const { data: propertyData } = await supabase
            .from('properties_02')
            .select('title, address, city, surface_area, rooms')
            .eq('id', plan.property_id)
            .single();

          const location = propertyData 
            ? `${propertyData.address || ''}, ${propertyData.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
            : 'N/A';

          return {
            ...plan,
            property_title: propertyData?.title || 'N/A',
            property_location: location,
            property_surface: propertyData?.surface_area,
            property_rooms: propertyData?.rooms,
            payments: paymentsData || []
          };
        })
      );

      // Filtrer les valeurs null (plans liés à des biens qui ne sont pas en vente)
      const validPlans = plansWithPayments.filter((plan): plan is InstallmentPlan => plan !== null);

      setPlans(validPlans);
    } catch (error) {
      console.error('Erreur lors du chargement des plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour calculer la date d'échéance basée sur payment_due_day
  const calculateDueDate = (baseDate: Date, paymentDueDay: number, monthOffset: number): Date => {
    const targetDate = new Date(baseDate);
    targetDate.setMonth(targetDate.getMonth() + monthOffset);
    
    // Gérer les mois avec moins de 31 jours
    const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const dueDay = Math.min(paymentDueDay, daysInMonth);
    
    targetDate.setDate(dueDay);
    return targetDate;
  };

  const handleSubmit = async () => {
    if (!form.property_id || !form.total_amount || !form.number_of_installments || !form.start_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier payment_due_day si frequency est monthly ou quarterly
    if ((form.frequency === 'monthly' || form.frequency === 'quarterly') && !form.payment_due_day) {
      alert('Veuillez renseigner le jour du mois pour les échéances');
      return;
    }

    const totalAmount = parseFloat(form.total_amount);
    const numberOfInstallments = parseInt(form.number_of_installments);
    if (numberOfInstallments < 2) {
      alert('Le nombre d\'échéances doit être au moins 2');
      return;
    }

    // Calcul du premier paiement et du reste
    let firstPaymentAmount = 0;
    if (form.first_payment_type === 'percentage' && form.first_payment_value) {
      const pct = parseFloat(form.first_payment_value);
      if (pct > 0 && pct < 100) {
        firstPaymentAmount = Math.round((totalAmount * pct) / 100);
      }
    } else if (form.first_payment_type === 'fixed' && form.first_payment_value) {
      firstPaymentAmount = parseFloat(form.first_payment_value);
    }

    if (firstPaymentAmount >= totalAmount) {
      alert('Le premier paiement ne peut pas être supérieur ou égal au montant total');
      return;
    }

    const remainder = totalAmount - firstPaymentAmount;
    const remainingInstallments = firstPaymentAmount > 0 ? numberOfInstallments - 1 : numberOfInstallments;
    const regularInstallmentAmount = Math.round(remainder / remainingInstallments);
    const installmentAmount = firstPaymentAmount > 0 ? regularInstallmentAmount : totalAmount / numberOfInstallments;
    const paymentDueDay = form.payment_due_day ? parseInt(form.payment_due_day) : null;

    setActionLoading(true);
    try {
      const planData: any = {
        property_id: form.property_id,
        owner_id: userId,
        total_amount: totalAmount,
        number_of_installments: numberOfInstallments,
        installment_amount: firstPaymentAmount > 0 ? regularInstallmentAmount : installmentAmount,
        start_date: form.start_date,
        frequency: form.frequency,
        payment_due_day: paymentDueDay,
        status: 'active',
        payer_first_name: form.payer_first_name,
        payer_last_name: form.payer_last_name,
        payer_birth_date: form.payer_birth_date,
        payer_phone: form.payer_phone,
        payer_email: form.payer_email,
        payer_address: form.payer_address
      };

      let planId: string;

      if (editingPlan) {
        const { error } = await supabase
          .from('installment_plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        planId = editingPlan.id;
        alert('Plan de paiement modifié avec succès !');
      } else {
        const { data, error } = await supabase
          .from('installment_plans')
          .insert([planData])
          .select()
          .single();

        if (error) throw error;
        planId = data.id;
        alert('Plan de paiement créé avec succès !');

        // Créer les échéances (premier paiement éventuel + reste réparti)
        const installments = [];
        const startDate = new Date(form.start_date);

        // Montants : 1er = firstPaymentAmount, 2..N = répartition du reste (dernière échéance absorbe les arrondis)
        const regularAmount = Math.round(remainder / remainingInstallments);
        const lastRegularAmount = remainder - regularAmount * (remainingInstallments - 1);

        for (let i = 0; i < numberOfInstallments; i++) {
          let dueDate: Date;

          if (form.frequency === 'monthly') {
            dueDate = paymentDueDay
              ? calculateDueDate(startDate, paymentDueDay, i)
              : (() => { const d = new Date(startDate); d.setMonth(d.getMonth() + i); return d; })();
          } else if (form.frequency === 'weekly') {
            dueDate = new Date(startDate);
            dueDate.setDate(dueDate.getDate() + (i * 7));
          } else if (form.frequency === 'quarterly') {
            dueDate = paymentDueDay
              ? calculateDueDate(startDate, paymentDueDay, i * 3)
              : (() => { const d = new Date(startDate); d.setMonth(d.getMonth() + (i * 3)); return d; })();
          } else {
            dueDate = new Date(startDate);
          }

          const amount = firstPaymentAmount > 0 && i === 0
            ? firstPaymentAmount
            : (firstPaymentAmount > 0 && i === numberOfInstallments - 1 ? lastRegularAmount : regularAmount);

          installments.push({
            installment_plan_id: planId,
            installment_number: i + 1,
            due_date: dueDate.toISOString().split('T')[0],
            amount: Math.round(amount * 100) / 100,
            status: 'pending'
          });
        }

        const { error: installmentsError } = await supabase
          .from('installment_payments')
          .insert(installments);

        if (installmentsError) throw installmentsError;

        // Envoyer un email au payeur avec toutes les informations
        if (form.payer_email) {
          try {
            // Récupérer les informations du créateur (propriétaire)
            const { data: ownerData } = await supabase
              .from('users_2025_12_01_11_29')
              .select('full_name, email, phone')
              .eq('id', userId)
              .single();

            // Récupérer les informations du bien
            const { data: propertyData } = await supabase
              .from('properties_02')
              .select('title, address, city, surface_area, rooms')
              .eq('id', form.property_id)
              .single();

            const effectiveInstallmentAmount = firstPaymentAmount > 0 ? regularInstallmentAmount : installmentAmount;

            const emailHtml = buildInstallmentPlanEmail({
              payerName: `${form.payer_first_name} ${form.payer_last_name}`,
              ownerName: ownerData?.full_name || 'Le propriétaire',
              ownerEmail: ownerData?.email || '',
              ownerPhone: ownerData?.phone || '',
              propertyTitle: propertyData?.title || 'Bien immobilier',
              propertyAddress: propertyData?.address || '',
              propertyCity: propertyData?.city || '',
              propertySurface: propertyData?.surface_area,
              propertyRooms: propertyData?.rooms,
              totalAmount: totalAmount,
              numberOfInstallments: numberOfInstallments,
              installmentAmount: effectiveInstallmentAmount,
              firstPaymentAmount: firstPaymentAmount > 0 ? firstPaymentAmount : undefined,
              frequency: form.frequency,
              paymentDueDay: paymentDueDay,
              startDate: form.start_date,
              installments: installments.map(inst => ({
                number: inst.installment_number,
                dueDate: inst.due_date,
                amount: inst.amount
              }))
            });

            const emailText = buildInstallmentPlanEmailText({
              payerName: `${form.payer_first_name} ${form.payer_last_name}`,
              ownerName: ownerData?.full_name || 'Le propriétaire',
              ownerEmail: ownerData?.email || '',
              ownerPhone: ownerData?.phone || '',
              propertyTitle: propertyData?.title || 'Bien immobilier',
              propertyAddress: propertyData?.address || '',
              propertyCity: propertyData?.city || '',
              propertySurface: propertyData?.surface_area,
              propertyRooms: propertyData?.rooms,
              totalAmount: totalAmount,
              numberOfInstallments: numberOfInstallments,
              installmentAmount: effectiveInstallmentAmount,
              firstPaymentAmount: firstPaymentAmount > 0 ? firstPaymentAmount : undefined,
              frequency: form.frequency,
              paymentDueDay: paymentDueDay,
              startDate: form.start_date,
              installments: installments.map(inst => ({
                number: inst.installment_number,
                dueDate: inst.due_date,
                amount: inst.amount
              }))
            });

            // Envoyer l'email via l'API
            const emailResponse = await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: form.payer_email,
                subject: `Plan de paiement échelonné créé - ${propertyData?.title || 'Bien immobilier'}`,
                html: emailHtml,
                text: emailText,
              }),
            });

            if (!emailResponse.ok) {
              console.warn('Erreur lors de l\'envoi de l\'email:', await emailResponse.text());
            } else {
              console.log('✅ Email envoyé au payeur');
            }
          } catch (emailError: any) {
            console.error('Erreur lors de l\'envoi de l\'email:', emailError);
            // Ne pas bloquer la création du plan si l'email échoue
          }
        }
      }

      setShowModal(false);
      setEditingPlan(null);
      setForm({
        property_id: '',
        total_amount: '',
        first_payment_type: 'none',
        first_payment_value: '',
        number_of_installments: '',
        start_date: '',
        frequency: 'monthly',
        payment_due_day: '',
        payer_first_name: '',
        payer_last_name: '',
        payer_birth_date: '',
        payer_phone: '',
        payer_email: '',
        payer_address: ''
      });
      await loadPlans();
    } catch (error: any) {
      console.error('Erreur:', error);
      if (error.message?.includes('does not exist')) {
        alert('Les tables installment_plans et installment_payments n\'existent pas encore. Veuillez créer ces tables dans Supabase.');
      } else {
        alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plan de paiement ?')) return;

    try {
      // Supprimer d'abord les paiements
      await supabase
        .from('installment_payments')
        .delete()
        .eq('installment_plan_id', id);

      // Puis supprimer le plan
      const { error } = await supabase
        .from('installment_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Plan de paiement supprimé avec succès !');
      await loadPlans();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleEdit = (plan: InstallmentPlan) => {
    setEditingPlan(plan);
    setForm({
      property_id: plan.property_id,
      total_amount: plan.total_amount.toString(),
      first_payment_type: 'none',
      first_payment_value: '',
      number_of_installments: plan.number_of_installments.toString(),
      start_date: plan.start_date,
      frequency: plan.frequency,
      payment_due_day: plan.payment_due_day?.toString() || '',
      payer_first_name: plan.payer_first_name || '',
      payer_last_name: plan.payer_last_name || '',
      payer_birth_date: plan.payer_birth_date || '',
      payer_phone: plan.payer_phone || '',
      payer_email: plan.payer_email || '',
      payer_address: plan.payer_address || ''
    });
    setShowModal(true);
  };

  const handleTogglePaymentStatus = async (paymentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      const paymentDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null;

      const { error } = await supabase
        .from('installment_payments')
        .update({
          status: newStatus,
          payment_date: paymentDate
        })
        .eq('id', paymentId);

      if (error) throw error;
      await loadPlans();
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const togglePlanExpanded = (planId: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planId)) {
        newSet.delete(planId);
      } else {
        newSet.add(planId);
      }
      return newSet;
    });
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel'
    };
    return labels[frequency] || frequency;
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
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Paiements échelonnés</h2>
            <p className="text-sm md:text-base text-gray-600">Gérez vos plans de paiement échelonnés</p>
          </div>
        </div>
        <div className="md:hidden mt-4">
          <button
            onClick={() => {
              setEditingPlan(null);
              setForm({
                property_id: '',
                total_amount: '',
                first_payment_type: 'none',
                first_payment_value: '',
                number_of_installments: '',
                start_date: '',
                frequency: 'monthly',
                payment_due_day: '',
                payer_first_name: '',
                payer_last_name: '',
                payer_birth_date: '',
                payer_phone: '',
                payer_email: '',
                payer_address: ''
              });
              setShowModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-lg"></i>
            Créer un plan
          </button>
        </div>
        <div className="hidden md:flex items-center justify-end">
          <button
            onClick={() => {
              setEditingPlan(null);
              setForm({
                property_id: '',
                total_amount: '',
                first_payment_type: 'none',
                first_payment_value: '',
                number_of_installments: '',
                start_date: '',
                frequency: 'monthly',
                payment_due_day: '',
                payer_first_name: '',
                payer_last_name: '',
                payer_birth_date: '',
                payer_phone: '',
                payer_email: '',
                payer_address: ''
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
          >
            <i className="ri-add-line text-xl"></i>
            Créer un plan
          </button>
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {plans.length === 0 ? (
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-12 text-center">
            <i className="ri-installment-line text-5xl text-gray-300 mb-4"></i>
            <p className="text-gray-600 mb-2">Aucun plan de paiement échelonné</p>
            <p className="text-sm text-gray-500">Créez votre premier plan pour commencer</p>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 break-words">{plan.property_title}</h3>
                  {/* Informations supplémentaires du bien */}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                    {plan.property_location && (
                      <div className="flex items-center gap-1">
                        <i className="ri-map-pin-line"></i>
                        <span>{plan.property_location}</span>
                      </div>
                    )}
                    {plan.property_surface && (
                      <div className="flex items-center gap-1">
                        <i className="ri-ruler-line"></i>
                        <span>{plan.property_surface} m²</span>
                      </div>
                    )}
                    {plan.property_rooms && (
                      <div className="flex items-center gap-1">
                        <i className="ri-door-lock-line"></i>
                        <span>{plan.property_rooms} pièce{plan.property_rooms > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Montant total:</span>
                      <span className="font-semibold text-gray-900 ml-2">
                        {plan.total_amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Nombre d'échéances:</span>
                      <span className="font-semibold text-gray-900 ml-2">{plan.number_of_installments}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Montant par échéance:</span>
                      <span className="font-semibold text-gray-900 ml-2">
                        {plan.installment_amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Fréquence:</span>
                      <span className="font-semibold text-gray-900 ml-2">{getFrequencyLabel(plan.frequency)}</span>
                    </div>
                  </div>
                  {plan.payer_first_name && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Informations du payeur</h5>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Nom:</span>
                          <span className="font-semibold text-gray-900 ml-2">
                            {plan.payer_first_name} {plan.payer_last_name}
                          </span>
                        </div>
                        {plan.payer_birth_date && (
                          <div>
                            <span className="text-gray-500">Date de naissance:</span>
                            <span className="font-semibold text-gray-900 ml-2">
                              {new Date(plan.payer_birth_date).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                        {plan.payer_phone && (
                          <div>
                            <span className="text-gray-500">Téléphone:</span>
                            <span className="font-semibold text-gray-900 ml-2">{plan.payer_phone}</span>
                          </div>
                        )}
                        {plan.payer_email && (
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <span className="font-semibold text-gray-900 ml-2">{plan.payer_email}</span>
                          </div>
                        )}
                        {plan.payer_address && (
                          <div className="w-full">
                            <span className="text-gray-500">Adresse:</span>
                            <span className="font-semibold text-gray-900 ml-2">{plan.payer_address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 flex-wrap">
                  <button
                    onClick={async () => {
                      try {
                        // Charger les données complètes pour le PDF
                        const [propertyData, ownerData] = await Promise.all([
                          supabase
                            .from('properties_02')
                            .select('title, address, city')
                            .eq('id', plan.property_id)
                            .single(),
                          supabase
                            .from('users_2025_12_01_11_29')
                            .select('full_name, email, phone')
                            .eq('id', userId)
                            .single(),
                        ]);

                        generateInstallmentPaymentReceiptPDF({
                          id: plan.id,
                          property_title: propertyData.data?.title || plan.property_title || 'Bien immobilier',
                          property_address: propertyData.data?.address,
                          property_city: propertyData.data?.city,
                          owner_name: ownerData.data?.full_name || 'Propriétaire',
                          owner_email: ownerData.data?.email,
                          owner_phone: ownerData.data?.phone,
                          payer_name: plan.payer_first_name && plan.payer_last_name 
                            ? `${plan.payer_first_name} ${plan.payer_last_name}` 
                            : 'Payeur',
                          payer_email: plan.payer_email,
                          payer_phone: plan.payer_phone,
                          total_amount: plan.total_amount,
                          number_of_installments: plan.number_of_installments,
                          installment_amount: plan.installment_amount,
                          frequency: plan.frequency,
                          start_date: plan.start_date,
                          status: plan.status,
                          payments: plan.payments,
                        });
                      } catch (error: any) {
                        console.error('Erreur lors de la génération du PDF:', error);
                        alert(`Erreur lors de la génération du PDF: ${error.message}`);
                      }
                    }}
                    className="p-2 hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                    title="Télécharger le bordereau"
                  >
                    <i className="ri-file-download-line text-green-600"></i>
                  </button>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    title="Modifier"
                  >
                    <i className="ri-edit-line text-blue-600"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Supprimer"
                  >
                    <i className="ri-delete-bin-line text-red-600"></i>
                  </button>
                </div>
              </div>

              {/* Installments */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => togglePlanExpanded(plan.id)}
                  className="flex items-center justify-between w-full mb-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                >
                  <h4 className="text-sm font-semibold text-gray-700">Échéances ({plan.payments.length})</h4>
                  <i className={`ri-arrow-${expandedPlans.has(plan.id) ? 'up' : 'down'}-s-line text-gray-600`}></i>
                </button>
                {expandedPlans.has(plan.id) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {plan.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`p-3 rounded-lg border-2 ${
                        payment.status === 'paid'
                          ? 'bg-green-50 border-green-200'
                          : payment.status === 'overdue'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">
                          Échéance {payment.installment_number}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : payment.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {payment.status === 'paid' ? 'Payé' : payment.status === 'overdue' ? 'En retard' : 'En attente'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {payment.amount.toLocaleString('fr-FR')} FCFA
                      </div>
                      <div className="text-xs text-gray-600">
                        Échéance: {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                      </div>
                      {payment.payment_date && (
                        <div className="text-xs text-gray-600 mt-1">
                          Payé le: {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200">
                        <button
                          onClick={() => handleTogglePaymentStatus(payment.id, payment.status)}
                          className={`w-full px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            payment.status === 'paid'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={payment.status === 'paid' ? 'Marquer comme non payé' : 'Marquer comme payé'}
                        >
                          <i className={`ri-${payment.status === 'paid' ? 'close' : 'check'}-line mr-1`}></i>
                          {payment.status === 'paid' ? 'Annuler' : 'Marquer payé'}
                        </button>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                {editingPlan ? 'Modifier le plan' : 'Créer un plan de paiement échelonné'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPlan(null);
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
                  onChange={(e) => {
                    const id = e.target.value;
                    const prop = properties.find((p: any) => p.id === id);
                    setForm({
                      ...form,
                      property_id: id,
                      total_amount: prop?.price != null ? String(prop.price) : form.total_amount,
                    });
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                >
                  <option value="">Sélectionner un bien</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} {property.address ? `- ${property.address}, ${property.city || ''}` : ''}
                      {property.price != null ? ` - ${Number(property.price).toLocaleString('fr-FR')} FCFA` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant total (FCFA) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.total_amount}
                    onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre d'échéances *</label>
                  <input
                    type="number"
                    min="2"
                    value={form.number_of_installments}
                    onChange={(e) => setForm({ ...form, number_of_installments: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="2"
                  />
                </div>
              </div>

              {/* Premier paiement (optionnel) - uniquement en création */}
              {!editingPlan && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <label className="block text-sm font-medium text-gray-700 mb-3">Premier paiement (optionnel)</label>
                <p className="text-xs text-gray-500 mb-3">
                  Si défini, les échéances seront calculées sur le reste (montant total moins le premier paiement).
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="first-none"
                      name="first_payment_type"
                      checked={form.first_payment_type === 'none'}
                      onChange={() => setForm({ ...form, first_payment_type: 'none', first_payment_value: '' })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <label htmlFor="first-none" className="text-sm">Aucun</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="first-percentage"
                      name="first_payment_type"
                      checked={form.first_payment_type === 'percentage'}
                      onChange={() => setForm({ ...form, first_payment_type: 'percentage', first_payment_value: '' })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <label htmlFor="first-percentage" className="text-sm">Pourcentage</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="first-fixed"
                      name="first_payment_type"
                      checked={form.first_payment_type === 'fixed'}
                      onChange={() => setForm({ ...form, first_payment_type: 'fixed', first_payment_value: '' })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <label htmlFor="first-fixed" className="text-sm">Montant fixe</label>
                  </div>
                </div>
                {(form.first_payment_type === 'percentage' || form.first_payment_type === 'fixed') && (
                  <div className="mt-3">
                    <input
                      type="number"
                      step={form.first_payment_type === 'percentage' ? '1' : '0.01'}
                      min={form.first_payment_type === 'percentage' ? '1' : '0'}
                      max={form.first_payment_type === 'percentage' ? '99' : undefined}
                      value={form.first_payment_value}
                      onChange={(e) => setForm({ ...form, first_payment_value: e.target.value })}
                      className="w-32 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      placeholder={form.first_payment_type === 'percentage' ? 'Ex: 20' : 'Ex: 500000'}
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      {form.first_payment_type === 'percentage' ? '%' : 'FCFA'}
                    </span>
                  </div>
                )}
              </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date de début *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence *</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                  >
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuel</option>
                    <option value="quarterly">Trimestriel</option>
                  </select>
                </div>
              </div>

              {/* Jour d'échéance (pour monthly et quarterly) */}
              {(form.frequency === 'monthly' || form.frequency === 'quarterly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jour du mois pour les échéances <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={form.payment_due_day}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 31)) {
                        setForm({ ...form, payment_due_day: value });
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Jour du mois où le payeur doit effectuer les paiements (1-31)
                  </p>
                </div>
              )}

              {/* Informations du payeur */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Informations du payeur *</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                    <input
                      type="text"
                      value={form.payer_first_name}
                      onChange={(e) => setForm({ ...form, payer_first_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                    <input
                      type="text"
                      value={form.payer_last_name}
                      onChange={(e) => setForm({ ...form, payer_last_name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      placeholder="Nom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance *</label>
                    <input
                      type="date"
                      value={form.payer_birth_date}
                      onChange={(e) => setForm({ ...form, payer_birth_date: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone *</label>
                    <input
                      type="tel"
                      value={form.payer_phone}
                      onChange={(e) => setForm({ ...form, payer_phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      placeholder="+225 XX XX XX XX XX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={form.payer_email}
                      onChange={(e) => setForm({ ...form, payer_email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adresse *</label>
                    <textarea
                      value={form.payer_address}
                      onChange={(e) => setForm({ ...form, payer_address: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none"
                      placeholder="Adresse complète"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {form.total_amount && form.number_of_installments && parseInt(form.number_of_installments) >= 2 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Résumé du plan:</div>
                  {(() => {
                    const total = parseFloat(form.total_amount);
                    const count = parseInt(form.number_of_installments || '1');
                    let first = 0;
                    if (form.first_payment_type === 'percentage' && form.first_payment_value) {
                      const pct = parseFloat(form.first_payment_value);
                      if (pct > 0 && pct < 100) first = Math.round((total * pct) / 100);
                    } else if (form.first_payment_type === 'fixed' && form.first_payment_value) {
                      first = parseFloat(form.first_payment_value);
                    }
                    const remainder = total - first;
                    const remainingCount = first > 0 ? count - 1 : count;
                    const regularAmount = first > 0 ? Math.round(remainder / remainingCount) : total / count;
                    return (
                      <div className="space-y-2 text-sm">
                        {first > 0 ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-gray-600">1er paiement:</span>
                              <span className="font-semibold text-gray-900">{first.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Reste à répartir:</span>
                              <span>{remainder.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Échéances suivantes ({remainingCount} ×):</span>
                              <span className="font-semibold text-teal-600">{regularAmount.toLocaleString('fr-FR')} FCFA</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Montant par échéance:</span>
                            <span className="font-semibold text-gray-900">{(total / count).toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlan(null);
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
                      {editingPlan ? 'Modification...' : 'Création...'}
                    </>
                  ) : (
                    editingPlan ? 'Modifier' : 'Créer'
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

/**
 * Construit l'email HTML pour le plan de paiement échelonné
 */
function buildInstallmentPlanEmail(data: {
  payerName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertySurface?: number;
  propertyRooms?: number;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  firstPaymentAmount?: number;
  frequency: string;
  paymentDueDay: number | null;
  startDate: string;
  installments: Array<{ number: number; dueDate: string; amount: number }>;
}): string {
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel'
    };
    return labels[frequency] || frequency;
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const propertyDetails = [];
  if (data.propertySurface) propertyDetails.push(`${data.propertySurface} m²`);
  if (data.propertyRooms) propertyDetails.push(`${data.propertyRooms} pièce${data.propertyRooms > 1 ? 's' : ''}`);

  const installmentsList = data.installments.map(inst => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: center;">${inst.number}</td>
      <td style="padding: 12px;">${formatDate(inst.dueDate)}</td>
      <td style="padding: 12px; text-align: right; font-weight: bold;">${formatPrice(inst.amount)}</td>
    </tr>
  `).join('');

  const paymentDueDayInfo = data.paymentDueDay
    ? `<p><strong>Jour d'échéance :</strong> Le ${data.paymentDueDay} de chaque mois</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
    .plan-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
    td { padding: 12px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
    .highlight { color: #14b8a6; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Plan de paiement échelonné créé</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.payerName}</strong>,</p>
      <p>Un plan de paiement échelonné a été créé pour vous par <strong>${data.ownerName}</strong>.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
        ${propertyDetails.length > 0 ? `<p><strong>Caractéristiques:</strong> ${propertyDetails.join(', ')}</p>` : ''}
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations du créateur</h3>
        <p><strong>Nom:</strong> ${data.ownerName}</p>
        ${data.ownerEmail ? `<p><strong>Email:</strong> ${data.ownerEmail}</p>` : ''}
        ${data.ownerPhone ? `<p><strong>Téléphone:</strong> ${data.ownerPhone}</p>` : ''}
      </div>

      <div class="plan-box">
        <h3 style="margin-top: 0; color: #10b981;">Détails du plan de paiement</h3>
        <p><strong>Montant total:</strong> <span class="highlight">${formatPrice(data.totalAmount)}</span></p>
        <p><strong>Nombre d'échéances:</strong> ${data.numberOfInstallments}</p>
        ${data.firstPaymentAmount
          ? `<p><strong>1er paiement:</strong> <span class="highlight">${formatPrice(data.firstPaymentAmount)}</span></p>
             <p><strong>Échéances suivantes:</strong> <span class="highlight">${formatPrice(data.installmentAmount)}</span> par échéance</p>`
          : `<p><strong>Montant par échéance:</strong> <span class="highlight">${formatPrice(data.installmentAmount)}</span></p>`}
        <p><strong>Fréquence:</strong> ${getFrequencyLabel(data.frequency)}</p>
        <p><strong>Date de début:</strong> ${formatDate(data.startDate)}</p>
        ${paymentDueDayInfo}
      </div>

      <div class="plan-box">
        <h3 style="margin-top: 0; color: #10b981;">Calendrier des échéances</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">N°</th>
              <th>Date d'échéance</th>
              <th style="text-align: right;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${installmentsList}
          </tbody>
        </table>
      </div>

      <p>Veuillez noter ces dates d'échéance et effectuer les paiements en temps voulu.</p>
      <p>Si vous avez des questions, n'hésitez pas à contacter ${data.ownerName}${data.ownerEmail ? ` à ${data.ownerEmail}` : ''}${data.ownerPhone ? ` ou au ${data.ownerPhone}` : ''}.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Construit l'email texte pour le plan de paiement échelonné
 */
function buildInstallmentPlanEmailText(data: {
  payerName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertySurface?: number;
  propertyRooms?: number;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  firstPaymentAmount?: number;
  frequency: string;
  paymentDueDay: number | null;
  startDate: string;
  installments: Array<{ number: number; dueDate: string; amount: number }>;
}): string {
  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel'
    };
    return labels[frequency] || frequency;
  };

  const propertyInfo = data.propertyAddress || data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
    : 'Adresse non renseignée';

  const propertyDetails = [];
  if (data.propertySurface) propertyDetails.push(`${data.propertySurface} m²`);
  if (data.propertyRooms) propertyDetails.push(`${data.propertyRooms} pièce${data.propertyRooms > 1 ? 's' : ''}`);

  const installmentsList = data.installments.map(inst => 
    `  ${inst.number}. ${formatDate(inst.dueDate)} - ${formatPrice(inst.amount)}`
  ).join('\n');

  const paymentDueDayInfo = data.paymentDueDay
    ? `Jour d'échéance: Le ${data.paymentDueDay} de chaque mois\n`
    : '';

  return `Bonjour ${data.payerName},

Un plan de paiement échelonné a été créé pour vous par ${data.ownerName}.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}
${propertyDetails.length > 0 ? `- Caractéristiques: ${propertyDetails.join(', ')}\n` : ''}
INFORMATIONS DU CRÉATEUR:
- Nom: ${data.ownerName}
${data.ownerEmail ? `- Email: ${data.ownerEmail}\n` : ''}${data.ownerPhone ? `- Téléphone: ${data.ownerPhone}\n` : ''}
DÉTAILS DU PLAN DE PAIEMENT:
- Montant total: ${formatPrice(data.totalAmount)}
- Nombre d'échéances: ${data.numberOfInstallments}
${data.firstPaymentAmount
  ? `- 1er paiement: ${formatPrice(data.firstPaymentAmount)}
- Échéances suivantes: ${formatPrice(data.installmentAmount)} par échéance`
  : `- Montant par échéance: ${formatPrice(data.installmentAmount)}`}
- Fréquence: ${getFrequencyLabel(data.frequency)}
- Date de début: ${formatDate(data.startDate)}
${paymentDueDayInfo}
CALENDRIER DES ÉCHÉANCES:
${installmentsList}

Veuillez noter ces dates d'échéance et effectuer les paiements en temps voulu.

Si vous avez des questions, n'hésitez pas à contacter ${data.ownerName}${data.ownerEmail ? ` à ${data.ownerEmail}` : ''}${data.ownerPhone ? ` ou au ${data.ownerPhone}` : ''}.

Cordialement,
L'équipe Mestoits`;
}
