import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';
interface ProfessionalDocument {
  type: 'professional_card' | 'rcs_extract' | 'id_card' | 'insurance_certificate';
  name: string;
  url: string | null;
  size: string;
  uploadDate: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface OpeningHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export default function ProfessionalTab() {
  const navigate = useNavigate();
  const { sendEmail } = useEmail();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [isProfessional, setIsProfessional] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const previousDocumentsRef = useRef<Record<string, ProfessionalDocument>>({
    professional_card: { type: 'professional_card', name: '', url: null, size: '', uploadDate: '', status: 'pending' },
    rcs_extract: { type: 'rcs_extract', name: '', url: null, size: '', uploadDate: '', status: 'pending' },
    id_card: { type: 'id_card', name: '', url: null, size: '', uploadDate: '', status: 'pending' },
    insurance_certificate: { type: 'insurance_certificate', name: '', url: null, size: '', uploadDate: '', status: 'pending' },
  });
  
  const [formData, setFormData] = useState({
    companyName: '',
    siret: '',
    profession: 'agent',
    licenseNumber: '',
    companyAddress: '',
    companyCity: '',
    companyPostalCode: '',
    companyPhone: '',
    companyEmail: '',
    website: '',
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    description: '',
    specialties: [] as string[],
  });

  // Documents professionnels individuels
  const [professionalDocuments, setProfessionalDocuments] = useState<Record<string, ProfessionalDocument>>({
    professional_card: {
      type: 'professional_card',
      name: '',
      url: null,
      size: '',
      uploadDate: '',
      status: 'pending',
    },
    rcs_extract: {
      type: 'rcs_extract',
      name: '',
      url: null,
      size: '',
      uploadDate: '',
      status: 'pending',
    },
    id_card: {
      type: 'id_card',
      name: '',
      url: null,
      size: '',
      uploadDate: '',
      status: 'pending',
    },
    insurance_certificate: {
      type: 'insurance_certificate',
      name: '',
      url: null,
      size: '',
      uploadDate: '',
      status: 'pending',
    },
  });

  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([
    { day: 'Lundi', open: '09:00', close: '18:00', closed: false },
    { day: 'Mardi', open: '09:00', close: '18:00', closed: false },
    { day: 'Mercredi', open: '09:00', close: '18:00', closed: false },
    { day: 'Jeudi', open: '09:00', close: '18:00', closed: false },
    { day: 'Vendredi', open: '09:00', close: '18:00', closed: false },
    { day: 'Samedi', open: '09:00', close: '12:00', closed: false },
    { day: 'Dimanche', open: '09:00', close: '18:00', closed: true },
  ]);

  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activityPhotos, setActivityPhotos] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [professionalTypes, setProfessionalTypes] = useState<Array<{ name: string; label: string; icon: string }>>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  useEffect(() => {
    loadUserData();
    loadCities();
    loadProfessionalTypes();
  }, []);

  const loadProfessionalTypes = async () => {
    try {
      setLoadingTypes(true);
      const { data, error } = await supabase
        .from('professional_types')
        .select('name, label, icon')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des types de professionnels:', error);
        return;
      }

      if (data && data.length > 0) {
        setProfessionalTypes(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types de professionnels:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  // Mettre à jour searchCity quand formData.companyCity change
  useEffect(() => {
    setSearchCity(formData.companyCity || '');
  }, [formData.companyCity]);

  // Filtrer les villes selon la recherche en temps réel et afficher les 5 premiers résultats
  useEffect(() => {
    if (searchCity.trim().length > 0 && cities.length > 0) {
      const searchTerm = searchCity.toLowerCase().trim();
      const filtered = cities
        .filter(city => 
          city && typeof city === 'string' && city.toLowerCase().includes(searchTerm)
        )
        .slice(0, 5);
      
      setFilteredCities(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowDropdown(false);
    }
  }, [searchCity, cities]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.city-search-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const loadCities = async () => {
    try {
      const { data: localitiesData, error } = await supabase
        .from('localities')
        .select('commune')
        .not('commune', 'is', null);
      if (error) {
        console.error('Erreur lors du chargement des communes:', error);
        return;
      }

      const uniqueCities = [...new Set(localitiesData.map(item => item.commune).filter(Boolean))].sort();
      setCities(uniqueCities);
    } catch (error) {
      console.error('Erreur lors du chargement des communes:', error);
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      setUserId(user.id);

      // Charger les données depuis la table users
      const { data: userData, error: fetchError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      if (userData) {
        const isPro = userData.user_type === 'professional';
        setIsProfessional(isPro);

        if (isPro) {
          setFormData({
            companyName: userData.company_name || '',
            siret: userData.siret || '',
            profession: userData.profession_type || '',
            licenseNumber: userData.professional_card || '',
            companyAddress: userData.company_address || '',
            companyCity: userData.city || '',
            companyPostalCode: userData.postal_code || '',
            companyPhone: userData.phone || '',
            companyEmail: userData.email || '',
            website: userData.website || '',
            facebookUrl: userData.facebook_url || '',
            instagramUrl: userData.instagram_url || '',
            linkedinUrl: userData.linkedin_url || '',
            tiktokUrl: userData.tiktok_url || '',
            youtubeUrl: userData.youtube_url || '',
            description: userData.description || '',
            specialties: userData.specialties || [],
          });

          // Charger les photos d'activité
          if (userData.activity_photos && Array.isArray(userData.activity_photos)) {
            setActivityPhotos(userData.activity_photos);
          }

          // Charger les certifications
          if (userData.certifications && Array.isArray(userData.certifications)) {
            setCertifications(userData.certifications);
          }

          // Charger les horaires d'ouverture
          if (userData.opening_hours && typeof userData.opening_hours === 'object') {
            try {
              const hours = Array.isArray(userData.opening_hours) 
                ? userData.opening_hours 
                : Object.values(userData.opening_hours);
              if (hours.length > 0) {
                setOpeningHours(hours as OpeningHours[]);
              }
            } catch (err) {
              console.error('Erreur lors du chargement des horaires:', err);
            }
          }

          // Charger la photo de couverture
          if (userData.photo_url) {
            setCoverPhoto(userData.photo_url);
          }

          // Charger les documents professionnels
          if (userData.professional_documents && typeof userData.professional_documents === 'object') {
            try {
              const docs = userData.professional_documents as Record<string, any>;
              const loadedDocs = {
                professional_card: docs.professional_card || {
                  type: 'professional_card',
                  name: '',
                  url: null,
                  size: '',
                  uploadDate: '',
                  status: 'pending',
                },
                rcs_extract: docs.rcs_extract || {
                  type: 'rcs_extract',
                  name: '',
                  url: null,
                  size: '',
                  uploadDate: '',
                  status: 'pending',
                },
                id_card: docs.id_card || {
                  type: 'id_card',
                  name: '',
                  url: null,
                  size: '',
                  uploadDate: '',
                  status: 'pending',
                },
                insurance_certificate: docs.insurance_certificate || {
                  type: 'insurance_certificate',
                  name: '',
                  url: null,
                  size: '',
                  uploadDate: '',
                  status: 'pending',
                },
              };
              setProfessionalDocuments(loadedDocs);
              previousDocumentsRef.current = loadedDocs;
            } catch (err) {
              console.error('Erreur lors du chargement des documents:', err);
            }
          }

          // Charger le statut de vérification
          setVerificationStatus(userData.status || 'pending');
        }
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données professionnelles');
    } finally {
      setLoading(false);
    }
  };

  const specialtiesList = [
    'Vente résidentielle',
    'Location',
    'Immobilier de luxe',
    'Immobilier commercial',
    'Gestion locative',
    'Investissement',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.includes(specialty)
        ? formData.specialties.filter(s => s !== specialty)
        : [...formData.specialties, specialty],
    });
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentType: 'professional_card' | 'rcs_extract' | 'id_card' | 'insurance_certificate'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${documentType}-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('professional-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('professional-assets')
        .getPublicUrl(filePath);

      const fileSize = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      const uploadDate = new Date().toISOString().split('T')[0];

      setProfessionalDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          name: file.name,
          url: publicUrl,
          size: fileSize,
          uploadDate: uploadDate,
          status: 'pending',
        },
      }));
    } catch (error) {
      console.error(`Erreur upload document ${documentType}:`, error);
      alert(`Erreur lors du téléchargement du document: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handleRemoveDocument = (documentType: 'professional_card' | 'rcs_extract' | 'id_card' | 'insurance_certificate') => {
    setProfessionalDocuments(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        name: '',
        url: null,
        size: '',
        uploadDate: '',
        status: 'pending',
      },
    }));
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-cover-${Date.now()}.${fileExt}`;
        const filePath = `cover-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('professional-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('professional-assets')
          .getPublicUrl(filePath);

        setCoverPhoto(publicUrl);
      } catch (error) {
        console.error('Erreur upload photo de couverture:', error);
        alert('Erreur lors du téléchargement de la photo de couverture');
      }
    }
  };

  const handleActivityPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-photo-${Date.now()}.${fileExt}`;
        const filePath = `activity-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('professional-assets')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('professional-assets')
          .getPublicUrl(filePath);

        setActivityPhotos([...activityPhotos, publicUrl]);
      } catch (error) {
        console.error('Erreur upload photo:', error);
      }
    }
  };

  const removeActivityPhoto = (index: number) => {
    setActivityPhotos(activityPhotos.filter((_, i) => i !== index));
  };

  const updateOpeningHours = (index: number, field: keyof OpeningHours, value: string | boolean) => {
    const updated = [...openingHours];
    updated[index] = { ...updated[index], [field]: value };
    setOpeningHours(updated);
  };

  const addCertification = () => {
    setCertifications([...certifications, '']);
  };

  const updateCertification = (index: number, value: string) => {
    const updated = [...certifications];
    updated[index] = value;
    setCertifications(updated);
  };

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setShowSuccess(false);

    try {
      if (!userId) {
        throw new Error('Utilisateur non connecté');
      }

      // Préparer les données pour la mise à jour
      const updateData: Record<string, any> = {
        user_type: 'professional',
        company_name: formData.companyName,
        siret: formData.siret,
        professional_card: formData.licenseNumber,
        profession_type: formData.profession || null,
        company_address: formData.companyAddress,
        city: formData.companyCity,
        phone: formData.companyPhone,
        email: formData.companyEmail,
        description: formData.description || null,
        specialties: formData.specialties.length > 0 ? formData.specialties : null,
        activity_photos: activityPhotos.length > 0 ? activityPhotos : null,
        certifications: certifications.length > 0 ? certifications.filter(c => c.trim() !== '') : null,
        opening_hours: openingHours.length > 0 ? openingHours : null,
        website: formData.website || null,
        facebook_url: formData.facebookUrl || null,
        instagram_url: formData.instagramUrl || null,
        linkedin_url: formData.linkedinUrl || null,
        tiktok_url: formData.tiktokUrl || null,
        youtube_url: formData.youtubeUrl || null,
        postal_code: formData.companyPostalCode || null,
      };

      // Photo de couverture
      if (coverPhoto) {
        updateData.photo_url = coverPhoto;
      }

      // Documents professionnels (stockés en JSONB)
      const newDocuments = {
        professional_card: professionalDocuments.professional_card.url ? professionalDocuments.professional_card : null,
        rcs_extract: professionalDocuments.rcs_extract.url ? professionalDocuments.rcs_extract : null,
        id_card: professionalDocuments.id_card.url ? professionalDocuments.id_card : null,
        insurance_certificate: professionalDocuments.insurance_certificate.url ? professionalDocuments.insurance_certificate : null,
      };
      updateData.professional_documents = newDocuments;

      // Détecter les nouveaux documents ajoutés
      const newDocumentsAdded: string[] = [];
      const documentTypes: Array<'professional_card' | 'rcs_extract' | 'id_card' | 'insurance_certificate'> = [
        'professional_card',
        'rcs_extract',
        'id_card',
        'insurance_certificate',
      ];

      documentTypes.forEach((docType) => {
        const newDoc = newDocuments[docType];
        const oldDoc = previousDocumentsRef.current[docType];
        
        // Si un nouveau document a été ajouté (il n'existait pas avant ou l'URL a changé)
        if (newDoc && newDoc.url && (!oldDoc || !oldDoc.url || oldDoc.url !== newDoc.url)) {
          newDocumentsAdded.push(docType);
        }
      });

      // Si c'est la première fois qu'on enregistre, définir le statut à 'pending'
      if (!verificationStatus) {
        updateData.status = 'pending';
      }

      const { error: updateError } = await supabase
        .from('users_2025_12_01_11_29')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      // Mettre à jour le statut local si nécessaire
      if (!verificationStatus) {
        setVerificationStatus('pending');
      }

      // Envoyer un email de notification si de nouveaux documents ont été ajoutés
      if (newDocumentsAdded.length > 0) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          const documentLabels: Record<string, string> = {
            professional_card: 'Carte professionnelle',
            rcs_extract: 'Extrait RCS',
            id_card: "Pièce d'identité",
            insurance_certificate: 'Assurance RC Pro',
          };

          const documentsList = newDocumentsAdded.map((type) => documentLabels[type] || type).join(', ');
          const professionalName = formData.companyName || userData.user?.email || 'Professionnel';

          await sendEmail('document_professionnel_ajoute', {
            professionalName,
            professionalEmail: userData.user?.email || '',
            siret: formData.siret || undefined,
            documentsList,
            appUrl: window.location.origin,
          });
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email de notification:', emailError);
          // Ne pas bloquer la sauvegarde si l'email échoue
        }
      }

      // Mettre à jour les documents précédents
      previousDocumentsRef.current = {
        professional_card: professionalDocuments.professional_card,
        rcs_extract: professionalDocuments.rcs_extract,
        id_card: professionalDocuments.id_card,
        insurance_certificate: professionalDocuments.insurance_certificate,
      };

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
            <i className="ri-check-line w-3 h-3 flex items-center justify-center"></i>
            Vérifié
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full whitespace-nowrap">
            <i className="ri-time-line w-3 h-3 flex items-center justify-center"></i>
            En attente
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full whitespace-nowrap">
            <i className="ri-close-line w-3 h-3 flex items-center justify-center"></i>
            Rejeté
          </span>
        );
    }
  };

  const getVerificationStatusDisplay = (status: string | null) => {
    const statusValue = status || 'pending';
    
    switch (statusValue) {
      case 'verified':
        return {
          label: 'Vérifié',
          message: 'Votre compte professionnel a été vérifié et approuvé',
          bgColor: 'from-green-50 to-green-100',
          borderColor: 'border-green-200',
          iconBg: 'bg-green-500',
          badgeBg: 'bg-green-500',
          badgeText: 'text-white',
        };
      case 'under_review':
        return {
          label: 'En cours de vérification',
          message: 'Vos documents sont en cours d\'examen par notre équipe',
          bgColor: 'from-blue-50 to-blue-100',
          borderColor: 'border-blue-200',
          iconBg: 'bg-blue-500',
          badgeBg: 'bg-blue-500',
          badgeText: 'text-white',
        };
      case 'rejected':
        return {
          label: 'Rejeté',
          message: 'Votre demande a été rejetée. Veuillez vérifier vos documents et réessayer',
          bgColor: 'from-red-50 to-red-100',
          borderColor: 'border-red-200',
          iconBg: 'bg-red-500',
          badgeBg: 'bg-red-500',
          badgeText: 'text-white',
        };
      case 'pending':
      default:
        return {
          label: 'En attente',
          message: 'Vos documents sont en attente de vérification',
          bgColor: 'from-orange-50 to-orange-100',
          borderColor: 'border-orange-200',
          iconBg: 'bg-orange-500',
          badgeBg: 'bg-orange-500',
          badgeText: 'text-white',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 sm:py-20">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl sm:text-5xl text-orange-600 animate-spin"></i>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isProfessional) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <i className="ri-briefcase-line text-orange-600 text-3xl sm:text-4xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"></i>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 px-4">
          Devenez professionnel certifié
        </h3>
        <p className="text-sm sm:text-base text-gray-600 max-w-[600px] mx-auto mb-6 sm:mb-8 px-4">
          Créez votre page professionnelle pour gagner en visibilité et crédibilité auprès de vos clients. 
          Bénéficiez d'outils avancés et d'un badge de certification après vérification de vos documents.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-[800px] mx-auto mb-8 sm:mb-10 px-4">
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <i className="ri-shield-check-line text-green-600 text-lg sm:text-xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Badge vérifié</h4>
            <p className="text-[10px] sm:text-xs text-gray-600">Certification officielle</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <i className="ri-star-line text-orange-600 text-lg sm:text-xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Visibilité accrue</h4>
            <p className="text-[10px] sm:text-xs text-gray-600">Mise en avant prioritaire</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <i className="ri-tools-line text-white text-lg sm:text-xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">Outils pro</h4>
            <p className="text-[10px] sm:text-xs text-gray-600">Fonctionnalités avancées</p>
          </div>
        </div>

        <button
          onClick={async () => {
            if (!userId) return;
            try {
              const { error } = await supabase
                .from('users_2025_12_01_11_29')
                .update({ user_type: 'professional' })
                .eq('id', userId);
              if (error) throw error;
              setIsProfessional(true);
            } catch (err: any) {
              console.error('Erreur:', err);
              setError('Erreur lors de l\'activation du mode professionnel');
            }
          }}
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap"
        >
          <span className="hidden sm:inline">Créer mon espace professionnel</span>
          <span className="sm:hidden">Créer mon espace</span>
          <i className="ri-arrow-right-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Status Banner */}
      {verificationStatus && (() => {
        const statusDisplay = getVerificationStatusDisplay(verificationStatus);
        return (
          <div className={`mb-6 sm:mb-8 p-4 sm:p-6 bg-gradient-to-r ${statusDisplay.bgColor} border ${statusDisplay.borderColor} rounded-lg sm:rounded-xl`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${statusDisplay.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <i className="ri-shield-check-line text-white text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Statut de vérification</h3>
                  <p className="text-xs sm:text-sm text-gray-700">{statusDisplay.message}</p>
                </div>
              </div>
              <span className={`px-3 sm:px-4 py-1.5 sm:py-2 ${statusDisplay.badgeBg} ${statusDisplay.badgeText} text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap`}>
                {statusDisplay.label}
              </span>
            </div>
          </div>
        );
      })()}

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 sm:gap-3">
          <i className="ri-error-warning-line text-red-600 text-lg sm:text-xl flex-shrink-0 mt-0.5"></i>
          <p className="text-xs sm:text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Cover Photo Upload */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <i className="ri-image-2-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            Photo de couverture
          </h3>

          <div className="flex items-center gap-4 sm:gap-6">
            {coverPhoto ? (
              <div className="relative w-full">
                <img
                  src={coverPhoto}
                  alt="Photo de couverture"
                  className="w-full h-32 sm:h-40 md:h-48 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setCoverPhoto(null)}
                  className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all cursor-pointer"
                >
                  <i className="ri-close-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                </button>
              </div>
            ) : (
              <label className="w-full h-32 sm:h-40 md:h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all p-4">
                <i className="ri-image-add-line text-gray-400 text-3xl sm:text-4xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mb-2"></i>
                <span className="text-xs sm:text-sm text-gray-600 font-medium text-center">Ajouter une photo de couverture</span>
                <span className="text-[10px] sm:text-xs text-gray-500 mt-1 text-center">Format recommandé : 16:9, JPG ou PNG, max 5MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverPhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Company Information */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <i className="ri-building-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            Informations de l'entreprise
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Agence Immobilière Dupont"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Numéro du régistre de commerce
              </label>
              <input
                type="text"
                name="siret"
                value={formData.siret}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="123 456 789 00012"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Profession *
              </label>
              {loadingTypes ? (
                <div className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm flex items-center justify-center">
                  <i className="ri-loader-4-line text-gray-400 animate-spin"></i>
                </div>
              ) : (
                <select
                  name="profession"
                  value={formData.profession}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">Sélectionner une profession</option>
                  {professionalTypes.map((type) => (
                    <option key={type.name} value={type.name}>
                      {type.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Numéro de carte professionnelle
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="CPI 7501 2024 000 000 001"
              />
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Adresse de l'entreprise *
            </label>
            <input
              type="text"
              name="companyAddress"
              value={formData.companyAddress}
              onChange={handleChange}
              required
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="123 Avenue des Champs-Élysées"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Ville / Commune *
              </label>
              <div className="relative city-search-container">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center z-10"></i>
                <input
                  type="text"
                  placeholder="Rechercher une ville..."
                  value={searchCity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchCity(value);
                    const cityExists = cities.some(city => 
                      city && city.toLowerCase().trim() === value.toLowerCase().trim()
                    );
                    if (value.trim() === '' || cityExists || filteredCities.some(c => c.toLowerCase() === value.toLowerCase())) {
                      setFormData({ ...formData, companyCity: value });
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && !cities.some(city => city && city.toLowerCase().trim() === value.toLowerCase().trim())) {
                      setSearchCity('');
                      setFormData({ ...formData, companyCity: '' });
                      setShowDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (filteredCities.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  required
                  className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                {showDropdown && filteredCities.length > 0 && (
                  <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden top-full">
                    {filteredCities.slice(0, 5).map((city, index) => (
                      <button
                        key={`city-${city}-${index}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSearchCity(city);
                          setFormData({ ...formData, companyCity: city });
                          setShowDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 active:bg-orange-100 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0 cursor-pointer focus:outline-none focus:bg-orange-50"
                      >
                        <i className="ri-map-pin-line text-orange-600 w-4 h-4 flex items-center justify-center flex-shrink-0"></i>
                        <span className="text-sm text-gray-900 flex-1">{city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Téléphone professionnel *
              </label>
              <input
                type="tel"
                name="companyPhone"
                value={formData.companyPhone}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="+33 1 23 45 67 89"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Email professionnel *
              </label>
              <input
                type="email"
                name="companyEmail"
                value={formData.companyEmail}
                onChange={handleChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="contact@agence-dupont.fr"
              />
            </div>
          </div>

          

          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Description de votre activité
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Présentez votre entreprise, vos services et votre expertise..."
            ></textarea>
            <div className="text-xs text-gray-500 mt-1 text-right">
              {formData.description.length}/500 caractères
            </div>
          </div>

          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Site web
            </label>
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://www.agence-koffi.fr"
            />
          </div>
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Facebook
            </label>
            <input
              type="text"
              name="facebookUrl"
              value={formData.facebookUrl}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://www.facebook.com/agence-koffi"
            />
          </div>
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Instagram
            </label>
            <input
              type="text"
              name="instagramUrl"
              value={formData.instagramUrl}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://www.instagram.com/agence-koffi"
            />
          </div>
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              LinkedIn
            </label>
            <input
              type="text"
              name="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://www.linkedin.com/company/agence-koffi"
            />
          </div>
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              TikTok
            </label>
            <input
              type="text"
              name="tiktokUrl"
              value={formData.tiktokUrl}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://www.tiktok.com/@agence-koffi"
            />
          </div>
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              YouTube
            </label>
            <input
              type="text"
              name="youtubeUrl"
              value={formData.youtubeUrl}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="https://www.youtube.com/@agence-koffi"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
              Spécialités
            </label>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {specialtiesList.map((specialty) => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => toggleSpecialty(specialty)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    formData.specialties.includes(specialty)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Photos */}
        <div className="mb-6 sm:mb-8 pt-6 sm:pt-8 border-t border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <i className="ri-gallery-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            Photos d'activité
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
            {activityPhotos.map((photo, index) => (
              <div key={index} className="relative">
                <img
                  src={photo}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-24 sm:h-28 md:h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeActivityPhoto(index)}
                  className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all cursor-pointer"
                >
                  <i className="ri-close-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                </button>
              </div>
            ))}
            
            {activityPhotos.length < 8 && (
              <label className="w-full h-24 sm:h-28 md:h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-all p-2">
                <i className="ri-add-line text-gray-400 text-2xl sm:text-3xl w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mb-1"></i>
                <span className="text-[10px] sm:text-xs text-gray-600">Ajouter photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleActivityPhotoUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <p className="text-[10px] sm:text-xs text-gray-500">
            Ajoutez jusqu'à 8 photos de votre activité (bureaux, équipe, réalisations...)
          </p>
        </div>

        {/* Opening Hours */}
        <div className="mb-6 sm:mb-8 pt-6 sm:pt-8 border-t border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <i className="ri-time-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            Horaires d'ouverture
          </h3>

          <div className="space-y-2 sm:space-y-3">
            {openingHours.map((hours, index) => (
              <div key={hours.day} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-full sm:w-32">
                  <span className="text-xs sm:text-sm font-semibold text-gray-900">{hours.day}</span>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4 flex-1 w-full sm:w-auto">
                  {!hours.closed ? (
                    <>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) => updateOpeningHours(index, 'open', e.target.value)}
                        className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) => updateOpeningHours(index, 'close', e.target.value)}
                        className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm text-gray-500">Fermé</span>
                  )}
                  
                  <label className="flex items-center gap-2 sm:ml-auto cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hours.closed}
                      onChange={(e) => updateOpeningHours(index, 'closed', e.target.checked)}
                      className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-gray-600">Fermé</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mb-6 sm:mb-8 pt-6 sm:pt-8 border-t border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <i className="ri-award-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            Certifications et labels
          </h3>

          <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
            {certifications.map((cert, index) => (
              <div key={index} className="flex items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  value={cert}
                  onChange={(e) => updateCertification(index, e.target.value)}
                  placeholder="Ex: Certification ISO 9001..."
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                >
                  <i className="ri-delete-bin-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addCertification}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
            Ajouter une certification
          </button>
        </div>

        {/* Documents Section */}
        <div className="mb-6 sm:mb-8 pt-6 sm:pt-8 border-t border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
            <i className="ri-file-text-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
            Documents de vérification
          </h3>

          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2 sm:gap-3">
              <i className="ri-information-line text-orange-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center mt-0.5 flex-shrink-0"></i>
              <div className="text-xs sm:text-sm text-gray-700">
                <p className="font-semibold mb-1">Documents requis pour la vérification :</p>
                <ul className="list-disc list-inside space-y-1 text-[10px] sm:text-xs">
                  <li>Carte professionnelle en cours de validité</li>
                  <li>Extrait du registre du commerce et des sociétés</li>
                  <li>Pièce d'identité du représentant légal</li>
                  <li>Attestation d'assurance responsabilité civile professionnelle</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Documents individuels */}
          <div className="space-y-3 sm:space-y-4">
            {/* Carte professionnelle */}
            <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-file-text-line text-orange-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900">Carte professionnelle en cours de validité</h4>
                    {professionalDocuments.professional_card.url ? (
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                        {professionalDocuments.professional_card.name} • {professionalDocuments.professional_card.size} • {professionalDocuments.professional_card.uploadDate}
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-gray-500">Aucun document téléchargé</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end sm:justify-start">
                  {professionalDocuments.professional_card.url && getStatusBadge(professionalDocuments.professional_card.status)}
                  {professionalDocuments.professional_card.url ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument('professional_card')}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-delete-bin-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    </button>
                  ) : (
                    <label className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all cursor-pointer whitespace-nowrap">
                      <i className="ri-upload-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center inline-block mr-1 sm:mr-2"></i>
                      Télécharger
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, 'professional_card')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Extrait du registre du commerce */}
            <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-file-text-line text-orange-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900">Extrait du registre du commerce et des sociétés</h4>
                    {professionalDocuments.rcs_extract.url ? (
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                        {professionalDocuments.rcs_extract.name} • {professionalDocuments.rcs_extract.size} • {professionalDocuments.rcs_extract.uploadDate}
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-gray-500">Aucun document téléchargé</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end sm:justify-start">
                  {professionalDocuments.rcs_extract.url && getStatusBadge(professionalDocuments.rcs_extract.status)}
                  {professionalDocuments.rcs_extract.url ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument('rcs_extract')}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-delete-bin-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    </button>
                  ) : (
                    <label className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all cursor-pointer whitespace-nowrap">
                      <i className="ri-upload-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center inline-block mr-1 sm:mr-2"></i>
                      Télécharger
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, 'rcs_extract')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Pièce d'identité */}
            <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-file-text-line text-orange-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900">Pièce d'identité du représentant légal</h4>
                    {professionalDocuments.id_card.url ? (
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                        {professionalDocuments.id_card.name} • {professionalDocuments.id_card.size} • {professionalDocuments.id_card.uploadDate}
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-gray-500">Aucun document téléchargé</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end sm:justify-start">
                  {professionalDocuments.id_card.url && getStatusBadge(professionalDocuments.id_card.status)}
                  {professionalDocuments.id_card.url ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument('id_card')}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-delete-bin-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    </button>
                  ) : (
                    <label className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all cursor-pointer whitespace-nowrap">
                      <i className="ri-upload-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center inline-block mr-1 sm:mr-2"></i>
                      Télécharger
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, 'id_card')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Attestation d'assurance */}
            <div className="p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-file-text-line text-orange-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-900">Attestation d'assurance responsabilité civile professionnelle</h4>
                    {professionalDocuments.insurance_certificate.url ? (
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                        {professionalDocuments.insurance_certificate.name} • {professionalDocuments.insurance_certificate.size} • {professionalDocuments.insurance_certificate.uploadDate}
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-gray-500">Aucun document téléchargé</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end sm:justify-start">
                  {professionalDocuments.insurance_certificate.url && getStatusBadge(professionalDocuments.insurance_certificate.status)}
                  {professionalDocuments.insurance_certificate.url ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument('insurance_certificate')}
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-delete-bin-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    </button>
                  ) : (
                    <label className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-orange-600 transition-all cursor-pointer whitespace-nowrap">
                      <i className="ri-upload-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center inline-block mr-1 sm:mr-2"></i>
                      Télécharger
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleDocumentUpload(e, 'insurance_certificate')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 sm:gap-3">
            <i className="ri-check-circle-fill text-green-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            <span className="text-xs sm:text-sm font-medium text-green-800">
              Vos informations professionnelles ont été enregistrées avec succès
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            type="button"
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
          >
            Annuler
          </button>
          {isProfessional && userId && (
            <button
              type="button"
              onClick={() => navigate(`/professionnel/${userId}`)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-teal-600 text-teal-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-teal-50 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              <i className="ri-eye-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              <span className="hidden sm:inline">Voir ma page publique</span>
              <span className="sm:hidden">Ma page</span>
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin w-4 h-4 flex items-center justify-center"></i>
                <span className="hidden sm:inline">Enregistrement...</span>
                <span className="sm:hidden">Enregistrement</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Enregistrer les modifications</span>
                <span className="sm:hidden">Enregistrer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
