import { useState } from 'react';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

export default function MentionsLegalesPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mx-auto mb-6">
              <i className="ri-file-text-line text-3xl text-teal-600 w-8 h-8 flex items-center justify-center"></i>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Mentions Légales</h1>
            <p className="text-lg text-gray-600">
              Informations légales et réglementaires
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm p-8 md:p-12 space-y-10">
            {/* Éditeur du site */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-building-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Éditeur du site
              </h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Raison sociale :</strong> ImmoConnect SARL
                </p>
                <p>
                  <strong className="text-gray-900">Forme juridique :</strong> Société à Responsabilité Limitée
                </p>
                <p>
                  <strong className="text-gray-900">Capital social :</strong> 50 000 €
                </p>
                <p>
                  <strong className="text-gray-900">Siège social :</strong> 123 Avenue de la République, 75011 Paris, France
                </p>
                <p>
                  <strong className="text-gray-900">SIRET :</strong> 123 456 789 00012
                </p>
                <p>
                  <strong className="text-gray-900">RCS :</strong> Paris B 123 456 789
                </p>
                <p>
                  <strong className="text-gray-900">Numéro de TVA intracommunautaire :</strong> FR 12 123456789
                </p>
                <p>
                  <strong className="text-gray-900">Directeur de la publication :</strong> Jean Dupont
                </p>
                <p>
                  <strong className="text-gray-900">Email :</strong>{' '}
                  <a href="mailto:contact@immoconnect.fr" className="text-teal-600 hover:text-teal-700 cursor-pointer">
                    contact@immoconnect.fr
                  </a>
                </p>
                <p>
                  <strong className="text-gray-900">Téléphone :</strong>{' '}
                  <a href="tel:+33123456789" className="text-teal-600 hover:text-teal-700 cursor-pointer">
                    +33 1 23 45 67 89
                  </a>
                </p>
              </div>
            </section>

            {/* Hébergement */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-server-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Hébergement
              </h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong className="text-gray-900">Hébergeur :</strong> Vercel Inc.
                </p>
                <p>
                  <strong className="text-gray-900">Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
                </p>
                <p>
                  <strong className="text-gray-900">Site web :</strong>{' '}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 cursor-pointer"
                  >
                    https://vercel.com
                  </a>
                </p>
              </div>
            </section>

            {/* Propriété intellectuelle */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-copyright-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Propriété intellectuelle
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  L'ensemble de ce site relève de la législation française et internationale sur le droit d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y compris pour les documents téléchargeables et les représentations iconographiques et photographiques.
                </p>
                <p>
                  La reproduction de tout ou partie de ce site sur un support électronique quel qu'il soit est formellement interdite sauf autorisation expresse du directeur de la publication.
                </p>
                <p>
                  Les marques et logos figurant sur le site sont des marques déposées. Toute reproduction totale ou partielle de ces marques ou de ces logos effectuée à partir des éléments du site sans l'autorisation expresse de ImmoConnect est donc prohibée.
                </p>
              </div>
            </section>

            {/* Protection des données personnelles */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-shield-user-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Protection des données personnelles
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Conformément à la loi n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés, modifiée par la loi n° 2004-801 du 6 août 2004, et au Règlement Général sur la Protection des Données (RGPD) du 27 avril 2016, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
                </p>
                <p>
                  Pour exercer ce droit, vous pouvez nous contacter :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Par email : <a href="mailto:dpo@immoconnect.fr" className="text-teal-600 hover:text-teal-700 cursor-pointer">dpo@immoconnect.fr</a></li>
                  <li>Par courrier : ImmoConnect SARL - Service DPO, 123 Avenue de la République, 75011 Paris, France</li>
                </ul>
                <p>
                  Les informations recueillies sur ce site sont enregistrées dans un fichier informatisé par ImmoConnect pour la gestion des utilisateurs et des annonces immobilières. Elles sont conservées pendant 3 ans et sont destinées au service client et au service technique.
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-cookie-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Cookies
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Ce site utilise des cookies pour améliorer l'expérience utilisateur et réaliser des statistiques de visites. Un cookie est un petit fichier texte déposé sur votre ordinateur lors de la visite d'un site.
                </p>
                <p>
                  <strong className="text-gray-900">Types de cookies utilisés :</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Cookies techniques :</strong> nécessaires au fonctionnement du site (authentification, panier, etc.)</li>
                  <li><strong>Cookies analytiques :</strong> pour mesurer l'audience et améliorer le site</li>
                  <li><strong>Cookies de préférence :</strong> pour mémoriser vos choix (langue, favoris, etc.)</li>
                </ul>
                <p>
                  Vous pouvez à tout moment désactiver les cookies depuis les paramètres de votre navigateur. Cependant, certaines fonctionnalités du site pourraient ne plus être disponibles.
                </p>
              </div>
            </section>

            {/* Responsabilité */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-alert-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Limitation de responsabilité
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  ImmoConnect s'efforce d'assurer au mieux de ses possibilités, l'exactitude et la mise à jour des informations diffusées sur ce site. Toutefois, ImmoConnect ne peut garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition sur ce site.
                </p>
                <p>
                  En conséquence, ImmoConnect décline toute responsabilité :
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur le site</li>
                  <li>Pour tous dommages résultant d'une intrusion frauduleuse d'un tiers ayant entraîné une modification des informations mises à disposition sur le site</li>
                  <li>Pour tous dommages directs ou indirects, quelles qu'en soient les causes, origines, natures ou conséquences, provoqués à raison de l'accès de quiconque au site ou de l'impossibilité d'y accéder</li>
                </ul>
              </div>
            </section>

            {/* Droit applicable */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-scales-3-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Droit applicable et juridiction compétente
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut d'accord amiable, le litige sera porté devant les tribunaux français conformément aux règles de compétence en vigueur.
                </p>
              </div>
            </section>

            {/* Médiation */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-full">
                  <i className="ri-user-voice-line text-xl text-teal-600 w-5 h-5 flex items-center justify-center"></i>
                </div>
                Médiation de la consommation
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Conformément à l'article L.612-1 du Code de la consommation, il est prévu que le consommateur a le droit de recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige qui l'opposerait à un professionnel.
                </p>
                <p>
                  <strong className="text-gray-900">Médiateur compétent :</strong>
                </p>
                <p>
                  Médiateur de la consommation CNPM - MÉDIATION<br />
                  27 avenue de la Libération<br />
                  42400 Saint-Chamond<br />
                  <a href="https://www.cnpm-mediation-consommation.eu" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700 cursor-pointer">
                    www.cnpm-mediation-consommation.eu
                  </a>
                </p>
              </div>
            </section>

            {/* Date de mise à jour */}
            <section className="pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                <strong>Dernière mise à jour :</strong> 1er décembre 2024
              </p>
            </section>
          </div>

          {/* Contact CTA */}
          <div className="mt-12 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-3">Des questions ?</h3>
            <p className="text-teal-50 mb-6 max-w-2xl mx-auto">
              Notre équipe est à votre disposition pour répondre à toutes vos questions concernant nos mentions légales
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="/aide"
                className="px-8 py-3 bg-white text-teal-600 rounded-full font-semibold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Contactez-nous
              </a>
              <a
                href="mailto:contact@immoconnect.fr"
                className="px-8 py-3 bg-teal-600 text-white rounded-full font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Envoyer un email
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
