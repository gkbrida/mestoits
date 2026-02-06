import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
interface Listing {
  id: string;
  title: string;
  price: number;
  property_type: string;
  city: string;
  bedrooms?: number;
  surface_area: number;
  images?: string[];
  owner_id: string;
  offered_by: string;
}

export default function LatestListingsSection() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    loadListings();
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadUserFavorites();
    }
  }, [userId]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadListings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties_02')
        .select('id, title, price, property_type, city, bedrooms, surface_area, images, owner_id, offered_by')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des annonces:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('property_02_id, property_id')
        .eq('user_id', userId);

      if (error) throw error;
      // Combiner les deux types de favoris (property_id et property_02_id)
      const allFavorites = (data || []).map(fav => fav.property_02_id || fav.property_id).filter(Boolean);
      setFavorites(allFavorites);
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    if (!userId) {
      window.location.href = '/connexion';
      return;
    }

    const isFavorite = favorites.includes(propertyId);

    try {
      if (isFavorite) {
        // Essayer de supprimer depuis property_02_id d'abord, puis property_id pour compatibilité
        const { error: error02 } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('property_02_id', propertyId);

        if (error02) {
          // Si ça échoue, essayer avec property_id (pour compatibilité avec l'ancienne table)
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('property_id', propertyId);
          if (error) throw error;
        }
        setFavorites(prev => prev.filter(id => id !== propertyId));
      } else {
        // Utiliser property_02_id pour les nouveaux favoris
        const { error } = await supabase
          .from('favorites')
          .insert([{
            user_id: userId,
            property_02_id: propertyId
          }]);

        if (error) throw error;
        setFavorites(prev => [...prev, propertyId]);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error);
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-center py-20">
            <i className="ri-loader-4-line text-5xl text-blue-600 animate-spin"></i>
          </div>
        </div>
      </section>
    );
  }

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      apartment: 'Appartement',
      house: 'Maison',
      villa: 'Villa',
      studio: 'Studio',
      loft: 'Loft',
      duplex: 'Duplex',
      penthouse: 'Penthouse',
      land: 'Terrain'
    };
    return labels[type] || type;
  };

  return (
    <section className="py-10 md:py-20 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-10 gap-4">
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900">Dernières Annonces</h2>
          <a
            href="/recherche-biens"
            className="flex items-center gap-2 text-blue-600 text-sm md:text-base font-semibold hover:gap-3 transition-all cursor-pointer whitespace-nowrap"
          >
            <span className="hidden sm:inline">Voir toutes les annonces</span>
            <span className="sm:hidden">Toutes les annonces</span>
            <i className="ri-arrow-right-line text-lg md:text-xl"></i>
          </a>
        </div>

        {/* Horizontal Scroll Container */}
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <i className="ri-home-line text-6xl text-gray-300 mb-4"></i>
            <p className="text-gray-600">Aucune annonce disponible</p>
          </div>
        ) : (
        <div className="relative">
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 md:pb-6 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {listings.map((listing) => {
                const mainImage = listing.images && listing.images.length > 0
                  ? listing.images[0]
                  : `https://readdy.ai/api/search-image?query=Modern%20${listing.property_type}%20property&width=640&height=480&seq=latest${listing.id}&orientation=landscape`;

                return (
              <div
                key={listing.id}
                    className="flex-shrink-0 w-[280px] md:w-[320px] bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300"
              >
                    <a href={`/bien/${listing.id}`} className="block">
                {/* Image */}
                <div className="relative h-[200px] md:h-[240px] rounded-t-xl md:rounded-t-2xl overflow-hidden">
                  <img
                          src={mainImage}
                    alt={listing.title}
                    className="w-full h-full object-cover object-top"
                  />
                  {/* Price Badge */}
                  <div className="absolute top-3 md:top-4 left-3 md:left-4 px-3 md:px-5 py-2 md:py-3 bg-black/80 backdrop-blur-sm text-white text-xs md:text-sm font-bold rounded-lg">
                          {listing.price.toLocaleString('fr-FR')} FCFA
                  </div>
                  {/* Favorite Icon */}
                  <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFavorite(listing.id);
                          }}
                    className="absolute top-3 md:top-4 right-3 md:right-4 flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                    aria-label="Ajouter aux favoris"
                  >
                    <i
                      className={`${
                        favorites.includes(listing.id)
                          ? 'ri-heart-fill text-red-500'
                          : 'ri-heart-line text-gray-600'
                      } text-lg md:text-xl`}
                    ></i>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 md:p-5">
                  <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                          {getPropertyTypeLabel(listing.property_type)}
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-snug">
                    {listing.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                    <i className="ri-map-pin-line text-sm md:text-base w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                          {listing.city}
                  </div>

                  {/* Features */}
                  <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-gray-200">
                          {listing.bedrooms && (
                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600">
                      <i className="ri-hotel-bed-line text-sm md:text-base w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      {listing.bedrooms}
                    </div>
                          )}
                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600">
                      <i className="ri-ruler-line text-sm md:text-base w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                            {listing.surface_area}m²
                    </div>
                  </div>

                        {/* Advertiser type */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <i className={`${listing.offered_by === 'professional' ? 'ri-briefcase-line' : 'ri-user-line'} text-xs md:text-sm`}></i>
                          <span>{listing.offered_by === 'professional' ? 'Professionnel' : 'Particulier'}</span>
                        </div>
                      </div>
                    </a>
                  </div>
                );
              })}
              </div>
          </div>
        )}
      </div>
    </section>
  );
}
