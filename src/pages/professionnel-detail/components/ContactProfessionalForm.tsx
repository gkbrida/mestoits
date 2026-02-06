import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';

interface Professional {
  id: string;
  full_name: string;
  company_name: string;
  email?: string;
}

interface ContactProfessionalFormProps {
  professional: Professional;
  onClose: () => void;
}

export default function ContactProfessionalForm({ professional, onClose }: ContactProfessionalFormProps) {
  const { sendEmail } = useEmail();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setCurrentUserId(user.id);
        
        // Charger les données utilisateur depuis la table users_2025_12_01_11_29
        const { data: userData, error } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email, phone')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erreur lors du chargement des données utilisateur:', error);
          // Utiliser les données de auth si la table n'a pas de données
          setFormData(prev => ({
            ...prev,
            email: user.email || '',
          }));
        } else if (userData) {
          setFormData({
            name: userData.full_name || '',
            email: userData.email || user.email || '',
            phone: userData.phone || '',
            subject: '',
            message: '',
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!currentUserId) {
        alert('Vous devez être connecté pour envoyer un message.');
        setLoading(false);
        return;
      }

      // Construire le message complet avec le sujet
      const fullMessage = `Sujet: ${formData.subject}\n\n${formData.message}`;

      // Envoyer le message dans la table messages_2025_12_01_11_29
      const { error: messageError } = await supabase
        .from('messages_2025_12_01_11_29')
        .insert({
          sender_id: currentUserId,
          receiver_id: professional.id,
          content: fullMessage,
          property_id: null, // Pas associé à un bien
          read: false,
        });

      if (messageError) {
        console.error('Erreur lors de l\'envoi du message:', messageError);
        throw messageError;
      }

      // Récupérer l'email du professionnel
      const { data: professionalData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('email, full_name')
        .eq('id', professional.id)
        .single();

      const professionalEmail = professionalData?.email || professional.email;

      // Envoyer un email de notification au professionnel
      if (professionalEmail) {
        const emailResult = await sendEmail('nouveau_message', {
          receiverEmail: professionalEmail,
          receiverName: professional.full_name || professional.company_name || 'Professionnel',
          senderName: formData.name || 'Un utilisateur',
          propertyTitle: null, // Pas de bien associé
          messagePreview: formData.message.substring(0, 100),
          appUrl: window.location.origin,
        });

        if (!emailResult.success) {
          console.warn('Email de notification non envoyé:', emailResult.error);
          // Ne pas bloquer l'interface si l'email échoue
        }
      }

      setSuccess(true);
      
      // Fermer le modal après 2 secondes
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(`Une erreur est survenue lors de l'envoi du message: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl md:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex items-center justify-between rounded-t-xl md:rounded-t-3xl">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">Contacter {professional.full_name}</h2>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 break-words">{professional.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer flex-shrink-0 ml-2 sm:ml-4"
          >
            <i className="ri-close-line text-lg sm:text-xl text-gray-600"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
          {loadingUser ? (
            <div className="text-center py-8 sm:py-12">
              <i className="ri-loader-4-line text-3xl sm:text-4xl text-teal-600 animate-spin mb-3 sm:mb-4"></i>
              <p className="text-sm sm:text-base text-gray-600">Chargement de vos informations...</p>
            </div>
          ) : success ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-green-100 rounded-full mx-auto mb-4 sm:mb-6">
                <i className="ri-check-line text-3xl sm:text-4xl text-green-600"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Message envoyé !</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Le professionnel vous répondra dans les plus brefs délais.
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Votre nom *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Jean Dupont"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Votre email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="nom@email.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Votre téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="06 12 34 56 78"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Sujet *
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">Sélectionnez un sujet</option>
                  <option value="achat">Projet d'achat</option>
                  <option value="vente">Projet de vente</option>
                  <option value="estimation">Demande d'estimation</option>
                  <option value="gestion">Gestion locative</option>
                  <option value="investissement">Conseil en investissement</option>
                  <option value="autre">Autre demande</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Votre message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  maxLength={500}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  placeholder="Décrivez votre projet ou votre demande..."
                ></textarea>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                  {formData.message.length}/500 caractères
                </p>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 md:py-4 bg-gray-100 text-gray-700 text-sm sm:text-base font-semibold rounded-lg md:rounded-xl hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 md:py-4 bg-teal-600 text-white text-sm sm:text-base font-semibold rounded-lg md:rounded-xl hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      <span className="hidden sm:inline">Envoi en cours...</span>
                      <span className="sm:hidden">Envoi...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      <span className="hidden sm:inline">Envoyer le message</span>
                      <span className="sm:hidden">Envoyer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
