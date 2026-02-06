import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { usePropertyTypes } from '../../../hooks/usePropertyTypes';
import { useOperationTypes } from '../../../hooks/useOperationTypes';
import type { Property } from '../../../contexts/PropertiesCacheContext';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Initialiser avec un placeholder par défaut pour afficher immédiatement
  const hasImages = property.images && Array.isArray(property.images) && property.images.length > 0 && property.images[0];
  const realImageUrl = hasImages && property.images ? property.images[0] : null;
  const placeholderUrl = `https://readdy.ai/api/search-image?query=Modern%20${property.property_type}%20property%20exterior%20with%20clean%20architecture%2C%20bright%20natural%20lighting%2C%20simple%20background%20showcasing%20elegant%20residential%20real%20estate%20for%20listing&width=640&height=480&seq=prop${property.id}&orientation=landscape`;
  const currentImage = realImageUrl || placeholderUrl;

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId && property.id) {
      checkFavorite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, property.id]);

  useEffect(() => {
    // Si on a une image réelle, la charger en arrière-plan
    if (realImageUrl) {
      setImageLoaded(false);
      
      // Précharger l'image
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageLoaded(true); // Garder le placeholder en cas d'erreur
      };
      img.src = realImageUrl;
    } else {
      // Pas d'image réelle, utiliser le placeholder généré
      setImageLoaded(false);
      
      // Précharger le placeholder
      const img = new Image();
      img.onload = () => {
        setImageLoaded(true);
      };
      img.onerror = () => {
        setImageLoaded(true);
      };
      img.src = placeholderUrl;
    }
  }, [realImageUrl, placeholderUrl]);

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

  const checkFavorite = async () => {
    if (!userId || !property.id) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('property_02_id', property.id)
        .limit(1);

      if (error) {
        console.error('Erreur lors de la vérification du favori:', error);
        // Si la colonne property_02_id n'existe pas encore, essayer avec property_id pour compatibilité
        if (error.message && error.message.includes('property_02_id')) {
          console.warn('La colonne property_02_id n\'existe pas encore. Veuillez exécuter la migration SQL.');
        }
        setIsFavorite(false);
        return;
      }
      
      setIsFavorite(data && data.length > 0);
    } catch (error) {
      console.error('Erreur lors de la vérification du favori:', error);
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      window.location.href = '/connexion';
      return;
    }

    if (!property.id) {
      console.error('Property ID is missing');
      return;
    }

    try {
      if (isFavorite) {
        // Essayer de supprimer avec property_02_id
        const { error: error02 } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('property_02_id', property.id);

        if (error02) {
          // Si la colonne n'existe pas, essayer avec property_id pour compatibilité
          if (error02.message && error02.message.includes('property_02_id')) {
            console.warn('La colonne property_02_id n\'existe pas encore. Veuillez exécuter la migration SQL.');
            const { error } = await supabase
              .from('favorites')
              .delete()
              .eq('user_id', userId)
              .eq('property_id', property.id);
            
            if (error) {
              console.error('Erreur lors de la suppression du favori:', error);
              return;
            }
          } else {
            console.error('Erreur lors de la suppression du favori:', error02);
            return;
          }
        }
        setIsFavorite(false);
      } else {
        // Essayer d'ajouter avec property_02_id
        const { error: error02 } = await supabase
          .from('favorites')
          .insert([{
            user_id: userId,
            property_02_id: property.id
          }]);

        if (error02) {
          // Si la colonne n'existe pas, essayer avec property_id pour compatibilité
          if (error02.message && error02.message.includes('property_02_id')) {
            console.warn('La colonne property_02_id n\'existe pas encore. Utilisation de property_id temporairement.');
            const { error } = await supabase
              .from('favorites')
              .insert([{
                user_id: userId,
                property_id: property.id
              }]);
            
            if (error) {
              if (error.code === '23505') {
                setIsFavorite(true);
              } else {
                console.error('Erreur lors de l\'ajout du favori:', error);
              }
              return;
            }
          } else if (error02.code === '23505') {
            // Déjà en favoris
            setIsFavorite(true);
            return;
          } else {
            console.error('Erreur lors de l\'ajout du favori:', error02);
            return;
          }
        }
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageLoaded(true); // Afficher le placeholder même en cas d'erreur
  };

  const { getPropertyTypeLabel } = usePropertyTypes();
  const { getOperationTypeLabel } = useOperationTypes();

  const getDepositorStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      owner: 'Propriétaire direct',
      agent: 'Mandataire',
      developer: 'Promoteur',
    };
    return statuses[status] || status;
  };

  // Image placeholder floutée (SVG avec gradient)
  const placeholderImage = (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400 animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <i className="ri-image-line text-4xl text-gray-500 opacity-50"></i>
      </div>
    </div>
  );

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Passer les données du bien via le state de navigation
    navigate(`/bien/${property.id}`, {
      state: { propertyData: property }
    });
  };

  return (
    <div
      onClick={handleCardClick}
      className="block bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-[200px] sm:h-[220px] md:h-[240px] rounded-t-xl md:rounded-t-2xl overflow-hidden bg-gray-200">
        {/* Placeholder flouté - toujours visible jusqu'à ce que l'image soit chargée */}
        <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}>
          {placeholderImage}
        </div>
        
        {/* Image réelle ou placeholder - se charge en arrière-plan */}
        <img
          src={currentImage}
          alt={property.title}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover object-top transition-opacity duration-300 absolute inset-0 z-10 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
        
  
        {/* Favorite Icon */}
        <button
          onClick={toggleFavorite}
          className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white rounded-full shadow-lg hover:scale-110 transition-transform z-20"
          aria-label="Ajouter aux favoris"
        >
          <i
            className={`${
              isFavorite ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-gray-600'
            } text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center`}
          ></i>
        </button>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 md:p-5">
        {/* Price */}
        <div className="text-sm sm:text-base md:text-lg  font-bold text-gray-900 mb-1 sm:mb-2">
          {property.price.toLocaleString()} FCFA
          {(property as any).operation_type === 'rental' && (
            <span className="text-xs sm:text-sm font-normal"> / mois</span>
          )}
          {(property as any).operation_type === 'short-term-rental' && (
            <span > / nuit</span>
          )}
        </div>

        <div className="text-xs sm:text-sm md:text-base uppercase font-semibold text-gray-500 mb-1 sm:mb-2 line-clamp-2 leading-snug">
          {getPropertyTypeLabel(property.property_type)}
          {' - '}
          {getOperationTypeLabel((property as any).operation_type || 'sale')}
        </div>
    
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          <i className="ri-map-pin-line text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
          {property.city}
        </div>

        {/* Features */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-200">
          {property.bedrooms && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
              <i className="ri-hotel-bed-line text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              {property.bedrooms}
            </div>
          )}
          {property.bathrooms && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
              <i className="ri-drop-line text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              {property.bathrooms}
            </div>
          )}
          {(property.surface_area || property.surface_per_lot) && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
              <i className="ri-ruler-line text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              {property.surface_area ? `${property.surface_area}m²` : property.surface_per_lot ? `${property.surface_per_lot}m²/lot` : ''}
            </div>
          )}
        </div>

        {/* Advertiser type and depositor status */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-gray-500">
          <i className={`${property.offered_by === 'professional' ? 'ri-briefcase-line' : 'ri-user-line'} text-xs sm:text-sm w-3 h-3 sm:w-3.5 sm:h-3.5 flex items-center justify-center`}></i>
          <span>
            {property.offered_by === 'professional' ? 'Professionnel' : 'Particulier'}
            {(property as any).depositor_status && (
              <>
                {' - '}
                {getDepositorStatusLabel((property as any).depositor_status)}
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
