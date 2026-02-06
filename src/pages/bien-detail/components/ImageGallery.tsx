import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface ImageGalleryProps {
  images: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  propertyType: string;
  propertyId: string;
  onGalleryOpenChange?: (isOpen: boolean) => void;
}

export default function ImageGallery({
  images,
  videoUrl,
  virtualTourUrl,
  propertyType,
  propertyId,
  onGalleryOpenChange,
}: ImageGalleryProps) {
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [mouseStart, setMouseStart] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId && propertyId) {
      checkFavorite();
    }
  }, [userId, propertyId]);

  useEffect(() => {
    if (onGalleryOpenChange) {
      onGalleryOpenChange(showAllPhotos);
    }
  }, [showAllPhotos, onGalleryOpenChange]);

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
    try {
      // Vérifier d'abord dans property_02_id, puis property_id pour compatibilité
      const { data: data02, error: error02 } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('property_02_id', propertyId)
        .limit(1);

      if (!error02 && data02 && data02.length > 0) {
        setIsFavorite(true);
        return;
      }

      // Vérifier aussi dans property_id pour compatibilité avec l'ancienne table
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('property_id', propertyId)
        .limit(1);

      if (error) {
        console.error('Erreur lors de la vérification du favori:', error);
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

    try {
      if (isFavorite) {
        // Essayer de supprimer depuis property_02_id d'abord
        const { error: error02 } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('property_02_id', propertyId);

        if (error02) {
          // Si ça échoue, essayer avec property_id (pour compatibilité)
          const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', userId)
            .eq('property_id', propertyId);
          
          if (error) {
            console.error('Erreur lors de la suppression du favori:', error);
            setIsFavorite(false);
            return;
          }
        }
        setIsFavorite(false);
      } else {
        // Utiliser property_02_id pour les nouveaux favoris
        const { error } = await supabase
          .from('favorites')
          .insert([{
            user_id: userId,
            property_02_id: propertyId
          }]);

        if (error) {
          if (error.code === '23505') {
            setIsFavorite(true);
          } else {
            console.error('Erreur lors de l\'ajout du favori:', error);
          }
          return;
        }
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des favoris:', error);
    }
  };

  // Générer des images par défaut si aucune image n'est fournie
  const defaultImages = images.length > 0 ? images : [
    `https://readdy.ai/api/search-image?query=Modern%20${encodeURIComponent(propertyType)}%20property%20exterior%20with%20elegant%20architecture%2C%20bright%20natural%20lighting%2C%20simple%20clean%20background%20showcasing%20beautiful%20residential%20real%20estate%20for%20listing&width=1200&height=800&seq=prop${propertyId}1&orientation=landscape`,
    `https://readdy.ai/api/search-image?query=Spacious%20${encodeURIComponent(propertyType)}%20living%20room%20with%20modern%20furniture%2C%20large%20windows%2C%20natural%20light%2C%20simple%20clean%20background%20highlighting%20comfortable%20interior%20space&width=1200&height=800&seq=prop${propertyId}2&orientation=landscape`,
    `https://readdy.ai/api/search-image?query=Contemporary%20${encodeURIComponent(propertyType)}%20kitchen%20with%20modern%20appliances%20and%20clean%20design%2C%20bright%20lighting%2C%20simple%20background%20showcasing%20functional%20cooking%20space&width=1200&height=800&seq=prop${propertyId}3&orientation=landscape`,
    `https://readdy.ai/api/search-image?query=Elegant%20${encodeURIComponent(propertyType)}%20bedroom%20with%20comfortable%20bed%20and%20modern%20decor%2C%20soft%20lighting%2C%20simple%20clean%20background%20emphasizing%20relaxing%20sleeping%20area&width=1200&height=800&seq=prop${propertyId}4&orientation=landscape`,
    `https://readdy.ai/api/search-image?query=Modern%20${encodeURIComponent(propertyType)}%20bathroom%20with%20contemporary%20fixtures%20and%20clean%20design%2C%20bright%20lighting%2C%20simple%20background%20showcasing%20stylish%20sanitary%20space&width=1200&height=800&seq=prop${propertyId}5&orientation=landscape`,
    `https://readdy.ai/api/search-image?query=Beautiful%20${encodeURIComponent(propertyType)}%20outdoor%20space%20with%20garden%20or%20terrace%2C%20natural%20daylight%2C%20simple%20clean%20background%20highlighting%20exterior%20living%20area&width=1200&height=800&seq=prop${propertyId}6&orientation=landscape`,
    `https://readdy.ai/api/search-image?query=Charming%20${encodeURIComponent(propertyType)}%20detail%20view%20showing%20architectural%20features%2C%20natural%20lighting%2C%20simple%20clean%20background%20emphasizing%20property%20quality&width=1200&height=800&seq=prop${propertyId}7&orientation=landscape`,
  ];

  const displayImages = defaultImages;

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setHasSwiped(false);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setHasSwiped(false);
      return;
    }
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && displayImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
      setHasSwiped(true);
    } else if (isRightSwipe && displayImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
      setHasSwiped(true);
    } else {
      setHasSwiped(false);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setMouseStart(e.clientX);
    setHasSwiped(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || mouseStart === null) return;
    setTouchEnd(e.clientX);
  };

  const onMouseUp = () => {
    if (!isDragging || mouseStart === null || touchEnd === null) {
      setIsDragging(false);
      setHasSwiped(false);
      return;
    }
    const distance = mouseStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && displayImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % displayImages.length);
      setHasSwiped(true);
    } else if (isRightSwipe && displayImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
      setHasSwiped(true);
    } else {
      setHasSwiped(false);
    }
    setIsDragging(false);
    setMouseStart(null);
    setTouchEnd(null);
  };

  const handleImageClick = () => {
    if (!hasSwiped) {
      setShowAllPhotos(true);
    }
    setHasSwiped(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
        {/* Main Image */}
        <div 
          className="relative h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] bg-gray-100 select-none cursor-pointer"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onClick={handleImageClick}
        >
          <img
            src={displayImages[currentImageIndex]}
            alt={`Photo ${currentImageIndex + 1}`}
            className="w-full h-full object-cover object-top pointer-events-none"
            draggable={false}
          />

          {/* Favorite Button - Top Right */}
          <button
            onClick={toggleFavorite}
            className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all cursor-pointer z-10"
            aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <i
              className={`${
                isFavorite ? 'ri-heart-fill text-red-500' : 'ri-heart-line text-gray-600'
              } text-lg sm:text-xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center`}
            ></i>
          </button>

          {/* Action Buttons */}
          <div 
            className="absolute bottom-2 sm:bottom-3 md:bottom-4 right-2 sm:right-3 md:right-4 flex flex-wrap items-center gap-2 sm:gap-3 z-10"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-all cursor-pointer whitespace-nowrap text-xs sm:text-sm"
              >
                <i className="ri-video-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                Vidéo
              </a>
            )}
            {virtualTourUrl && (
              <a
                href={virtualTourUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-all cursor-pointer whitespace-nowrap text-xs sm:text-sm"
              >
                <i className="ri-360-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="hidden sm:inline">Visite 3D</span>
                <span className="sm:hidden">3D</span>
              </a>
            )}
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-2 sm:left-3 md:left-4 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-black/70 backdrop-blur-sm text-white text-xs sm:text-sm rounded-lg">
            {currentImageIndex + 1} / {displayImages.length}
          </div>
        </div>

        
      </div>

      {/* Full Screen Gallery Modal */}
      {showAllPhotos && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header */}
          <div 
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-b from-black/80 to-transparent"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="text-white text-sm sm:text-base md:text-lg font-semibold">
              {currentImageIndex + 1} / {displayImages.length}
            </div>
            <button
              onClick={() => setShowAllPhotos(false)}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all cursor-pointer"
              aria-label="Fermer"
            >
              <i className="ri-close-line text-xl sm:text-2xl text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            </button>
          </div>

          {/* Main Image */}
          <div 
            className="relative w-full h-full flex items-center justify-center px-4 sm:px-6 select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <img
              src={displayImages[currentImageIndex]}
              alt={`Photo ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Thumbnail Strip */}
          <div 
            className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 bg-gradient-to-t from-black/80 to-transparent"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide justify-center">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-12 sm:w-18 sm:h-14 md:w-20 md:h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    index === currentImageIndex
                      ? 'border-white ring-2 ring-white/50'
                      : 'border-transparent hover:border-white/50'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Miniature ${index + 1}`}
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
