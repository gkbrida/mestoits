import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

/**
 * Composant pour vérifier périodiquement si le compte utilisateur est actif
 * Déconnecte automatiquement si le compte devient inactif
 */
export function UserActiveStatusChecker() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserActiveStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Vérifier le statut is_active dans la table users_2025_12_01_11_29
        const { data: userData, error } = await supabase
          .from('users_2025_12_01_11_29')
          .select('is_active')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erreur lors de la vérification du statut utilisateur:', error);
          return;
        }

        // Si le compte est désactivé, déconnecter l'utilisateur
        if (userData && userData.is_active === false) {
          // Déconnecter l'utilisateur
          await supabase.auth.signOut();
          
          // Afficher un message et rediriger vers la page de connexion
          alert('Votre compte a été désactivé. Veuillez contacter l\'équipe mestoits.com pour plus d\'informations à contact@mestoits.com');
          navigate('/connexion');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut actif:', error);
      }
    };

    // Vérifier immédiatement
    checkUserActiveStatus();

    // Vérifier périodiquement toutes les 30 secondes
    const interval = setInterval(checkUserActiveStatus, 30000);

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Vérifier immédiatement après la connexion
        checkUserActiveStatus();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null; // Ce composant ne rend rien
}

