
export default function EstimationSection() {
  return (
    <section className="py-10 md:py-20 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* Left - Visual */}
          <div className="w-full md:w-1/2 order-2 md:order-1">
            <div className="relative" style={{ transform: 'rotate(-2deg)' }}>
              <img
                src="/estimation-hero.jpg"
                alt="Estimation immobilière - Professionnel présentant un rapport d'estimation sur tablette"
                className="w-full h-[300px] md:h-[400px] lg:h-[500px] object-cover object-top rounded-xl md:rounded-2xl shadow-2xl shadow-blue-500/15"
              />
            </div>
          </div>

          {/* Right - Content */}
          <div className="w-full md:w-1/2 order-1 md:order-2 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6 leading-tight">
              Estimation<br />
              <span className="text-orange-500">Gratuite</span><br />
              de Votre Bien
            </h2>
            <ul className="space-y-4 md:space-y-5 mb-6 md:mb-10">
              <li className="flex items-start gap-3 md:gap-4">
                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex-shrink-0 mt-1">
                  <i className="ri-check-line text-white text-base md:text-lg"></i>
                </div>
                <p className="text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed">
                  <strong>Estimation précise</strong> basée sur les données du marché immobilier local et les transactions récentes
                </p>
              </li>
              <li className="flex items-start gap-3 md:gap-4">
                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex-shrink-0 mt-1">
                  <i className="ri-check-line text-white text-base md:text-lg"></i>
                </div>
                <p className="text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed">
                  <strong>Résultat instantané</strong> en quelques minutes seulement, sans engagement ni frais cachés
                </p>
              </li>
              <li className="flex items-start gap-3 md:gap-4">
                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex-shrink-0 mt-1">
                  <i className="ri-check-line text-white text-base md:text-lg"></i>
                </div>
                <p className="text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed">
                  <strong>Rapport détaillé</strong> incluant l'analyse comparative du quartier et les tendances du marché
                </p>
              </li>
              <li className="flex items-start gap-3 md:gap-4">
                <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-green-500 rounded-full flex-shrink-0 mt-1">
                  <i className="ri-check-line text-white text-base md:text-lg"></i>
                </div>
                <p className="text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed">
                  <strong>Conseils personnalisés</strong> pour optimiser la valeur de votre propriété avant la vente
                </p>
              </li>
            </ul>
            <a
              href="/estimation"
              className="inline-flex items-center justify-center px-6 md:px-10 py-3 md:py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm md:text-base lg:text-lg font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
            >
              Estimer mon bien maintenant
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
