import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

interface AdvertiserCardProps {
  ownerId: string;
  offeredBy: string;
}

interface Advertiser {
  id: string;
  full_name?: string;
  company_name?: string;
  photo_url?: string;
  avatar_url?: string;
  description?: string;
  rating?: number;
  reviews_count?: number;
  city?: string;
  specialties?: string[];
  user_type?: string;
  is_verified?: boolean;
}

export default function AdvertiserCard({ ownerId, offeredBy }: AdvertiserCardProps) {
  const navigate = useNavigate();
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculatedRating, setCalculatedRating] = useState<number | null>(null);
  const [calculatedReviewsCount, setCalculatedReviewsCount] = useState<number>(0);

  useEffect(() => {
    if (ownerId) {
      loadAdvertiser();
    }
  }, [ownerId]);

  useEffect(() => {
    // Charger le rating calculé si c'est un professionnel
    if (advertiser && (advertiser.user_type === 'professional' || offeredBy === 'professional')) {
      loadRatingStats();
    }
  }, [advertiser, offeredBy]);

  const loadAdvertiser = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users_2025_12_01_11_29')
        .select(`
          id,
          full_name,
          company_name,
          photo_url,
          avatar_url,
          description,
          rating,
          reviews_count,
          city,
          specialties,
          user_type,
          is_verified
        `)
        .eq('id', ownerId)
        .single();

      if (error) {
        console.error('Erreur lors du chargement de l\'annonceur:', error);
        setAdvertiser(null);
      } else {
        setAdvertiser(data);
        console.log('Annonceur chargé:', data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'annonceur:', error);
      setAdvertiser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRatingStats = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_professional_rating', {
        professional_uuid: ownerId
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

  if (loading) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
        <div className="flex items-center justify-center py-6 sm:py-8">
          <i className="ri-loader-4-line text-2xl sm:text-3xl text-gray-400 animate-spin"></i>
        </div>
      </div>
    );
  }

  if (!advertiser) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
        <p className="text-gray-500 text-xs sm:text-sm">Informations de l'annonceur non disponibles</p>
      </div>
    );
  }

  // Déterminer si c'est un professionnel (basé sur user_type ou offeredBy)
  const isProfessional = advertiser.user_type === 'professional' || offeredBy === 'professional';

  const displayName = isProfessional
    ? advertiser.company_name || advertiser.full_name || 'Professionnel'
    : advertiser.full_name || 'Particulier';

  const displayPhoto = advertiser.photo_url || advertiser.avatar_url || null;

  // Utiliser le rating calculé pour les professionnels, sinon utiliser le rating de la table
  const displayRating = isProfessional && calculatedRating !== null 
    ? calculatedRating 
    : advertiser.rating || 0;
  
  const displayReviewsCount = isProfessional && calculatedReviewsCount > 0
    ? calculatedReviewsCount
    : advertiser.reviews_count || 0;

  const handleCardClick = () => {
    if (isProfessional) {
      navigate(`/professionnel/${ownerId}`);
    }
  };

  return (
    <div 
      className={`bg-gradient-to-br from-gray-50 to-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8 border border-gray-100 ${isProfessional ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={handleCardClick}
    >
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Découvrir la page de l'annonceur</h2>
      
      <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
        {/* Photo */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 sm:border-4 border-white shadow-lg">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={displayName}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-3">
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 break-words">{displayName}</h3>
              {offeredBy === 'professional' && advertiser.city && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600">
                  <i className="ri-map-pin-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                  {advertiser.city}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {isProfessional && advertiser.is_verified && (
                <i className="ri-verified-badge-fill text-blue-600 text-base sm:text-lg"></i>
              )}
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
                isProfessional
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {isProfessional ? 'Professionnel' : 'Particulier'}
              </span>
            </div>
          </div>

          {/* Rating */}
          {displayRating > 0 && displayReviewsCount > 0 && (
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="flex items-center gap-0.5 sm:gap-1">
                {[...Array(5)].map((_, i) => (
                  <i
                    key={i}
                    className={`${
                      i < Math.floor(displayRating)
                        ? 'ri-star-fill text-yellow-400'
                        : 'ri-star-line text-gray-300'
                    } text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center`}
                  ></i>
                ))}
              </div>
              <span className="text-xs sm:text-sm font-semibold text-gray-900">{displayRating.toFixed(1)}</span>
              <span className="text-xs sm:text-sm text-gray-500">({displayReviewsCount} avis)</span>
            </div>
          )}

          {/* Specialties */}
          {advertiser.specialties && advertiser.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {advertiser.specialties.slice(0, 3).map((specialty, index) => (
                <span
                  key={index}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] sm:text-xs font-medium"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
