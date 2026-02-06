import { useState } from 'react';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

export default function CGUPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <i className="ri-file-text-line text-3xl sm:text-4xl text-white w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"></i>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 px-4">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* Section 1 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-information-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">1. Objet</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités et conditions d'utilisation de la plateforme immobilière accessible à l'adresse [votre-site.com] (ci-après "la Plateforme").
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    La Plateforme permet aux utilisateurs de publier, rechercher et consulter des annonces immobilières, de gérer leurs biens locatifs, d'estimer la valeur de leurs biens, et de contacter des professionnels de l'immobilier.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-user-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">2. Acceptation des CGU</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la Plateforme.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Nous nous réservons le droit de modifier les présentes CGU à tout moment. Les modifications entreront en vigueur dès leur publication sur la Plateforme. Il est de votre responsabilité de consulter régulièrement les CGU.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-account-circle-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">3. Inscription et compte utilisateur</h2>
                  
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">3.1 Création de compte</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Pour accéder à certaines fonctionnalités de la Plateforme (publication d'annonces, gestion locative, messagerie), vous devez créer un compte utilisateur en fournissant des informations exactes et à jour.
                  </p>

                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">3.2 Sécurité du compte</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Vous êtes responsable de la confidentialité de vos identifiants de connexion. Toute activité effectuée depuis votre compte est présumée avoir été effectuée par vous.
                  </p>

                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">3.3 Conditions d'inscription</h3>
                  <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 ml-2 sm:ml-4">
                    <li>Être âgé d'au moins 18 ans</li>
                    <li>Fournir des informations exactes et complètes</li>
                    <li>Ne créer qu'un seul compte par personne</li>
                    <li>Ne pas usurper l'identité d'une autre personne</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-home-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">4. Publication d'annonces immobilières</h2>
                  
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">4.1 Contenu des annonces</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Vous vous engagez à publier des annonces conformes à la réalité, contenant des informations exactes et à jour concernant les biens immobiliers proposés.
                  </p>

                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">4.2 Interdictions</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2">Il est strictement interdit de publier des annonces :</p>
                  <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 ml-2 sm:ml-4 mb-3 sm:mb-4">
                    <li>Contenant des informations fausses ou trompeuses</li>
                    <li>Concernant des biens dont vous n'êtes pas propriétaire ou mandataire</li>
                    <li>Violant les droits de propriété intellectuelle de tiers</li>
                    <li>Contenant des contenus illégaux, offensants ou discriminatoires</li>
                    <li>Incluant des coordonnées dans les photos pour contourner la plateforme</li>
                  </ul>

                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">4.3 Modération</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Nous nous réservons le droit de modérer, modifier ou supprimer toute annonce ne respectant pas les présentes CGU, sans préavis ni justification.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 5 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-shield-check-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">5. Responsabilités</h2>
                  
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">5.1 Responsabilité de la Plateforme</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    La Plateforme agit en tant qu'intermédiaire entre les utilisateurs. Nous ne sommes pas partie aux transactions immobilières conclues entre utilisateurs et ne pouvons être tenus responsables des litiges éventuels.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Nous mettons tout en œuvre pour assurer la disponibilité et la sécurité de la Plateforme, mais ne garantissons pas un fonctionnement sans interruption ni erreur.
                  </p>

                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">5.2 Responsabilité des utilisateurs</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2">Vous êtes seul responsable :</p>
                  <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 ml-2 sm:ml-4">
                    <li>Du contenu que vous publiez sur la Plateforme</li>
                    <li>De la véracité des informations fournies</li>
                    <li>Du respect de la législation en vigueur</li>
                    <li>Des transactions que vous effectuez avec d'autres utilisateurs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 6 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-copyright-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">6. Propriété intellectuelle</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Tous les éléments de la Plateforme (textes, images, logos, design, code source) sont protégés par les droits de propriété intellectuelle et appartiennent à la Plateforme ou à ses partenaires.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Toute reproduction, représentation, modification ou exploitation non autorisée est strictement interdite et constitue une contrefaçon sanctionnée par le Code de la propriété intellectuelle.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    En publiant du contenu sur la Plateforme, vous accordez à celle-ci une licence non exclusive, gratuite et mondiale pour utiliser, reproduire et diffuser ce contenu dans le cadre de ses services.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 7 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-lock-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">7. Protection des données personnelles</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Le traitement de vos données personnelles est effectué conformément à notre{' '}
                    <a href="/confidentialite" className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
                      Politique de confidentialité
                    </a>
                    {' '}et au Règlement Général sur la Protection des Données (RGPD).
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition concernant vos données personnelles.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 8 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-money-euro-circle-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">8. Services payants et paiements</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Certains services de la Plateforme peuvent être payants (options de mise en avant, abonnements professionnels, etc.). Les tarifs sont indiqués en euros TTC.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Les paiements sont sécurisés et traités par notre prestataire de paiement Stripe. Nous ne conservons pas vos données bancaires.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Conformément à l'article L.221-18 du Code de la consommation, vous disposez d'un droit de rétractation de 14 jours pour les services payants, sauf si le service a été entièrement exécuté avant la fin du délai.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 9 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-message-3-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">9. Messagerie et communications</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    La Plateforme met à disposition un système de messagerie interne pour faciliter les échanges entre utilisateurs. Vous vous engagez à utiliser ce service de manière respectueuse et conforme à la loi.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-2">Il est interdit d'utiliser la messagerie pour :</p>
                  <ul className="list-disc list-inside text-sm sm:text-base text-gray-700 space-y-1 sm:space-y-2 ml-2 sm:ml-4">
                    <li>Envoyer des messages à caractère commercial non sollicités (spam)</li>
                    <li>Harceler ou menacer d'autres utilisateurs</li>
                    <li>Diffuser des contenus illégaux ou offensants</li>
                    <li>Tenter d'escroquer d'autres utilisateurs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 10 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-calculator-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">10. Outil d'estimation</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    L'outil d'estimation de biens immobiliers fourni sur la Plateforme est donné à titre indicatif uniquement. Les estimations sont basées sur des données de marché et des algorithmes, mais ne constituent pas une expertise officielle.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Nous ne pouvons être tenus responsables des décisions prises sur la base de ces estimations. Pour une évaluation précise, nous vous recommandons de consulter un professionnel de l'immobilier.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 11 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-building-2-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">11. Gestion locative</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Les outils de gestion locative proposés sur la Plateforme sont destinés à faciliter la gestion administrative de vos biens. Ils ne se substituent pas aux obligations légales des propriétaires et locataires.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Vous restez responsable du respect de la législation en vigueur concernant les baux, les loyers, les charges et toutes autres obligations légales liées à la location immobilière.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 12 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-user-unfollow-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">12. Suspension et résiliation</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Nous nous réservons le droit de suspendre ou de résilier votre compte, sans préavis ni indemnité, en cas de violation des présentes CGU, de comportement frauduleux ou de non-respect de la législation en vigueur.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Vous pouvez à tout moment supprimer votre compte depuis votre espace personnel. La suppression entraînera la suppression de vos données personnelles conformément à notre politique de confidentialité.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 13 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-scales-3-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">13. Droit applicable et juridiction</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'efforceront de trouver une solution amiable.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    À défaut d'accord amiable, tout litige relatif à l'interprétation ou à l'exécution des présentes CGU sera soumis aux tribunaux compétents français.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir gratuitement à un médiateur de la consommation en cas de litige. Coordonnées du médiateur : [à compléter].
                  </p>
                </div>
              </div>
            </div>

            {/* Section 14 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-cookie-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">14. Cookies</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    La Plateforme utilise des cookies pour améliorer votre expérience utilisateur, réaliser des statistiques de visite et personnaliser le contenu.
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Vous pouvez à tout moment gérer vos préférences en matière de cookies depuis les paramètres de votre navigateur. Pour plus d'informations, consultez notre{' '}
                    <a href="/confidentialite" className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer">
                      Politique de confidentialité
                    </a>.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 15 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <i className="ri-alert-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">15. Signalement de contenus illicites</h2>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 sm:mb-4">
                    Si vous constatez la présence de contenus illicites ou contraires aux présentes CGU sur la Plateforme, vous pouvez nous le signaler à l'adresse suivante :{' '}
                    <a href="mailto:signalement@votre-site.com" className="text-teal-600 hover:text-teal-700 font-medium cursor-pointer break-all">
                      signalement@votre-site.com
                    </a>
                  </p>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    Nous nous engageons à traiter rapidement tout signalement et à prendre les mesures appropriées.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 text-white">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Des questions sur nos CGU ?</h2>
                <p className="text-teal-50 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg px-4">
                  Notre équipe est à votre disposition pour répondre à toutes vos questions
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                  <a
                    href="mailto:contact@mestoits.com"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white text-teal-600 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-mail-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    <span className="hidden sm:inline">contact@mestoits.com</span>
                    <span className="sm:hidden">Email</span>
                  </a>
                  <a
                    href="tel:+33123456789"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white text-teal-600 rounded-lg sm:rounded-xl text-xs sm:text-sm md:text-base font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-phone-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    <span className="hidden sm:inline">+225 XX XX XX XX XX</span>
                    <span className="sm:hidden">Téléphone</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Related Links */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Documents associés</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <a
                  href="/confidentialite"
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg sm:rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all cursor-pointer"
                >
                  <i className="ri-shield-check-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0"></i>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">Politique de confidentialité</span>
                </a>
                <a
                  href="/mentions-legales"
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg sm:rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all cursor-pointer"
                >
                  <i className="ri-file-list-3-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0"></i>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">Mentions légales</span>
                </a>
                <a
                  href="/aide"
                  className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg sm:rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-all cursor-pointer sm:col-span-2 md:col-span-1"
                >
                  <i className="ri-question-line text-xl sm:text-2xl text-teal-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0"></i>
                  <span className="font-medium text-gray-900 text-sm sm:text-base">Centre d'aide</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
