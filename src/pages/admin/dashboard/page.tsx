import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import StatisticsTab from '../components/StatisticsTab';
import UsersManagementTab from '../components/UsersManagementTab';
import PropertiesManagementTab from '../components/PropertiesManagementTab';
import SubscriptionsTab from '../components/SubscriptionsTab';
import CommissionsTab from '../components/CommissionsTab';
import AffiliationTab from '../components/AffiliationTab';
import SettingsTab from '../components/SettingsTab';
import ShortTermRentalsTab from '../components/ShortTermRentalsTab';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { admin, logout, isAuthenticated, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'statistics' | 'users' | 'properties' | 'short-term' | 'subscriptions' | 'commissions' | 'affiliation' | 'settings'>('statistics');

  // Rediriger vers la page de connexion si non authentifié
  if (!isLoading && !isAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-sm text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header responsive */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 sm:py-0 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="ri-shield-user-line text-lg sm:text-xl text-white"></i>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Dashboard Admin</h1>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              <div className="text-right min-w-0 flex-1 sm:flex-initial">
                <p className="text-sm font-semibold text-gray-900 truncate">{admin?.full_name}</p>
                <p className="text-xs text-gray-500 truncate max-w-[160px] sm:max-w-none">{admin?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
              >
                <i className="ri-logout-box-line"></i>
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Tabs Navigation - scroll horizontal sur mobile */}
        <div className="mb-4 sm:mb-8">
          <div className="border-b border-gray-200 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <nav className="-mb-px flex gap-2 sm:gap-6 lg:gap-8 min-w-max sm:min-w-0 pb-px">
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'statistics'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-bar-chart-line mr-1.5 sm:mr-2"></i>
                Statistiques
              </button>
              {(['users', 'properties', 'short-term', 'subscriptions', 'commissions', 'affiliation', 'settings'] as const).map((tab) => {
                const labels: Record<string, string> = {
                  users: 'Utilisateurs',
                  properties: 'Annonces',
                  'short-term': 'Court durée',
                  subscriptions: 'Abonnements',
                  commissions: 'Commissions',
                  affiliation: 'Affiliation',
                  settings: 'Paramètres',
                };
                const icons: Record<string, string> = {
                  users: 'ri-user-settings-line',
                  properties: 'ri-home-line',
                  'short-term': 'ri-calendar-check-line',
                  subscriptions: 'ri-vip-crown-line',
                  commissions: 'ri-money-dollar-circle-line',
                  affiliation: 'ri-user-shared-line',
                  settings: 'ri-settings-3-line',
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${icons[tab]} mr-1.5 sm:mr-2`}></i>
                    {labels[tab]}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'statistics' && <StatisticsTab />}
          {activeTab === 'users' && <UsersManagementTab />}
          {activeTab === 'properties' && <PropertiesManagementTab />}
          {activeTab === 'short-term' && <ShortTermRentalsTab />}
          {activeTab === 'subscriptions' && <SubscriptionsTab />}
          {activeTab === 'commissions' && <CommissionsTab />}
          {activeTab === 'affiliation' && <AffiliationTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

