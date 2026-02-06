import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePropertyTypes } from '../../hooks/usePropertyTypes';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
interface Property {
  id: string;
  title: string;
  price: number;
  city: string;
  property_type: string;
  offer_type?: string;
  operation_type?: string;
  surface_area?: number;
  surface_per_lot?: number;
  bedrooms?: number;
  bathrooms?: number;
  images?: string[];
  price_per_sqm?: number;
  offered_by?: 'professional' | 'individual';
}

export default function FavorisPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [userId, setUserId] = useState<string>('');
  const { getPropertyTypeLabel } = usePropertyTypes();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadFavorites();
    }
  }, [userId]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async () => {
    try {
      setLoading(true);
      
      // Récupérer les favoris avec property_02_id
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('property_02_id')
        .eq('user_id', userId)
        .not('property_02_id', 'is', null)
        .order('created_at', { ascending: false });

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        return;
      }

      // Extraire les IDs des propriétés
      const propertyIds = favoritesData
        .map((fav: any) => fav.property_02_id)
        .filter((id: string) => id !== null && id !== undefined);

      if (propertyIds.length === 0) {
        setFavorites([]);
        return;
      }

      // Charger les propriétés depuis properties_02
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties_02')
        .select('*')
        .in('id', propertyIds)
        .eq('status', 'active');

      if (propertiesError) {
        console.error('Erreur lors du chargement des propriétés:', propertiesError);
        throw propertiesError;
      }

      setFavorites(propertiesData || []);
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (propertyId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('property_02_id', propertyId);

      if (error) throw error;

      // Recharger les favoris pour s'assurer que la liste est à jour
      await loadFavorites();
    } catch (error) {
      console.error('Erreur lors de la suppression du favori:', error);
      alert('Une erreur est survenue lors de la suppression du favori');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="ri-loader-4-line text-5xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas d'utilisateur connecté
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <div className="pt-24 pb-20">
          <div className="max-w-[1600px] mx-auto px-6">
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
              <div className="bg-white rounded-2xl shadow-lg p-12 max-w-[600px] w-full text-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-heart-line text-4xl text-teal-600 w-10 h-10 flex items-center justify-center"></i>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Mes favoris</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Pour sauvegarder vos biens favoris et y accéder facilement, vous devez être connecté à votre compte
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/connexion"
                    className="px-8 py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-login-box-line text-xl w-5 h-5 flex items-center justify-center inline-block mr-2"></i>
                    Se connecter
                  </a>
                  <a
                    href="/inscription"
                    className="px-8 py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-user-add-line text-xl w-5 h-5 flex items-center justify-center inline-block mr-2"></i>
                    Créer un compte
                  </a>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-4">Pourquoi créer un compte ?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Sauvegarder vos biens préférés</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Accès rapide à vos favoris</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Comparer vos biens favoris</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Recevoir des alertes</span>
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

  // Pour les utilisateurs connectés
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <div className="pt-24 pb-20">
        <div className="max-w-[1600px] mx-auto px-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Mes favoris</h1>
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <i className="ri-loader-4-line text-5xl text-teal-600 animate-spin"></i>
                <p className="mt-4 text-gray-600">Chargement...</p>
              </div>
            </div>
          ) : favorites.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <i className="ri-heart-line text-6xl text-gray-300 w-16 h-16 flex items-center justify-center mx-auto mb-4"></i>
            <p className="text-gray-600 text-lg">Vous n'avez pas encore de favoris</p>
            <p className="text-gray-500 mt-2">Parcourez nos annonces et ajoutez vos biens préférés</p>
            <a
              href="/recherche-biens"
              className="inline-block mt-6 px-8 py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Rechercher des biens
            </a>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((property) => {
                const mainImage = property.images && property.images.length > 0
                  ? property.images[0]
                  : `https://readdy.ai/api/search-image?query=Modern%20${property.property_type}%20property%20exterior%20with%20clean%20architecture%2C%20bright%20natural%20lighting%2C%20simple%20background%20showcasing%20elegant%20residential%20real%20estate%20for%20listing&width=640&height=480&seq=fav${property.id}&orientation=landscape`;


                return (
                  <div key={property.id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
                    <a href={`/bien/${property.id}`} className="block">
                      <div className="relative h-[240px] rounded-t-2xl overflow-hidden">
                        <img
                          src={mainImage}
                          alt={property.title}
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute top-4 left-4 px-5 py-3 bg-black/80 backdrop-blur-sm text-white font-bold rounded-lg">
                          {property.price.toLocaleString()} FCFA
                        </div>
                        <button
                          onClick={(e) => handleRemoveFavorite(property.id, e)}
                          className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-lg hover:scale-110 transition-transform z-10"
                          aria-label="Retirer des favoris"
                        >
                          <i className="ri-heart-fill text-xl text-red-500 w-5 h-5 flex items-center justify-center"></i>
                        </button>
                      </div>
                      <div className="p-5">
                        <div className="text-lg uppercase font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
                          {getPropertyTypeLabel(property.property_type)}
                          {property.operation_type === 'sale' 
                            ? ' en vente' 
                            : property.operation_type === 'short-term-rental'
                            ? ' en location courte durée'
                            : property.operation_type === 'rental'
                            ? ' en location'
                            : ''}
                        </div>
                        <h3 className="text-xs tracking-wider text-gray-500 mb-2">
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                          <i className="ri-map-pin-line text-base w-4 h-4 flex items-center justify-center"></i>
                          {property.city}
                        </div>
                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-200">
                          {property.bedrooms && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <i className="ri-hotel-bed-line text-base w-4 h-4 flex items-center justify-center"></i>
                              {property.bedrooms}
                            </div>
                          )}
                          {property.bathrooms && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <i className="ri-drop-line text-base w-4 h-4 flex items-center justify-center"></i>
                              {property.bathrooms}
                            </div>
                          )}
                          {(property.surface_area || property.surface_per_lot) && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <i className="ri-ruler-line text-base w-4 h-4 flex items-center justify-center"></i>
                              {property.surface_area || property.surface_per_lot}m²
                            </div>
                          )}
                        </div>
                        {property.offered_by && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <i className={`${property.offered_by === 'professional' ? 'ri-briefcase-line' : 'ri-user-line'} text-sm w-3.5 h-3.5 flex items-center justify-center`}></i>
                            <span>{property.offered_by === 'professional' ? 'Professionnel' : 'Particulier'}</span>
                          </div>
                        )}
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
