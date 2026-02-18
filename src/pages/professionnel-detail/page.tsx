
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import ContactProfessionalForm from './components/ContactProfessionalForm';
import ReviewsSection from './components/ReviewsSection';
import CertificationsSection from './components/CertificationsSection';
interface Professional {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  avatar_url: string | null;
  company_name: string;
  siret: string;
  professional_card: string;
  company_address: string;
  city: string;
  postal_code: string | null;
  specialties: string[];
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  description: string;
  website: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  activity_photos: string[] | null;
  certifications: string[] | null;
  opening_hours: any;
  professional_documents: any;
  logo_url: string | null;
}

export default function ProfessionalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContactForm, setShowContactForm] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [soldProperties, setSoldProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentPhotoList, setCurrentPhotoList] = useState<string[]>([]);

  const openPhotoGallery = (photos: string[], startIndex: number = 0) => {
    if (photos.length === 0) return;
    setCurrentPhotoList(photos);
    setCurrentPhotoIndex(startIndex);
    setShowPhotoGallery(true);
  };

  const goToPreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentPhotoList.length - 1));
  };

  const goToNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev < currentPhotoList.length - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    if (id) {
      fetchProfessional();
      fetchProperties();
    }
  }, [id]);

  useEffect(() => {
    if (!showPhotoGallery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousPhoto();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextPhoto();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPhotoGallery(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPhotoGallery, currentPhotoList.length]);

  const fetchProfessional = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users_2025_12_01_11_29')
        .select(`
          id,
          full_name,
          email,
          phone,
          photo_url,
          avatar_url,
          company_name,
          siret,
          professional_card,
          company_address,
          city,
          postal_code,
          specialties,
          is_verified,
          rating,
          reviews_count,
          description,
          website,
          facebook_url,
          instagram_url,
          linkedin_url,
          tiktok_url,
          youtube_url,
          activity_photos,
          certifications,
          opening_hours,
          professional_documents,
          logo_url,
          user_type
        `)
        .eq('id', id)
        .eq('user_type', 'professional')
        .single();

      if (error) throw error;
      
      if (data) {
        // S'assurer que les valeurs par défaut sont définies
        const professionalData: Professional = {
          id: data.id,
          full_name: data.full_name || 'Nom non renseigné',
          email: data.email || '',
          phone: data.phone || '',
          photo_url: data.photo_url || data.avatar_url || null,
          avatar_url: data.avatar_url || null,
          company_name: data.company_name || '',
          siret: data.siret || '',
          professional_card: data.professional_card || '',
          company_address: data.company_address || '',
          city: data.city || '',
          postal_code: data.postal_code || null,
          specialties: data.specialties || [],
          is_verified: data.is_verified || false,
          rating: data.rating || 0,
          reviews_count: data.reviews_count || 0,
          description: data.description || 'Aucune description disponible.',
          website: data.website || null,
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          linkedin_url: data.linkedin_url || null,
          tiktok_url: data.tiktok_url || null,
          youtube_url: data.youtube_url || null,
          activity_photos: data.activity_photos || null,
          certifications: data.certifications || null,
          opening_hours: data.opening_hours || null,
          professional_documents: data.professional_documents || null,
          logo_url: data.logo_url || null,
        };
        setProfessional(professionalData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du professionnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      if (!id) {
        setLoadingProperties(false);
        return;
      }

      // Charger les biens disponibles (status = 'active') depuis properties_02
      const { data: availableData, error: availableError } = await supabase
        .from('properties_02')
        .select('id, title, price, city, images, operation_type, property_type, surface_area, bedrooms, status, created_at')
        .eq('owner_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);

      if (availableError) {
        console.error('Erreur chargement biens disponibles:', availableError);
        setAvailableProperties([]);
      } else {
        console.log('Biens disponibles chargés:', availableData?.length || 0);
        setAvailableProperties(availableData || []);
      }

      // Charger les biens vendus (status = 'sold') depuis properties_02
      const { data: soldData, error: soldError } = await supabase
        .from('properties_02')
        .select('id, title, price, city, images, operation_type, property_type, surface_area, bedrooms, status, created_at')
        .eq('owner_id', id)
        .eq('status', 'sold')
        .order('created_at', { ascending: false })
        .limit(6);

      if (soldError) {
        console.error('Erreur chargement biens vendus:', soldError);
        setSoldProperties([]);
      } else {
        console.log('Biens vendus chargés:', soldData?.length || 0);
        setSoldProperties(soldData || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des biens:', error);
      setAvailableProperties([]);
      setSoldProperties([]);
    } finally {
      setLoadingProperties(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm sm:text-base text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!professional) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gray-100 rounded-full mb-4 sm:mb-6 mx-auto">
              <i className="ri-user-line text-3xl sm:text-4xl text-gray-400"></i>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Professionnel introuvable</h2>
            <button
              onClick={() => navigate('/professionnels')}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white text-sm sm:text-base font-medium rounded-full hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="pt-16 md:pt-24 pb-12 md:pb-16">
        {/* Cover Photo with Hero Section Overlay */}
        <div className="relative h-48 sm:h-64 md:h-96 w-full overflow-hidden">
          {professional.photo_url ? (
            <>
              <img
                src={professional.photo_url}
                alt={`Photo de couverture - ${professional.company_name}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30"></div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-600"></div>
          )}
          
          {/* Hero Section Content - Superposed */}
          <div className="absolute inset-0 flex items-end">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 w-full pb-4 sm:pb-6 md:pb-8 lg:pb-16">
            <button
              onClick={() => navigate('/professionnels')}
              className="flex items-center gap-1.5 sm:gap-2 text-white/90 hover:text-white mb-4 sm:mb-6 md:mb-8 cursor-pointer whitespace-nowrap text-sm sm:text-base"
            >
              <i className="ri-arrow-left-line text-lg sm:text-xl"></i>
              Retour à la liste
            </button>

            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-8 items-start">
              {/* Photo */}
              <div className="relative">
                {professional.avatar_url ? (
                  <img
                    src={professional.avatar_url}
                    alt={professional.full_name}
                    className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-white object-cover shadow-2xl"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                      {getInitials(professional.full_name)}
                    </span>
                  </div>
                )}
                {professional.is_verified && (
                  <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-white rounded-full p-1 sm:p-2 shadow-lg">
                    <i className="ri-verified-badge-fill text-xl sm:text-2xl md:text-3xl text-teal-600"></i>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl text-white font-bold mb-1 sm:mb-2 break-words">{professional.company_name }</h1>
                <p className="text-base sm:text-lg md:text-xl text-white/90 mb-2 sm:mb-3 md:mb-4 break-words">{professional.full_name}</p>

                {/* Rating */}
                {professional.rating > 0 && (
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {[...Array(5)].map((_, i) => (
                        <i
                          key={i}
                          className={`ri-star-${i < Math.floor(professional.rating) ? 'fill' : 'line'} text-lg sm:text-xl md:text-2xl text-yellow-300`}
                        ></i>
                      ))}
                    </div>
                    <span className="text-base sm:text-lg font-semibold">
                      {professional.rating.toFixed(1)}
                    </span>
                    <span className="text-sm sm:text-base text-white/80">
                      ({professional.reviews_count} avis)
                    </span>
                  </div>
                )}

                {/* Specialties */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                  {professional.specialties?.map((specialty, index) => (
                    <span
                      key={index}
                      className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs sm:text-sm font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg mb-3 sm:mb-4 text-white/90">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex items-center justify-center flex-shrink-0">
                    <i className="ri-map-pin-line text-lg sm:text-xl md:text-2xl"></i>
                  </div>
                  <span className="break-words">
                    {professional.city}
                    {professional.postal_code && ` (${professional.postal_code})`}
                  </span>
                </div>

                {/* CTA */}
                <button
                  onClick={() => setShowContactForm(true)}
                  className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-white text-teal-600 text-sm sm:text-base font-semibold rounded-full hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap shadow-lg"
                >
                  <i className="ri-mail-line mr-1.5 sm:mr-2"></i>
                  Contacter ce professionnel
                </button>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-6 sm:mt-8 md:mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8">
              {/* About */}
              <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                  <i className="ri-information-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
                  À propos
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed">
                  {professional.description}
                </p>
              </div>

              {/* Certifications */}
              <CertificationsSection
                siret={professional.siret}
                professionalCard={professional.professional_card}
                professionalDocuments={professional.professional_documents}
              />

              {/* Activity Photos */}
              {professional.activity_photos && professional.activity_photos.length > 0 && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                    <i className="ri-image-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
                    Photos d'activité
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                    {professional.activity_photos.map((photo, index) => (
                      <div
                        key={index}
                        onClick={() => openPhotoGallery(professional.activity_photos!, index)}
                        className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
                      >
                        <img
                          src={photo}
                          alt={`Photo d'activité ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <i className="ri-fullscreen-line text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications List */}
              {professional.certifications && professional.certifications.length > 0 && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                    <i className="ri-award-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
                    Certifications et formations
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {professional.certifications.map((certification, index) => (
                      <div key={index} className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg md:rounded-xl">
                        <i className="ri-award-fill text-xl sm:text-2xl text-teal-600 flex-shrink-0"></i>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{certification}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opening Hours */}
              {professional.opening_hours && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                    <i className="ri-time-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
                    Horaires d'ouverture
                  </h2>
                  <div className="space-y-2 sm:space-y-3">
                    {Array.isArray(professional.opening_hours) && professional.opening_hours.map((day: any, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 p-3 sm:p-4 bg-gray-50 rounded-lg md:rounded-xl">
                        <span className="text-sm sm:text-base font-semibold text-gray-900">{day.day}</span>
                        {day.closed ? (
                          <span className="text-sm sm:text-base text-gray-500">Fermé</span>
                        ) : (
                          <span className="text-sm sm:text-base text-gray-700">
                            {day.open} - {day.close}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Properties */}
              {loadingProperties ? (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <i className="ri-loader-4-line text-3xl sm:text-4xl text-teal-600 animate-spin"></i>
                  </div>
                </div>
              ) : availableProperties.length > 0 ? (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                    <i className="ri-home-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
                    Biens disponibles ({availableProperties.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {availableProperties.map((property) => (
                      <div
                        key={property.id}
                        onClick={() => navigate(`/bien/${property.id}`)}
                        className="bg-gray-50 rounded-lg md:rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      >
                        {property.images && property.images.length > 0 && (
                          <div className="relative h-40 sm:h-48 w-full">
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-white/90 backdrop-blur-sm text-teal-600 text-[10px] sm:text-xs font-semibold rounded-full">
                                {(property.operation_type || property.offer_type) === 'sale' ? 'Vente' : 'Location'}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="p-3 sm:p-4">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2 line-clamp-2">{property.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                            {property.surface_area && (
                              <span className="flex items-center gap-1">
                                <i className="ri-ruler-line text-xs sm:text-sm"></i>
                                {property.surface_area} m²
                              </span>
                            )}
                            {property.bedrooms && (
                              <span className="flex items-center gap-1">
                                <i className="ri-hotel-bed-line text-xs sm:text-sm"></i>
                                {property.bedrooms}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <i className="ri-map-pin-line text-xs sm:text-sm"></i>
                              {property.city}
                            </span>
                          </div>
                          <p className="text-lg sm:text-xl font-bold text-teal-600">{formatPrice(property.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {availableProperties.length >= 6 && (
                    <div className="text-center mt-4 sm:mt-6">
                      <button
                        onClick={() => navigate(`/search?professional=${professional.id}`)}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white text-sm sm:text-base font-semibold rounded-lg md:rounded-xl hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Voir tous les biens disponibles
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Sold Properties */}
              {!loadingProperties && soldProperties.length > 0 && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                    <i className="ri-checkbox-circle-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
                    Biens vendus ({soldProperties.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {soldProperties.map((property) => (
                      <div
                        key={property.id}
                        className="bg-gray-50 rounded-lg md:rounded-xl overflow-hidden opacity-75"
                      >
                        {property.images && property.images.length > 0 && (
                          <div className="relative h-40 sm:h-48 w-full">
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="w-full h-full object-cover grayscale"
                            />
                            <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                              <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-800/90 backdrop-blur-sm text-white text-[10px] sm:text-xs font-semibold rounded-full">
                                Vendu
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="p-3 sm:p-4">
                          <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2 line-clamp-2">{property.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">
                            {property.surface_area && (
                              <span className="flex items-center gap-1">
                                <i className="ri-ruler-line text-xs sm:text-sm"></i>
                                {property.surface_area} m²
                              </span>
                            )}
                            {property.bedrooms && (
                              <span className="flex items-center gap-1">
                                <i className="ri-hotel-bed-line text-xs sm:text-sm"></i>
                                {property.bedrooms}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <i className="ri-map-pin-line text-xs sm:text-sm"></i>
                              {property.city}
                            </span>
                          </div>
                          <p className="text-lg sm:text-xl font-bold text-gray-600">{formatPrice(property.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {soldProperties.length >= 6 && (
                    <div className="text-center mt-4 sm:mt-6">
                      <button
                        onClick={() => navigate(`/search?professional=${professional.id}&status=sold`)}
                        className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-600 text-white text-sm sm:text-base font-semibold rounded-lg md:rounded-xl hover:bg-gray-700 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Voir tous les biens vendus
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              <ReviewsSection
                professionalId={professional.id}
                rating={professional.rating}
                reviewsCount={professional.reviews_count}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Contact Card */}
              <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 sticky top-20 sm:top-24">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Coordonnées</h3>
                
                <div className="space-y-3 sm:space-y-4">
                  {/* Phone */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
                      <i className="ri-phone-line text-lg sm:text-xl text-teal-600"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">Téléphone</p>
                      <a
                        href={`tel:${professional.phone}`}
                        className="text-sm sm:text-base text-gray-900 font-medium hover:text-teal-600 cursor-pointer break-all"
                      >
                        {professional.phone}
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
                      <i className="ri-mail-line text-lg sm:text-xl text-teal-600"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-gray-500 mb-1">Email</p>
                      <a
                        href={`mailto:${professional.email}`}
                        className="text-sm sm:text-base text-gray-900 font-medium hover:text-teal-600 cursor-pointer break-all"
                      >
                        {professional.email}
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  {(professional.company_address || professional.city) && (
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
                        <i className="ri-map-pin-line text-lg sm:text-xl text-teal-600"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Adresse</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium break-words">
                          {professional.company_address && (
                            <>
                              {professional.company_address}
                              <br />
                            </>
                          )}
                          {professional.city}
                          {professional.postal_code && ` ${professional.postal_code}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {professional.website && (
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
                        <i className="ri-global-line text-lg sm:text-xl text-teal-600"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Site web</p>
                        <a
                          href={professional.website.startsWith('http') ? professional.website : `https://${professional.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm sm:text-base text-gray-900 font-medium hover:text-teal-600 cursor-pointer break-all"
                        >
                          {professional.website}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Social Media Links */}
                  {(professional.facebook_url || professional.instagram_url || professional.linkedin_url || professional.tiktok_url || professional.youtube_url) && (
                    <div className="pt-3 sm:pt-4 border-t border-gray-200">
                      <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">Réseaux sociaux</p>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {professional.facebook_url && (
                          <a
                            href={professional.facebook_url.startsWith('http') ? professional.facebook_url : `https://${professional.facebook_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-lg md:rounded-xl transition-colors cursor-pointer"
                            title="Facebook"
                          >
                            <i className="ri-facebook-fill text-lg sm:text-xl text-blue-600"></i>
                          </a>
                        )}
                        {professional.instagram_url && (
                          <a
                            href={professional.instagram_url.startsWith('http') ? professional.instagram_url : `https://${professional.instagram_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-pink-100 hover:bg-pink-200 rounded-lg md:rounded-xl transition-colors cursor-pointer"
                            title="Instagram"
                          >
                            <i className="ri-instagram-fill text-lg sm:text-xl text-pink-600"></i>
                          </a>
                        )}
                        {professional.linkedin_url && (
                          <a
                            href={professional.linkedin_url.startsWith('http') ? professional.linkedin_url : `https://${professional.linkedin_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-lg md:rounded-xl transition-colors cursor-pointer"
                            title="LinkedIn"
                          >
                            <i className="ri-linkedin-fill text-lg sm:text-xl text-blue-700"></i>
                          </a>
                        )}
                        {professional.tiktok_url && (
                          <a
                            href={professional.tiktok_url.startsWith('http') ? professional.tiktok_url : `https://${professional.tiktok_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-black hover:bg-gray-800 rounded-lg md:rounded-xl transition-colors cursor-pointer"
                            title="TikTok"
                          >
                            <i className="ri-tiktok-fill text-lg sm:text-xl text-white"></i>
                          </a>
                        )}
                        {professional.youtube_url && (
                          <a
                            href={professional.youtube_url.startsWith('http') ? professional.youtube_url : `https://${professional.youtube_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-lg md:rounded-xl transition-colors cursor-pointer"
                            title="YouTube"
                          >
                            <i className="ri-youtube-fill text-lg sm:text-xl text-red-600"></i>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowContactForm(true)}
                  className="w-full mt-4 sm:mt-6 px-4 sm:px-6 py-3 sm:py-4 bg-teal-600 text-white text-sm sm:text-base font-semibold rounded-lg md:rounded-xl hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-mail-send-line mr-1.5 sm:mr-2"></i>
                  Envoyer un message
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Full-screen Photo Gallery */}
      {showPhotoGallery && currentPhotoList.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowPhotoGallery(false)}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
            >
              <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
            </button>

            {currentPhotoList.length > 1 && (
              <button
                onClick={goToPreviousPhoto}
                className="absolute left-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
              >
                <i className="ri-arrow-left-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            )}

            <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
              <img
                src={currentPhotoList[currentPhotoIndex]}
                alt={`Photo d'activité ${currentPhotoIndex + 1} sur ${currentPhotoList.length}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {currentPhotoList.length > 1 && (
              <button
                onClick={goToNextPhoto}
                className="absolute right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
              >
                <i className="ri-arrow-right-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            )}

            {currentPhotoList.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                {currentPhotoIndex + 1} / {currentPhotoList.length}
              </div>
            )}

            {currentPhotoList.length > 1 && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-4xl overflow-x-auto px-4 py-2 bg-black/30 backdrop-blur-sm rounded-lg">
                {currentPhotoList.map((photoUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPhotoIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentPhotoIndex
                        ? 'border-teal-500 scale-110'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img
                      src={photoUrl}
                      alt={`Miniature ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <ContactProfessionalForm
          professional={professional}
          onClose={() => setShowContactForm(false)}
        />
      )}
    </div>
  );
}
