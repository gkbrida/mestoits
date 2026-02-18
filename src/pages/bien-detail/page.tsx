import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { usePropertiesCache } from '../../contexts/PropertiesCacheContext';
import type { Property } from '../../contexts/PropertiesCacheContext';
import { usePropertyTypes } from '../../hooks/usePropertyTypes';
import { useOperationTypes } from '../../hooks/useOperationTypes';
import { useEmail } from '../../hooks/useEmail';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import ImageGallery from './components/ImageGallery';
import ContactForm from './components/ContactForm';
import ReservationForm from './components/ReservationForm';
import PriceComparison from './components/PriceComparison';
import SimilarProperties from './components/SimilarProperties';
import PartnersSection from './components/PartnersSection';
import CostsDetails from './components/CostsDetails';
import AdvertiserCard from './components/AdvertiserCard';

// Composant pour Description avec "voir plus/voir moins"
function DescriptionSection({ description }: { description: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * 4; // 4 lignes
      setNeedsTruncation(textRef.current.scrollHeight > maxHeight);
    }
  }, [description]);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">Description</h2>
      <p
        ref={textRef}
        className={`text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line ${
          !isExpanded && needsTruncation ? 'line-clamp-4' : ''
        }`}
      >
        {description}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-sm sm:text-base text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
        >
          {isExpanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}

// Composant pour Caractéristiques avec "voir plus/voir moins"
function CharacteristicsSection({ property, conditionLabels, standingLabels, getDepositorStatusLabel, isCommercial, isBuilding, isParking }: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const lineHeight = parseInt(window.getComputedStyle(contentRef.current).lineHeight);
      const maxHeight = lineHeight * 4; // 4 lignes approximatives
      setNeedsTruncation(contentRef.current.scrollHeight > maxHeight);
    }
  }, [property]);

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Caractéristiques</h2>
      <div
        ref={contentRef}
        className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 ${
          !isExpanded && needsTruncation ? 'line-clamp-4' : ''
        }`}
        style={!isExpanded && needsTruncation ? { maxHeight: '8rem', overflow: 'hidden' } : {}}
      >
        {/* État du bien - Pas pour location courte durée */}
        {property.condition && (property as any).operation_type !== 'short-term-rental' && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">État</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {conditionLabels[property.condition]}
            </div>
          </div>
        )}
        {property.standing && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Standing</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {standingLabels[property.standing]}
            </div>
          </div>
        )}
        {property.security_type && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Sécurité</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {property.security_type === 'gated-community' && 'Résidence fermée'}
              {property.security_type === 'security-equipment' && 'Équipement de sécurité'}
              {property.security_type === 'none' && 'Aucune'}
            </div>
          </div>
        )}
        {property.accessibility && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Accessibilité</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {property.accessibility === 'paved' && 'Route bitumée'}
              {property.accessibility === 'unpaved' && 'Voie non bitumée'}
            </div>
          </div>
        )}
        {/* Type de commerce */}
        {isCommercial && (property as any).commerce_type && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Type de commerce</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).commerce_type}
            </div>
          </div>
        )}
        {/* Statut du déposant */}
        {(property as any).depositor_status && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Déposant</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {getDepositorStatusLabel((property as any).depositor_status)}
            </div>
          </div>
        )}
        {/* Réseaux et situation */}
        {(property as any).water_supply !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Eau courante</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).water_supply ? 'Oui' : 'Non'}
            </div>
          </div>
        )}
        {(property as any).electricity !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Électricité</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).electricity ? 'Oui' : 'Non'}
            </div>
          </div>
        )}
        {(property as any).personal_meter !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Compteur personnel</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).personal_meter ? 'Oui' : 'Non'}
            </div>
          </div>
        )}
        {(property as any).in_gated_community !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Situé dans une cité</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).in_gated_community ? 'Oui' : 'Non'}
            </div>
          </div>
        )}
        {/* Détails spécifiques */}
        {(property as any).floor_number !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Numéro d'étage</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).floor_number}
            </div>
          </div>
        )}
        {(property as any).kitchen_closed !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Cuisine fermée</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).kitchen_closed ? 'Oui' : 'Non'}
            </div>
          </div>
        )}
        {(property as any).has_balcony !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Balcon</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).has_balcony ? 'Oui' : 'Non'}
            </div>
          </div>
        )}
        {/* Revenu locatif mensuel (Immeuble) */}
        {isBuilding && (property as any).monthly_rental_income && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Revenu locatif mensuel</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).monthly_rental_income.toLocaleString()} FCFA
            </div>
          </div>
        )}
        {/* Heure d'arrivée - Location courte durée */}
        {(property as any).operation_type === 'short-term-rental' && (property as any).check_in_time && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Heure d'arrivée</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(() => {
                const time = (property as any).check_in_time;
                // Si le format est "HH:mm:ss", prendre seulement "HH:mm"
                if (typeof time === 'string' && time.includes(':')) {
                  return time.substring(0, 5); // Prendre les 5 premiers caractères (HH:mm)
                }
                return time;
              })()}
            </div>
          </div>
        )}
        {/* Heure de départ - Location courte durée */}
        {(property as any).operation_type === 'short-term-rental' && (property as any).check_out_time && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Heure de départ</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(() => {
                const time = (property as any).check_out_time;
                // Si le format est "HH:mm:ss", prendre seulement "HH:mm"
                if (typeof time === 'string' && time.includes(':')) {
                  return time.substring(0, 5); // Prendre les 5 premiers caractères (HH:mm)
                }
                return time;
              })()}
            </div>
          </div>
        )}
       
        {/* Immeuble occupé */}
        {isBuilding && (property as any).building_occupied !== undefined && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Occupé</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).building_occupied ? 'Oui' : 'Non'}
            </div>
          </div>
        )}
        {/* Année de construction (Immeuble) */}
        {isBuilding && (property as any).construction_year && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Année de construction</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).construction_year}
            </div>
          </div>
        )}
        {/* Usage parking */}
        {isParking && (property as any).parking_usage && (
          <div>
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Usage</div>
            <div className="text-sm sm:text-base font-semibold text-gray-900">
              {(property as any).parking_usage === 'residential' ? 'Résidentiel' : 'Commercial'}
            </div>
          </div>
        )}
      </div>
      {needsTruncation && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-sm sm:text-base text-teal-600 hover:text-teal-700 font-semibold cursor-pointer"
        >
          {isExpanded ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </div>
  );
}

export default function BienDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getProperty, setProperty: setCachedProperty } = usePropertiesCache();
  const { getPropertyTypeLabel } = usePropertyTypes();
  const { getOperationTypeLabel } = useOperationTypes();
  const { sendEmail } = useEmail();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [ownerPhone, setOwnerPhone] = useState('');
  const [cityName, setCityName] = useState<string>('');
  const [showStickyButton, setShowStickyButton] = useState(true);
  const reservationFormRef = useRef<HTMLDivElement>(null);
  const contactFormRef = useRef<HTMLDivElement>(null);

  // Gérer le retour après paiement Stripe pour les réservations
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const reservationId = searchParams.get('reservation');

    if (paymentStatus === 'success' && reservationId) {
      console.log('✅ PAIEMENT RÉSERVATION RÉUSSI DÉTECTÉ');
      console.log('📝 Détails de la réservation temporaire:', reservationId);
      
      (async () => {
        try {
          // 1. Récupérer la réservation temporaire
          const { data: tempData, error: fetchError } = await supabase
            .from('reservations_temp')
            .select('property_id, owner_id, guest_name, guest_email, guest_phone, start_date, end_date, nights, total_amount')
            .eq('id', reservationId)
            .single();

          if (fetchError || !tempData) {
            console.error('❌ Réservation temporaire introuvable:', fetchError);
            alert('Le paiement a été effectué mais la réservation temporaire est introuvable. Veuillez contacter le support.');
            return;
          }

          // 2. Insérer dans reservations (confirmée)
          const { data: newReservation, error: insertError } = await supabase
            .from('reservations')
            .insert([{
              property_id: tempData.property_id,
              owner_id: tempData.owner_id,
              guest_name: tempData.guest_name,
              guest_email: tempData.guest_email,
              guest_phone: tempData.guest_phone || null,
              start_date: tempData.start_date,
              end_date: tempData.end_date,
              nights: tempData.nights,
              total_amount: tempData.total_amount,
              status: 'confirmed',
            }])
            .select('id')
            .single();

          if (insertError || !newReservation) {
            console.error('❌ Erreur lors de l\'insertion dans reservations:', insertError);
            alert('Le paiement a été effectué mais une erreur est survenue. Veuillez contacter le support.');
            return;
          }

          // 3. Supprimer la réservation temporaire
          await supabase.from('reservations_temp').delete().eq('id', reservationId);

          const confirmedId = newReservation.id;

          // Traiter la commission
          try {
            const { processCommission } = await import('../../utils/commissionUtils');
            const { data: { user } } = await supabase.auth.getUser();
            await processCommission(
              'reservation',
              confirmedId,
              user?.id || null,
              parseFloat(String(tempData.total_amount))
            );
          } catch (commissionError) {
            console.error('⚠️ Erreur lors du traitement de la commission:', commissionError);
          }

          alert('✅ Réservation confirmée ! Votre paiement a été effectué avec succès.');

          // Envoyer un email au propriétaire
          try {
            const reservationData = { ...tempData, id: confirmedId };
            const { data: ownerData } = await supabase
              .from('users_2025_12_01_11_29')
              .select('full_name, email, phone')
              .eq('id', reservationData.owner_id)
              .single();

            const { data: propertyData } = await supabase
              .from('properties_02')
              .select('title')
              .eq('id', reservationData.property_id)
              .single();

            if (ownerData?.email) {
              const formatDate = (dateString: string) => {
                return new Date(dateString).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                });
              };

              const formatPrice = (amount: number) => {
                return new Intl.NumberFormat('fr-FR').format(amount);
              };

              const confirmationMessage = `Bonjour ${ownerData.full_name || 'Propriétaire'},

La réservation pour votre bien "${propertyData?.title || 'Bien immobilier'}" a été confirmée suite au paiement effectué.

Détails de la réservation confirmée :
- Client : ${reservationData.guest_name}
- Email : ${reservationData.guest_email}
${reservationData.guest_phone ? `- Téléphone : ${reservationData.guest_phone}` : ''}
- Dates : Du ${formatDate(reservationData.start_date)} au ${formatDate(reservationData.end_date)}
- Nombre de nuits : ${reservationData.nights}
- Montant total : ${formatPrice(parseFloat(reservationData.total_amount))} FCFA
- Statut : Confirmée

La réservation est maintenant confirmée et le paiement a été reçu.

Cordialement,
L'équipe Mestoits`;

              await sendEmail('contact_annonce', {
                receiverEmail: ownerData.email,
                receiverName: ownerData.full_name || 'Propriétaire',
                senderName: reservationData.guest_name,
                senderEmail: reservationData.guest_email,
                senderPhone: reservationData.guest_phone,
                propertyTitle: propertyData?.title || 'Bien immobilier',
                propertyId: reservationData.property_id,
                message: confirmationMessage,
                appUrl: window.location.origin,
              });
            }
          } catch (emailError) {
            console.error('⚠️ Erreur lors de l\'envoi de l\'email de confirmation au propriétaire:', emailError);
          }
        } catch (error) {
          console.error('❌ Erreur lors de la mise à jour de la réservation:', error);
          alert('Le paiement a été effectué mais une erreur est survenue lors de la mise à jour. Veuillez contacter le support.');
        }
      })();

      // Nettoyer les paramètres d'URL après un court délai
      setTimeout(() => {
        setSearchParams({});
      }, 100);
    } else if (paymentStatus === 'cancelled' && reservationId) {
      console.log('❌ PAIEMENT RÉSERVATION ANNULÉ');
      alert('Le paiement a été annulé. Vous pouvez réessayer à tout moment.');
      
      // Nettoyer les paramètres d'URL après un court délai
      setTimeout(() => {
        setSearchParams({});
      }, 100);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (id) {
      // Priorité 1: Données passées via location.state (navigation depuis la recherche)
      const passedPropertyData = location.state?.propertyData as Property | undefined;
      
      // Priorité 2: Données du cache
      const cachedProperty = getProperty(id);
      
      // Priorité 3: Charger depuis Supabase
      
      if (passedPropertyData && passedPropertyData.id === id) {
        // Utiliser les données passées immédiatement pour afficher la page
        console.log('Utilisation des données passées depuis la recherche:', passedPropertyData);
        const enrichedProperty: Property = {
          ...passedPropertyData,
          description: passedPropertyData.description || '',
          address: passedPropertyData.address || '',
          views_count: passedPropertyData.views_count || 0,
          favorites_count: passedPropertyData.favorites_count || 0,
        };
        setProperty(enrichedProperty);
        setLoading(false);
        
        // Mettre en cache
        setCachedProperty(enrichedProperty);
        
        // Charger les données complètes depuis Supabase en arrière-plan pour mettre à jour
        loadProperty();
        
        // Charger la ville depuis localities
        if (enrichedProperty.city) {
          loadCityName(enrichedProperty.city);
        }
      } else if (cachedProperty) {
        // Utiliser les données du cache immédiatement
        console.log('Utilisation des données du cache:', cachedProperty);
        setProperty(cachedProperty);
        setLoading(false);
        
        // Charger depuis Supabase en arrière-plan pour mettre à jour si nécessaire
        loadProperty();
        
        // Charger la ville depuis localities
        if (cachedProperty.city) {
          loadCityName(cachedProperty.city);
        }
      } else {
        // Pas de données disponibles, charger depuis Supabase
        loadProperty();
      }
      
      incrementViews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadCityName = async (commune: string) => {
    try {
      const { data, error } = await supabase
        .from('localities')
        .select('villes')
        .eq('commune', commune)
        .limit(1)
        .single();

      if (error) {
        console.error('Erreur lors du chargement de la ville:', error);
        // En cas d'erreur, utiliser la commune comme fallback
        setCityName(commune);
        return;
      }

      if (data && data.villes) {
        setCityName(data.villes);
      } else {
        // Si pas de ville trouvée, utiliser la commune comme fallback
        setCityName(commune);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la ville:', error);
      setCityName(commune);
    }
  };

  const loadProperty = async () => {
    try {
      // Ne pas mettre loading à true si on a déjà des données (pour éviter le flash)
      const hasInitialData = property !== null;
      if (!hasInitialData) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('properties_02')
        .select(`
          *,
          owner_id,
          offered_by
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erreur lors du chargement du bien:', error);
        // Si on n'avait pas de données initiales, mettre à null
        if (!hasInitialData) {
          setProperty(null);
        }
        return;
      }

      console.log('Bien chargé depuis Supabase:', data);
      
      // Toujours mettre à jour avec les données complètes de Supabase
      setProperty(data);
      
      // Mettre à jour le cache avec les données fraîches
      setCachedProperty(data);

      // Charger les infos du propriétaire
      if (data.owner_id) {
        const { data: ownerData, error: ownerError } = await supabase
          .from('users_2025_12_01_11_29')
          .select('phone, user_type, full_name, company_name')
          .eq('id', data.owner_id)
          .single();

        if (ownerError) {
          console.error('Erreur lors du chargement du propriétaire:', ownerError);
        } else if (ownerData) {
          console.log('Propriétaire chargé:', ownerData);
          setOwnerPhone(ownerData.phone || 'Non disponible');
        }
      }

      // Charger la ville depuis localities
      if (data.city) {
        loadCityName(data.city);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du bien:', error);
      // Si on n'avait pas de données initiales, mettre à null
      if (!property) {
        setProperty(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Observer pour détecter quand le formulaire est visible (pour masquer le bouton sticky)
  useEffect(() => {
    if (!property) return;

    const isShortTermRental = (property as any).operation_type === 'short-term-rental';
    const targetRef = isShortTermRental ? reservationFormRef : contactFormRef;
    
    if (!targetRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Si le formulaire est visible (même partiellement), masquer le bouton sticky
          // entry.isIntersecting = true signifie que le formulaire est visible dans le viewport
          setShowStickyButton(!entry.isIntersecting);
        });
      },
      {
        threshold: 0, // Détecter dès qu'une partie du formulaire entre dans le viewport
        rootMargin: '0px', // Pas de marge, détecter exactement quand le formulaire entre dans le viewport
      }
    );

    observer.observe(targetRef.current);

    return () => {
      observer.disconnect();
    };
  }, [property]);

  const scrollToForm = () => {
    if (!property) return;

    const isShortTermRental = (property as any).operation_type === 'short-term-rental';
    const targetRef = isShortTermRental ? reservationFormRef : contactFormRef;
    
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const incrementViews = async () => {
    if (!id) return;
    
    try {
      // Incrémenter les vues directement dans properties_02
      const { error } = await supabase
        .from('properties_02')
        .update({ views_count: (property?.views_count || 0) + 1 })
        .eq('id', id);
      
      if (error) {
        console.error('Erreur lors de l\'incrémentation des vues:', error);
      } else {
        // Mettre à jour l'état local
        if (property) {
          setProperty({ ...property, views_count: (property.views_count || 0) + 1 });
        }
      }
    } catch (error) {
      // Ignorer les erreurs silencieusement pour ne pas bloquer l'interface
      console.warn('Impossible d\'incrémenter les vues:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl sm:text-5xl text-blue-600 animate-spin"></i>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Chargement du bien...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '96px' }}>
          <div className="text-center">
            <i className="ri-home-smile-line text-4xl sm:text-5xl md:text-6xl text-gray-300 mb-3 sm:mb-4"></i>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Bien non trouvé</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Ce bien n'existe pas ou n'est plus disponible</p>
            <a
              href="/recherche-biens"
              className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white text-sm sm:text-base rounded-full hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Retour à la recherche
            </a>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  const getVillaTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'low-rise': 'Villa basse',
      'duplex': 'Duplex',
      'triplex': 'Triplex',
    };
    return types[type] || type;
  };

  const getDepositorStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      owner: 'Propriétaire direct',
      agent: 'Mandataire',
      developer: 'Promoteur',
    };
    return statuses[status] || status;
  };

  const getFeatureLabel = (feature: string) => {
    const features: Record<string, string> = {
      // Résidentiels
      front_yard: 'Cour avant',
      back_yard: 'Cour arrière',
      garden: 'Jardin',
      dependency: 'Dépendance',
      pool: 'Piscine',
      playground: 'Aire de jeux',
      gym: 'Salle de sport',
      garage: 'Garage',
      air_conditioning: 'Climatisation',
      water_heater: 'Chauffe-eau',
      storage: 'Placards / Buanderie',
      elevator: 'Ascenseur',
      parking: 'Parking',
      generator: 'Groupe électrogène',
      water_tank: 'Citerne d\'eau',
      solar_panel: 'Panneau solaire',
      security: 'Sécurité',
      // Location courte durée
      has_sofa: 'Canapé',
      has_tv: 'Télévision',
      has_internet: 'Internet',
      equipped_kitchen: 'Cuisine équipée',
      has_washing_machine: 'Machine à laver',
      has_wifi: 'Wifi',
      has_netflix: 'Netflix',
      // Terrain
      approved_subdivision: 'Lotissement approuvé',
      electricity_viabilized: 'Viabilisé en électricité',
      water_viabilized: 'Viabilisé en eau',
      fenced: 'Terrain clôturé',
      flat_relief: 'Relief plat',
      // Commerce
      visible_facade: 'Façade visible',
      high_traffic_area: 'Zone passante',
      internal_wc: 'WC',
      terrace: 'Terrasse',
      customer_parking: 'Parking clients',
      office: 'Bureau',
      warehouse: 'Entrepôt',
      cold_room: 'Chambre froide',
      // Immeuble
      building_parking: 'Parking',
      building_generator: 'Groupe électrogène',
      // Bureau
      meeting_room: 'Salle de réunion',
      office_air_conditioning: 'Climatisation',
      fiber_internet: 'Fibre internet disponible',
      reception: 'Réception',
      office_parking: 'Parking',
      office_wc: 'WC',
      office_kitchen: 'Cuisine',
      // Parking
      covered_parking: 'Couvert',
      secure_access: 'Accès sécurisé',
    };
    return features[feature] || feature;
  };

  const conditionLabels: Record<string, string> = {
    new: 'Neuf',
    excellent: 'Excellent état',
    good: 'Bon état',
    'to-renovate': 'À rénover',
    unfinished: 'Inachevé',
  };

  const standingLabels: Record<string, string> = {
    low: 'Économique',
    medium: 'Moyen standing',
    high: 'Haut standing',
    luxury: 'Luxe',
  };

  // Déterminer le type de bien pour l'affichage conditionnel
  const isResidentialType = ['villa', 'apartment', 'house', 'furnished-residence'].includes(property?.property_type || '');
  const isLand = property?.property_type === 'land';
  const isCommercial = property?.property_type === 'commercial';
  const isBuilding = property?.property_type === 'building';
  const isOffice = property?.property_type === 'office';
  const isParking = property?.property_type === 'parking';

  const getPriceSuffix = () => {
    const operationType = (property as any)?.operation_type || 'sale';
    if (operationType === 'rental') return '/mois';
    if (operationType === 'short-term-rental') return '/nuit';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-16 md:pt-24 pb-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-600 mb-4 md:mb-6 overflow-x-auto">
            <a href="/" className="hover:text-blue-600 cursor-pointer whitespace-nowrap">
              Accueil
            </a>
            <i className="ri-arrow-right-s-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
            <a href="/recherche-biens" className="hover:text-blue-600 cursor-pointer whitespace-nowrap">
              Recherche
            </a>
            <i className="ri-arrow-right-s-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
            <span className="text-gray-900 truncate">{property.title}</span>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            {/* Left Column - Property Details */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Image Gallery */}
              <ImageGallery
                images={property.images || []}
                videoUrl={(property as any).video_url}
                virtualTourUrl={property.virtual_tour_url}
                propertyType={property.property_type}
                propertyId={property.id}
                onGalleryOpenChange={(isOpen) => setShowStickyButton(!isOpen)}
              />

              {/* Price and Location */}
              <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                <div className="mb-3 sm:mb-4">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                    <span className="px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs md:text-sm font-semibold rounded-full uppercase">
                      {getOperationTypeLabel((property as any).operation_type || property.offer_type || 'sale')}
                    </span>
                    <span className="px-2 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 bg-gray-100 text-gray-700 text-[10px] sm:text-xs md:text-sm font-semibold rounded-full">
                      {getPropertyTypeLabel(property.property_type)}
                      {property.villa_type && ` - ${getVillaTypeLabel(property.villa_type)}`}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 break-words">
                    {property.price.toLocaleString()} FCFA
                    {getPriceSuffix() && <span className="text-base sm:text-lg md:text-xl font-normal text-gray-600 ml-2">{getPriceSuffix()}</span>}
                  </h1>
                  {property.price_per_sqm && (
                    <div className="text-xs sm:text-sm md:text-base text-gray-600 mb-1 sm:mb-2">
                      {property.price_per_sqm.toLocaleString()} FCFA/m²
                    </div>
                  )}
                  <div className="flex flex-col gap-1 text-xs sm:text-sm md:text-base text-gray-600">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <i className="ri-map-pin-line text-sm sm:text-base md:text-lg w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0"></i>
                      <span className="truncate">
                        {cityName ? `${cityName}, ${property.city}` : property.city}
                      </span>
                    </div>
                    {property.address && (
                      <div className="flex items-center gap-1.5 sm:gap-2 pl-5 sm:pl-6 md:pl-7">
                        <span className="truncate">{property.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Features */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 pt-3 sm:pt-4 md:pt-6 border-t border-gray-200">
                  {/* Surface - Affichée pour tous sauf Parking */}
                  {!isParking && (property.surface_area || (property as any).surface_per_lot) && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-ruler-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        {property.surface_area || (property as any).surface_per_lot}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {isLand ? 'm²/lot' : 'm²'}
                        {isLand && (property as any).available_lots && ` (${(property as any).available_lots} lot${(property as any).available_lots > 1 ? 's' : ''})`}
                      </div>
                    </div>
                  )}
                  {/* Nombre de pièces - Seulement pour résidentiels et bureau */}
                  {(isResidentialType || isOffice) && (property.rooms || (property as any).office_rooms) && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-home-4-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        {property.rooms || (property as any).office_rooms}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">Pièce{(property.rooms || (property as any).office_rooms) > 1 ? 's' : ''}</div>
                    </div>
                  )}
                  {/* Chambres - Seulement pour résidentiels */}
                  {isResidentialType && property.bedrooms && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-hotel-bed-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{property.bedrooms}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Chambre{property.bedrooms > 1 ? 's' : ''}</div>
                    </div>
                  )}
                  {/* Salles de bain - Seulement pour résidentiels */}
                  {isResidentialType && property.bathrooms && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-drop-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{property.bathrooms}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Salle{property.bathrooms > 1 ? 's' : ''} de bain</div>
                    </div>
                  )}
                  {/* Capacité - Location courte durée */}
                  {(property as any).capacity && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-user-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{(property as any).capacity}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Personne{(property as any).capacity > 1 ? 's' : ''}</div>
                    </div>
                  )}
                  {/* Nombre d'étages - Villa/Maison */}
                  {isResidentialType && property.floors && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-building-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{property.floors}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Étage{property.floors > 1 ? 's' : ''}</div>
                    </div>
                  )}
                  {/* Nombre d'étages - Immeuble */}
                  {isBuilding && (property as any).building_floors && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-building-2-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{(property as any).building_floors}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Étage{(property as any).building_floors > 1 ? 's' : ''}</div>
                    </div>
                  )}
                  {/* Nombre d'unités - Immeuble */}
                  {isBuilding && (property as any).total_units && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-home-3-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{(property as any).total_units}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Unité{(property as any).total_units > 1 ? 's' : ''}</div>
                    </div>
                  )}
                  {/* Nombre de places - Parking */}
                  {isParking && (property as any).parking_spaces && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full mx-auto mb-1 sm:mb-2">
                        <i className="ri-parking-box-line text-xl sm:text-2xl text-blue-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{(property as any).parking_spaces}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Place{(property as any).parking_spaces > 1 ? 's' : ''}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <DescriptionSection description={property.description || 'Aucune description disponible.'} />

              {/* Characteristics */}
              <CharacteristicsSection property={property} conditionLabels={conditionLabels} standingLabels={standingLabels} getDepositorStatusLabel={getDepositorStatusLabel} isCommercial={isCommercial} isBuilding={isBuilding} isParking={isParking} />

              {/* Features */}
              {property.features && property.features.length > 0 && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Équipements</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {property.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-full flex-shrink-0">
                          <i className="ri-check-line text-green-600 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                        </div>
                        <span className="text-xs sm:text-sm md:text-base text-gray-700 break-words">{getFeatureLabel(feature)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Land Titles */}
              {property.land_titles && property.land_titles.length > 0 && (
                <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Titres fonciers</h2>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {property.land_titles.map((title, index) => (
                      <span
                        key={index}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium"
                      >
                        {title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Comparison */}
              {property.price_per_sqm && (
                <PriceComparison
                  pricePerSqm={property.price_per_sqm}
                  city={property.city}
                  propertyType={property.property_type}
                  offerType={(property as any).operation_type || 'sale'}
                />
              )}

              {/* Costs Details - Seulement pour location longue durée (pas location courte durée) */}
              {((property as any).operation_type === 'rental' || property.offer_type === 'rental') && 
               (property.agency_fees || property.security_deposit || property.advance_rent || property.service_charges || 
                (property as any).advance_months || (property as any).deposit_months) && (
                <CostsDetails
                  agencyFees={property.agency_fees}
                  securityDeposit={property.security_deposit}
                  advanceRent={property.advance_rent}
                  serviceCharges={property.service_charges}
                  advanceMonths={(property as any).advance_months}
                  depositMonths={(property as any).deposit_months}
                  price={property.price}
                />
              )}

              {/* Partners Section */}
              <PartnersSection />

              {/* Advertiser Card - Pas pour location courte durée */}
              {property.owner_id && (property as any).operation_type !== 'short-term-rental' && (
                <AdvertiserCard ownerId={property.owner_id} offeredBy={property.offered_by} />
              )}
            </div>

            {/* Right Column - Contact Form ou Réservation */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 sm:top-24 space-y-4 sm:space-y-6">
                {/* Afficher le formulaire de réservation pour location courte durée, sinon le formulaire de contact */}
                {(property as any).operation_type === 'short-term-rental' ? (
                  <div ref={reservationFormRef}>
                    <ReservationForm 
                      propertyId={property.id} 
                      price={property.price}
                      propertyTitle={property.title}
                      ownerId={property.owner_id}
                    />
                  </div>
                ) : (
                  <div ref={contactFormRef}>
                    <ContactForm propertyId={property.id} />
                  </div>
                )}

                {/* Show Phone Button - Pas pour location courte durée */}
                {(property as any).operation_type !== 'short-term-rental' && (
                  <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6">
                    {!showPhone ? (
                      <button
                        onClick={() => setShowPhone(true)}
                        className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-green-600 text-white text-sm sm:text-base rounded-lg md:rounded-xl font-semibold hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-phone-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                        Afficher le numéro
                      </button>
                    ) : (
                      <div className="text-center">
                        <div className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Téléphone du propriétaire</div>
                        <a
                          href={`tel:${ownerPhone}`}
                          className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 hover:text-green-700 cursor-pointer break-all"
                        >
                          {ownerPhone}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats - Pas pour location courte durée */}
                {(property as any).operation_type !== 'short-term-rental' && (
                  <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <i className="ri-eye-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                        <span className="whitespace-nowrap">{property.views_count} vues</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <i className="ri-heart-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                        <span className="whitespace-nowrap">{property.favorites_count || 0} favoris</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Similar Properties */}
          <SimilarProperties
            currentPropertyId={property.id}
            city={property.city}
            propertyType={property.property_type}
            offerType={(property as any).operation_type || 'sale'}
            operationType={(property as any).operation_type}
          />
        </div>
      </div>

      {/* Bouton sticky mobile - Réserver ou Contacter */}
      {property && showStickyButton && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 shadow-lg p-4">
          {(property as any).operation_type === 'short-term-rental' ? (
            <button
              onClick={scrollToForm}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-teal-600 text-white text-base font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              <i className="ri-calendar-check-line text-xl"></i>
              Réserver maintenant
            </button>
          ) : (
            <button
              onClick={scrollToForm}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-teal-600 text-white text-base font-semibold rounded-lg hover:bg-teal-700 transition-colors"
            >
              <i className="ri-mail-line text-xl"></i>
              Contacter
            </button>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}
