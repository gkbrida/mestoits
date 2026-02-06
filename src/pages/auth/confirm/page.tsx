import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function ConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [isAccountDisabled, setIsAccountDisabled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Check URL parameters for confirmation hash
        const hash = window.location.hash;
        let accessToken = null;
        let refreshToken = null;

        // Extract tokens from URL hash
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        }

        // If tokens are present, set the session
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('error');
            return;
          }
        }

        // Check if user is authenticated after confirmation
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        
        if (getUserError) {
          console.error('Error getting user:', getUserError);
          setStatus('error');
          return;
        }

        if (user) {
          // Vérifier le statut is_active de l'utilisateur
          const { data: userData, error: userError } = await supabase
            .from('users_2025_12_01_11_29')
            .select('is_active')
            .eq('id', user.id)
            .single();

          if (userError) {
            console.error('Erreur lors de la vérification du statut utilisateur:', userError);
            // Continuer même en cas d'erreur pour ne pas bloquer la confirmation
          } else if (userData && userData.is_active === false) {
            // Si le compte est désactivé, déconnecter et afficher un message
            await supabase.auth.signOut();
            setStatus('error');
            // Le message d'erreur sera affiché dans le rendu
            return;
          }

          setStatus('success');
          // Redirect to home page after 3 seconds
          const timeoutId = setTimeout(() => {
            navigate('/');
          }, 3000);

          // Cleanup timeout on unmount
          return () => clearTimeout(timeoutId);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
      }
    };

    confirmEmail();
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-[500px] w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Mestoits" 
              className="w-16 h-16"
            />
          </Link>
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-loader-4-line text-teal-600 text-4xl animate-spin w-10 h-10 flex items-center justify-center"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Confirmation en cours...
          </h2>
          <p className="text-base text-gray-600">
            Veuillez patienter pendant que nous confirmons votre email.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-[500px] w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Mestoits" 
              className="w-16 h-16"
            />
          </Link>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-check-line text-green-600 text-4xl w-10 h-10 flex items-center justify-center"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Email confirmé !
          </h2>
          <p className="text-base text-gray-600 mb-8">
            Votre compte a été activé avec succès. Vous allez être redirigé vers la page d'accueil...
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-base font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap"
          >
            Aller à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const checkAccountStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('is_active')
            .eq('id', user.id)
            .single();
          
          if (userData && userData.is_active === false) {
            setIsAccountDisabled(true);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut:', error);
      }
    };

    if (status === 'error') {
      checkAccountStatus();
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-[500px] w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <Link to="/" className="inline-flex items-center justify-center mb-6">
          <img 
            src="/logo.png" 
            alt="Mestoits" 
            className="w-16 h-16"
          />
        </Link>
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="ri-close-line text-red-600 text-4xl w-10 h-10 flex items-center justify-center"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {isAccountDisabled ? 'Compte désactivé' : 'Erreur de confirmation'}
        </h2>
        <p className="text-base text-gray-600 mb-8">
          {isAccountDisabled 
            ? 'Votre compte a été désactivé. Veuillez contacter l\'équipe mestoits.com pour plus d\'informations à contact@mestoits.com'
            : 'Le lien de confirmation est invalide ou a expiré. Veuillez réessayer de vous inscrire.'}
        </p>
        {isAccountDisabled ? (
          <a
            href="mailto:contact@mestoits.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-base font-semibold rounded-lg hover:bg-teal-700 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-mail-line"></i>
            Contacter l'équipe
          </a>
        ) : (
          <Link
            to="/inscription"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-base font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap"
          >
            Retour à l'inscription
          </Link>
        )}
      </div>
    </div>
  );
}
