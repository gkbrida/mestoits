import { useNavigate } from 'react-router-dom';

export default function PartnersSection() {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Nos partenaires</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Mortgage Loan Partner */}
        <div 
          onClick={() => navigate('/partenaires/pret-immobilier')}
          className="border border-gray-200 rounded-lg md:rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg md:rounded-xl flex-shrink-0">
              <i className="ri-bank-line text-xl sm:text-2xl text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Prêt immobilier</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                Obtenez les meilleures conditions pour financer votre projet immobilier avec nos partenaires bancaires de confiance.
              </p>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap">
                Simuler mon prêt
                <i className="ri-arrow-right-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Home Insurance Partner */}
        <div 
          onClick={() => navigate('/partenaires/assurance')}
          className="border border-gray-200 rounded-lg md:rounded-xl p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg md:rounded-xl flex-shrink-0">
              <i className="ri-shield-check-line text-xl sm:text-2xl text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Assurance habitation</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                Protégez votre nouveau logement avec une assurance adaptée à vos besoins et au meilleur prix du marché.
              </p>
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap">
                Obtenir un devis
                <i className="ri-arrow-right-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
