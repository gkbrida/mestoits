import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { canUserAccessRentalManagement } from '../../utils/subscriptionUtils';

import Navbar from '../../components/feature/Navbar';
import Footer from '../../components/feature/Footer';
import SideMenu from '../../components/feature/SideMenu';
import DashboardTab from './components/DashboardTab';
import PropertiesTab from './components/PropertiesTab';
import TenantsTab from './components/TenantsTab';
import LeasesTab from './components/LeasesTab';

export default function RentalManagementPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    if (!user) return;
    
    try {
      const canAccess = await canUserAccessRentalManagement(user.id);
      setAccessDenied(!canAccess);
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'accès:', error);
      // En cas d'erreur, autoriser l'accès pour ne pas bloquer l'utilisateur
      setAccessDenied(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      checkAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Lire les paramètres d'URL pour déterminer l'onglet actif
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const propertyParam = searchParams.get('property');
    const leaseParam = searchParams.get('lease');
    
    if (propertyParam) {
      setActiveTab('properties');
    } else if (leaseParam) {
      setActiveTab('leases');
    } else if (tabParam && ['dashboard', 'properties', 'tenants', 'leases'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'ri-dashboard-line' },
    { id: 'properties', label: 'Biens', icon: 'ri-building-line' },
    { id: 'tenants', label: 'Locataires', icon: 'ri-user-line' },
    { id: 'leases', label: 'Baux', icon: 'ri-file-text-line' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="ri-loader-4-line text-5xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si accès refusé
  if (user && accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <div className="pt-16 md:pt-24 pb-12 md:pb-20">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 lg:p-12 max-w-[600px] w-full text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <i className="ri-shield-cross-line text-3xl md:text-4xl text-orange-600 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Accès restreint</h2>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg mb-6 md:mb-8">
                  L'accès à la gestion locative nécessite un abonnement approprié. Veuillez mettre à niveau votre plan pour accéder à cette fonctionnalité.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                  <button
                    onClick={() => navigate('/abonnements')}
                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-vip-crown-line text-lg md:text-xl"></i>
                    <span>Voir les abonnements</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  // Si pas d'utilisateur connecté
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <div className="pt-16 md:pt-24 pb-12 md:pb-20">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 lg:p-12 max-w-[600px] w-full text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <i className="ri-building-line text-3xl md:text-4xl text-teal-600 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Gérer mes biens</h2>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg mb-6 md:mb-8">
                  Pour gérer vos biens immobiliers, suivre vos locataires et vos paiements, vous devez être connecté à votre compte
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                  <a
                    href="/connexion"
                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-login-box-line text-lg md:text-xl"></i>
                    <span>Se connecter</span>
                  </a>
                  <a
                    href="/inscription"
                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-user-add-line text-lg md:text-xl"></i>
                    <span>Créer un compte</span>
                  </a>
                </div>
                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
                  <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">Pourquoi créer un compte ?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-left">
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Gérer tous vos biens en un seul endroit</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Suivre vos locataires et baux</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Gérer les paiements de loyers</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Tableau de bord complet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      <div className="pt-16 md:pt-24 pb-12 md:pb-16">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Gérer mes biens</h1>
            <p className="text-sm md:text-base lg:text-lg text-gray-600">Gérez vos propriétés, locataires et baux en toute simplicité</p>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm mb-6 md:mb-8 p-1 md:p-2">
            <div className="grid grid-cols-2 md:flex gap-1 md:gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 md:gap-3 px-3 md:px-6 py-2 md:py-4 rounded-lg md:rounded-xl text-xs md:text-sm lg:text-base font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <i className={`${tab.icon} text-base md:text-lg lg:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center`}></i>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'properties' && <PropertiesTab propertyId={searchParams.get('property')} />}
            {activeTab === 'tenants' && <TenantsTab />}
            {activeTab === 'leases' && <LeasesTab leaseId={searchParams.get('lease')} />}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
