import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
interface NavbarProps {
  onMenuToggle: () => void;
}

export default function Navbar({ onMenuToggle }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadUnreadCount();
      loadUserProfile();
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

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      if (!currentUserId) return;
      
      const { data, error } = await supabase
        .from('users_2025_12_01_11_29')
        .select('avatar_url, full_name')
        .eq('id', currentUserId)
        .single();

      if (error) throw error;
      
      if (data) {
        setUserAvatar(data.avatar_url || '');
        setUserName(data.full_name || '');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  const getInitials = () => {
    if (userName) {
      return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  const loadUnreadCount = async () => {
    try {
      if (!currentUserId) {
        setUnreadMessages(0);
        return;
      }

      const { count, error } = await supabase
        .from('messages_2025_12_01_11_29')
        .select('id', { count: 'exact', head: true })
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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-lg' : 'bg-white md:bg-transparent'
    }`}>
      <div className="max-w-[1400px] mx-auto px-3 md:px-6 py-2 md:py-4">
        <div className="flex items-center justify-between">
          {/* Left - Logo/Hamburger Menu */}
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={onMenuToggle}
              className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Menu"
            >
              <i className="ri-menu-line text-2xl md:text-2xl text-gray-800"></i>
            </button>
            {/* Logo */}
            <a href="/" className="flex items-center gap-2 md:gap-3 cursor-pointer">
              <img 
                src="/logo.png" 
                alt="Mestoits" 
                className="w-10 h-10 md:w-10 md:h-10"
              />
              <span className="hidden md:block text-lg md:text-xl font-bold text-gray-900">
                Mestoits
              </span>
            </a>
          </div>

          {/* Center - Navigation Tabs - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <div className="relative">
              <button
                onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                className="flex items-center gap-2 text-sm md:text-base font-medium text-gray-600 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Rechercher
                <i className={`ri-arrow-down-s-line text-base md:text-lg transition-transform ${showSearchDropdown ? 'rotate-180' : ''}`}></i>
              </button>
              {showSearchDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl py-2 min-w-[200px] z-50">
                  <a href="/recherche-biens" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                    Rechercher un bien
                  </a>
                  <a href="/professionnels" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                    Rechercher un professionnel
                  </a>
                </div>
              )}
            </div>
            <a href="/agenda" className="text-sm md:text-base font-medium text-gray-600 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap">
              Agenda
            </a>
            <a href="/mes-locations" className="text-sm md:text-base font-medium text-gray-600 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap">
              Mes locations
            </a>
          </div>

          {/* Right - Action Buttons */}
          <div className="flex items-center gap-3 md:gap-3">
            {/* Rechercher un bien - Icon only on mobile */}
            <a
              href="/recherche-biens"
              className="md:hidden flex items-center justify-center w-11 h-11 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Rechercher un bien"
            >
              <i className="ri-search-line text-2xl text-gray-700"></i>
            </a>

            {/* Agenda - Icon only on mobile */}
            <a
              href="/agenda"
              className="md:hidden flex items-center justify-center w-11 h-11 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Agenda"
            >
              <i className="ri-calendar-line text-2xl text-gray-700"></i>
            </a>

            {/* Déposer annonce - Icon only on mobile */}
            <a
              href="/deposer-annonce"
              className="hidden md:flex items-center px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-full hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
              title="Déposer une annonce"
            >
              <span className="hidden lg:inline">Déposer une annonce</span>
              <i className="ri-add-circle-line text-lg lg:hidden"></i>
            </a>
            <a
              href="/deposer-annonce"
              className="md:hidden flex items-center justify-center w-11 h-11 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full hover:shadow-lg transition-all cursor-pointer"
              title="Déposer une annonce"
            >
              <i className="ri-add-circle-line text-2xl text-white"></i>
            </a>

            {/* Gérer mes biens - Desktop only */}
            <a
              href="/gestion-locative"
              className="hidden md:flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap"
              title="Gérer mes biens"
            >
              <i className="ri-building-line text-base md:text-lg"></i>
              <span className="hidden lg:inline">Gérer mes biens</span>
            </a>

            {/* Messages - Desktop only */}
            <a
              href="/messages"
              className="hidden md:relative md:flex items-center justify-center w-10 h-10 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              aria-label="Messages"
            >
              <i className="ri-mail-line text-xl text-gray-700"></i>
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </a>

            {/* Profile - Icon with dropdown */}
            {currentUserId ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="relative flex items-center justify-center w-11 h-11 md:w-10 md:h-10 hover:bg-gray-100 rounded-full transition-colors cursor-pointer overflow-hidden"
                  aria-label="Profil"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Profil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs md:text-sm font-bold">
                      {getInitials()}
                    </div>
                  )}
                  {/* Badge messages non lus - Mobile only */}
                  {unreadMessages > 0 && (
                    <span className="md:hidden absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </button>
                {showProfileDropdown && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl py-2 min-w-[200px] z-50">
                    {/* Messages - Mobile only */}
                    <a
                      href="/profil"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <i className="ri-user-line inline-block mr-2"></i>
                      Mon profil
                    </a>
                    
                    <a
                      href="/favoris"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <i className="ri-heart-line inline-block mr-2"></i>
                      Mes favoris
                    </a>
                    <div className="md:hidden border-t border-gray-200 my-1">
                    <a
                      href="/messages"
                      className="md:hidden flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <div className="flex items-center">
                        <i className="ri-mail-line inline-block mr-2"></i>
                        Messages
                      </div>
                      {unreadMessages > 0 && (
                        <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </a>
                    <a
                      href="/mes-locations"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <i className="ri-home-heart-line inline-block mr-2"></i>
                      Mes locations
                    </a>
                    <a
                      href="/gestion-locative"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <i className="ri-building-line inline-block mr-2"></i>
                      Gérer mes biens
                    </a>
                    </div>
                    
                    <div className="border-t border-gray-200 my-1"></div>
                    <a
                      href="/connexion"
                      onClick={async (e) => {
                        e.preventDefault();
                        await supabase.auth.signOut();
                        window.location.href = '/connexion';
                      }}
                      className="block px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-logout-box-line inline-block mr-2"></i>
                      Déconnexion
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <a
                href="/connexion"
                className="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                aria-label="Connexion"
              >
                <i className="ri-user-line text-2xl md:text-xl text-gray-700"></i>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Close dropdowns when clicking outside */}
      {(showSearchDropdown || showProfileDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowSearchDropdown(false);
            setShowProfileDropdown(false);
          }}
        ></div>
      )}
    </nav>
  );
}
