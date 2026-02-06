import { useState } from 'react';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

export default function ConfidentialitePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-16 sm:pt-20 md:pt-24 pb-12 sm:pb-16 md:pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-teal-100 rounded-full mx-auto mb-4 sm:mb-6">
              <i className="ri-shield-check-line text-3xl sm:text-4xl text-teal-600 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"></i>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">Politique de confidentialité</h1>
            <p className="text-sm sm:text-base text-gray-600 px-4">Dernière mise à jour : 1er décembre 2024</p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
            {/* Introduction */}
            <section>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                La présente politique de confidentialité décrit comment nous collectons, utilisons, stockons et protégeons vos données personnelles lorsque vous utilisez notre plateforme immobilière. Nous nous engageons à protéger votre vie privée et à respecter le Règlement Général sur la Protection des Données (RGPD).
              </p>
            </section>

            {/* Responsable du traitement */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-building-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">1. Responsable du traitement</h2>
              </div>
              <div className="pl-0 sm:pl-13 space-y-2 text-sm sm:text-base text-gray-700">
                <p><strong>Raison sociale :</strong> Mestoits</p>
                <p><strong>Adresse :</strong> Abidjan, Côte d'Ivoire</p>
                <p><strong>Email :</strong> <a href="mailto:contact@mestoits.com" className="text-teal-600 hover:text-teal-700 cursor-pointer break-all">contact@mestoits.com</a></p>
                <p><strong>Téléphone :</strong> <a href="tel:+33769632096" className="text-teal-600 hover:text-teal-700 cursor-pointer">+33 76 96 32 09 6</a></p>
              </div>
            </section>

            {/* Données collectées */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-database-2-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">2. Données collectées</h2>
              </div>
              <div className="pl-0 sm:pl-13 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">2.1 Données d'identification</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                    <li>Nom et prénom</li>
                    <li>Adresse email</li>
                    <li>Numéro de téléphone</li>
                    <li>Adresse postale</li>
                    <li>Date de naissance</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">2.2 Données de connexion</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                    <li>Adresse IP</li>
                    <li>Type de navigateur</li>
                    <li>Pages visitées</li>
                    <li>Date et heure de connexion</li>
                    <li>Cookies et traceurs</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">2.3 Données relatives aux biens immobiliers</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                    <li>Caractéristiques des biens</li>
                    <li>Photos et documents</li>
                    <li>Prix et conditions de vente/location</li>
                    <li>Localisation des biens</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">2.4 Données de paiement</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                    <li>Informations bancaires (via Stripe sécurisé)</li>
                    <li>Historique des transactions</li>
                    <li>Factures et reçus</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Finalités du traitement */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-target-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">3. Finalités du traitement</h2>
              </div>
              <div className="pl-0 sm:pl-13">
                <p className="text-sm sm:text-base text-gray-700 mb-3">Nous utilisons vos données personnelles pour :</p>
                <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                  <li>Créer et gérer votre compte utilisateur</li>
                  <li>Publier et gérer vos annonces immobilières</li>
                  <li>Faciliter la mise en relation entre acheteurs, vendeurs, locataires et propriétaires</li>
                  <li>Traiter vos demandes de contact et de renseignements</li>
                  <li>Gérer les paiements et transactions</li>
                  <li>Fournir le service d'estimation en ligne</li>
                  <li>Gérer la gestion locative</li>
                  <li>Envoyer des notifications et communications importantes</li>
                  <li>Améliorer nos services et votre expérience utilisateur</li>
                  <li>Respecter nos obligations légales et réglementaires</li>
                  <li>Prévenir la fraude et assurer la sécurité de la plateforme</li>
                </ul>
              </div>
            </section>

            {/* Base légale */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-scales-3-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">4. Base légale du traitement</h2>
              </div>
              <div className="pl-0 sm:pl-13 space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700">
                <p><strong>Exécution du contrat :</strong> Le traitement de vos données est nécessaire pour l'exécution du contrat de service que vous avez accepté en créant votre compte.</p>
                <p><strong>Consentement :</strong> Pour certaines finalités (newsletters, communications marketing), nous recueillons votre consentement explicite.</p>
                <p><strong>Intérêt légitime :</strong> Pour améliorer nos services et assurer la sécurité de la plateforme.</p>
                <p><strong>Obligation légale :</strong> Pour respecter nos obligations légales (comptabilité, fiscalité, lutte contre la fraude).</p>
              </div>
            </section>

            {/* Destinataires des données */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-group-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">5. Destinataires des données</h2>
              </div>
              <div className="pl-0 sm:pl-13">
                <p className="text-sm sm:text-base text-gray-700 mb-3">Vos données personnelles peuvent être partagées avec :</p>
                <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                  <li><strong>Utilisateurs de la plateforme :</strong> Les informations de vos annonces sont visibles par les autres utilisateurs</li>
                  <li><strong>Prestataires de services :</strong> Hébergement (Vercel), paiement (Stripe), email (services d'envoi d'emails)</li>
                  <li><strong>Autorités compétentes :</strong> En cas d'obligation légale ou de demande judiciaire</li>
                  <li><strong>Professionnels de l'immobilier :</strong> Si vous contactez un professionnel via la plateforme</li>
                </ul>
                <p className="text-sm sm:text-base text-gray-700 mt-3">Nous ne vendons jamais vos données personnelles à des tiers.</p>
              </div>
            </section>

            {/* Durée de conservation */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-time-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">6. Durée de conservation</h2>
              </div>
              <div className="pl-0 sm:pl-13 space-y-2 text-sm sm:text-base text-gray-700">
                <p><strong>Données de compte :</strong> Conservées pendant toute la durée de votre compte actif, puis 3 ans après la dernière connexion</p>
                <p><strong>Annonces immobilières :</strong> Conservées pendant la durée de publication + 1 an</p>
                <p><strong>Données de paiement :</strong> Conservées conformément aux obligations légales (10 ans)</p>
                <p><strong>Cookies :</strong> Maximum 13 mois</p>
                <p><strong>Données de connexion :</strong> 1 an maximum</p>
              </div>
            </section>

            {/* Sécurité des données */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-lock-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">7. Sécurité des données</h2>
              </div>
              <div className="pl-0 sm:pl-13">
                <p className="text-sm sm:text-base text-gray-700 mb-3">Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :</p>
                <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                  <li>Chiffrement SSL/TLS pour toutes les communications</li>
                  <li>Authentification sécurisée via Supabase</li>
                  <li>Hébergement sécurisé sur des serveurs protégés</li>
                  <li>Accès restreint aux données personnelles</li>
                  <li>Sauvegardes régulières</li>
                  <li>Surveillance et détection des intrusions</li>
                  <li>Formation du personnel à la protection des données</li>
                </ul>
              </div>
            </section>

            {/* Vos droits */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-user-settings-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">8. Vos droits</h2>
              </div>
              <div className="pl-0 sm:pl-13">
                <p className="text-sm sm:text-base text-gray-700 mb-3">Conformément au RGPD, vous disposez des droits suivants :</p>
                <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-sm sm:text-base text-gray-700 ml-2 sm:ml-0">
                  <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données personnelles</li>
                  <li><strong>Droit de rectification :</strong> Corriger vos données inexactes ou incomplètes</li>
                  <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</li>
                  <li><strong>Droit à la limitation :</strong> Limiter le traitement de vos données</li>
                  <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
                  <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
                  <li><strong>Droit de retirer votre consentement :</strong> À tout moment pour les traitements basés sur le consentement</li>
                  <li><strong>Droit de définir des directives post-mortem :</strong> Concernant le sort de vos données après votre décès</li>
                </ul>
                <p className="text-sm sm:text-base text-gray-700 mt-3 sm:mt-4">
                  Pour exercer vos droits, contactez-nous à : <a href="mailto:contact@mestoits.com" className="text-teal-600 hover:text-teal-700 cursor-pointer font-semibold break-all">contact@mestoits.com</a>
                </p>
                <p className="text-sm sm:text-base text-gray-700 mt-2">
                  Vous disposez également du droit d'introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 cursor-pointer break-all">www.cnil.fr</a>
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-cookie-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">9. Cookies et traceurs</h2>
              </div>
              <div className="pl-0 sm:pl-13 space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700">
                <p>Notre site utilise des cookies pour améliorer votre expérience et analyser l'utilisation du site.</p>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Types de cookies utilisés :</h3>
                  <ul className="list-disc list-inside space-y-1 ml-2 sm:ml-0">
                    <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du site (authentification, sécurité)</li>
                    <li><strong>Cookies de performance :</strong> Analyse de l'utilisation du site</li>
                    <li><strong>Cookies fonctionnels :</strong> Mémorisation de vos préférences</li>
                  </ul>
                </div>
                <p>Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur ou notre bandeau de consentement.</p>
              </div>
            </section>

            {/* Transferts internationaux */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-global-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">10. Transferts internationaux</h2>
              </div>
              <div className="pl-0 sm:pl-13 text-sm sm:text-base text-gray-700">
                <p className="mb-3">
                  Certains de nos prestataires peuvent être situés en dehors de l'Union Européenne. Dans ce cas, nous nous assurons que des garanties appropriées sont mises en place :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2 sm:ml-0">
                  <li>Clauses contractuelles types approuvées par la Commission Européenne</li>
                  <li>Certification Privacy Shield (pour les États-Unis)</li>
                  <li>Décisions d'adéquation de la Commission Européenne</li>
                </ul>
              </div>
            </section>

            {/* Modifications */}
            <section>
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-50 rounded-full flex-shrink-0">
                  <i className="ri-refresh-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">11. Modifications de la politique</h2>
              </div>
              <div className="pl-0 sm:pl-13 text-sm sm:text-base text-gray-700">
                <p>
                  Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Les modifications seront publiées sur cette page avec une nouvelle date de mise à jour. Nous vous encourageons à consulter régulièrement cette page pour rester informé de nos pratiques en matière de protection des données.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section className="bg-teal-50 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-full flex-shrink-0">
                  <i className="ri-mail-line text-lg sm:text-xl text-teal-600 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">12. Nous contacter</h2>
              </div>
              <div className="pl-0 sm:pl-13 space-y-2 text-sm sm:text-base text-gray-700">
                <p>Pour toute question concernant cette politique de confidentialité ou l'utilisation de vos données personnelles :</p>
                <p><strong>Délégué à la Protection des Données (DPO) :</strong></p>
                <p>Email : <a href="mailto:contact@mestoits.com" className="text-teal-600 hover:text-teal-700 cursor-pointer font-semibold break-all">contact@mestoits.com</a></p>
                <p>Téléphone : <a href="tel:+33769632096" className="text-teal-600 hover:text-teal-700 cursor-pointer font-semibold">+33 76 96 32 09 6</a></p>
                <p>Adresse : Abidjan, Côte d'Ivoire</p>
              </div>
            </section>
          </div>

          {/* Back to home */}
          <div className="text-center mt-8 sm:mt-12">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap text-sm sm:text-base"
            >
              <i className="ri-home-line w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
              Retour à l'accueil
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
