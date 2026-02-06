import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import BasicInfoStep from './components/BasicInfoStep';
import LocationStep from './components/LocationStep';
import PropertyDetailsStep from './components/PropertyDetailsStep';
import MediasStep from './components/MediasStep';
import PreviewStep from './components/PreviewStep';
import { usePropertyTypes } from '../../hooks/usePropertyTypes';
import { useOperationTypes } from '../../hooks/useOperationTypes';
interface PropertyData {
  // Informations de base
  title: string;
  description: string;
  offer_type: string;
  operation_type?: string;
  property_type: string;
  villa_type?: string;
  
  // Localisation
  address: string;
  city: string;
  postal_code: string;
  
  // Caractéristiques principales
  surface_area: number;
  surface_per_lot?: number;
  available_lots?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  capacity?: number;
  rooms?: number;
  floor_number?: number;
  
  // Prix et frais
  price: number;
  agency_fees?: number;
  security_deposit?: number;
  advance_rent?: number;
  service_charges?: number;
  
  // Location courte durée
  check_in_time?: string; // Heure d'arrivée (format HH:mm)
  check_out_time?: string; // Heure de départ (format HH:mm)
  min_nights?: number; // Nombre minimal de nuitées à réserver
  
  // Détails
  condition?: string;
  standing?: string;
  security_type?: string;
  accessibility?: string;
  land_titles?: string[];
  features?: string[];
  
  // Médias
  images?: string[];
  video_url?: string;
  floor_plan_url?: string;
  virtual_tour_url?: string;
  
  // Informations de contact
  offered_by: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
}

export default function DeposerAnnoncePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editPropertyId = searchParams.get('edit');
  const isEditMode = !!editPropertyId;
  
  // Hooks pour obtenir les labels des types
  const { getPropertyTypeLabel } = usePropertyTypes();
  const { getOperationTypeLabel } = useOperationTypes();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyData, setPropertyData] = useState<PropertyData>({
    title: '',
    description: '',
    offer_type: 'sale',
    property_type: 'apartment',
    address: '',
    city: '',
    postal_code: '',
    surface_area: 0,
    price: 0,
    offered_by: 'individual',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isStep1Valid, setIsStep1Valid] = useState(false);
  const [isStep2Valid, setIsStep2Valid] = useState(false);
  const [isStep3Valid, setIsStep3Valid] = useState(false);
  const [isStep4Valid, setIsStep4Valid] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftPropertyId, setDraftPropertyId] = useState<string | null>(null);

  // Fonction pour générer automatiquement le titre
  const generateTitle = (data: PropertyData): string => {
    const propertyTypeLabel = getPropertyTypeLabel(data.property_type || '');
    const operationTypeLabel = getOperationTypeLabel((data as any).operation_type || data.offer_type || 'sale');
    
    // Formater le label du type d'opération pour l'affichage
    let operationLabel = '';
    if ((data as any).operation_type === 'sale' || data.offer_type === 'sale') {
      operationLabel = 'vente';
    } else if ((data as any).operation_type === 'rental' || data.offer_type === 'rental') {
      operationLabel = 'location';
    } else if ((data as any).operation_type === 'short-term-rental') {
      operationLabel = 'location courte durée';
    } else {
      operationLabel = operationTypeLabel.toLowerCase();
    }
    
    return `${propertyTypeLabel} en ${operationLabel}`;
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user && editPropertyId) {
      loadPropertyForEdit(editPropertyId);
    }
  }, [user, editPropertyId]);

  // Charger un brouillon existant si disponible
  useEffect(() => {
    if (user && !editPropertyId && !isEditMode && !loading) {
      loadDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, editPropertyId, isEditMode, loading]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Pré-remplir les informations de contact depuis le profil
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setPropertyData(prev => ({
            ...prev,
            contact_name: userData.full_name || '',
            contact_email: userData.email || user.email || '',
            contact_phone: userData.phone || '',
            offered_by: userData.company_name ? 'professional' : 'individual',
          }));
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyForEdit = async (propertyId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties_02')
        .select('*')
        .eq('id', propertyId)
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Si le bien est en draft, définir draftPropertyId
        if (data.status === 'draft') {
          setDraftPropertyId(data.id);
        }
        
        // Pré-remplir le formulaire avec les données existantes
        // Utiliser operation_type depuis properties_02, avec fallback sur offer_type pour compatibilité
        const operationType = (data as any).operation_type || data.offer_type || 'sale';
        setPropertyData({
          title: data.title || '',
          description: data.description || '',
          offer_type: operationType === 'short-term-rental' ? 'rental' : operationType, // Conversion pour compatibilité avec les composants
          operation_type: operationType,
          property_type: data.property_type || 'apartment',
          villa_type: data.villa_type || undefined,
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          surface_area: data.surface_area || 0,
          bedrooms: data.bedrooms || undefined,
          bathrooms: data.bathrooms || undefined,
          floors: data.floors || undefined,
          capacity: data.capacity || undefined,
          rooms: data.rooms || undefined,
          floor_number: data.floor_number || undefined,
          price: data.price || 0,
          agency_fees: data.agency_fees || undefined,
          security_deposit: data.security_deposit || undefined,
          advance_rent: data.advance_rent || undefined,
          service_charges: data.service_charges || undefined,
          condition: data.condition || undefined,
          standing: data.standing || undefined,
          security_type: data.security_type || undefined,
          accessibility: data.accessibility || undefined,
          land_titles: data.land_titles || undefined,
          features: data.features || undefined,
          images: data.images || undefined,
          video_url: (data as any).video_url || undefined,
          floor_plan_url: data.floor_plan_url || undefined,
          virtual_tour_url: data.virtual_tour_url || undefined,
          offered_by: data.offered_by || 'individual',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
        });

        // Charger les informations de contact depuis le profil utilisateur
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setPropertyData(prev => ({
            ...prev,
            contact_name: userData.full_name || '',
            contact_email: userData.email || user.email || '',
            contact_phone: userData.phone || '',
            offered_by: userData.company_name ? 'professional' : 'individual',
          }));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du bien à modifier:', error);
      alert('Erreur lors du chargement du bien. Vous allez être redirigé.');
      navigate('/gestion-locative');
    } finally {
      setLoading(false);
    }
  };

  const updatePropertyData = (data: Partial<PropertyData>) => {
    setPropertyData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    // Valider l'étape actuelle avant de passer au suivant
    let isValid = true;
    let errorMessage = '';

    if (currentStep === 1 && !isStep1Valid) {
      isValid = false;
      errorMessage = 'Veuillez remplir tous les champs obligatoires de l\'étape 1 (Type de bien & Transaction).';
    } else if (currentStep === 2 && !isStep2Valid) {
      isValid = false;
      errorMessage = 'Veuillez remplir tous les champs obligatoires de l\'étape 2 (Localisation).';
    } else if (currentStep === 3 && !isStep3Valid) {
      isValid = false;
      errorMessage = 'Veuillez remplir tous les champs obligatoires de l\'étape 3 (Caractéristiques & Équipements).';
    } else if (currentStep === 4 && !isStep4Valid) {
      isValid = false;
      errorMessage = 'Veuillez remplir tous les champs obligatoires de l\'étape 4 (Photos).';
    }

    if (!isValid) {
      alert(errorMessage);
      return;
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const loadDraft = async () => {
    if (!user) return;
    
    try {
      // Chercher un brouillon existant pour cet utilisateur
      const { data, error } = await supabase
        .from('properties_02')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'draft')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors du chargement du brouillon:', error);
        return;
      }

      if (data) {
        setDraftPropertyId(data.id);
        // Pré-remplir le formulaire avec les données du brouillon
        setPropertyData({
          title: data.title || '',
          description: data.description || '',
          offer_type: data.offer_type || 'sale',
          property_type: data.property_type || 'apartment',
          villa_type: data.villa_type || undefined,
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          surface_area: data.surface_area || 0,
          bedrooms: data.bedrooms || undefined,
          bathrooms: data.bathrooms || undefined,
          floors: data.floors || undefined,
          capacity: data.capacity || undefined,
          rooms: data.rooms || undefined,
          floor_number: data.floor_number || undefined,
          price: data.price || 0,
          agency_fees: data.agency_fees || undefined,
          security_deposit: data.security_deposit || undefined,
          advance_rent: data.advance_rent || undefined,
          service_charges: data.service_charges || undefined,
          condition: data.condition || undefined,
          standing: data.standing || undefined,
          security_type: data.security_type || undefined,
          accessibility: data.accessibility || undefined,
          land_titles: data.land_titles || undefined,
          features: data.features || undefined,
          images: data.images || undefined,
          video_url: (data as any).video_url || undefined,
          floor_plan_url: data.floor_plan_url || undefined,
          virtual_tour_url: data.virtual_tour_url || undefined,
          operation_type: (data as any).operation_type || undefined,
          offered_by: data.offered_by || 'individual',
          contact_name: '',
          contact_email: '',
          contact_phone: '',
        });

        // Charger les informations de contact depuis le profil utilisateur
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        if (userData) {
          setPropertyData(prev => ({
            ...prev,
            contact_name: userData.full_name || '',
            contact_email: userData.email || user.email || '',
            contact_phone: userData.phone || '',
            offered_by: userData.company_name ? 'professional' : 'individual',
          }));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du brouillon:', error);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) {
      alert('Vous devez être connecté pour enregistrer un brouillon');
      return;
    }

    // Validation minimale : seulement les champs vraiment obligatoires
    const operationType = propertyData.operation_type || propertyData.offer_type;
    if (!operationType || !propertyData.property_type || !propertyData.city || !propertyData.price || propertyData.price <= 0) {
      alert('Veuillez remplir au minimum : Type d\'offre, Type de bien, Ville et Prix pour enregistrer un brouillon');
      return;
    }

    setSavingDraft(true);
    try {
      // Préparer les données sans les champs de contact
      const { contact_name, contact_email, contact_phone, ...propertyDataToUpdate } = propertyData;

      // Nettoyer les données
      const cleanedData: any = {
        ...propertyDataToUpdate,
        owner_id: user.id,
      };

      // Toujours définir comme brouillon lors de la sauvegarde
      cleanedData.status = 'draft';
      cleanedData.views_count = 0;
      cleanedData.favorites_count = 0;

      // Retirer les champs undefined/null vides (sauf les obligatoires)
      const requiredFieldsList = ['title', 'city', 'operation_type', 'property_type', 'price'];
      
      // Pour les brouillons, ne pas envoyer les images/vidéo en base64 (trop volumineux)
      // On les gardera pour l'affichage mais ne les sauvegardera pas dans le brouillon
      // Les images seront uploadées lors de la publication finale
      if (cleanedData.images && Array.isArray(cleanedData.images)) {
        // Filtrer les images base64 (data URLs) - garder seulement les URLs
        const imageUrls = cleanedData.images.filter((img: string) => 
          typeof img === 'string' && !img.startsWith('data:')
        );
        // Si toutes les images sont en base64, ne pas les sauvegarder dans le brouillon
        if (imageUrls.length === 0) {
          delete cleanedData.images;
        } else {
          cleanedData.images = imageUrls;
        }
      }
      
      // Ne pas sauvegarder la vidéo en base64 dans le brouillon
      if (cleanedData.video_url && cleanedData.video_url.startsWith('data:')) {
        delete cleanedData.video_url;
      }
      
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined || cleanedData[key] === null || cleanedData[key] === '') {
          // Ne pas supprimer les champs obligatoires
          if (requiredFieldsList.includes(key)) {
            return;
          }
          // Garder les valeurs 0 pour les nombres et les tableaux vides
          if (typeof cleanedData[key] !== 'number' && !Array.isArray(cleanedData[key])) {
            delete cleanedData[key];
          }
        }
      });

      // Utiliser operation_type en priorité, avec fallback sur offer_type pour compatibilité
      const operationType = cleanedData.operation_type || cleanedData.offer_type;
      if (operationType && !cleanedData.operation_type) {
        cleanedData.operation_type = operationType;
      }
      // Supprimer offer_type car properties_02 n'utilise que operation_type
      delete cleanedData.offer_type;
      
      // Générer automatiquement le titre
      // Toujours régénérer le titre pour s'assurer qu'il correspond au type de bien et d'offre
      if (cleanedData.property_type && cleanedData.operation_type) {
        cleanedData.title = generateTitle(cleanedData as PropertyData);
      } else if (!cleanedData.title || cleanedData.title.trim() === '') {
        cleanedData.title = 'Brouillon - ' + new Date().toLocaleDateString('fr-FR');
      }

      // S'assurer que surface_area existe si nécessaire
      if (!cleanedData.surface_area || cleanedData.surface_area === 0) {
        cleanedData.surface_area = null; // Permettre NULL pour les brouillons
      }

      let data, error;

      // Utiliser draftPropertyId ou editPropertyId pour mettre à jour un brouillon existant
      const propertyIdToUpdate = draftPropertyId || editPropertyId;

      if (propertyIdToUpdate) {
        // Mettre à jour un brouillon existant
        const result = await supabase
          .from('properties_02')
          .update(cleanedData)
          .eq('id', propertyIdToUpdate)
          .eq('owner_id', user.id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Créer un nouveau brouillon
        const result = await supabase
          .from('properties_02')
          .insert([cleanedData])
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (data) {
        setDraftPropertyId(data.id);
        alert('Brouillon enregistré avec succès !');
        // Rediriger vers la page des biens
        navigate('/gestion-locative');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement du brouillon:', error);
      alert(`Une erreur est survenue lors de l'enregistrement du brouillon: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('Vous devez être connecté pour publier une annonce');
      return;
    }

    // Générer automatiquement le titre si nécessaire (avant la validation)
    const dataWithTitle = { ...propertyData };
    if (!dataWithTitle.title || dataWithTitle.title.trim() === '') {
      if (dataWithTitle.property_type && (dataWithTitle.operation_type || dataWithTitle.offer_type)) {
        dataWithTitle.title = generateTitle(dataWithTitle);
      }
    }

    // Validation des champs obligatoires
    // Le titre est généré automatiquement, donc pas besoin de le valider
    // La surface n'est obligatoire que pour les terrains (surface_per_lot)
    const requiredFields: Record<string, any> = {
      city: dataWithTitle.city,
      offer_type: dataWithTitle.offer_type,
      property_type: dataWithTitle.property_type,
      price: dataWithTitle.price,
    };

    // Pour les terrains, vérifier surface_per_lot et available_lots au lieu de surface_area
    if (dataWithTitle.property_type === 'land') {
      requiredFields.surface_per_lot = (dataWithTitle as any).surface_per_lot;
      requiredFields.available_lots = (dataWithTitle as any).available_lots;
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => {
        if (key === 'surface_per_lot' || key === 'available_lots' || key === 'price') {
          return value === undefined || value === null || value === 0;
        }
        return value === undefined || value === null || value === '';
      })
      .map(([key]) => {
        const fieldNames: Record<string, string> = {
          city: 'Ville',
          operation_type: 'Type d\'offre',
          property_type: 'Type de bien',
          surface_per_lot: 'Superficie par lot',
          available_lots: 'Nombre de lots disponibles',
          price: 'Prix',
        };
        return fieldNames[key] || key;
      });

    if (missingFields.length > 0) {
      alert(`Veuillez remplir les champs obligatoires suivants : ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      // Fonction pour uploader les images base64 restantes vers Supabase Storage
      const uploadBase64Images = async (images: string[]): Promise<string[]> => {
        const uploadedUrls: string[] = [];
        const base64Images = images.filter((img: string) => 
          typeof img === 'string' && img.startsWith('data:')
        );
        const existingUrls = images.filter((img: string) => 
          typeof img === 'string' && !img.startsWith('data:')
        );

        if (base64Images.length === 0) {
          return existingUrls;
        }

        for (const base64Image of base64Images) {
          try {
            // Convertir base64 en blob
            const response = await fetch(base64Image);
            const blob = await response.blob();
            
            // Générer un nom de fichier unique
            const fileExt = base64Image.split(';')[0].split('/')[1] || 'jpg';
            const fileName = `properties/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = fileName;

            // Upload vers Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('professional-assets')
              .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: false,
              });

            if (uploadError) {
              console.error('Erreur upload image:', uploadError);
              continue;
            }

            // Obtenir l'URL publique
            const { data: { publicUrl } } = supabase.storage
              .from('professional-assets')
              .getPublicUrl(filePath);

            uploadedUrls.push(publicUrl);
          } catch (error) {
            console.error('Erreur lors de la conversion/upload de l\'image:', error);
          }
        }

        return [...existingUrls, ...uploadedUrls];
      };

      // Fonction pour uploader la vidéo base64 vers Supabase Storage
      const uploadBase64Video = async (videoUrl: string): Promise<string | undefined> => {
        if (!videoUrl || !videoUrl.startsWith('data:')) {
          return videoUrl;
        }

        try {
          // Convertir base64 en blob
          const response = await fetch(videoUrl);
          const blob = await response.blob();
          
          // Vérifier la taille (max 30 MB)
          const maxSize = 30 * 1024 * 1024;
          if (blob.size > maxSize) {
            alert('La vidéo est trop volumineuse (max 30 MB)');
            return undefined;
          }

          // Générer un nom de fichier unique
          const fileExt = videoUrl.split(';')[0].split('/')[1] || 'mp4';
          const fileName = `properties/${user.id}/videos/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = fileName;

          // Upload vers Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('professional-assets')
            .upload(filePath, blob, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Erreur upload vidéo:', uploadError);
            return undefined;
          }

          // Obtenir l'URL publique
          const { data: { publicUrl } } = supabase.storage
            .from('professional-assets')
            .getPublicUrl(filePath);

          return publicUrl;
        } catch (error) {
          console.error('Erreur lors de la conversion/upload de la vidéo:', error);
          return undefined;
        }
      };

      // Préparer les données sans les champs de contact qui n'existent pas dans la table
      // Note: price_per_sqm est une colonne générée, elle sera calculée automatiquement par la base de données
      // Utiliser dataWithTitle qui contient le titre généré automatiquement
      const { contact_name, contact_email, contact_phone, ...propertyDataToUpdate } = dataWithTitle;

      // Uploader les images base64 restantes vers Supabase Storage
      if (propertyDataToUpdate.images && Array.isArray(propertyDataToUpdate.images)) {
        propertyDataToUpdate.images = await uploadBase64Images(propertyDataToUpdate.images);
        if (propertyDataToUpdate.images.length === 0) {
          delete propertyDataToUpdate.images;
        }
      }

      // Uploader la vidéo base64 vers Supabase Storage
      if ((propertyDataToUpdate as any).video_url) {
        const uploadedVideoUrl = await uploadBase64Video((propertyDataToUpdate as any).video_url);
        if (uploadedVideoUrl) {
          (propertyDataToUpdate as any).video_url = uploadedVideoUrl;
        } else {
          delete (propertyDataToUpdate as any).video_url;
        }
      }

      // Nettoyer les données : retirer les valeurs undefined/null vides et s'assurer que les valeurs correspondent aux contraintes CHECK
      const cleanedData: any = {
        ...propertyDataToUpdate,
      };

      // Ajouter les champs initiaux
      cleanedData.owner_id = user.id;
      cleanedData.views_count = 0;
      cleanedData.favorites_count = 0;

      // Liste des champs obligatoires qui ne doivent JAMAIS être supprimés
      // Le titre est généré automatiquement, donc toujours présent
      // La surface n'est obligatoire que pour les terrains (surface_per_lot)
      const requiredFieldsList = ['title', 'city', 'offer_type', 'property_type', 'price'];
      if (cleanedData.property_type === 'land') {
        requiredFieldsList.push('surface_per_lot', 'available_lots');
      }

      // Retirer les champs undefined/null vides pour éviter les erreurs de contrainte
      // MAIS garder les champs obligatoires même s'ils sont vides (ils seront validés avant)
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined || cleanedData[key] === null || cleanedData[key] === '') {
          // Ne pas supprimer les champs obligatoires
          if (requiredFieldsList.includes(key)) {
            return;
          }
          // Garder les valeurs 0 pour les nombres et les tableaux vides
          if (typeof cleanedData[key] !== 'number' && !Array.isArray(cleanedData[key])) {
            delete cleanedData[key];
          }
        }
      });

      // S'assurer que les valeurs correspondent aux contraintes CHECK de la base
      // Si accessibility est défini mais invalide, le retirer (properties_02 accepte seulement 'paved' et 'unpaved')
      if (cleanedData.accessibility && !['paved', 'unpaved'].includes(cleanedData.accessibility)) {
        delete cleanedData.accessibility;
      }

      // Si condition est défini mais invalide, le retirer
      if (cleanedData.condition && !['new', 'excellent', 'good', 'to-renovate', 'unfinished'].includes(cleanedData.condition)) {
        delete cleanedData.condition;
      }

      // Si standing est défini mais invalide, le retirer (properties_02 accepte 'low', 'medium', 'high', 'luxury')
      if (cleanedData.standing && !['low', 'medium', 'high', 'luxury'].includes(cleanedData.standing)) {
        delete cleanedData.standing;
      }

      // Si security_type est défini mais invalide, le retirer
      if (cleanedData.security_type && !['gated-community', 'security-equipment', 'none'].includes(cleanedData.security_type)) {
        delete cleanedData.security_type;
      }

      // S'assurer que capacity est un nombre entier positif si défini
      if (cleanedData.capacity !== undefined && cleanedData.capacity !== null) {
        const capacityValue = typeof cleanedData.capacity === 'string' 
          ? parseInt(cleanedData.capacity, 10) 
          : cleanedData.capacity;
        if (isNaN(capacityValue) || capacityValue <= 0) {
          delete cleanedData.capacity;
        } else {
          cleanedData.capacity = capacityValue;
        }
      }

      // Utiliser operation_type en priorité, avec fallback sur offer_type pour compatibilité
      const operationType = cleanedData.operation_type || cleanedData.offer_type;
      if (operationType && !cleanedData.operation_type) {
        cleanedData.operation_type = operationType;
      }
      // Supprimer offer_type car properties_02 n'utilise que operation_type
      delete cleanedData.offer_type;
      
      // Générer automatiquement le titre si nécessaire
      if (!cleanedData.title || cleanedData.title.trim() === '') {
        // Générer le titre à partir du type de bien et du type d'offre
        if (cleanedData.property_type && cleanedData.operation_type) {
          cleanedData.title = generateTitle(cleanedData as PropertyData);
        } else {
          cleanedData.title = 'Brouillon - ' + new Date().toLocaleDateString('fr-FR');
        }
      } else {
        // Toujours régénérer le titre pour s'assurer qu'il correspond au type de bien et d'offre
        if (cleanedData.property_type && cleanedData.operation_type) {
          cleanedData.title = generateTitle(cleanedData as PropertyData);
        }
      }

      let data, error;

      // Déterminer l'action à effectuer
      const propertyIdToUpdate = draftPropertyId || editPropertyId;

      if (propertyIdToUpdate) {
        // Mettre à jour un bien existant
        if (draftPropertyId) {
          // Publier un brouillon : mettre le statut à 'active'
          cleanedData.status = 'active';
        }
        // Si c'est une modification d'un bien publié (editPropertyId sans draftPropertyId),
        // ne pas inclure le statut pour le préserver
        
        const result = await supabase
          .from('properties_02')
          .update(cleanedData)
          .eq('id', propertyIdToUpdate)
          .eq('owner_id', user.id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Créer un nouveau bien avec status 'active'
        cleanedData.status = 'active';
        const result = await supabase
          .from('properties_02')
          .insert([cleanedData])
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Rediriger vers la page du bien ou la gestion locative
      if (data) {
        navigate(`/bien/${data.id}`);
      } else {
        navigate('/gestion-locative');
      }
    } catch (error: any) {
      console.error('Erreur lors de la publication:', error);
      alert(`Une erreur est survenue lors de ${isEditMode ? 'la modification' : 'la publication'} de votre annonce: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Type de bien', icon: 'ri-home-4-line' },
    { number: 2, title: 'Localisation', icon: 'ri-map-pin-line' },
    { number: 3, title: 'Caractéristiques', icon: 'ri-list-check' },
    { number: 4, title: 'Médias', icon: 'ri-image-line' },
    { number: 5, title: 'Aperçu', icon: 'ri-eye-line' },
  ];

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
        
        <div className="pt-16 md:pt-24 pb-12 md:pb-20">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
              <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-6 md:p-8 lg:p-12 max-w-[600px] w-full text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <i className="ri-home-4-line text-3xl md:text-4xl text-teal-600 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"></i>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 md:mb-4">Déposer une annonce</h2>
                <p className="text-gray-600 text-sm md:text-base lg:text-lg mb-6 md:mb-8">
                  Pour publier votre bien immobilier, vous devez être connecté à votre compte
                </p>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                  <a
                    href="/connexion"
                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-login-box-line text-lg md:text-xl"></i>
                    Se connecter
                  </a>
                  <a
                    href="/inscription"
                    className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-user-add-line text-lg md:text-xl"></i>
                    Créer un compte
                  </a>
                </div>
                <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
                  <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">Pourquoi créer un compte ?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-left">
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Publier vos annonces gratuitement</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Gérer vos biens en ligne</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Recevoir des messages d'acheteurs</span>
                    </div>
                    <div className="flex items-start gap-2 md:gap-3">
                      <i className="ri-check-line text-teal-600 text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-xs md:text-sm text-gray-600">Suivre vos statistiques</span>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-16 md:pt-24 pb-12 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 md:mb-3">
              {isEditMode ? 'Modifier l\'annonce' : 'Déposer une annonce'}
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-gray-600">
              {isEditMode 
                ? 'Modifiez les informations de votre bien immobilier'
                : 'Publiez votre bien immobilier en quelques étapes simples'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 lg:p-8 mb-6 md:mb-8 overflow-x-auto">
            <div className="flex items-center justify-between min-w-[600px] md:min-w-0">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div 
                    className={`flex flex-col items-center flex-1 ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
                    onClick={isEditMode ? () => {
                      setCurrentStep(step.number);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } : undefined}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full transition-all flex-shrink-0 ${
                        currentStep >= step.number
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      } ${isEditMode ? 'hover:opacity-80' : ''}`}
                    >
                      <i className={`${step.icon} text-lg md:text-xl lg:text-2xl w-5 h-5 md:w-6 md:h-6 flex items-center justify-center`}></i>
                    </div>
                    <div className="mt-2 md:mt-3 text-center">
                      <div
                        className={`text-xs md:text-sm font-semibold ${
                          currentStep >= step.number ? 'text-teal-600' : 'text-gray-500'
                        }`}
                      >
                        Étape {step.number}
                      </div>
                      <div className="text-[10px] md:text-xs text-gray-600 mt-0.5 md:mt-1 hidden sm:block">
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 md:h-1 flex-1 mx-2 md:mx-4 rounded transition-all hidden sm:block ${
                        currentStep > step.number ? 'bg-teal-600' : 'bg-gray-200'
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
            {currentStep === 1 && (
              <BasicInfoStep 
                data={propertyData} 
                onUpdate={updatePropertyData}
                onValidationChange={setIsStep1Valid}
              />
            )}
            {currentStep === 2 && (
              <LocationStep 
                data={propertyData} 
                onUpdate={updatePropertyData}
                onValidationChange={setIsStep2Valid}
              />
            )}
            {currentStep === 3 && (
              <PropertyDetailsStep 
                data={propertyData} 
                onUpdate={updatePropertyData}
                onValidationChange={setIsStep3Valid}
              />
            )}
            {currentStep === 4 && (
              <MediasStep 
                data={propertyData} 
                onUpdate={updatePropertyData}
                onValidationChange={setIsStep4Valid}
              />
            )}
            {currentStep === 5 && (
              <PreviewStep data={propertyData} />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 md:gap-4">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center justify-center gap-2 px-5 md:px-6 lg:px-8 py-3 md:py-4 rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-all ${
                currentStep === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-800 cursor-pointer'
              } whitespace-nowrap`}
            >
              <i className="ri-arrow-left-line text-lg md:text-xl"></i>
              Précédent
            </button>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Bouton Enregistrer - Caché sur l'étape 1 */}
              {currentStep !== 1 && (
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft || !propertyData.offer_type || !propertyData.property_type || !propertyData.city || !propertyData.price || propertyData.price <= 0}
                  className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-5 lg:px-6 py-3 md:py-4 rounded-lg md:rounded-xl text-xs md:text-sm lg:text-base font-semibold transition-colors whitespace-nowrap ${
                    savingDraft || !propertyData.offer_type || !propertyData.property_type || !propertyData.city || !propertyData.price || propertyData.price <= 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  }`}
                  title={!propertyData.offer_type || !propertyData.property_type || !propertyData.city || !propertyData.price || propertyData.price <= 0 ? 'Remplissez au minimum : Type d\'offre, Type de bien, Ville et Prix' : 'Enregistrer comme brouillon'}
                >
                  {savingDraft ? (
                    <>
                      <i className="ri-loader-4-line text-lg md:text-xl animate-spin"></i>
                      <span className="hidden sm:inline">Enregistrement...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line text-lg md:text-xl"></i>
                      <span className="hidden sm:inline">Enregistrer</span>
                      <span className="sm:hidden">Sauver</span>
                    </>
                  )}
                </button>
              )}

              {currentStep < 5 ? (
                <button
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !isStep1Valid) ||
                    (currentStep === 2 && !isStep2Valid) ||
                    (currentStep === 3 && !isStep3Valid) ||
                    (currentStep === 4 && !isStep4Valid)
                  }
                  className={`flex items-center gap-1.5 md:gap-2 px-5 md:px-6 lg:px-8 py-3 md:py-4 rounded-lg md:rounded-xl text-sm md:text-base font-semibold transition-colors whitespace-nowrap ${
                    (currentStep === 1 && !isStep1Valid) ||
                    (currentStep === 2 && !isStep2Valid) ||
                    (currentStep === 3 && !isStep3Valid) ||
                    (currentStep === 4 && !isStep4Valid)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-teal-600 text-white hover:bg-teal-700 cursor-pointer'
                  }`}
                  title={
                    (currentStep === 1 && !isStep1Valid) ? 'Veuillez remplir tous les champs obligatoires de l\'étape 1' :
                    (currentStep === 2 && !isStep2Valid) ? 'Veuillez remplir tous les champs obligatoires de l\'étape 2' :
                    (currentStep === 3 && !isStep3Valid) ? 'Veuillez remplir tous les champs obligatoires de l\'étape 3' :
                    (currentStep === 4 && !isStep4Valid) ? 'Veuillez remplir tous les champs obligatoires de l\'étape 4' :
                    ''
                  }
                >
                  Suivant
                  <i className="ri-arrow-right-line text-lg md:text-xl"></i>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-1.5 md:gap-2 px-5 md:px-6 lg:px-8 py-3 md:py-4 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line text-lg md:text-xl animate-spin"></i>
                      <span className="hidden sm:inline">{isEditMode ? 'Modification...' : 'Publication...'}</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-check-line text-lg md:text-xl"></i>
                      <span className="hidden sm:inline">Publier l'annonce</span>
                      <span className="sm:hidden">Publier</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
