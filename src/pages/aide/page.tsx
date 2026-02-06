import { useState } from 'react';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

export default function AidePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Comment créer un compte sur Mestoits ?',
      answer: 'Pour créer un compte, cliquez sur "Inscription" dans le menu principal. Remplissez le formulaire avec vos informations personnelles (nom, email, mot de passe). Vous recevrez un email de confirmation pour activer votre compte.'
    },
    {
      question: 'Comment déposer une annonce immobilière ?',
      answer: 'Une fois connecté, cliquez sur "Déposer une annonce" dans le menu. Suivez les étapes du formulaire : type de bien, localisation, prix, caractéristiques, photos et informations de contact. Votre annonce sera publiée après validation.'
    },
    {
      question: 'Comment rechercher un bien immobilier ?',
      answer: 'Utilisez la page "Rechercher un bien" accessible depuis le menu principal. Vous pouvez filtrer par type de bien (Villa, Appartement, Appartement-meublé, Terrain), localisation, prix, nombre de pièces et autres critères pour trouver le bien idéal.'
    },
    {
      question: 'Comment fonctionne l\'estimation de bien ?',
      answer: 'L\'outil d\'estimation gratuite vous permet d\'obtenir une estimation du prix de votre bien. Renseignez les informations sur votre propriété (type, localisation, surface, caractéristiques) et notre algorithme vous fournira une estimation basée sur les données du marché.'
    },
    {
      question: 'Comment gérer mes locations en tant que propriétaire ?',
      answer: 'Accédez à "Gérer mes biens" dans le menu. Vous pourrez ajouter vos propriétés, créer des baux, gérer vos locataires, suivre les paiements de loyer et générer des quittances automatiquement.'
    },
    {
      question: 'Comment contacter un propriétaire ou un professionnel ?',
      answer: 'Sur chaque annonce ou profil professionnel, vous trouverez un formulaire de contact. Remplissez-le avec votre message et vos coordonnées. Le propriétaire ou professionnel recevra votre demande et pourra vous répondre directement.'
    },
    {
      question: 'Comment ajouter un bien à mes favoris ?',
      answer: 'Sur chaque annonce, cliquez sur l\'icône cœur pour ajouter le bien à vos favoris. Vous pourrez retrouver tous vos biens favoris dans la section "Mes favoris" accessible depuis le menu.'
    },
    {
      question: 'Comment fonctionne la messagerie ?',
      answer: 'La messagerie vous permet de communiquer directement avec les propriétaires, locataires ou professionnels. Accédez à "Messages" dans le menu pour voir toutes vos conversations. Vous recevrez une notification pour les nouveaux messages.'
    },
    {
      question: 'Quels sont les frais pour publier une annonce ?',
      answer: 'La publication d\'annonces sur Mestoits est gratuite pour les particuliers. Les professionnels peuvent bénéficier d\'offres premium avec des fonctionnalités avancées. Contactez-nous pour plus d\'informations sur les offres professionnelles.'
    },
    {
      question: 'Comment modifier ou supprimer mon annonce ?',
      answer: 'Connectez-vous à votre compte et accédez à "Mes biens". Vous verrez toutes vos annonces avec des options pour les modifier ou les supprimer. Les modifications sont prises en compte immédiatement.'
    },
    {
      question: 'Comment consulter la carte des prix immobiliers ?',
      answer: 'Accédez à "Carte des prix" depuis le menu principal. Cette carte interactive affiche les prix moyens par quartier à Abidjan. Cliquez sur les marqueurs pour voir les détails des prix par localité.'
    },
    {
      question: 'Comment sécuriser mon compte ?',
      answer: 'Utilisez un mot de passe fort et unique. Vous pouvez modifier votre mot de passe dans "Mon profil" > "Sécurité". Ne partagez jamais vos identifiants et déconnectez-vous après chaque session sur un appareil partagé.'
    }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const formBody = new URLSearchParams();
      formBody.append('name', formData.name);
      formBody.append('email', formData.email);
      formBody.append('phone', formData.phone);
      formBody.append('subject', formData.subject);
      formBody.append('message', formData.message);

      const response = await fetch('https://readdy.ai/api/form/d4mug877s74mkk8pe31g', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString()
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 py-12 sm:py-16 md:py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full mx-auto mb-4 sm:mb-6">
              <i className="ri-customer-service-2-line text-4xl sm:text-5xl text-white"></i>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">Centre d'Aide</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto px-4">
              Nous sommes là pour vous aider. Consultez notre FAQ ou contactez-nous directement.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
          {/* Contact Form */}
          <div>
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex-shrink-0">
                  <i className="ri-mail-line text-xl sm:text-2xl text-teal-600"></i>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Contactez-nous</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Nous vous répondrons dans les plus brefs délais</p>
                </div>
              </div>

              <form id="contact-aide-form" data-readdy-form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="Votre nom"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Sujet <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all cursor-pointer"
                  >
                    <option value="">Sélectionnez un sujet</option>
                    <option value="compte">Problème de compte</option>
                    <option value="annonce">Question sur une annonce</option>
                    <option value="paiement">Question sur un paiement</option>
                    <option value="technique">Problème technique</option>
                    <option value="suggestion">Suggestion d'amélioration</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    maxLength={500}
                    rows={5}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                    placeholder="Décrivez votre demande en détail..."
                  ></textarea>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {formData.message.length}/500 caractères
                  </div>
                </div>

                {submitStatus === 'success' && (
                  <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 sm:gap-3">
                    <i className="ri-checkbox-circle-fill text-lg sm:text-xl text-green-600 mt-0.5 flex-shrink-0"></i>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-green-800">Message envoyé avec succès !</p>
                      <p className="text-[10px] sm:text-xs text-green-700 mt-1">Nous vous répondrons dans les plus brefs délais.</p>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 sm:gap-3">
                    <i className="ri-error-warning-fill text-lg sm:text-xl text-red-600 mt-0.5 flex-shrink-0"></i>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-red-800">Erreur lors de l'envoi</p>
                      <p className="text-[10px] sm:text-xs text-red-700 mt-1">Veuillez réessayer plus tard.</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white text-sm sm:text-base font-medium rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <i className="ri-loader-4-line text-lg sm:text-xl animate-spin"></i>
                      <span className="hidden sm:inline">Envoi en cours...</span>
                      <span className="sm:hidden">Envoi...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill text-lg sm:text-xl"></i>
                      <span className="hidden sm:inline">Envoyer le message</span>
                      <span className="sm:hidden">Envoyer</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg mb-3 sm:mb-4">
                  <i className="ri-phone-line text-xl sm:text-2xl text-teal-600"></i>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm">Téléphone</h3>
                <p className="text-xs sm:text-sm text-gray-600">+225 XX XX XX XX XX</p>
              </div>

              <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg mb-3 sm:mb-4">
                  <i className="ri-mail-line text-xl sm:text-2xl text-teal-600"></i>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 text-xs sm:text-sm">Email</h3>
                <p className="text-xs sm:text-sm text-gray-600 break-all">contact@mestoits.com</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-lg flex-shrink-0">
                <i className="ri-question-answer-line text-xl sm:text-2xl text-teal-600"></i>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Questions Fréquentes</h2>
                <p className="text-xs sm:text-sm text-gray-600">Trouvez rapidement des réponses à vos questions</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between p-3 sm:p-4 md:p-5 text-left hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="font-medium text-gray-900 pr-2 sm:pr-4 text-sm sm:text-base">{faq.question}</span>
                    <i className={`ri-arrow-down-s-line text-xl sm:text-2xl text-gray-400 transition-transform flex-shrink-0 ${expandedFaq === index ? 'rotate-180' : ''}`}></i>
                  </button>
                  
                  {expandedFaq === index && (
                    <div className="px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5 pt-0">
                      <div className="border-t border-gray-100 pt-3 sm:pt-4">
                        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Additional Help */}
            <div className="mt-6 sm:mt-8 bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-teal-100">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex-shrink-0">
                  <i className="ri-lightbulb-line text-xl sm:text-2xl text-teal-600"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Vous ne trouvez pas votre réponse ?</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    Notre équipe est disponible pour vous aider. N'hésitez pas à nous contacter via le formulaire ci-contre.
                  </p>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-teal-600">
                    <i className="ri-time-line"></i>
                    <span>Temps de réponse moyen : 24h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
