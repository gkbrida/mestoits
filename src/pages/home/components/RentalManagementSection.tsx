
export default function RentalManagementSection() {
  const features = [
    {
      icon: 'ri-calendar-check-line',
      title: 'Gestion des Visites',
      description: 'Planifiez et organisez les visites de vos biens en toute simplicité avec notre calendrier intelligent et les notifications automatiques.',
      color: 'blue',
    },
    {
      icon: 'ri-file-text-line',
      title: 'États des Lieux',
      description: 'Créez des états des lieux détaillés avec photos et signatures électroniques pour sécuriser vos locations et éviter les litiges.',
      color: 'green',
    },
    {
      icon: 'ri-money-euro-circle-line',
      title: 'Paiement en Ligne',
      description: 'Recevez les loyers directement sur votre compte avec notre système de paiement sécurisé et générez automatiquement les quittances.',
      color: 'purple',
    },
  ];

  return (
    <section className="py-10 md:py-20 bg-gray-50">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-12 lg:p-16 shadow-lg">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12 lg:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4">
              Gestion Locative Simplifiée
            </h2>
            <p className="text-sm md:text-base text-gray-600 max-w-[700px] mx-auto leading-relaxed">
              Gérez tous les aspects de vos locations depuis une seule plateforme : visites, états des lieux, paiements des loyers et suivi financier complet
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 md:p-8 rounded-xl md:rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer ${
                  feature.color === 'blue'
                    ? 'bg-blue-50/50'
                    : feature.color === 'green'
                    ? 'bg-green-50/50'
                    : 'bg-purple-50/50'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl mb-4 md:mb-6 ${
                    feature.color === 'blue'
                      ? 'bg-blue-500'
                      : feature.color === 'green'
                      ? 'bg-green-500'
                      : 'bg-purple-500'
                  }`}
                >
                  <i className={`${feature.icon} text-white text-2xl md:text-3xl w-6 h-6 md:w-8 md:h-8 flex items-center justify-center`}></i>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <a
              href="/gestion-locative"
              className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 border-2 border-blue-600 text-blue-600 text-sm md:text-base font-semibold rounded-full hover:bg-blue-600 hover:text-white transition-all cursor-pointer whitespace-nowrap"
            >
              <span className="hidden sm:inline">Découvrir l'outil de gestion</span>
              <span className="sm:hidden">Découvrir</span>
              <i className="ri-arrow-right-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
