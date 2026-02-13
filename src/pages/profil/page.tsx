import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

import PersonalInfoTab from './components/PersonalInfoTab';
import ProfessionalTab from './components/ProfessionalTab';
import SecurityTab from './components/SecurityTab';
import WalletTab from './components/WalletTab';
import PartnershipSignatureView from './components/PartnershipSignatureView';
import { getAffiliationSettings } from '../../utils/affiliationUtils';
export default function ProfilPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'security' | 'wallet'>('personal');
  const [isPartner, setIsPartner] = useState(false);
  const [showPartnershipSignature, setShowPartnershipSignature] = useState(false);
  const [partnershipData, setPartnershipData] = useState<{
    email: string;
    userName: string;
    percentage: number;
    durationMonths: number;
  } | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  // Gérer l'onglet depuis l'URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'professional') setActiveTab('professional');
    else if (tabParam === 'wallet') setActiveTab('wallet');
    else if (tabParam === 'security') setActiveTab('security');
  }, [searchParams]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/connexion');
        return;
      }
      // Vérifier si l'utilisateur a signé un contrat de partenariat
      const { data: contract } = await supabase
        .from('partnership_contracts')
        .select('signed_at')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsPartner(!!contract?.signed_at);

      // Charger profil pour le formulaire de signature (email, nom)
      const { data: profile } = await supabase
        .from('users_2025_12_01_11_29')
        .select('email, full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const settings = await getAffiliationSettings(user.id);
        setPartnershipData({
          email: profile.email || user.email || '',
          userName: profile.full_name || 'Partenaire',
          percentage: settings.percentage || 10,
          durationMonths: settings.durationMonths || 12,
        });
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
                onClick={() => setActiveTab('wallet')}
                className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'wallet'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <i className="ri-wallet-line mr-2 w-4 h-4 sm:w-5 sm:h-5 inline-flex items-center justify-center"></i>
                Portefeuille
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
              {activeTab === 'wallet' && <WalletTab />}
            </div>
          </div>

          {/* Programme d'affiliation */}
          <div className="mt-6 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl md:rounded-2xl shadow-sm border border-teal-600 p-6 md:p-8">
            {showPartnershipSignature && partnershipData ? (
              <PartnershipSignatureView
                userEmail={partnershipData.email}
                userName={partnershipData.userName}
                percentage={partnershipData.percentage}
                durationMonths={partnershipData.durationMonths}
                onComplete={() => {
                  setShowPartnershipSignature(false);
                  setIsPartner(true);
                }}
                onCancel={() => setShowPartnershipSignature(false)}
              />
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    <i className="ri-gift-line mr-2"></i>
                    Programme d'affiliation
                  </h3>
                  <p className="text-teal-50 text-sm sm:text-base">
                    {isPartner
                      ? 'Accédez à votre espace partenaire pour consulter vos affiliés et revenus.'
                      : 'Partagez votre code d\'affiliation et gagnez en invitant vos contacts. Signez le contrat de partenariat pour commencer.'}
                  </p>
                </div>
                <button
                  onClick={() =>
                    isPartner ? navigate('/affiliation') : setShowPartnershipSignature(true)
                  }
                  className="px-6 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap flex items-center gap-2"
                >
                  <i className="ri-arrow-right-line"></i>
                  {isPartner ? 'Mon espace partenaire' : 'Devenir partenaire'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
