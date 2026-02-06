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
}

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

      // Charger toutes les statistiques en parallèle
      const [
        visitsData,
        usersData,
        professionalsData,
        propertiesData,
        visitsByDayData,
        propertiesByTypeData,
      ] = await Promise.all([
        // Statistiques des visites
        supabase
          .from('visitor_tracking')
          .select('visitor_id, session_id, created_at')
          .order('created_at', { ascending: false }),

        // Tous les utilisateurs
        supabase
          .from('users_2025_12_01_11_29')
          .select('id, user_type, is_active')
          .eq('is_active', true),

        // Professionnels
        supabase
          .from('users_2025_12_01_11_29')
          .select('id, user_type')
          .eq('user_type', 'professional')
          .eq('is_active', true),

        // Toutes les annonces
        supabase
          .from('properties')
          .select('id, status, is_approved, property_type'),

        // Visites par jour (7 derniers jours)
        supabase
          .from('visitor_tracking')
          .select('created_at')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false }),

        // Annonces par type
        supabase
          .from('properties')
          .select('property_type, is_approved')
          .eq('is_approved', true),
      ]);

      if (visitsData.error) throw visitsData.error;
      if (usersData.error) throw usersData.error;
      if (professionalsData.error) throw professionalsData.error;
      if (propertiesData.error) throw propertiesData.error;
      if (visitsByDayData.error) throw visitsByDayData.error;
      if (propertiesByTypeData.error) throw propertiesByTypeData.error;

      // Calculer les statistiques
      const visits = visitsData.data || [];
      const users = usersData.data || [];
      const professionals = professionalsData.data || [];
      const properties = propertiesData.data || [];
      const visitsByDayRaw = visitsByDayData.data || [];
      const propertiesByTypeRaw = propertiesByTypeData.data || [];

      // Visiteurs uniques
      const uniqueVisitors = new Set(visits.map((v) => v.visitor_id).filter(Boolean)).size;

      // Visites par jour (7 derniers jours)
      const visitsByDayMap = new Map<string, number>();
      visitsByDayRaw.forEach((visit) => {
        const date = new Date(visit.created_at).toISOString().split('T')[0];
        visitsByDayMap.set(date, (visitsByDayMap.get(date) || 0) + 1);
      });

      const visitsByDay = Array.from(visitsByDayMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Utilisateurs par type
      const usersByType = {
        individual: users.filter((u) => u.user_type === 'individual').length,
        professional: users.filter((u) => u.user_type === 'professional').length,
      };

      // Annonces par type
      const propertiesByType: Record<string, number> = {};
      propertiesByTypeRaw.forEach((p) => {
        propertiesByType[p.property_type] = (propertiesByType[p.property_type] || 0) + 1;
      });

      // Annonces actives et en attente
      const activeProperties = properties.filter((p) => p.is_approved && p.status === 'active').length;
      const pendingProperties = properties.filter((p) => !p.is_approved).length;

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

  if (!statistics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Cards de statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Visites */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total visites</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.totalVisits.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{statistics.uniqueVisitors} visiteurs uniques</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <i className="ri-eye-line text-2xl text-blue-600"></i>
            </div>
          </div>
        </div>

        {/* Utilisateurs */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {statistics.usersByType.individual} particuliers, {statistics.usersByType.professional} professionnels
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="ri-user-line text-2xl text-green-600"></i>
            </div>
          </div>
        </div>

        {/* Professionnels */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Professionnels</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.totalProfessionals.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <i className="ri-briefcase-line text-2xl text-purple-600"></i>
            </div>
          </div>
        </div>

        {/* Annonces */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Annonces</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{statistics.totalProperties.toLocaleString()}</p>
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

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visites par jour */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visites des 7 derniers jours</h3>
          <div className="space-y-2">
            {statistics.visitsByDay.length > 0 ? (
              statistics.visitsByDay.map((day) => {
                const maxVisits = Math.max(...statistics.visitsByDay.map((d) => d.count));
                const percentage = maxVisits > 0 ? (day.count / maxVisits) * 100 : 0;
                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <div className="w-24 text-xs text-gray-600">
                      {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
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

        {/* Annonces par type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Annonces par type</h3>
          <div className="space-y-3">
            {Object.entries(statistics.propertiesByType).length > 0 ? (
              Object.entries(statistics.propertiesByType).map(([type, count]) => {
                const total = Object.values(statistics.propertiesByType).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;
                const typeLabels: Record<string, string> = {
                  apartment: 'Appartement',
                  house: 'Maison',
                  villa: 'Villa',
                  land: 'Terrain',
                  commercial: 'Commercial',
                  office: 'Bureau',
                  parking: 'Parking',
                };
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{typeLabels[type] || type}</span>
                      <span className="text-sm font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
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

