import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

import PersonalInfoTab from './components/PersonalInfoTab';
import ProfessionalTab from './components/ProfessionalTab';
import SecurityTab from './components/SecurityTab';
export default function ProfilPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'security'>('personal');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/connexion');
        return;
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      navigate('/connexion');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl sm:text-5xl text-orange-600 animate-spin"></i>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="pt-16 md:pt-24 pb-12 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Mon Profil</h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">Gérez vos informations personnelles et professionnelles</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex flex-col sm:flex-row border-b border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveTab('personal')}
                className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'personal'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className="ri-user-line mr-2 w-4 h-4 sm:w-5 sm:h-5 inline-flex items-center justify-center"></i>
                <span className="hidden sm:inline">Informations personnelles</span>
                <span className="sm:hidden">Personnel</span>
              </button>
              <button
                onClick={() => setActiveTab('professional')}
                className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'professional'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className="ri-briefcase-line mr-2 w-4 h-4 sm:w-5 sm:h-5 inline-flex items-center justify-center"></i>
                <span className="hidden sm:inline">Espace professionnel</span>
                <span className="sm:hidden">Professionnel</span>
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'security'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className="ri-shield-line mr-2 w-4 h-4 sm:w-5 sm:h-5 inline-flex items-center justify-center"></i>
                Sécurité
              </button>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
              {activeTab === 'personal' && <PersonalInfoTab />}
              {activeTab === 'professional' && <ProfessionalTab />}
              {activeTab === 'security' && <SecurityTab />}
            </div>
          </div>

          {/* Bouton Devenir partenaire */}
          <div className="mt-6 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl md:rounded-2xl shadow-sm border border-teal-600 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">
                  <i className="ri-gift-line mr-2"></i>
                  Programme d'affiliation
                </h3>
                <p className="text-teal-50 text-sm sm:text-base">
                  Partagez votre code d'affiliation et gagnez des avantages en invitant vos contacts à rejoindre la plateforme.
                </p>
              </div>
              <button
                onClick={() => navigate('/affiliation')}
                className="px-6 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-arrow-right-line"></i>
                Devenir partenaire
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
