import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    // Vérifier l'état de connexion
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    };

    checkAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        setCurrentUserId(session.user.id);
      } else {
        setCurrentUserId('');
        setUnreadMessages(0);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 10000);
      
      // Écouter les événements de mise à jour des messages non lus
      const handleUnreadUpdate = (event: CustomEvent) => {
        setUnreadMessages(event.detail.count);
      };
      
      window.addEventListener('unreadMessagesUpdated', handleUnreadUpdate as EventListener);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('unreadMessagesUpdated', handleUnreadUpdate as EventListener);
      };
    }
  }, [currentUserId]);


  const loadUnreadCount = async () => {
    try {
      if (!currentUserId) {
        setUnreadMessages(0);
        return;
      }

      const { count, error } = await supabase
        .from('messages_2025_12_01_11_29')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', currentUserId)
        .eq('read', false);

      if (error) {
        console.error('Erreur chargement messages non lus:', error);
        return;
      }

      setUnreadMessages(count || 0);
    } catch (error) {
      console.error('Erreur lors du chargement des messages non lus:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      navigate('/');
      onClose();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        ></div>
      )}

      {/* Side Menu */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with Close Button */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Menu</h2>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-6 pb-6 space-y-2 pt-4">
            {isAuthenticated ? (
              <>
                {/* Section 1: Profil et réservations */}
                <button
                  onClick={() => handleNavigation('/profil')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-user-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Mon profil</span>
                </button>

                <button
                  onClick={() => handleNavigation('/mes-reservations')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-calendar-check-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Mes réservations</span>
                </button>

                <button
                  onClick={() => handleNavigation('/mes-locations')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-home-heart-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Mes locations</span>
                </button>

                <button
                  onClick={() => handleNavigation('/mes-paiements-echelonnes')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-bank-card-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Mes paiements échelonnés</span>
                </button>

                <div className="border-t border-gray-200 my-4"></div>

                {/* Section 2: Gestion */}
                <button
                  onClick={() => handleNavigation('/gestion-locative')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-building-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Gérer mes biens</span>
                </button>

                <button
                  onClick={() => handleNavigation('/messages')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-message-3-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Messages</span>
                  {unreadMessages > 0 && (
                    <span className="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full">{unreadMessages}</span>
                  )}
                </button>

                <button
                  onClick={() => handleNavigation('/agenda')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-calendar-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Agenda</span>
                </button>

                <button
                  onClick={() => handleNavigation('/favoris')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-heart-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Mes favoris</span>
                </button>

                <div className="border-t border-gray-200 my-4"></div>

                {/* Section 3: Recherche et actions */}
                <button
                  onClick={() => handleNavigation('/recherche-biens')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-search-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Rechercher un bien</span>
                </button>

                <button
                  onClick={() => handleNavigation('/professionnels')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-briefcase-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Trouver un professionnel</span>
                </button>

                <button
                  onClick={() => handleNavigation('/deposer-annonce')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-add-circle-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Déposer une annonce</span>
                </button>

                <button
                  onClick={() => handleNavigation('/estimation')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-calculator-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Estimer un bien</span>
                </button>

                <div className="border-t border-gray-200 my-4"></div>

                {/* Section 4: Informations */}
                <Link
                  to="/a-propos"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  onClick={onClose}
                >
                  <i className="ri-information-line text-xl w-6 h-6 flex items-center justify-center"></i>
                  <span className="text-base">À propos</span>
                </Link>

                <button
                  onClick={() => handleNavigation('/aide')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-customer-service-2-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Aide</span>
                </button>

                <div className="border-t border-gray-200 my-4"></div>

                {/* Section 5: Déconnexion */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="ri-logout-box-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">{isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
                </button>
              </>
            ) : (
              <>
                {/* Menu pour utilisateurs non connectés */}
                <button
                  onClick={() => handleNavigation('/recherche-biens')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-search-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Rechercher un bien</span>
                </button>

                <button
                  onClick={() => handleNavigation('/professionnels')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-briefcase-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Trouver un professionnel</span>
                </button>

                <div className="border-t border-gray-200 my-4"></div>

                <Link
                  to="/a-propos"
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  onClick={onClose}
                >
                  <i className="ri-information-line text-xl w-6 h-6 flex items-center justify-center"></i>
                  <span className="text-base">À propos</span>
                </Link>

                <button
                  onClick={() => handleNavigation('/aide')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-customer-service-2-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Aide</span>
                </button>

                <div className="border-t border-gray-200 my-4"></div>

                <button
                  onClick={() => handleNavigation('/connexion')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:shadow-lg transition-all cursor-pointer"
                >
                  <i className="ri-login-box-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Connexion</span>
                </button>

                <button
                  onClick={() => handleNavigation('/inscription')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <i className="ri-user-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
                  <span className="font-medium">Inscription</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}
