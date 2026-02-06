import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';

interface ContactFormProps {
  propertyId: string;
}

export default function ContactForm({ propertyId }: ContactFormProps) {
  const { sendEmail } = useEmail();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      setLoadingUser(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
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
    setError('');
    setSuccess(false);

    try {
      // Vérifier que l'utilisateur est connecté
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Vous devez être connecté pour envoyer un message.');
        setLoading(false);
        return;
      }

      // Récupérer les informations du propriétaire et du bien
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties_02')
        .select('owner_id, title')
        .eq('id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      if (!propertyData?.owner_id) {
        setError('Propriétaire du bien introuvable.');
        setLoading(false);
        return;
      }

      // Enregistrer le contact dans la table property_contacts (pour historique)
      const { error: dbError } = await supabase.from('property_contacts').insert({
        property_id: propertyId,
        sender_name: formData.name,
        sender_email: formData.email,
        sender_phone: formData.phone,
        message: formData.message,
      });

      if (dbError) {
        console.warn('Erreur lors de l\'enregistrement dans property_contacts:', dbError);
        // Ne pas bloquer si cette insertion échoue
      }

      // Créer un message dans la table messages_2025_12_01_11_29 pour que la conversation apparaisse
      const { error: messageError } = await supabase
        .from('messages_2025_12_01_11_29')
        .insert({
          sender_id: user.id,
          receiver_id: propertyData.owner_id,
          content: formData.message,
          property_id: propertyId, // Associer le message au bien
          read: false,
        });

      if (messageError) {
        console.error('Erreur lors de la création du message:', messageError);
        throw messageError;
      }

      // Essayer d'envoyer l'email au propriétaire (non bloquant)
      try {
        if (propertyData?.owner_id) {
          const { data: ownerData, error: ownerError } = await supabase
            .from('users_2025_12_01_11_29')
            .select('email, full_name')
            .eq('id', propertyData.owner_id)
            .single();

          if (!ownerError && ownerData?.email) {
            // Envoyer l'email au propriétaire via useEmail
            // Utiliser try-catch pour éviter que l'erreur remonte
            try {
              const emailResult = await sendEmail('contact_annonce', {
                receiverEmail: ownerData.email,
                receiverName: ownerData.full_name || 'Propriétaire',
                senderName: formData.name,
                senderEmail: formData.email,
                senderPhone: formData.phone || '',
                propertyTitle: propertyData.title || 'Bien immobilier',
                propertyId: propertyId,
                message: formData.message,
                appUrl: window.location.origin,
              });

              if (!emailResult.success) {
                // Log silencieux - ne pas afficher d'erreur à l'utilisateur
                // Le contact est toujours enregistré en base de données, c'est l'essentiel
                console.debug('ℹ️ Email non envoyé (serveur non disponible). Le contact a été enregistré.');
              }
            } catch (emailError) {
              // Erreur silencieuse - le serveur email n'est probablement pas disponible
              console.debug('Impossible d\'envoyer l\'email (serveur non disponible). Le contact a été enregistré.');
            }
          }
        }
      } catch (emailError) {
        // Erreur silencieuse - ne pas bloquer l'interface
        console.debug('Erreur lors de l\'envoi de l\'email. Le contact a été enregistré.');
      }

      setSuccess(true);
      setFormData(prev => ({ ...prev, message: '' }));
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du message:', err);
      setError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Contacter le propriétaire</h3>

      {success && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2 text-green-800">
            <i className="ri-check-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            <span className="text-xs sm:text-sm font-medium">Message envoyé avec succès !</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-1.5 sm:gap-2 text-red-800">
            <i className="ri-error-warning-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            <span className="text-xs sm:text-sm font-medium break-words">{error}</span>
          </div>
        </div>
      )}

      {loadingUser ? (
        <div className="text-center py-6 sm:py-8">
          <i className="ri-loader-4-line text-2xl sm:text-3xl text-blue-600 animate-spin mb-3 sm:mb-4"></i>
          <p className="text-gray-600 text-xs sm:text-sm">Chargement de vos informations...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Nom complet *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Votre nom"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            readOnly
            disabled
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-xs sm:text-sm cursor-not-allowed"
            placeholder="votre@email.com"
          />
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Votre email est verrouillé pour des raisons de sécurité</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Téléphone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+33 6 12 34 56 78"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            Message *
          </label>
          <textarea
            required
            rows={4}
            maxLength={500}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Bonjour, je suis intéressé(e) par ce bien..."
          />
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-right">
            {formData.message.length}/500 caractères
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 md:py-4 bg-blue-600 text-white text-xs sm:text-sm md:text-base rounded-lg md:rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          {loading ? (
            <>
              <i className="ri-loader-4-line text-lg sm:text-xl animate-spin w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
              <span className="hidden sm:inline">Envoi en cours...</span>
              <span className="sm:hidden">Envoi...</span>
            </>
          ) : (
            <>
              <i className="ri-send-plane-fill text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
              <span className="hidden sm:inline">Envoyer le message</span>
              <span className="sm:hidden">Envoyer</span>
            </>
          )}
        </button>
      </form>
      )}
    </div>
  );
}
