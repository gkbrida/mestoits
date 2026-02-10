import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import PaymentResult from '../tenant-rentals/components/PaymentResult';

interface InstallmentPayment {
  id: string;
  installment_plan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  payment_date?: string;
  status: string;
  plan?: {
    id: string;
    property_title?: string;
    property_address?: string;
    property_city?: string;
    owner_name?: string;
  };
}

export default function PaiementEcheancesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<InstallmentPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paydunya'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<'success' | 'cancelled' | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user]);

  // Gérer le retour après paiement
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentId = searchParams.get('paymentId');

    if (paymentStatus === 'success' && paymentId) {
      setPaymentResult('success');
      // Mettre à jour le statut du paiement
      updatePaymentStatus(paymentId);
    } else if (paymentStatus === 'cancelled') {
      setPaymentResult('cancelled');
    }
  }, [searchParams]);

  const checkUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/connexion');
        return;
      }
      setUser(authUser);
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
      navigate('/connexion');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer les paiements échelonnés en attente pour cet utilisateur
      const { data: plansData, error: plansError } = await supabase
        .from('installment_plans')
        .select('id, property_id')
        .eq('tenant_id', user.id)
        .eq('status', 'active');

      if (plansError) throw plansError;

      if (!plansData || plansData.length === 0) {
        setPayments([]);
        return;
      }

      const planIds = plansData.map(p => p.id);

      // Récupérer les paiements en attente
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('installment_payments')
        .select('*')
        .in('installment_plan_id', planIds)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Enrichir avec les informations du plan et de la propriété
      const enrichedPayments = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          const { data: planData } = await supabase
            .from('installment_plans')
            .select(`
              id,
              property_id,
              properties_02:property_id (
                title,
                address,
                city
              )
            `)
            .eq('id', payment.installment_plan_id)
            .single();

          return {
            ...payment,
            plan: planData ? {
              id: planData.id,
              property_title: (planData.properties_02 as any)?.title,
              property_address: (planData.properties_02 as any)?.address,
              property_city: (planData.properties_02 as any)?.city,
            } : undefined
          };
        })
      );

      setPayments(enrichedPayments);
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
      alert('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('installment_payments')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'stripe',
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Recharger les paiements
      await loadPayments();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du paiement:', error);
    }
  };

  const handlePay = async (payment: InstallmentPayment) => {
    if (!user || !payment.plan) return;

    setSelectedPayment(payment);
    setProcessing(true);

    try {
      const apiUrl = import.meta.env.VITE_EMAIL_API_URL || '/api';
      const origin = window.location.origin;

      const response = await fetch(`${apiUrl}/create-payment-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: payment.amount,
          month: `Échéance ${payment.installment_number}`,
          propertyTitle: payment.plan.property_title || 'Propriété',
          tenantEmail: user.email,
          tenantName: user.user_metadata?.full_name || user.email,
          leaseId: payment.installment_plan_id,
          paymentId: payment.id,
          origin: origin,
          type: 'installment_payment'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création de la session de paiement');
      }

      if (paymentMethod === 'stripe' && data.url) {
        window.location.href = data.url;
      } else if (paymentMethod === 'paydunya' && data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du paiement:', error);
      alert(error.message || 'Erreur lors de la création du paiement');
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
        <SideMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <i className="ri-loader-4-line text-4xl text-orange-600 animate-spin"></i>
            <p className="mt-4 text-gray-600">Chargement des échéances...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (paymentResult) {
    return (
      <PaymentResult
        success={paymentResult === 'success'}
        onClose={() => {
          setPaymentResult(null);
          navigate('/paiement-echeances', { replace: true });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      <SideMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Paiement des échéances</h1>
          <p className="text-gray-600">
            Gérez et payez vos échéances de paiement échelonné
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <i className="ri-calendar-check-line text-6xl text-gray-400 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune échéance en attente</h3>
            <p className="text-gray-600 mb-6">
              Vous n'avez actuellement aucune échéance à payer.
            </p>
            <button
              onClick={() => navigate('/mes-paiements-echelonnes')}
              className="px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              Voir mes paiements échelonnés
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 ${
                  isOverdue(payment.due_date)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Échéance #{payment.installment_number}
                      </h3>
                      {isOverdue(payment.due_date) && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          En retard
                        </span>
                      )}
                    </div>

                    {payment.plan && (
                      <p className="text-sm text-gray-600 mb-2">
                        <i className="ri-home-line mr-2"></i>
                        {payment.plan.property_title}
                        {payment.plan.property_city && ` - ${payment.plan.property_city}`}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Date d'échéance :</span>{' '}
                        <span className={isOverdue(payment.due_date) ? 'text-red-600 font-semibold' : ''}>
                          {formatDate(payment.due_date)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Montant :</span>{' '}
                        <span className="text-lg font-bold text-orange-600">
                          {formatAmount(payment.amount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 md:w-64">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Méthode de paiement
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`payment-method-${payment.id}`}
                            value="stripe"
                            checked={paymentMethod === 'stripe'}
                            onChange={(e) => setPaymentMethod(e.target.value as 'stripe' | 'paydunya')}
                            className="text-orange-600"
                          />
                          <span className="text-sm">Carte</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`payment-method-${payment.id}`}
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
                      onClick={() => handlePay(payment)}
                      disabled={processing}
                      className={`w-full px-4 py-2 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                        isOverdue(payment.due_date)
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      }`}
                    >
                      {processing && selectedPayment?.id === payment.id ? (
                        <>
                          <i className="ri-loader-4-line animate-spin"></i>
                          Traitement...
                        </>
                      ) : (
                        <>
                          <i className="ri-money-dollar-circle-line"></i>
                          Payer maintenant
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
