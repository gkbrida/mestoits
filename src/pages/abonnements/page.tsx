import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import { getUserActivePlan, getUserActiveSubscription } from '../../utils/subscriptionUtils';
import type { SubscriptionPlan } from '../../utils/subscriptionUtils';

export default function AbonnementsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'individual' | 'professional'>('individual');
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<{ end_date: string | null } | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paydunya'>('stripe');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && userType) {
      loadPlans();
      loadActivePlan();
    }
  }, [user, userType]);

  // Gérer le retour après paiement
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const planId = searchParams.get('planId');

    if (paymentStatus === 'success' && planId && user) {
      // Activer l'abonnement
      activateSubscription(planId);
    } else if (paymentStatus === 'cancelled') {
      alert('Paiement annulé');
      navigate('/abonnements', { replace: true });
    }
  }, [searchParams, navigate, user]);

  const activateSubscription = async (planId: string) => {
    if (!user) return;

    try {
      setProcessing(true);

      const today = new Date().toISOString().split('T')[0];
      let plan = plans.find((p) => p.id === planId);
      if (!plan) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();
        plan = planData;
      }
      const isPaidMonthly = plan && plan.price > 0;

      // Vérifier si c'est un renouvellement (même plan actif avec end_date)
      const result = await getUserActiveSubscription(user.id);
      const isRenewal =
        result &&
        result.subscription.plan_id === planId &&
        result.subscription.end_date &&
        result.subscription.status === 'active';

      if (isRenewal && result && result.subscription.end_date) {
        // Renouvellement : prolonger end_date de 30 jours
        const currentEnd = new Date(result.subscription.end_date);
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + 30);

        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            end_date: newEnd.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', result.subscription.id);

        if (error) throw error;
      } else {
        // Nouvel abonnement : annuler l'ancien et créer le nouveau
        if (activePlan) {
          await supabase
            .from('user_subscriptions')
            .update({ status: 'cancelled' })
            .eq('user_id', user.id)
            .eq('status', 'active');
        }

        const endDate = isPaidMonthly
          ? (() => {
              const d = new Date();
              d.setDate(d.getDate() + 30);
              return d.toISOString().split('T')[0];
            })()
          : null;

        const { error } = await supabase.from('user_subscriptions').insert({
          user_id: user.id,
          plan_id: planId,
          start_date: today,
          end_date: endDate,
          status: 'active',
        });

        if (error) throw error;
      }

      alert('Abonnement activé avec succès !');
      await loadActivePlan();
      setSelectedPlan(null);
      navigate('/abonnements', { replace: true });
    } catch (error: any) {
      console.error('Erreur lors de l\'activation de l\'abonnement:', error);
      alert('Erreur lors de l\'activation de l\'abonnement. Veuillez contacter le support.');
    } finally {
      setProcessing(false);
    }
  };

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/connexion');
        return;
      }

      setUser(authUser);

      // Récupérer le type d'utilisateur
      const { data: userData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('user_type')
        .eq('id', authUser.id)
        .single();

      if (userData) {
        setUserType(userData.user_type || 'individual');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
      navigate('/connexion');
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      // Charger tous les plans actifs, pas seulement ceux du type d'utilisateur
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('user_type', { ascending: true })
        .order('price', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des plans:', error);
      alert('Erreur lors du chargement des plans d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  const loadActivePlan = async () => {
    if (!user) return;

    try {
      const result = await getUserActiveSubscription(user.id);
      if (result) {
        setActivePlan(result.plan);
        setActiveSubscription({ end_date: result.subscription.end_date });
      } else {
        const plan = await getUserActivePlan(user.id);
        setActivePlan(plan);
        setActiveSubscription(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du plan actif:', error);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (plan.plan_type === 'free') return;

    // Renouvellement : même plan actif avec end_date (abonnement payant mensuel)
    const isRenewal = activePlan?.id === plan.id && plan.price > 0 && activeSubscription?.end_date;
    if (isRenewal) {
      setSelectedPlan(plan);
      return;
    }

    // Déjà actif (plan gratuit ou sans fin)
    if (activePlan && activePlan.id === plan.id) return;

    if (plan.user_type !== userType) {
      alert(`Ce plan est réservé aux ${plan.user_type === 'professional' ? 'professionnels' : 'particuliers'}.`);
      return;
    }

    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) return;

    // Si le plan est gratuit, l'activer directement
    if (selectedPlan.price === 0) {
      try {
        setProcessing(true);

        // Désactiver l'ancien abonnement
        if (activePlan) {
          await supabase
            .from('user_subscriptions')
            .update({ status: 'cancelled' })
            .eq('user_id', user.id)
            .eq('status', 'active');
        }

        const today = new Date().toISOString().split('T')[0];
        const endDate = selectedPlan.price > 0
          ? (() => {
              const d = new Date();
              d.setDate(d.getDate() + 30);
              return d.toISOString().split('T')[0];
            })()
          : null;

        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            plan_id: selectedPlan.id,
            start_date: today,
            end_date: endDate,
            status: 'active'
          });

        if (error) throw error;

        alert('Abonnement activé avec succès !');
        await loadActivePlan();
        setSelectedPlan(null);
      } catch (error: any) {
        console.error('Erreur lors de l\'activation de l\'abonnement:', error);
        alert('Erreur lors de l\'activation de l\'abonnement');
      } finally {
        setProcessing(false);
      }
      return;
    }

    // Pour les plans payants, créer une session de paiement
    try {
      setProcessing(true);

      const apiUrl = import.meta.env.VITE_EMAIL_API_URL || '/api';
      const origin = window.location.origin;

      const response = await fetch(`${apiUrl}/create-subscription-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          currency: selectedPlan.currency || 'XOF',
          userEmail: user.email,
          userId: user.id,
          origin: origin,
          paymentMethod: paymentMethod
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création de la session de paiement');
      }

      if (paymentMethod === 'stripe' && data.url) {
        // Rediriger vers Stripe Checkout
        window.location.href = data.url;
      } else if (paymentMethod === 'paydunya' && data.invoiceUrl) {
        // Rediriger vers PayDunya
        window.location.href = data.invoiceUrl;
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du paiement:', error);
      alert(error.message || 'Erreur lors de la création du paiement');
      setProcessing(false);
    }
  };



  const formatPrice = (price: number, currency: string = 'XOF') => {
    if (price === 0) return 'Gratuit';
    return `${price.toLocaleString('fr-FR')} ${currency}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <i className="ri-loader-4-line text-4xl text-orange-600 animate-spin"></i>
            <p className="mt-4 text-gray-600">Chargement des plans d'abonnement...</p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choisir un abonnement</h1>
          <p className="text-gray-600">
            Sélectionnez le plan qui correspond le mieux à vos besoins
          </p>
        </div>

        {activePlan && (
          <div className="mb-6 space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <i className="ri-information-line mr-2"></i>
                Plan actuel : <strong>{activePlan.name}</strong>
                {activeSubscription?.end_date && (
                  <span className="ml-2">
                    – Expire le {new Date(activeSubscription.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </p>
            </div>
            {activePlan.price > 0 && activeSubscription?.end_date && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-amber-900">
                  <i className="ri-time-line mr-2"></i>
                  Votre abonnement expire le <strong>{new Date(activeSubscription.end_date).toLocaleDateString('fr-FR')}</strong>.
                  Payer le mois suivant pour continuer sans interruption.
                </p>
                <button
                  onClick={() => handleSelectPlan(activePlan)}
                  className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 whitespace-nowrap flex-shrink-0"
                >
                  <i className="ri-refresh-line mr-1"></i>
                  Payer le mois suivant
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => {
            const isActive = activePlan?.id === plan.id;
            const isSelected = selectedPlan?.id === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => handleSelectPlan(plan)}
                className={`p-6 bg-white rounded-lg border-2 transition-all ${
                  plan.user_type !== userType && userType === 'individual'
                    ? 'cursor-default'
                    : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'border-orange-500 shadow-lg'
                    : isActive
                    ? 'border-green-500'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                {/* Tag type d'utilisateur */}
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                    plan.user_type === 'professional'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    <i className={`ri-${plan.user_type === 'professional' ? 'building' : 'user'}-line mr-1`}></i>
                    {plan.user_type === 'professional' ? 'Professionnel' : 'Particulier'}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  {isActive && (
                    <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Actif
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {formatPrice(plan.price, plan.currency ?? 'XOF')}
                  </div>
                  {plan.price > 0 && (
                    <p className="text-sm text-gray-500">
                      {plan.user_type === 'individual' && plan.plan_type === 'publish_only'
                        ? 'par annonce supplémentaire'
                        : 'par mois'}
                    </p>
                  )}
                </div>

                {plan.description && (
                  <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                )}
                
                {/* Clarification pour publication uniquement (particuliers) */}
                {plan.user_type === 'individual' && plan.plan_type === 'publish_only' && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs text-orange-800">
                      <i className="ri-information-line mr-1"></i>
                      <strong>Coût par annonce supplémentaire</strong> - Ce montant correspond au coût d'une annonce supplémentaire au-delà de votre quota gratuit (1 annonce gratuite tous les 3 mois).
                    </p>
                  </div>
                )}

                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <i className={`ri-${plan.features.can_publish ? 'check' : 'close'}-line text-lg ${plan.features.can_publish ? 'text-green-600' : 'text-red-600'}`}></i>
                    <span className="text-sm text-gray-700">
                      {plan.features.can_publish ? 'Publication d\'annonces' : 'Pas de publication'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className={`ri-${plan.features.can_access_rental_management ? 'check' : 'close'}-line text-lg ${plan.features.can_access_rental_management ? 'text-green-600' : 'text-red-600'}`}></i>
                    <span className="text-sm text-gray-700">
                      {plan.features.can_access_rental_management ? 'Gestion locative' : 'Pas de gestion locative'}
                    </span>
                  </div>
                  {plan.user_type === 'professional' && (
                    <div className="flex items-center gap-2">
                      <i className={`ri-${plan.features.can_access_directory ? 'check' : 'close'}-line text-lg ${plan.features.can_access_directory ? 'text-green-600' : 'text-red-600'}`}></i>
                      <span className="text-sm text-gray-700">
                        {plan.features.can_access_directory ? 'Présence dans l\'annuaire' : 'Pas d\'annuaire'}
                      </span>
                    </div>
                  )}
                  {plan.restrictions?.max_properties_per_period && (
                    <div className="flex items-center gap-2">
                      <i className="ri-information-line text-lg text-blue-600"></i>
                      <span className="text-sm text-gray-700">
                        {plan.restrictions.max_properties_per_period} annonce(s) / {plan.restrictions.period_days} jours
                      </span>
                    </div>
                  )}
                </div>

                {/* Si particulier regarde un plan professionnel */}
                {userType === 'individual' && plan.user_type === 'professional' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-3">
                        <i className="ri-information-line mr-2"></i>
                        Ce plan est réservé aux professionnels. Créez votre profil professionnel pour y accéder.
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/profil?tab=professional');
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <i className="ri-briefcase-line"></i>
                        Créer mon profil professionnel
                      </button>
                    </div>
                  </div>
                )}

                {/* Si professionnel regarde un plan particulier */}
                {userType === 'professional' && plan.user_type === 'individual' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <i className="ri-information-line mr-2"></i>
                        Ce plan est réservé aux particuliers.
                      </p>
                    </div>
                  </div>
                )}

                {isSelected && (!isActive || (activePlan?.id === plan.id && plan.price > 0 && activeSubscription?.end_date)) && plan.user_type === userType && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Méthode de paiement
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`payment-${plan.id}`}
                            value="stripe"
                            checked={paymentMethod === 'stripe'}
                            onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paydunya')}
                            className="text-orange-600"
                          />
                          <span className="text-sm">Carte bancaire</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`payment-${plan.id}`}
                            value="paydunya"
                            checked={paymentMethod === 'paydunya'}
                            onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paydunya')}
                            className="text-orange-600"
                          />
                          <span className="text-sm">Mobile Money</span>
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubscribe();
                      }}
                      disabled={processing}
                      className="w-full px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <i className="ri-loader-4-line animate-spin"></i>
                          Traitement...
                        </>
                      ) : (
                        <>
                          <i className="ri-check-line"></i>
                          S'abonner
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Footer />
    </div>
  );
}
