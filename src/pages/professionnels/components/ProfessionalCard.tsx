import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

interface Professional {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  photo_url: string | null; // Photo de couverture
  avatar_url: string | null; // Photo de profil
  company_name: string;
  profession_type: string | null;
  siret: string;
  professional_card: string;
  company_address: string;
  city: string;
  specialties: string[];
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  description: string;
}

interface ProfessionalCardProps {
  professional: Professional;
}

export default function ProfessionalCard({ professional }: ProfessionalCardProps) {
  const navigate = useNavigate();
  const [showContact, setShowContact] = useState(false);
  const [calculatedRating, setCalculatedRating] = useState<number | null>(null);
  const [calculatedReviewsCount, setCalculatedReviewsCount] = useState<number>(0);
  const [professionTypeLabel, setProfessionTypeLabel] = useState<string | null>(null);

  useEffect(() => {
    // Charger le rating calculé pour les professionnels
    loadRatingStats();
    // Charger le libellé du type de profession
    if (professional.profession_type) {
      loadProfessionTypeLabel();
    }
  }, [professional.id, professional.profession_type]);

  const loadRatingStats = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_professional_rating', {
        professional_uuid: professional.id
      });

      if (error) {
        console.error('Erreur lors du chargement du rating:', error);
        return;
      }

      if (data && data.length > 0) {
        setCalculatedRating(parseFloat(data[0].average_rating) || 0);
        setCalculatedReviewsCount(data[0].total_reviews || 0);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const loadProfessionTypeLabel = async () => {
    if (!professional.profession_type) return;
    
    try {
      const { data, error } = await supabase
        .from('professional_types')
        .select('label')
        .eq('name', professional.profession_type)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du type de profession:', error);
        return;
      }

      if (data) {
        setProfessionTypeLabel(data.label);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du type de profession:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCardClick = () => {
    navigate(`/professionnel/${professional.id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-xl md:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
    >
      {/* Header with Cover Photo */}
      <div className="relative h-36 sm:h-40 md:h-48 p-4 sm:p-5 md:p-6">
        {/* Photo de couverture en arrière-plan */}
        <div className="absolute inset-0 overflow-hidden rounded-t-xl md:rounded-t-2xl">
          {professional.photo_url ? (
            <>
              <img
                src={professional.photo_url}
                alt={`Photo de couverture - ${professional.company_name}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/20"></div>
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600"></div>
          )}
        </div>
        
        <div className="absolute top-2 sm:top-3 md:top-4 right-2 sm:right-3 md:right-4 z-10">
          {professional.is_verified && (
            <div className="bg-white/90 backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full flex items-center gap-1">
              <i className="ri-verified-badge-fill text-blue-600 text-sm sm:text-base"></i>
              <span className="text-[10px] sm:text-xs font-medium text-gray-900">Vérifié</span>
            </div>
          )}
        </div>
        
        {/* Photo de profil */}
        <div className="absolute bottom-0 left-4 sm:left-5 md:left-6 transform translate-y-1/2 z-10">
          {professional.avatar_url ? (
            <img
              src={professional.avatar_url}
              alt={professional.full_name}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl border-2 md:border-4 border-white object-cover shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl md:rounded-2xl border-2 md:border-4 border-white bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                {getInitials(professional.full_name || 'P')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 sm:pt-14 md:pt-16 px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
        {/* Profession Type */}
        {professionTypeLabel && (
          <div className="mb-2 sm:mb-3">
            <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <i className="ri-briefcase-line text-xs sm:text-sm"></i>
              {professionTypeLabel}
            </span>
          </div>
        )}
        
        {/* Name and Company */}
        <div className="mb-3 sm:mb-4">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-0.5 sm:mb-1 line-clamp-2">
            {professional.company_name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 font-medium line-clamp-1">
            {professional.full_name}
          </p>
        </div>

        {/* Rating */}
        {(() => {
          const displayRating = calculatedRating !== null ? calculatedRating : professional.rating || 0;
          const displayReviewsCount = calculatedReviewsCount > 0 ? calculatedReviewsCount : professional.reviews_count || 0;
          
          return displayRating > 0 && displayReviewsCount > 0 ? (
            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`ri-star-${i < Math.floor(displayRating) ? 'fill' : 'line'} text-yellow-400 text-sm sm:text-base`}
                  ></i>
                ))}
              </div>
              <span className="text-xs sm:text-sm text-gray-600">
                {displayRating.toFixed(1)} ({displayReviewsCount} avis)
              </span>
            </div>
          ) : null;
        })()}

        {/* Location */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 mb-3 sm:mb-4">
          <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0">
            <i className="ri-map-pin-line text-sm sm:text-base md:text-lg"></i>
          </div>
          <span className="text-xs sm:text-sm truncate">{professional.city}</span>
        </div>

       

        

        {/* Actions */}
        <div className="flex gap-1.5 sm:gap-2 pt-3 sm:pt-4 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContact(!showContact);
            }}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-blue-600 text-white text-xs sm:text-sm md:text-base font-medium rounded-lg md:rounded-xl hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-phone-line mr-1 sm:mr-2 text-xs sm:text-sm md:text-base"></i>
            Contacter
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 bg-gray-100 text-gray-700 text-xs sm:text-sm md:text-base font-medium rounded-lg md:rounded-xl hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-user-line text-xs sm:text-sm md:text-base"></i>
          </button>
        </div>

        {/* Contact Info */}
        {showContact && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg md:rounded-xl space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
                <i className="ri-phone-line text-blue-600 text-sm sm:text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500">Téléphone</p>
                <a
                  href={`tel:${professional.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs sm:text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer break-all"
                >
                  {professional.phone}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
                <i className="ri-mail-line text-blue-600 text-sm sm:text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500">Email</p>
                <a
                  href={`mailto:${professional.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs sm:text-sm font-medium text-gray-900 hover:text-blue-600 cursor-pointer break-all"
                >
                  {professional.email}
                </a>
              </div>
            </div>
            {professional.company_address && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-100 rounded-lg flex-shrink-0">
                  <i className="ri-map-pin-line text-blue-600 text-sm sm:text-base"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-gray-500">Adresse</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 break-words">
                    {professional.company_address}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
