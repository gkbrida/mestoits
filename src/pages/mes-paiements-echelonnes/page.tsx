import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import PaymentResult from '../tenant-rentals/components/PaymentResult';

interface InstallmentPlan {
  id: string;
  property_id: string;
  property_title?: string;
  property_address?: string;
  property_city?: string;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  total_amount: number;
  number_of_installments: number;
  installment_amount: number;
  start_date: string;
  frequency: string;
  payment_due_day?: number | null;
  status: string;
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

export default function MesPaiementsEchelonnesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{ payment: InstallmentPayment; plan: InstallmentPlan } | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'paydunya'>('stripe');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success' | 'cancelled' | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<{ name?: string; email?: string; phone?: string } | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (userEmail || userPhone) {
      loadPlans();
    }
  }, [userEmail, userPhone]);

  // Gérer le retour après paiement Stripe
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentId = searchParams.get('paymentId');
    const leaseId = searchParams.get('lease'); // Dans notre cas, c'est l'ID du plan

    if (paymentStatus === 'success' && paymentId) {
      console.log('✅ PAIEMENT ÉCHELONNÉ RÉUSSI DÉTECTÉ');
      console.log('📝 Détails du paiement:');
      console.log('   • Payment ID:', paymentId);
      console.log('   • Plan ID:', leaseId);
      
      // Mettre à jour le statut du paiement échelonné
      (async () => {
        try {
          const { error: updateError } = await supabase
            .from('installment_payments')
            .update({
              status: 'paid',
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'stripe',
            })
            .eq('id', paymentId);

          if (updateError) {
            console.error('❌ Erreur lors de la mise à jour du paiement échelonné:', updateError);
            alert('Le paiement a été effectué mais une erreur est survenue lors de la mise à jour. Veuillez contacter le support.');
          } else {
            console.log('✅ Paiement échelonné mis à jour avec succès');
            alert('✅ Paiement effectué avec succès !');
            // Recharger les plans pour mettre à jour l'affichage
            await loadPlans();
          }
        } catch (error) {
          console.error('❌ Erreur lors de la mise à jour du paiement échelonné:', error);
          alert('Le paiement a été effectué mais une erreur est survenue lors de la mise à jour. Veuillez contacter le support.');
        }
      })();

      setPaymentResult('success');
      
      // Nettoyer les paramètres d'URL après un court délai
      setTimeout(() => {
        setSearchParams({});
      }, 100);
    } else if (paymentStatus === 'cancelled') {
      console.log('❌ PAIEMENT ÉCHELONNÉ ANNULÉ');
      setPaymentResult('cancelled');
      
      // Nettoyer les paramètres d'URL après un court délai
      setTimeout(() => {
        setSearchParams({});
      }, 100);
    }
  }, [searchParams, setSearchParams]);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('email, phone')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setUserEmail(userData.email || '');
          setUserPhone(userData.phone || '');
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des informations utilisateur:', error);
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      
      // Charger les plans où l'utilisateur est le payeur (par email ou téléphone)
      let query = supabase
        .from('installment_plans')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Filtrer par email ou téléphone
      if (userEmail && userPhone) {
        query = query.or(`payer_email.eq.${userEmail},payer_phone.eq.${userPhone}`);
      } else if (userEmail) {
        query = query.eq('payer_email', userEmail);
      } else if (userPhone) {
        query = query.eq('payer_phone', userPhone);
      } else {
        setPlans([]);
        setLoading(false);
        return;
      }

      const { data: plansData, error } = await query;

      if (error) {
        console.error('Erreur lors du chargement des plans:', error);
        setPlans([]);
        return;
      }

      // Enrichir avec les données de la propriété, du propriétaire et les paiements
      const enrichedPlans = await Promise.all(
        (plansData || []).map(async (plan) => {
          // Charger les données de la propriété
          const { data: propertyData } = await supabase
            .from('properties_02')
            .select('title, address, city')
            .eq('id', plan.property_id)
            .single();

          // Charger les données du propriétaire
          const { data: ownerData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('id, full_name, email, phone')
            .eq('id', plan.owner_id)
            .single();

          // Charger les paiements
          const { data: paymentsData } = await supabase
            .from('installment_payments')
            .select('*')
            .eq('installment_plan_id', plan.id)
            .order('installment_number', { ascending: true });

          return {
            ...plan,
            property_title: propertyData?.title,
            property_address: propertyData?.address,
            property_city: propertyData?.city,
            owner_id: ownerData?.id,
            owner_name: ownerData?.full_name,
            owner_email: ownerData?.email,
            owner_phone: ownerData?.phone,
            payments: paymentsData || [],
          };
        })
      );

      setPlans(enrichedPlans);
    } catch (error) {
      console.error('Erreur lors du chargement des plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  // Déterminer quels paiements sont débloqués
  const getUnlockedPayments = (plan: InstallmentPlan): InstallmentPayment[] => {
    const payments = plan.payments || [];
    if (payments.length === 0) return [];

    // Le premier paiement est toujours débloqué
    const unlocked: InstallmentPayment[] = [];
    
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      
      if (i === 0) {
        // Premier paiement toujours débloqué
        unlocked.push(payment);
      } else {
        // Un paiement est débloqué si le précédent est payé
        const previousPayment = payments[i - 1];
        if (previousPayment.status === 'paid') {
          unlocked.push(payment);
        } else {
          // Arrêter dès qu'on trouve un paiement non payé
          break;
        }
      }
    }

    return unlocked;
  };

  const handlePayInstallment = (payment: InstallmentPayment, plan: InstallmentPlan) => {
    setSelectedPayment({ payment, plan });
    setShowPaymentModal(true);
    setSelectedPaymentMethod('stripe');
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

      // Récupérer l'ID du propriétaire
      const { data: ownerData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id')
        .eq('email', selectedOwner.email)
        .single();

      if (!ownerData) {
        throw new Error('Propriétaire introuvable');
      }

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

      alert('Message envoyé avec succès !');
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

  const handleConfirmPayment = async () => {
    if (!selectedPayment || !userEmail) return;

    setProcessingPayment(true);
    try {
      // Vérifier que le numéro de téléphone est présent pour PayDunya
      if (selectedPaymentMethod === 'paydunya' && !userPhone) {
        throw new Error('Numéro de téléphone requis pour le paiement Mobile Money. Veuillez compléter votre profil.');
      }

      // Déterminer l'URL de l'API selon la méthode de paiement
      const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api';
      const apiUrl = selectedPaymentMethod === 'paydunya' 
        ? `${EMAIL_API_URL}/create-paydunya-payment`
        : `${EMAIL_API_URL}/create-payment-session`;

      // Récupérer les informations du propriétaire
      const { data: ownerData } = await supabase
        .from('installment_plans')
        .select('owner_id')
        .eq('id', selectedPayment.plan.id)
        .single();

      if (!ownerData) {
        throw new Error('Propriétaire introuvable');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPayment.payment.amount,
          month: `Échéance ${selectedPayment.payment.installment_number}/${selectedPayment.plan.number_of_installments}`,
          propertyTitle: selectedPayment.plan.property_title || 'Bien immobilier',
          tenantEmail: userEmail,
          tenantName: 'Client',
          tenantPhone: userPhone || '',
          leaseId: selectedPayment.plan.id, // Utiliser l'ID du plan comme identifiant
          paymentId: selectedPayment.payment.id,
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
        alert(`✅ Demande de paiement créée avec succès !\n\nUn SMS avec le code de paiement a été envoyé au numéro ${userPhone}.\n\nVeuillez suivre les instructions dans le SMS pour confirmer le paiement.`);
        setShowPaymentModal(false);
        setProcessingPayment(false);
        // Recharger les plans
        await loadPlans();
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

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
    };
    return labels[frequency] || frequency;
  };

  // Afficher le résultat du paiement si disponible
  if (paymentResult) {
    return (
      <PaymentResult
        status={paymentResult}
        onClose={() => {
          setPaymentResult(null);
          setSearchParams({});
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes paiements échelonnés</h1>
            <p className="text-gray-600">Gérez vos paiements échelonnés et réglez vos échéances</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <i className="ri-bank-card-line text-6xl text-gray-400 mb-4"></i>
              <p className="text-gray-600 text-lg mb-2">Aucun paiement échelonné pour le moment</p>
              <p className="text-gray-500 text-sm">Vos plans de paiement échelonné apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-6">
              {plans.map((plan) => {
                const unlockedPayments = getUnlockedPayments(plan);
                const pendingPayments = unlockedPayments.filter(p => p.status === 'pending');
                const paidPayments = plan.payments.filter(p => p.status === 'paid');
                const progress = (paidPayments.length / plan.number_of_installments) * 100;

                return (
                  <div 
                    key={plan.id} 
                    onClick={() => navigate(`/bien/${plan.property_id}`)}
                    className="bg-white rounded-lg border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {plan.property_title || 'Bien immobilier'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {plan.property_address && plan.property_city 
                          ? `${plan.property_address}, ${plan.property_city}`
                          : 'Adresse non disponible'}
                      </p>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progression</span>
                        <span className="text-sm font-medium text-gray-900">
                          {paidPayments.length} / {plan.number_of_installments} échéances payées
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-gray-600">Montant total:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatPrice(plan.total_amount)} FCFA</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Montant par échéance:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatPrice(plan.installment_amount)} FCFA</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Fréquence:</span>
                        <span className="ml-2 font-medium text-gray-900">{getFrequencyLabel(plan.frequency)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date de début:</span>
                        <span className="ml-2 font-medium text-gray-900">{formatDate(plan.start_date)}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Échéances disponibles</h4>
                        {plan.owner_name && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContactOwner({
                                name: plan.owner_name,
                                email: plan.owner_email,
                                phone: plan.owner_phone,
                              });
                            }}
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                          >
                            <i className="ri-message-3-line mr-1.5"></i>
                            Contacter le propriétaire
                          </button>
                        )}
                      </div>
                      {pendingPayments.length === 0 ? (
                        <p className="text-sm text-gray-600">Aucune échéance disponible pour le moment</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingPayments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <div className="font-medium text-gray-900">
                                  Échéance {payment.installment_number} / {plan.number_of_installments}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Échéance le {formatDate(payment.due_date)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-teal-600">
                                  {formatPrice(payment.amount)} FCFA
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePayInstallment(payment, plan);
                                  }}
                                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                                >
                                  Payer
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

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

      {/* Modal de paiement */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Confirmer le paiement</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                  setSelectedPaymentMethod('stripe');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Échéance:</span>
                  <span className="font-medium text-gray-900">
                    {selectedPayment.payment.installment_number} / {selectedPayment.plan.number_of_installments}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date d'échéance:</span>
                  <span className="font-medium text-gray-900">{formatDate(selectedPayment.payment.due_date)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-base font-bold text-gray-900">Montant:</span>
                  <span className="text-xl font-bold text-teal-600">
                    {formatPrice(selectedPayment.payment.amount)} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Sélection de la méthode de paiement */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Choisir le mode de paiement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPaymentMethod('stripe')}
                  className={`p-4 rounded-lg border-2 transition-all ${
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
                      <div className="font-semibold text-gray-900 text-sm">Carte bancaire</div>
                    </div>
                    <i className="ri-bank-card-line text-xl text-gray-400"></i>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('paydunya')}
                  className={`p-4 rounded-lg border-2 transition-all ${
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
                      <div className="font-semibold text-gray-900 text-sm">Mobile Money</div>
                    </div>
                    <i className="ri-smartphone-line text-xl text-gray-400"></i>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                  setSelectedPaymentMethod('stripe');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment}
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingPayment ? 'Traitement...' : 'Payer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
