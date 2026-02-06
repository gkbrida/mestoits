
export default function PostListingSection() {
  return (
    <section className="py-10 md:py-20 bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
          {/* Left - Gradient Background */}
          <div className="w-full md:w-[45%] bg-gradient-to-b from-[#1E3A8A] to-[#3B82F6] relative overflow-hidden p-8 md:p-12 lg:p-16 flex flex-col justify-center min-h-[300px] md:min-h-auto">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url('https://readdy.ai/api/search-image?query=Abstract%20geometric%20pattern%20with%20real%20estate%20icons%20and%20property%20symbols%2C%20modern%20minimalist%20design%2C%20blue%20tones%2C%20clean%20simple%20background%20for%20real%20estate%20platform%20decoration&width=800&height=1000&seq=postlisting1&orientation=portrait')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            ></div>
            <div className="relative z-10 text-center md:text-left">
              <div className="text-xs md:text-sm uppercase tracking-widest text-blue-200 mb-4 md:mb-6">
                Pour les propriétaires
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Déposez<br />
                Votre<br />
                Annonce
              </h2>
            </div>
          </div>

          {/* Right - White Content */}
          <div className="w-full md:w-[55%] bg-white p-6 md:p-12 lg:p-16 flex flex-col justify-center items-center">
            <h3 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 text-center mb-4 md:mb-6 leading-tight">
              Vendez ou Louez<br />
              Votre Bien Rapidement
            </h3>
            <p className="text-sm md:text-base text-gray-600 text-center max-w-[480px] mb-6 md:mb-10 leading-relaxed">
              Publiez votre annonce en quelques minutes et touchez des milliers d'acheteurs et locataires potentiels. Notre plateforme vous offre une visibilité maximale et des outils performants pour gérer vos annonces efficacement.
            </p>

            {/* Advantages List */}
            <div className="space-y-3 md:space-y-4 mb-6 md:mb-10 w-full max-w-[480px]">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex-shrink-0">
                  <i className="ri-eye-line text-blue-600 text-lg md:text-xl w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"></i>
                </div>
                <span className="text-sm md:text-base text-gray-700 font-medium">
                  Visibilité maximale auprès de milliers d'utilisateurs
                </span>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex-shrink-0">
                  <i className="ri-time-line text-green-600 text-lg md:text-xl w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"></i>
                </div>
                <span className="text-sm md:text-base text-gray-700 font-medium">
                  Publication en moins de 5 minutes
                </span>
              </div>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex-shrink-0">
                  <i className="ri-message-3-line text-purple-600 text-lg md:text-xl w-5 h-5 md:w-6 md:h-6 flex items-center justify-center"></i>
                </div>
                <span className="text-sm md:text-base text-gray-700 font-medium">
                  Messagerie intégrée pour échanger avec les intéressés
                </span>
              </div>
            </div>

            <a
              href="/deposer-annonce"
              className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-10 py-3 md:py-5 bg-gray-900 text-white text-sm md:text-base lg:text-lg font-semibold rounded-full hover:bg-gray-800 hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
            >
              Publier mon annonce
              <i className="ri-arrow-right-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
