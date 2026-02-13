import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import { getUserActivePlan, getUserActiveSubscription, areRestrictionsEnabled } from '../../utils/subscriptionUtils';
import type { SubscriptionPlan } from '../../utils/subscriptionUtils';

interface SubscriptionHistoryItem {
  id: string;
  plan_name: string;
  plan_type: string;
  user_type: string;
  price: number;
  currency: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

export default function MonAbonnementPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(false);
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<{ end_date: string | null } | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/connexion');
        return;
      }

      const enabled = await areRestrictionsEnabled();
      setSubscriptionsEnabled(enabled);

      if (!enabled) {
        setLoading(false);
        return;
      }

      const plan = await getUserActivePlan(authUser.id);
      setActivePlan(plan);

      const result = await getUserActiveSubscription(authUser.id);
      setActiveSubscription(result ? { end_date: result.subscription.end_date } : null);

      const { data: subs, error } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          start_date,
          end_date,
          status,
          created_at,
          subscription_plans (
            name,
            plan_type,
            user_type,
            price,
            currency
          )
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (!error && subs) {
        const items: SubscriptionHistoryItem[] = (subs || []).map((s: any) => {
          const plan = s.subscription_plans;
          return {
            id: s.id,
            plan_name: plan?.name || '—',
            plan_type: plan?.plan_type || '—',
            user_type: plan?.user_type || '—',
            price: Number(plan?.price ?? 0),
            currency: plan?.currency || 'XOF',
            start_date: s.start_date,
            end_date: s.end_date,
            status: s.status,
            created_at: s.created_at,
          };
        });
        setHistory(items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) =>
    price === 0 ? 'Gratuit' : `${price.toLocaleString('fr-FR')} ${currency}`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const getStatusLabel = (s: string) => ({ active: 'Actif', expired: 'Expiré', cancelled: 'Annulé' }[s] || s);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!subscriptionsEnabled) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <main className="pt-24 pb-12 px-4">
          <div className="max-w-2xl mx-auto text-center py-12">
            <i className="ri-vip-crown-line text-6xl text-gray-300 mb-4"></i>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Les abonnements ne sont pas activés</h1>
            <p className="text-gray-600 mb-6">
              La gestion des abonnements est actuellement désactivée. Contactez l'administrateur pour plus d'informations.
            </p>
            <button
              onClick={() => navigate('/profil')}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
            >
              Retour au profil
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Mon abonnement</h1>
          <p className="text-gray-600 mb-6">Gérez votre abonnement et consultez l'historique</p>

          {/* Abonnement actuel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Abonnement actuel</h2>
            {activePlan ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{activePlan.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{activePlan.description || ''}</p>
                    <p className="text-lg font-semibold text-teal-600 mt-2">
                      {formatPrice(activePlan.price, activePlan.currency || 'XOF')}
                    </p>
                    {activePlan.price > 0 && activeSubscription?.end_date && (
                      <p className="text-sm text-gray-600 mt-1">
                        Expire le {formatDate(activeSubscription.end_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {activePlan.price > 0 && activeSubscription?.end_date && (
                      <button
                        onClick={() => navigate('/abonnements')}
                        className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <i className="ri-refresh-line"></i>
                        Payer le mois suivant
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/abonnements')}
                      className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="ri-arrow-right-circle-line"></i>
                      Changer d'abonnement
                    </button>
                  </div>
                </div>
                {activePlan.price > 0 && activeSubscription?.end_date && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-900">
                      <i className="ri-time-line mr-2"></i>
                      Votre abonnement expire le <strong>{formatDate(activeSubscription.end_date)}</strong>.
                      Payer le mois suivant pour continuer sans interruption.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-gray-600">Aucun abonnement actif</p>
                <button
                  onClick={() => navigate('/abonnements')}
                  className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                >
                  Choisir un abonnement
                </button>
              </div>
            )}
          </div>

          {/* Historique */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des abonnements</h2>
            {history.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">Aucun historique pour le moment</p>
            ) : (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-semibold text-gray-700">Plan</th>
                        <th className="text-left py-3 font-semibold text-gray-700">Début</th>
                        <th className="text-left py-3 font-semibold text-gray-700">Fin</th>
                        <th className="text-right py-3 font-semibold text-gray-700">Montant</th>
                        <th className="text-left py-3 font-semibold text-gray-700">Statut</th>
                        <th className="text-right py-3 font-semibold text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id} className="border-b border-gray-100">
                          <td className="py-3 text-gray-900">{h.plan_name}</td>
                          <td className="py-3 text-gray-600">{formatDate(h.start_date)}</td>
                          <td className="py-3 text-gray-600">{h.end_date ? formatDate(h.end_date) : '—'}</td>
                          <td className="py-3 text-right font-medium">{formatPrice(h.price, h.currency)}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              h.status === 'active' ? 'bg-green-100 text-green-800' :
                              h.status === 'expired' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {getStatusLabel(h.status)}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {h.price > 0 && (
                              <button
                                onClick={() => navigate('/abonnements')}
                                className="text-teal-600 font-medium hover:underline text-xs"
                              >
                                Payer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="sm:hidden space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-gray-900">{h.plan_name}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          h.status === 'active' ? 'bg-green-100 text-green-800' :
                          h.status === 'expired' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {getStatusLabel(h.status)}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        <p>Début : {formatDate(h.start_date)}</p>
                        <p>Fin : {h.end_date ? formatDate(h.end_date) : '—'}</p>
                        <p className="font-medium text-gray-900">{formatPrice(h.price, h.currency)}</p>
                      </div>
                      {h.price > 0 && (
                        <button
                          onClick={() => navigate('/abonnements')}
                          className="mt-3 text-teal-600 font-medium text-sm hover:underline"
                        >
                          Payer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
