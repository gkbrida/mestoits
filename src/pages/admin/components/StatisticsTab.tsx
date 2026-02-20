import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Statistics {
  totalVisits: number;
  uniqueVisitors: number;
  totalUsers: number;
  totalProfessionals: number;
  totalProperties: number;
  activeProperties: number;
  pendingProperties: number;
  visitsByDay: Array<{ date: string; count: number }>;
  usersByType: { individual: number; professional: number };
  propertiesByType: Record<string, number>;
  // Données financières
  reservationsCount: number;
  reservationsTotal: number;
  reservationsCommission: number;
  rentPaymentsCount: number;
  rentPaymentsTotal: number;
  rentCommission: number;
  installmentPaymentsCount: number;
  installmentPaymentsTotal: number;
  installmentCommission: number;
  // Abonnements
  subscriptionsByPlan: Array<{ planType: string; planName: string; count: number; amount: number }>;
  totalSubscriptions: number;
  totalSubscriptionsAmount: number;
  // Totaux financiers
  totalMoneyTransit: number;
  totalPlatformRevenue: number;
}

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

export default function StatisticsTab() {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        visitsData,
        usersData,
        professionalsData,
        propertiesData,
        visitsByDayData,
        propertiesByTypeData,
        reservationsData,
        commissionsData,
        paymentsData,
        installmentPaymentsData,
        userSubscriptionsData,
        subscriptionPlansData,
      ] = await Promise.all([
        supabase.from('visitor_tracking').select('visitor_id, session_id, created_at').order('created_at', { ascending: false }),
        supabase.from('users_2025_12_01_11_29').select('id, user_type, is_active').eq('is_active', true),
        supabase.from('users_2025_12_01_11_29').select('id, user_type').eq('user_type', 'professional').eq('is_active', true),
        supabase.from('properties_02').select('id, status, property_type'),
        supabase.from('visitor_tracking').select('created_at').gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('properties_02').select('property_type, status').eq('status', 'active'),
        supabase.from('reservations').select('id, total_amount, status').in('status', ['confirmed', 'completed']),
        supabase.from('commissions').select('transaction_type, amount, commission_amount'),
        supabase.from('payments').select('id, amount').eq('status', 'paid'),
        supabase.from('installment_payments').select('id, amount').eq('status', 'paid'),
        supabase.from('user_subscriptions').select('id, plan_id, status, start_date, end_date').in('status', ['active', 'expired']),
        supabase.from('subscription_plans').select('id, name, plan_type, price'),
      ]);

      const visits = (visitsData.data || []).filter((v) => !visitsData.error);
      const users = usersData.data || [];
      const professionals = professionalsData.data || [];
      const properties = propertiesData.data || [];
      const visitsByDayRaw = (visitsByDayData.data || []).filter((v) => !visitsByDayData.error);
      const propertiesByTypeRaw = (propertiesByTypeData.data || []).filter((v) => !propertiesByTypeData.error);
      const reservations = (reservationsData.data || []).filter((v) => !reservationsData.error);
      const commissions = (commissionsData.data || []).filter((v) => !commissionsData.error);
      const payments = (paymentsData.data || []).filter((v) => !paymentsData.error);
      const installmentPayments = (installmentPaymentsData.data || []).filter((v) => !installmentPaymentsData.error);
      const userSubscriptions = (userSubscriptionsData.data || []).filter((v) => !userSubscriptionsData.error);
      const subscriptionPlans = (subscriptionPlansData.data || []).filter((v) => !subscriptionPlansData.error);

      if (usersData.error) throw usersData.error;
      if (professionalsData.error) throw professionalsData.error;
      if (propertiesData.error) throw propertiesData.error;
      if (reservationsData.error) throw reservationsData.error;

      const uniqueVisitors = new Set(visits.map((v: any) => v.visitor_id).filter(Boolean)).size;
      const visitsByDayMap = new Map<string, number>();
      visitsByDayRaw.forEach((visit: any) => {
        const date = new Date(visit.created_at).toISOString().split('T')[0];
        visitsByDayMap.set(date, (visitsByDayMap.get(date) || 0) + 1);
      });
      const visitsByDay = Array.from(visitsByDayMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

      const usersByType = { individual: users.filter((u: any) => u.user_type === 'individual').length, professional: users.filter((u: any) => u.user_type === 'professional').length };

      const propertiesByType: Record<string, number> = {};
      propertiesByTypeRaw.forEach((p: any) => { propertiesByType[p.property_type] = (propertiesByType[p.property_type] || 0) + 1; });

      const activeProperties = properties.filter((p: any) => p.status === 'active').length;
      const pendingProperties = properties.filter((p: any) => p.status === 'draft').length;

      const reservationsTotal = reservations.reduce((s: number, r: any) => s + parseFloat(String(r.total_amount || 0)), 0);
      const reservationsCommission = commissions.filter((c: any) => c.transaction_type === 'reservation').reduce((s: number, c: any) => s + parseFloat(String(c.commission_amount || 0)), 0);

      const rentPaymentsTotal = payments.reduce((s: number, p: any) => s + parseFloat(String(p.amount || 0)), 0);
      const rentCommission = commissions.filter((c: any) => c.transaction_type === 'rent_payment').reduce((s: number, c: any) => s + parseFloat(String(c.commission_amount || 0)), 0);

      const installmentPaymentsTotal = installmentPayments.reduce((s: number, p: any) => s + parseFloat(String(p.amount || 0)), 0);
      const installmentCommission = commissions.filter((c: any) => c.transaction_type === 'installment_payment').reduce((s: number, c: any) => s + parseFloat(String(c.commission_amount || 0)), 0);

      const plansMap = new Map(subscriptionPlans.map((p: any) => [p.id, p]));
      const subsByPlan: Record<string, { count: number; amount: number; name: string }> = {};
      let totalSubsAmount = 0;
      userSubscriptions.forEach((us: any) => {
        const plan = plansMap.get(us.plan_id);
        const planType = plan?.plan_type || 'unknown';
        const planName = plan?.name || planType;
        if (!subsByPlan[planType]) subsByPlan[planType] = { count: 0, amount: 0, name: planName };
        subsByPlan[planType].count += 1;
        subsByPlan[planType].amount += parseFloat(String(plan?.price || 0));
        totalSubsAmount += parseFloat(String(plan?.price || 0));
      });
      const subscriptionsByPlan = Object.entries(subsByPlan).map(([planType, data]) => ({ planType, planName: data.name, count: data.count, amount: data.amount }));

      const totalMoneyTransit = reservationsTotal + rentPaymentsTotal + installmentPaymentsTotal;
      const totalPlatformRevenue = reservationsCommission + rentCommission + installmentCommission + totalSubsAmount;

      setStatistics({
        totalVisits: visits.length,
        uniqueVisitors,
        totalUsers: users.length,
        totalProfessionals: professionals.length,
        totalProperties: properties.length,
        activeProperties,
        pendingProperties,
        visitsByDay,
        usersByType,
        propertiesByType,
        reservationsCount: reservations.length,
        reservationsTotal,
        reservationsCommission,
        rentPaymentsCount: payments.length,
        rentPaymentsTotal,
        rentCommission,
        installmentPaymentsCount: installmentPayments.length,
        installmentPaymentsTotal,
        installmentCommission,
        subscriptionsByPlan,
        totalSubscriptions: userSubscriptions.length,
        totalSubscriptionsAmount: totalSubsAmount,
        totalMoneyTransit,
        totalPlatformRevenue,
      });
    } catch (err: any) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-sm text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  if (!statistics) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Totaux financiers - bien visibles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-5 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-teal-100">Argent total transitant sur le site</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{formatPrice(statistics.totalMoneyTransit)}</p>
              <p className="text-xs text-teal-100 mt-1">Réservations + Loyers + Paiements échelonnés</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="ri-exchange-dollar-line text-2xl sm:text-3xl"></i>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-5 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-100">Revenus de la plateforme</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1">{formatPrice(statistics.totalPlatformRevenue)}</p>
              <p className="text-xs text-amber-100 mt-1">Commissions + Abonnements</p>
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <i className="ri-bank-card-line text-2xl sm:text-3xl"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Total visites</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{statistics.totalVisits.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{statistics.uniqueVisitors} visiteurs uniques</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-eye-line text-2xl text-blue-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{statistics.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {statistics.usersByType.individual} particuliers, {statistics.usersByType.professional} professionnels
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-line text-2xl text-green-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Professionnels</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{statistics.totalProfessionals.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-briefcase-line text-2xl text-purple-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600">Annonces</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{statistics.totalProperties.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {statistics.activeProperties} actives, {statistics.pendingProperties} en attente
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <i className="ri-home-line text-2xl text-orange-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques financières */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Données financières</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-teal-700 mb-2">Réservations (location courte durée)</h4>
            <p className="text-2xl font-bold text-gray-900">{statistics.reservationsCount}</p>
            <p className="text-sm text-gray-600">Montant total : {formatPrice(statistics.reservationsTotal)}</p>
            <p className="text-sm text-teal-600 font-medium">Commission plateforme : {formatPrice(statistics.reservationsCommission)}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-teal-700 mb-2">Loyers</h4>
            <p className="text-2xl font-bold text-gray-900">{statistics.rentPaymentsCount}</p>
            <p className="text-sm text-gray-600">Montant total : {formatPrice(statistics.rentPaymentsTotal)}</p>
            <p className="text-sm text-teal-600 font-medium">Commission plateforme : {formatPrice(statistics.rentCommission)}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-teal-700 mb-2">Paiements échelonnés</h4>
            <p className="text-2xl font-bold text-gray-900">{statistics.installmentPaymentsCount}</p>
            <p className="text-sm text-gray-600">Montant total : {formatPrice(statistics.installmentPaymentsTotal)}</p>
            <p className="text-sm text-teal-600 font-medium">Commission plateforme : {formatPrice(statistics.installmentCommission)}</p>
          </div>
        </div>
      </div>

      {/* Abonnements */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Abonnements</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="px-4 py-2 bg-teal-50 rounded-lg">
            <span className="text-sm text-gray-600">Nombre total :</span>
            <span className="ml-2 font-bold text-gray-900">{statistics.totalSubscriptions}</span>
          </div>
          <div className="px-4 py-2 bg-teal-50 rounded-lg">
            <span className="text-sm text-gray-600">Montant total :</span>
            <span className="ml-2 font-bold text-gray-900">{formatPrice(statistics.totalSubscriptionsAmount)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-700">Type</th>
                <th className="text-left py-2 font-semibold text-gray-700">Nombre</th>
                <th className="text-left py-2 font-semibold text-gray-700">Montant</th>
              </tr>
            </thead>
            <tbody>
              {statistics.subscriptionsByPlan.map((s) => (
                <tr key={s.planType} className="border-b border-gray-100">
                  <td className="py-2">{s.planName}</td>
                  <td className="py-2">{s.count}</td>
                  <td className="py-2">{formatPrice(s.amount)}</td>
                </tr>
              ))}
              {statistics.subscriptionsByPlan.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-gray-500">Aucun abonnement</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visites des 7 derniers jours</h3>
          <div className="space-y-2">
            {statistics.visitsByDay.length > 0 ? (
              statistics.visitsByDay.map((day) => {
                const maxVisits = Math.max(...statistics.visitsByDay.map((d) => d.count), 1);
                const percentage = (day.count / maxVisits) * 100;
                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-xs text-gray-600">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-sm font-semibold text-gray-900">{day.count}</div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Annonces par type</h3>
          <div className="space-y-3">
            {Object.entries(statistics.propertiesByType).length > 0 ? (
              Object.entries(statistics.propertiesByType).map(([type, count]) => {
                const total = Object.values(statistics.propertiesByType).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                const typeLabels: Record<string, string> = {
                  apartment: 'Appartement', house: 'Maison', villa: 'Villa', land: 'Terrain',
                  commercial: 'Commercial', office: 'Bureau', parking: 'Parking', 'furnished-residence': 'Résidence meublée', building: 'Immeuble',
                };
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{typeLabels[type] || type}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
