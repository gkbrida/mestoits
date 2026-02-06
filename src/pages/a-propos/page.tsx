import { Link } from 'react-router-dom';
import { useState } from 'react';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

export default function AboutPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);


  const values = [
    {
      icon: 'ri-shield-check-line',
      title: 'Transparence',
      description: 'Nous croyons en une information claire et accessible pour tous nos utilisateurs, sans frais cachés ni surprises.'
    },
    {
      icon: 'ri-user-heart-line',
      title: 'Confiance',
      description: 'La sécurité de vos transactions et la protection de vos données sont notre priorité absolue.'
    },
    {
      icon: 'ri-lightbulb-line',
      title: 'Innovation',
      description: 'Nous utilisons les dernières technologies pour simplifier votre recherche et gestion immobilière.'
    },
    {
      icon: 'ri-team-line',
      title: 'Accompagnement',
      description: 'Notre équipe est à votre écoute pour vous guider à chaque étape de votre projet immobilier.'
    }
  ];

  const milestones = [
    { year: 'Q1 2026', title: 'Lancement', description: 'Mise en ligne de la plateforme avec les fonctionnalités de base : recherche, publication d\'annonces et gestion de profil' },
    { year: 'Q2 2026', title: 'Expansion', description: 'Ouverture à toutes les communes d\'Abidjan et intégration de la carte interactive des prix' },
    { year: 'Q3 2026', title: 'Innovation', description: 'Lancement de l\'estimation en ligne et de la gestion locative complète' },
    { year: 'Q4 2026', title: 'Croissance', description: 'Objectif : atteindre 1 000 utilisateurs actifs et 500 professionnels certifiés' },
    { year: '2027', title: 'Leadership', description: 'Devenir la plateforme de référence de l\'immobilier en Côte d\'Ivoire avec plus de 10 000 annonces' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white py-12 sm:py-16 md:py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              Votre partenaire immobilier de confiance
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-teal-50 leading-relaxed px-2">
              Nous révolutionnons le marché immobilier ivoirien en offrant une plateforme moderne, transparente et accessible à tous pour acheter, vendre, louer et gérer vos biens immobiliers en toute sérénité.
            </p>
          </div>
        </div>
      </section>

  

      {/* Mission Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                Notre Mission
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                Nous avons créé cette plateforme avec une vision claire : démocratiser l'accès à l'immobilier en Côte d'Ivoire et rendre chaque transaction simple, sécurisée et transparente.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
                Que vous soyez propriétaire, locataire, acheteur ou professionnel de l'immobilier, nous mettons à votre disposition des outils innovants pour faciliter vos démarches et vous accompagner dans tous vos projets immobiliers.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                Notre engagement est de créer un écosystème immobilier moderne où la confiance, la transparence et l'efficacité sont au cœur de chaque interaction.
              </p>
            </div>
            <div className="relative h-64 sm:h-80 md:h-96 lg:h-full min-h-[300px] sm:min-h-[350px] md:min-h-[400px]">
              <img
                src="https://readdy.ai/api/search-image?query=Modern%20African%20real%20estate%20office%20interior%20with%20professional%20team%20collaborating%20around%20table%20with%20laptops%20and%20documents%2C%20bright%20natural%20lighting%20through%20large%20windows%2C%20contemporary%20workspace%20design%2C%20diverse%20team%20working%20together%2C%20clean%20and%20professional%20atmosphere&width=800&height=600&seq=mission1&orientation=landscape"
                alt="Notre mission"
                className="w-full h-full object-cover rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Nos Valeurs
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto px-4">
              Des principes qui guident chacune de nos actions et décisions pour vous offrir le meilleur service possible.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-lg p-4 sm:p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                  <i className={`${value.icon} text-2xl sm:text-2xl md:text-3xl text-teal-600`}></i>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                  {value.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Notre Vision
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto px-4">
              Un parcours ambitieux tracé pour révolutionner le marché immobilier ivoirien et vous offrir la meilleure expérience possible.
            </p>
          </div>
          <div className="relative">
            {/* Vertical line for desktop */}
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 sm:w-1 bg-teal-200 hidden md:block"></div>
            
            {/* Mobile timeline with left border */}
            <div className="md:hidden absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-teal-200"></div>
            
            <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className="relative">
                  {/* Desktop layout */}
                  <div className={`hidden md:flex items-start ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`flex-1 ${index % 2 === 0 ? 'text-right pr-6 lg:pr-12' : 'text-left pl-6 lg:pl-12'}`}>
                      <div className={`inline-block max-w-md ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                        <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-teal-600 mb-2">
                          {milestone.year}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                          {milestone.title}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Timeline dot */}
                    <div className="relative flex-shrink-0 mx-4 lg:mx-6">
                      <div className="w-4 h-4 lg:w-6 lg:h-6 bg-teal-600 rounded-full border-2 lg:border-4 border-white shadow-lg z-10"></div>
                    </div>
                    
                    {/* Empty space for alternating layout */}
                    <div className="flex-1"></div>
                  </div>
                  
                  {/* Mobile layout */}
                  <div className="md:hidden relative pl-8 sm:pl-12">
                    {/* Timeline dot for mobile */}
                    <div className="absolute left-0 top-0 transform -translate-x-1/2">
                      <div className="w-4 h-4 bg-teal-600 rounded-full border-2 border-white shadow-md z-10"></div>
                    </div>
                    
                    <div>
                      <div className="text-xl sm:text-2xl font-bold text-teal-600 mb-2">
                        {milestone.year}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Nos Services
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto px-4">
              Une gamme complète de services pour répondre à tous vos besoins immobiliers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200 hover:border-teal-500 transition-colors">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <i className="ri-search-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                Recherche de biens
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Trouvez le bien idéal parmi des milliers d'annonces avec nos filtres avancés et notre carte interactive des prix.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200 hover:border-teal-500 transition-colors">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <i className="ri-file-list-3-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                Publication d'annonces
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Publiez vos biens en quelques clics avec notre interface intuitive et touchez des milliers d'acheteurs potentiels.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200 hover:border-teal-500 transition-colors">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <i className="ri-calculator-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                Estimation en ligne
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Obtenez une estimation précise de votre bien en quelques minutes grâce à notre algorithme intelligent.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200 hover:border-teal-500 transition-colors">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <i className="ri-home-gear-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                Gestion locative
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Gérez vos locations, baux, paiements et locataires depuis une interface unique et complète.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200 hover:border-teal-500 transition-colors">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <i className="ri-map-pin-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                Carte des prix
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Consultez les prix du marché par quartier et prenez des décisions éclairées pour vos investissements.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 sm:p-6 md:p-8 border border-gray-200 hover:border-teal-500 transition-colors">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <i className="ri-user-star-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                Réseau de professionnels
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Accédez à notre réseau de professionnels certifiés : agents, notaires, architectes et plus encore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Prêt à commencer votre projet immobilier ?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-teal-50 mb-6 sm:mb-8 leading-relaxed px-4">
            Rejoignez des milliers d'utilisateurs qui nous font confiance pour leurs transactions immobilières.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              to="/deposer-annonce"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-teal-600 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Déposer une annonce
            </Link>
            <Link
              to="/recherche-biens"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-teal-700 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-teal-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Rechercher un bien
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
