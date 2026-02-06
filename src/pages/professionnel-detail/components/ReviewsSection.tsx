import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  avatar?: string;
}

interface ReviewsSectionProps {
  professionalId: string;
  rating: number;
  reviewsCount: number;
}

export default function ReviewsSection({ professionalId, rating, reviewsCount }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRating, setCurrentRating] = useState(rating);
  const [currentReviewsCount, setCurrentReviewsCount] = useState(reviewsCount);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');

  useEffect(() => {
    loadReviews();
    loadRatingStats();
    checkUser();
  }, [professionalId]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Charger le nom de l'utilisateur
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (userData?.full_name) {
          setCurrentUserName(userData.full_name);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    }
  };

  const loadRatingStats = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_professional_rating', {
        professional_uuid: professionalId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentRating(parseFloat(data[0].average_rating) || 0);
        setCurrentReviewsCount(data[0].total_reviews || 0);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const loadReviews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('professional_reviews')
        .select('*, users_2025_12_01_11_29!professional_reviews_reviewer_id_fkey(full_name)')
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedReviews: Review[] = (data || []).map((review: any) => ({
        id: review.id,
        author: review.reviewer_name || review.users_2025_12_01_11_29?.full_name || 'Anonyme',
        rating: review.rating,
        date: review.created_at,
        comment: review.comment || ''
      }));

      setReviews(formattedReviews);
    } catch (error) {
      console.error('Erreur lors du chargement des avis:', error);
    } finally {
      setLoading(false);
    }
  };
  const getInitials = (name: string) => {
    // Add error handling for empty or invalid names
    if (!name || typeof name !== 'string') {
      return '?';
    }
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '?';
    
    return parts
      .slice(0, 2) // Take only first two parts for better display
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date invalide';
    }
  };

  const handleSubmitReview = async () => {
    if (!currentUserId || userRating === 0) {
      alert('Veuillez sélectionner une note');
      return;
    }

    if (!currentUserName) {
      alert('Impossible de récupérer votre nom. Veuillez réessayer.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('professional_reviews')
        .insert({
          professional_id: professionalId,
          reviewer_id: currentUserId,
          reviewer_name: currentUserName,
          rating: userRating,
          comment: userComment.trim() || null,
        });

      if (error) {
        console.error('Erreur lors de l\'enregistrement de l\'avis:', error);
        throw error;
      }

      // Réinitialiser le formulaire
      setUserRating(0);
      setUserComment('');
      setShowReviewForm(false);

      // Recharger les avis et les statistiques
      await loadReviews();
      await loadRatingStats();
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement de l\'avis:', error);
      alert(`Erreur lors de l'enregistrement de l'avis: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const safeRating = typeof currentRating === 'number' && currentRating >= 0 ? currentRating : 0;
  const safeReviewsCount = typeof currentReviewsCount === 'number' && currentReviewsCount >= 0 ? currentReviewsCount : 0;

  // Calculer la distribution réelle des notes
  const ratingDistribution = [
    { stars: 5, count: reviews.filter(r => r.rating === 5).length },
    { stars: 4, count: reviews.filter(r => r.rating === 4).length },
    { stars: 3, count: reviews.filter(r => r.rating === 3).length },
    { stars: 2, count: reviews.filter(r => r.rating === 2).length },
    { stars: 1, count: reviews.filter(r => r.rating === 1).length },
  ];

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          <i className="ri-star-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
          Avis clients
        </h2>
        {currentUserId && (
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-600 text-white rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            {showReviewForm ? 'Annuler' : 'Laisser un avis'}
          </button>
        )}
      </div>

      {/* Review Form */}
      {showReviewForm && currentUserId && (
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-50 rounded-lg md:rounded-xl border-2 border-teal-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Votre avis</h3>
          
          {/* Rating Selection */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Note *
            </label>
            <div className="flex items-center gap-1 sm:gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setUserRating(star)}
                  className={`text-2xl sm:text-3xl transition-all ${
                    star <= userRating
                      ? 'text-yellow-400'
                      : 'text-gray-300 hover:text-yellow-300'
                  }`}
                >
                  <i className={`ri-star-${star <= userRating ? 'fill' : 'line'}`}></i>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Commentaire
            </label>
            <textarea
              value={userComment}
              onChange={(e) => setUserComment(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Partagez votre expérience avec ce professionnel..."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-right">
              {userComment.length}/500 caractères
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              onClick={() => {
                setShowReviewForm(false);
                setUserRating(0);
                setUserComment('');
              }}
              className="px-4 sm:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={submitting || userRating === 0}
              className="px-4 sm:px-6 py-2 bg-teal-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
            >
              {submitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  Envoi...
                </>
              ) : (
                <>
                  <i className="ri-send-plane-fill w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  Publier l'avis
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-1 sm:mb-2">{safeRating.toFixed(1)}</div>
          <div className="flex items-center justify-center gap-0.5 sm:gap-1 mb-1 sm:mb-2">
            {[...Array(5)].map((_, i) => (
              <i
                key={i}
                className={`ri-star-${i < Math.floor(safeRating) ? 'fill' : 'line'} text-xl sm:text-2xl text-yellow-400`}
              ></i>
            ))}
          </div>
          <p className="text-sm sm:text-base text-gray-600">Basé sur {safeReviewsCount} avis</p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {ratingDistribution.map((item) => (
            <div key={item.stars} className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-600 w-10 sm:w-12">{item.stars} étoiles</span>
              <div className="flex-1 h-2.5 sm:h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full"
                  style={{ width: safeReviewsCount > 0 ? `${(item.count / safeReviewsCount) * 100}%` : '0%' }}
                ></div>
              </div>
              <span className="text-xs sm:text-sm text-gray-600 w-10 sm:w-12 text-right">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <i className="ri-loader-4-line text-3xl sm:text-4xl text-teal-600 animate-spin"></i>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <i className="ri-star-line text-4xl sm:text-5xl md:text-6xl text-gray-300 mb-3 sm:mb-4"></i>
          <p className="text-sm sm:text-base text-gray-600">Aucun avis pour le moment</p>
        </div>
      ) : (
      <div className="space-y-4 sm:space-y-6">
          {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 last:border-0 pb-4 sm:pb-6 last:pb-0">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex-shrink-0">
                <span className="text-white text-xs sm:text-sm font-semibold">{getInitials(review.author)}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-1 sm:mb-2">
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">{review.author}</h4>
                  <span className="text-xs sm:text-sm text-gray-500">{formatDate(review.date)}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-0.5 sm:gap-1 mb-2 sm:mb-3">
                  {[...Array(5)].map((_, i) => (
                    <i
                      key={i}
                      className={`ri-star-${i < review.rating ? 'fill' : 'line'} text-yellow-400 text-sm sm:text-base`}
                    ></i>
                  ))}
                </div>

                {/* Comment */}
                <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed break-words">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Load More */}
      {reviews.length > 0 && reviews.length >= 10 && (
      <div className="text-center mt-6 sm:mt-8">
        <button className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 text-gray-700 text-sm sm:text-base font-medium rounded-full hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap">
          Voir plus d'avis
        </button>
      </div>
      )}
    </div>
  );
}
