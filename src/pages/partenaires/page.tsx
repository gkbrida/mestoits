import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import { useState } from 'react';

export default function PartenairesPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isLoan = type === 'pret-immobilier';

  const partnerInfo = isLoan
    ? {
        title: 'Prêt immobilier',
        icon: 'ri-bank-line',
        gradient: 'from-emerald-500 to-teal-600',
        color: 'emerald',
        description: 'Nous recherchons des partenaires bancaires de confiance pour vous accompagner dans votre projet immobilier.',
        features: [
          'Simulation de prêt en ligne',
          'Comparaison des meilleures offres',
          'Accompagnement personnalisé',
          'Taux compétitifs',
        ],
      }
    : {
        title: 'Assurance habitation',
        icon: 'ri-shield-check-line',
        gradient: 'from-orange-500 to-amber-600',
        color: 'orange',
        description: 'Nous recherchons des partenaires d\'assurance fiables pour protéger votre nouveau logement.',
        features: [
          'Devis personnalisé en quelques clics',
          'Comparaison des meilleures garanties',
          'Protection complète de votre bien',
          'Tarifs compétitifs',
        ],
      };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br ${partnerInfo.gradient} rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-lg`}>
              <i className={`${partnerInfo.icon} text-3xl sm:text-4xl text-white w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center`}></i>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              {partnerInfo.title}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              {partnerInfo.description}
            </p>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 mb-6 sm:mb-8 relative overflow-hidden">
            {/* Decorative Background */}
            <div className={`absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-gradient-to-br ${partnerInfo.gradient} opacity-5 rounded-full -mr-16 sm:-mr-32 -mt-16 sm:-mt-32`}></div>
            <div className={`absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-gradient-to-br ${partnerInfo.gradient} opacity-5 rounded-full -ml-12 sm:-ml-24 -mb-12 sm:-mb-24`}></div>

            <div className="relative z-10">
              {/* Animated Icon */}
              <div className="flex justify-center mb-6 sm:mb-8">
                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${partnerInfo.gradient} rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg animate-pulse`}>
                  <i className={`${partnerInfo.icon} text-4xl sm:text-5xl text-white w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center`}></i>
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white opacity-20 animate-ping"></div>
                </div>
              </div>

              {/* Coming Soon Badge */}
              <div className="flex justify-center mb-4 sm:mb-6">
                <span className={`inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-semibold ${
                  isLoan 
                    ? 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700' 
                    : 'bg-orange-50 border-2 border-orange-200 text-orange-700'
                }`}>
                  <i className="ri-time-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center animate-spin"></i>
                  Bientôt disponible
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-4 sm:mb-6 px-4">
                Une fonctionnalité en cours de développement
              </h2>

              <p className="text-base sm:text-lg text-gray-700 text-center mb-6 sm:mb-8 leading-relaxed px-4">
                Nous travaillons activement à mettre en place des partenariats de qualité pour vous offrir les meilleurs services. 
                Cette fonctionnalité sera disponible très prochainement.
              </p>

              {/* Features Preview */}
              <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 text-center px-2">
                  Ce que nous préparons pour vous :
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {partnerInfo.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl">
                      <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 ${
                        isLoan ? 'bg-emerald-100' : 'bg-orange-100'
                      }`}>
                        <i className={`ri-check-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center ${
                          isLoan ? 'text-emerald-600' : 'text-orange-600'
                        }`}></i>
                      </div>
                      <span className="text-sm sm:text-base text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div className="text-center">
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 px-4">
                  Restez informé de l'arrivée de cette fonctionnalité
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                  <button
                    onClick={() => navigate('/recherche-biens')}
                    className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r ${partnerInfo.gradient} text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:shadow-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2`}
                  >
                    <i className="ri-home-4-line text-lg sm:text-xl"></i>
                    <span>Continuer mes recherches</span>
                  </button>
                  <button
                    onClick={() => navigate(-1)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 border-2 border-gray-300 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <i className="ri-arrow-left-line text-lg sm:text-xl"></i>
                    <span>Retour</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Why We're Looking for Partners */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center px-4">
              Pourquoi nous recherchons des partenaires ?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="text-center p-4 sm:p-6">
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4">
                  <i className="ri-star-line text-2xl sm:text-3xl text-blue-600 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"></i>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Qualité</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Nous sélectionnons uniquement les partenaires les plus fiables et reconnus du marché.
                </p>
              </div>
              <div className="text-center p-4 sm:p-6">
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-50 rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4">
                  <i className="ri-shield-check-line text-2xl sm:text-3xl text-green-600 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"></i>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Confiance</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Nous voulons vous offrir des services de confiance qui répondent à vos besoins.
                </p>
              </div>
              <div className="text-center p-4 sm:p-6 sm:col-span-2 md:col-span-1">
                <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-purple-50 rounded-xl sm:rounded-2xl mx-auto mb-3 sm:mb-4">
                  <i className="ri-hand-heart-line text-2xl sm:text-3xl text-purple-600 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center"></i>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">Accompagnement</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Nous vous accompagnons dans toutes les étapes de votre projet immobilier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

