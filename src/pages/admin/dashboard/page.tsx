import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import StatisticsTab from '../components/StatisticsTab';
import UsersManagementTab from '../components/UsersManagementTab';
import PropertiesManagementTab from '../components/PropertiesManagementTab';
import SubscriptionsTab from '../components/SubscriptionsTab';
import CommissionsTab from '../components/CommissionsTab';
import SettingsTab from '../components/SettingsTab';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { admin, logout, isAuthenticated, isLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<'statistics' | 'users' | 'properties' | 'subscriptions' | 'commissions' | 'settings'>('statistics');

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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                  <i className="ri-shield-user-line text-xl text-white"></i>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard Admin</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{admin?.full_name}</p>
                <p className="text-xs text-gray-500">{admin?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <i className="ri-logout-box-line"></i>
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'statistics'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-bar-chart-line mr-2"></i>
                Statistiques
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'users'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-user-settings-line mr-2"></i>
                Gestion des utilisateurs
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'properties'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-home-line mr-2"></i>
                Gestion des annonces
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'subscriptions'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-vip-crown-line mr-2"></i>
                Abonnements
              </button>
              <button
                onClick={() => setActiveTab('commissions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'commissions'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-money-dollar-circle-line mr-2"></i>
                Commissions
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'settings'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <i className="ri-settings-3-line mr-2"></i>
                Paramètres
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'statistics' && <StatisticsTab />}
          {activeTab === 'users' && <UsersManagementTab />}
          {activeTab === 'properties' && <PropertiesManagementTab />}
          {activeTab === 'subscriptions' && <SubscriptionsTab />}
          {activeTab === 'commissions' && <CommissionsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

