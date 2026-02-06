import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import RevenusPage from './RevenusPage.tsx';
import DepensesPage from './DepensesPage.tsx';
import ReservationsPage from './ReservationsPage';
import PaiementEchelonnePage from './PaiementEchelonnePage.tsx';

export default function DashboardTab() {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [activeView, setActiveView] = useState<'dashboard' | 'revenus' | 'depenses' | 'reservations' | 'paiement-echelonne'>('dashboard');
  const [stats, setStats] = useState({
    monthlyRevenue: '0',
    monthlyExpenses: '0',
    reservationsCount: '0',
    installmentPlansCount: '0',
    revenueChange: '+0%',
    expensesChange: '+0%',
    reservationsChange: '+0',
    installmentPlansChange: '0'
  });
  const [chartData, setChartData] = useState<Array<{ month: string; revenus: number; depenses: number }>>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
  }, [userId, selectedPeriod]);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const monthsAgo = selectedPeriod === '3months' ? 3 : selectedPeriod === '6months' ? 6 : 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsAgo);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Date pour comparaison période précédente
      const previousStartDate = new Date();
      previousStartDate.setMonth(previousStartDate.getMonth() - (monthsAgo * 2));
      const previousStartDateStr = previousStartDate.toISOString().split('T')[0];

      // Charger les baux d'abord pour obtenir les IDs
      const leasesResult = await supabase
        .from('leases')
        .select('id, monthly_rent, start_date')
        .eq('owner_id', userId)
        .eq('status', 'active');

      const leases = leasesResult.data || [];
      const leaseIds = leases.map(l => l.id);

      // Charger les propriétés filtrées par type d'opération
      const [salePropertiesResult, shortTermRentalPropertiesResult] = await Promise.all([
        supabase
          .from('properties_02')
          .select('id')
          .eq('owner_id', userId)
          .eq('operation_type', 'sale'),
        supabase
          .from('properties_02')
          .select('id')
          .eq('owner_id', userId)
          .eq('operation_type', 'short-term-rental')
      ]);

      const salePropertyIds = (salePropertiesResult.data || []).map(p => p.id);
      const shortTermRentalPropertyIds = (shortTermRentalPropertiesResult.data || []).map(p => p.id);

      // Charger toutes les données en parallèle
      const [
        reservationsResult,
        installmentPlansResult,
        activitiesResult,
        paymentsResult,
        expensesResult,
        previousPaymentsResult,
        previousExpensesResult,
        recentRevenuesResult,
        recentReservationsResult,
        recentInstallmentPaymentsResult
      ] = await Promise.all([
        supabase
          .from('reservations')
          .select('id, property_id')
          .eq('owner_id', userId)
          .then(result => {
            if (result.error && result.error.message?.includes('does not exist')) {
              return { data: [], error: null };
            }
            return result;
          }),
        supabase
          .from('installment_plans')
          .select('id, property_id')
          .eq('owner_id', userId)
          .then(result => {
            if (result.error && result.error.message?.includes('does not exist')) {
              return { data: [], error: null };
            }
            return result;
          }),
        supabase
          .from('activity_log')
          .select('type, title, amount, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        leaseIds.length > 0
          ? supabase
              .from('payments')
              .select('payment_date, status, amount')
              .in('lease_id', leaseIds)
              .gte('payment_date', startDateStr)
              .eq('status', 'paid')
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('expenses')
          .select('expense_date, amount')
          .eq('owner_id', userId)
          .gte('expense_date', startDateStr)
          .then(result => {
            if (result.error) {
              console.warn('Erreur lors du chargement des dépenses (la table pourrait ne pas exister):', result.error);
              return { data: [], error: null };
            }
            return result;
          }),
        leaseIds.length > 0
          ? supabase
              .from('payments')
              .select('amount')
              .in('lease_id', leaseIds)
              .gte('payment_date', previousStartDateStr)
              .lt('payment_date', startDateStr)
              .eq('status', 'paid')
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('expenses')
          .select('amount')
          .eq('owner_id', userId)
          .gte('expense_date', previousStartDateStr)
          .lt('expense_date', startDateStr)
          .then(result => {
            if (result.error) {
              console.warn('Erreur lors du chargement des dépenses précédentes:', result.error);
              return { data: [], error: null };
            }
            return result;
          }),
        // Charger les revenus récents (payments et revenues)
        Promise.all([
          leaseIds.length > 0
            ? supabase
                .from('payments')
                .select('id, amount, payment_date, created_at, lease_id')
                .in('lease_id', leaseIds)
                .eq('status', 'paid')
                .order('payment_date', { ascending: false })
                .limit(5)
                .then(async (result) => {
                  const payments = result.data || [];
                  // Enrichir avec les titres des propriétés
                  const enrichedPayments = await Promise.all(
                    payments.map(async (payment: any) => {
                      const { data: leaseData } = await supabase
                        .from('leases')
                        .select('property_id')
                        .eq('id', payment.lease_id)
                        .single();
                      if (leaseData?.property_id) {
                        const { data: propertyData } = await supabase
                          .from('properties_02')
                          .select('title')
                          .eq('id', leaseData.property_id)
                          .single();
                        return { ...payment, property_title: propertyData?.title || 'Bien' };
                      }
                      return { ...payment, property_title: 'Bien' };
                    })
                  );
                  return enrichedPayments;
                })
            : Promise.resolve([]),
          supabase
            .from('revenues')
            .select('id, amount, payment_date, created_at, revenue_type, property_id')
            .eq('owner_id', userId)
            .in('revenue_type', ['sale', 'other'])
            .order('payment_date', { ascending: false })
            .limit(5)
            .then(async (result) => {
              if (result.error && result.error.message?.includes('does not exist')) {
                return [];
              }
              const revenues = result.data || [];
              // Enrichir avec les titres des propriétés
              const enrichedRevenues = await Promise.all(
                revenues.map(async (revenue: any) => {
                  if (revenue.property_id) {
                    const { data: propertyData } = await supabase
                      .from('properties_02')
                      .select('title')
                      .eq('id', revenue.property_id)
                      .single();
                    return { ...revenue, property_title: propertyData?.title || 'Bien' };
                  }
                  return { ...revenue, property_title: 'Bien' };
                })
              );
              return enrichedRevenues;
            })
        ]).then(([payments, revenues]) => [...payments, ...revenues]),
        // Charger les réservations récentes
        supabase
          .from('reservations')
          .select('id, guest_name, total_amount, start_date, end_date, created_at, property_id')
          .eq('owner_id', userId)
          .in('property_id', shortTermRentalPropertyIds.length > 0 ? shortTermRentalPropertyIds : ['00000000-0000-0000-0000-000000000000'])
          .order('created_at', { ascending: false })
          .limit(5)
          .then(async (result) => {
            if (result.error && result.error.message?.includes('does not exist')) {
              return [];
            }
            const reservations = result.data || [];
            // Enrichir avec les titres des propriétés
            const enrichedReservations = await Promise.all(
              reservations.map(async (reservation: any) => {
                const { data: propertyData } = await supabase
                  .from('properties_02')
                  .select('title')
                  .eq('id', reservation.property_id)
                  .single();
                return { ...reservation, property_title: propertyData?.title || 'Bien' };
              })
            );
            return enrichedReservations;
          }),
        // Charger les paiements échelonnés récents
        supabase
          .from('installment_payments')
          .select('id, amount, payment_date, created_at, status, installment_plan_id')
          .eq('status', 'paid')
          .order('payment_date', { ascending: false })
          .limit(10)
          .then(async (result) => {
            if (result.error && result.error.message?.includes('does not exist')) {
              return [];
            }
            const payments = result.data || [];
            // Enrichir avec les détails des plans et propriétés
            const enrichedPayments = await Promise.all(
              payments.map(async (payment: any) => {
                const { data: planData } = await supabase
                  .from('installment_plans')
                  .select('property_id, owner_id')
                  .eq('id', payment.installment_plan_id)
                  .single();
                
                if (planData && planData.owner_id === userId && salePropertyIds.includes(planData.property_id)) {
                  const { data: propertyData } = await supabase
                    .from('properties_02')
                    .select('title')
                    .eq('id', planData.property_id)
                    .single();
                  return { ...payment, property_title: propertyData?.title || 'Bien' };
                }
                return null;
              })
            );
            // Filtrer les valeurs null et limiter à 5
            return enrichedPayments.filter((p: any) => p !== null).slice(0, 5);
          })
      ]);

      // Filtrer les réservations pour ne garder que celles liées aux biens en location courte durée
      const allReservations = reservationsResult.data || [];
      const reservations = allReservations.filter((r: any) => 
        shortTermRentalPropertyIds.includes(r.property_id)
      );

      // Filtrer les plans d'échelonnement pour ne garder que ceux liés aux biens en vente
      const allInstallmentPlans = installmentPlansResult.data || [];
      const installmentPlans = allInstallmentPlans.filter((p: any) => 
        salePropertyIds.includes(p.property_id)
      );
      const activitiesData = activitiesResult.data || [];
      const payments = paymentsResult.data || [];
      const expenses = expensesResult.data || [];
      const previousPayments = previousPaymentsResult.data || [];
      const previousExpenses = previousExpensesResult.data || [];
      const recentRevenues = recentRevenuesResult || [];
      const recentReservations = recentReservationsResult || [];
      const recentInstallmentPayments = recentInstallmentPaymentsResult || [];

      // Calculer les revenus mensuels :
      // 1. Somme des loyers des baux actifs
      const leaseRevenue = leases.reduce((sum, lease) => sum + Number(lease.monthly_rent || 0), 0);
      
      // 2. Réservations confirmées du mois en cours
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentMonthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      
      const { data: currentMonthReservations } = await supabase
        .from('reservations')
        .select('total_amount')
        .eq('owner_id', userId)
        .eq('status', 'confirmed')
        .gte('start_date', currentMonthStart)
        .lte('start_date', currentMonthEnd)
        .then(result => {
          if (result.error && result.error.message?.includes('does not exist')) {
            return { data: [], error: null };
          }
          return result;
        });
      
      const reservationsRevenue = (currentMonthReservations || []).reduce((sum: number, r: any) => 
        sum + Number(r.total_amount || 0), 0
      );
      
      // 3. Paiements échelonnés du mois en cours
      const { data: currentMonthInstallments } = await supabase
        .from('installment_payments')
        .select('amount, installment_plan_id, installment_plans!inner(property_id, owner_id)')
        .eq('status', 'paid')
        .gte('payment_date', currentMonthStart)
        .lte('payment_date', currentMonthEnd)
        .then(result => {
          if (result.error && result.error.message?.includes('does not exist')) {
            return { data: [], error: null };
          }
          return result;
        });
      
      // Filtrer pour ne garder que les paiements liés aux biens en vente de l'utilisateur
      const userInstallmentPayments = (currentMonthInstallments || []).filter((payment: any) => {
        const planPropertyId = payment.installment_plans?.property_id;
        return planPropertyId && salePropertyIds.includes(planPropertyId) && 
               payment.installment_plans?.owner_id === userId;
      });
      
      const installmentsRevenue = userInstallmentPayments.reduce((sum: number, p: any) => 
        sum + Number(p.amount || 0), 0
      );
      
      const monthlyRevenue = leaseRevenue + reservationsRevenue + installmentsRevenue;

      // Calculer les dépenses mensuelles (somme totale des dépenses sur la période actuelle)
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      // Pour les dépenses mensuelles, on prend la moyenne sur la période
      const monthlyExpenses = monthsAgo > 0 ? totalExpenses : 0;


      // Calculer les variations
      const currentPeriodRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const previousPeriodRevenue = previousPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const revenueChange = previousPeriodRevenue > 0
        ? `${((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100).toFixed(1)}%`
        : '+0%';
      const revenueChangeValue = previousPeriodRevenue > 0
        ? (currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100
        : 0;

      const currentPeriodExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const previousPeriodExpenses = previousExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const expensesChange = previousPeriodExpenses > 0
        ? `${((currentPeriodExpenses - previousPeriodExpenses) / previousPeriodExpenses * 100).toFixed(1)}%`
        : '+0%';
      const expensesChangeValue = previousPeriodExpenses > 0
        ? (currentPeriodExpenses - previousPeriodExpenses) / previousPeriodExpenses * 100
        : 0;

      // Calculer les données du graphique par mois
      const chartDataMap = new Map<string, { revenus: number; depenses: number }>();
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

      // Initialiser tous les mois de la période
      for (let i = 0; i < monthsAgo; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (monthsAgo - 1 - i));
        const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        chartDataMap.set(monthKey, { revenus: 0, depenses: 0 });
      }

      // Ajouter les revenus (paiements) par mois
      payments.forEach(payment => {
        if (payment.payment_date) {
          const date = new Date(payment.payment_date);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          const existing = chartDataMap.get(monthKey) || { revenus: 0, depenses: 0 };
          existing.revenus += Number(payment.amount || 0);
          chartDataMap.set(monthKey, existing);
        }
      });

      // Ajouter les dépenses par mois
      expenses.forEach(expense => {
        if (expense.expense_date) {
          try {
            const date = new Date(expense.expense_date);
            if (!isNaN(date.getTime())) {
              const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
              const existing = chartDataMap.get(monthKey) || { revenus: 0, depenses: 0 };
              existing.depenses += Number(expense.amount || 0);
              chartDataMap.set(monthKey, existing);
            }
          } catch (error) {
            console.warn('Erreur lors du traitement d\'une dépense:', expense, error);
          }
        }
      });

      const chartDataArray = Array.from(chartDataMap.entries()).map(([month, data]) => ({
        month,
        revenus: data.revenus,
        depenses: data.depenses
      }));

      setChartData(chartDataArray);
      setStats({
        monthlyRevenue: monthlyRevenue.toLocaleString('fr-FR'),
        monthlyExpenses: monthlyExpenses.toLocaleString('fr-FR'),
        reservationsCount: reservations.length.toString(),
        installmentPlansCount: installmentPlans.length.toString(),
        revenueChange: revenueChangeValue >= 0 ? `+${revenueChange}` : revenueChange,
        expensesChange: expensesChangeValue >= 0 ? `+${expensesChange}` : expensesChange,
        reservationsChange: '+0',
        installmentPlansChange: '0'
      });

      // Formater les activités depuis activity_log
      const formattedActivitiesFromLog = activitiesData.map(activity => ({
        type: activity.type,
        text: activity.title,
        amount: activity.amount ? (activity.amount > 0 ? `+${activity.amount.toLocaleString('fr-FR')} FCFA` : `${activity.amount.toLocaleString('fr-FR')} FCFA`) : undefined,
        time: formatTimeAgo(activity.created_at),
        date: new Date(activity.created_at),
        icon: getActivityIcon(activity.type),
        color: getActivityColor(activity.type)
      }));

      // Formater les revenus récents
      const formattedRevenues = recentRevenues.map((revenue: any) => {
        const date = revenue.payment_date || revenue.created_at;
        const propertyTitle = revenue.leases?.properties_02?.title || revenue.properties_02?.title || 'Bien';
        const revenueType = revenue.revenue_type || 'lease';
        const typeLabel = revenueType === 'lease' ? 'Paiement de loyer' : revenueType === 'sale' ? 'Vente' : 'Autre revenu';
        
        return {
          type: 'revenue',
          text: `${typeLabel} - ${propertyTitle}`,
          amount: `+${Number(revenue.amount || 0).toLocaleString('fr-FR')} FCFA`,
          time: formatTimeAgo(date),
          date: new Date(date),
          icon: getActivityIcon('revenue'),
          color: getActivityColor('revenue')
        };
      });

      // Formater les réservations récentes
      const formattedReservations = recentReservations.map((reservation: any) => {
        const date = reservation.created_at;
        const propertyTitle = reservation.property_title || 'Bien';
        const startDate = new Date(reservation.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        const endDate = new Date(reservation.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        
        return {
          type: 'reservation',
          text: `Réservation - ${propertyTitle} (${startDate} - ${endDate})`,
          amount: `+${Number(reservation.total_amount || 0).toLocaleString('fr-FR')} FCFA`,
          time: formatTimeAgo(date),
          date: new Date(date),
          icon: getActivityIcon('reservation'),
          color: getActivityColor('reservation')
        };
      });

      // Formater les paiements échelonnés récents
      const formattedInstallmentPayments = recentInstallmentPayments.map((payment: any) => {
        const date = payment.payment_date || payment.created_at;
        const propertyTitle = payment.property_title || 'Bien';
        
        return {
          type: 'installment',
          text: `Paiement échelonné - ${propertyTitle}`,
          amount: `+${Number(payment.amount || 0).toLocaleString('fr-FR')} FCFA`,
          time: formatTimeAgo(date),
          date: new Date(date),
          icon: getActivityIcon('installment'),
          color: getActivityColor('installment')
        };
      });

      // Combiner toutes les activités et trier par date (plus récentes en premier)
      const allActivities = [
        ...formattedActivitiesFromLog,
        ...formattedRevenues,
        ...formattedReservations,
        ...formattedInstallmentPayments
      ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10) // Limiter à 10 activités
        .map(({ date, ...rest }) => rest); // Retirer la propriété date qui n'est plus nécessaire

      setActivities(allActivities);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Il y a moins d\'une heure';
    if (diffInHours < 24) return `Il y a ${Math.floor(diffInHours)}h`;
    if (diffInHours < 48) return 'Hier';
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR');
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      payment: 'ri-check-line',
      visit: 'ri-calendar-line',
      expense: 'ri-tools-line',
      message: 'ri-message-3-line',
      lease: 'ri-file-list-3-line',
      property: 'ri-building-line',
      tenant: 'ri-user-line',
      system: 'ri-notification-line',
      revenue: 'ri-money-euro-circle-line',
      reservation: 'ri-calendar-check-line',
      installment: 'ri-installment-line'
    };
    return icons[type] || 'ri-circle-line';
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      payment: 'text-green-600 bg-green-100',
      visit: 'text-blue-600 bg-blue-100',
      expense: 'text-orange-600 bg-orange-100',
      message: 'text-purple-600 bg-purple-100',
      lease: 'text-teal-600 bg-teal-100',
      property: 'text-indigo-600 bg-indigo-100',
      tenant: 'text-pink-600 bg-pink-100',
      system: 'text-gray-600 bg-gray-100',
      revenue: 'text-emerald-600 bg-emerald-100',
      reservation: 'text-blue-600 bg-blue-100',
      installment: 'text-purple-600 bg-purple-100'
    };
    return colors[type] || 'text-gray-600 bg-gray-100';
  };

  const statsArray = [
    {
      label: 'Revenus mensuels',
      value: `${stats.monthlyRevenue} FCFA`,
      change: stats.revenueChange,
      positive: !stats.revenueChange.startsWith('-'),
      icon: 'ri-money-euro-circle-line',
      color: 'from-emerald-500 to-emerald-600',
      clickable: true,
      view: 'revenus' as const
    },
    {
      label: 'Dépenses mensuelles',
      value: `${stats.monthlyExpenses} FCFA`,
      change: stats.expensesChange,
      positive: !stats.expensesChange.startsWith('-'),
      icon: 'ri-wallet-line',
      color: 'from-orange-500 to-orange-600',
      clickable: true,
      view: 'depenses' as const
    },
    {
      label: 'Reservations',
      value: stats.reservationsCount,
      change: stats.reservationsChange,
      positive: true,
      icon: 'ri-calendar-check-line',
      color: 'from-blue-500 to-blue-600',
      clickable: true,
      view: 'reservations' as const
    },
    {
      label: 'Paiements échelonnés',
      value: stats.installmentPlansCount,
      change: stats.installmentPlansChange,
      positive: true,
      icon: 'ri-installment-line',
      color: 'from-purple-500 to-purple-600',
      clickable: true,
      view: 'paiement-echelonne' as const
    }
  ];

  const maxValue = chartData.length > 0 
    ? Math.max(...chartData.flatMap(d => [d.revenus, d.depenses]), 1)
    : 1;

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

  // Afficher les pages spécifiques si une vue est sélectionnée
  if (activeView === 'revenus') {
    return <RevenusPage userId={userId} onBack={() => setActiveView('dashboard')} />;
  }
  if (activeView === 'depenses') {
    return <DepensesPage userId={userId} onBack={() => setActiveView('dashboard')} />;
  }
  if (activeView === 'reservations') {
    return <ReservationsPage userId={userId} onBack={() => setActiveView('dashboard')} />;
  }
  if (activeView === 'paiement-echelonne') {
    return <PaiementEchelonnePage userId={userId} onBack={() => setActiveView('dashboard')} />;
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {statsArray.map((stat, index) => (
          <button
            key={index}
            onClick={() => stat.clickable && setActiveView(stat.view)}
            className={`bg-white rounded-xl md:rounded-2xl p-4 md:p-5 lg:p-6 shadow-sm transition-all text-left w-full ${
              stat.clickable 
                ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer active:scale-[0.98]' 
                : 'cursor-default'
            }`}
          >
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br ${stat.color} text-white`}>
                <i className={`${stat.icon} text-xl md:text-2xl`}></i>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs md:text-sm font-medium px-2 md:px-3 py-0.5 md:py-1 rounded-full ${
                  stat.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {stat.change}
                </span>
                {stat.clickable && (
                  <i className="ri-arrow-right-s-line text-lg md:text-xl text-gray-400"></i>
                )}
              </div>
            </div>
            <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 break-words">{stat.value}</div>
            <div className="text-xs md:text-sm text-gray-600">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Revenus vs Dépenses</h2>
            <p className="text-sm md:text-base text-gray-600">Évolution mensuelle de vos finances</p>
          </div>
          <div className="flex gap-1 md:gap-2 bg-gray-100 rounded-lg md:rounded-xl p-1 w-full sm:w-auto">
              <button
                onClick={() => setSelectedPeriod('3months')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedPeriod === '3months' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                3 mois
              </button>
              <button
                onClick={() => setSelectedPeriod('6months')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedPeriod === '6months' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                6 mois
              </button>
              <button
                onClick={() => setSelectedPeriod('12months')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedPeriod === '12months' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                12 mois
              </button>
            </div>
          </div>

        {/* Legend */}
        <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
            <span className="text-xs md:text-sm text-gray-600">Revenus</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-gradient-to-r from-orange-500 to-orange-600"></div>
            <span className="text-xs md:text-sm text-gray-600">Dépenses</span>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-64 md:h-72 lg:h-80 overflow-x-auto">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <i className="ri-bar-chart-line text-4xl text-gray-300 mb-3"></i>
                <p className="text-sm text-gray-600">Aucune donnée disponible pour cette période</p>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-end justify-between gap-2 md:gap-3 lg:gap-4 min-w-[400px] md:min-w-0">
              {chartData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 md:gap-3">
                  <div className="w-full flex items-end justify-center gap-1 md:gap-2 h-48 md:h-56 lg:h-64">
                    {/* Revenus Bar */}
                    <div className="relative flex-1 flex flex-col items-center group cursor-pointer">
                      <div
                        className="w-full bg-gradient-to-t from-emerald-500 to-emerald-600 rounded-t-md md:rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${Math.max((data.revenus / maxValue) * 100, 2)}%`, minHeight: data.revenus > 0 ? '4px' : '0' }}
                      >
                        {data.revenus > 0 && (
                          <div className="absolute -top-7 md:-top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded whitespace-nowrap z-10">
                            {data.revenus.toLocaleString('fr-FR')} FCFA
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Depenses Bar */}
                    <div className="relative flex-1 flex flex-col items-center group cursor-pointer">
                      <div
                        className="w-full bg-gradient-to-t from-orange-500 to-orange-600 rounded-t-md md:rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${Math.max((data.depenses / maxValue) * 100, 2)}%`, minHeight: data.depenses > 0 ? '4px' : '0' }}
                      >
                        {data.depenses > 0 && (
                          <div className="absolute -top-7 md:-top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded whitespace-nowrap z-10">
                            {data.depenses.toLocaleString('fr-FR')} FCFA
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs md:text-sm font-medium text-gray-600 text-center">{data.month}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Activité récente</h2>
        <div className="space-y-3 md:space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <i className="ri-inbox-line text-3xl md:text-4xl text-gray-300 mb-3 md:mb-4"></i>
              <p className="text-sm md:text-base text-gray-600">Aucune activité récente</p>
            </div>
          ) : (
            activities.map((activity, index) => (
            <div key={index} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
              <div className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full ${activity.color} flex-shrink-0`}>
                <i className={`${activity.icon} text-base md:text-lg`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-900 truncate">{activity.text}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
              {activity.amount && (
                <span className={`text-sm md:text-base font-bold flex-shrink-0 ${activity.amount.startsWith('+') ? 'text-green-600' : 'text-orange-600'}`}>
                  {activity.amount}
                </span>
              )}
            </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
