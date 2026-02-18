import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';
import { generateLeasePDF } from '../../../utils/leasePdfGenerator';

interface RentalDetailViewProps {
  rental: any;
  onBack: () => void;
}

export default function RentalDetailView({ rental, onBack }: RentalDetailViewProps) {
  const { sendEmail } = useEmail();
  const [activeTab, setActiveTab] = useState<'property' | 'payments'>('payments');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRent, setSelectedRent] = useState<any>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageData, setMessageData] = useState({
    message: '',
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [propertyDetails, setPropertyDetails] = useState<any>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'paydunya'>('stripe');
  const [inventories, setInventories] = useState<any[]>([]);
  const [loadingInventories, setLoadingInventories] = useState(true);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentPhotoList, setCurrentPhotoList] = useState<string[]>([]);
  const [showInstallmentDetailModal, setShowInstallmentDetailModal] = useState(false);
  const [selectedRentForDetail, setSelectedRentForDetail] = useState<any>(null);

  const formatPrice = (n: number) => `${Number(n).toLocaleString('fr-FR')} FCFA`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Charger les détails complets de la propriété depuis properties_02
  useEffect(() => {
    if (rental?.property_02_id) {
      loadPropertyDetails();
    }
  }, [rental?.property_02_id]);

  // Charger les états des lieux
  useEffect(() => {
    if (rental?.id) {
      loadInventories();
    }
  }, [rental?.id]);

  const loadPropertyDetails = async () => {
    if (!rental?.property_02_id) {
      setLoadingProperty(false);
      return;
    }

    try {
      setLoadingProperty(true);
      const { data, error } = await supabase
        .from('properties_02')
        .select('*')
        .eq('id', rental.property_02_id)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors du chargement de la propriété:', error);
        setPropertyDetails(null);
        return;
      }

      if (data) {
        setPropertyDetails(data);
      } else {
        console.warn('Propriété non trouvée pour property_02_id:', rental.property_02_id);
        setPropertyDetails(null);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la propriété:', error);
      setPropertyDetails(null);
    } finally {
      setLoadingProperty(false);
    }
  };

  const loadInventories = async () => {
    if (!rental?.id) {
      setLoadingInventories(false);
      return;
    }

    try {
      setLoadingInventories(true);
      const { data, error } = await supabase
        .from('lease_inventories')
        .select('*')
        .eq('lease_id', rental.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des états des lieux:', error);
        setInventories([]);
        return;
      }

      setInventories(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des états des lieux:', error);
      setInventories([]);
    } finally {
      setLoadingInventories(false);
    }
  };

  const openPhotoGallery = (photos: string[], startIndex: number = 0) => {
    if (photos.length === 0) return;
    setCurrentPhotoList(photos);
    setCurrentPhotoIndex(startIndex);
    setShowPhotoGallery(true);
  };

  // Navigation dans la galerie
  const goToPreviousPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentPhotoList.length - 1));
  };

  const goToNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev < currentPhotoList.length - 1 ? prev + 1 : 0));
  };

  // Gestion des touches clavier pour la navigation
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
  }, [showPhotoGallery, currentPhotoList.length, currentPhotoIndex]);

  const handlePayRent = (rent: any) => {
    setSelectedRent(rent);
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedRent) return;

    setProcessingPayment(true);
    try {
      // Récupérer l'email du locataire
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: tenantData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('email, full_name, phone')
        .eq('id', user.id)
        .single();

      if (!tenantData) throw new Error('Données utilisateur non trouvées');

      // Vérifier que le numéro de téléphone est présent pour PayDunya
      if (selectedPaymentMethod === 'paydunya' && !tenantData.phone) {
        throw new Error('Numéro de téléphone requis pour le paiement Mobile Money. Veuillez compléter votre profil.');
      }

      // Déterminer l'URL de l'API selon la méthode de paiement
      const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api';
      const apiUrl = selectedPaymentMethod === 'paydunya' 
        ? `${EMAIL_API_URL}/create-paydunya-payment`
        : `${EMAIL_API_URL}/create-payment-session`;
      
      // Extraire le montant numérique
      // Priorité: amountNumber (si disponible) > amount (peut être formaté comme "100 000 FCFA")
      let amountValue: number;
      
      if (selectedRent.amountNumber !== undefined && !isNaN(selectedRent.amountNumber)) {
        // Utiliser amountNumber s'il est disponible (plus fiable)
        amountValue = Number(selectedRent.amountNumber);
      } else if (typeof selectedRent.amount === 'string') {
        // Si c'est une chaîne formatée, extraire le nombre (enlever "FCFA", espaces, etc.)
        const numericString = selectedRent.amount.replace(/[^\d,.]/g, '').replace(',', '.');
        amountValue = parseFloat(numericString);
      } else {
        // Sinon, convertir directement
        amountValue = Number(selectedRent.amount);
      }

      // Vérifier que le montant est valide
      if (isNaN(amountValue) || amountValue <= 0) {
        console.error('❌ Montant invalide:', {
          amount: selectedRent.amount,
          amountNumber: selectedRent.amountNumber,
          amountValue,
        });
        throw new Error(`Montant invalide: ${selectedRent.amount}. Veuillez contacter le support.`);
      }


      
      // Vérifier que le paymentId est présent
      if (!selectedRent.id) {
        console.error('❌ ERREUR: paymentId manquant dans selectedRent');
        console.error('   • selectedRent:', selectedRent);
        throw new Error('ID du paiement manquant. Impossible de créer la session de paiement.');
      }

      console.log('📡 Tentative de connexion à:', apiUrl);
      console.log('🌐 EMAIL_API_URL:', EMAIL_API_URL);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountValue,
          month: selectedRent.month,
          propertyTitle: rental.property_title || rental.property,
          tenantEmail: tenantData.email,
          tenantName: tenantData.full_name || 'Locataire',
          tenantPhone: tenantData.phone || '',
          leaseId: rental.id,
          paymentId: selectedRent.id,
          origin: window.location.origin,
        }),
      });

      console.log('📡 Réponse du serveur:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur serveur:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création de la demande de paiement');
      }

      // PayDunya envoie un SMS au client avec un code de paiement
      // Il n'y a pas de redirection vers une page de paiement
      if (result.requiresSMSConfirmation) {
        alert(`✅ Demande de paiement créée avec succès !\n\nUn SMS avec le code de paiement a été envoyé au numéro ${tenantData.phone}.\n\nVeuillez suivre les instructions dans le SMS pour confirmer le paiement.`);
        setShowPaymentModal(false);
        setProcessingPayment(false);
        // Recharger la page pour mettre à jour le statut du paiement
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (result.url) {
        // Pour Stripe, rediriger vers la page de paiement
        window.location.href = result.url;
      } else {
        throw new Error('Réponse inattendue du serveur de paiement');
      }
    } catch (error: any) {
      console.error('Erreur lors de la création du paiement:', error);
      alert(`Erreur lors de la création du paiement: ${error.message || 'Erreur inconnue'}`);
      setProcessingPayment(false);
    }
  };

  const handleDownloadReceipt = async (rent: any) => {
    try {
      console.log('📄 Génération de la quittance pour:', rent);
      
      // Récupérer les données complètes du paiement depuis Supabase
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', rent.id)
        .single();

      if (paymentError || !paymentData) {
        console.error('Erreur lors de la récupération du paiement:', paymentError);
        alert('Impossible de récupérer les données du paiement pour générer la quittance.');
        return;
      }

      // Récupérer les informations du bail
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select('*')
        .eq('id', rental.id)
        .single();

      if (leaseError || !leaseData) {
        console.error('Erreur lors de la récupération du bail:', leaseError);
        alert('Impossible de récupérer les données du bail pour générer la quittance.');
        return;
      }

      // Récupérer les informations du locataire
      // Privilégier users_2025_12_01_11_29, sinon utiliser tenants
      let tenantData = null;
      
      // D'abord récupérer l'email depuis tenants
      const { data: tenantDataFromTenants } = await supabase
        .from('tenants')
        .select('email, first_name, last_name')
        .eq('id', leaseData.tenant_id)
        .single();

      if (tenantDataFromTenants?.email) {
        // Chercher dans users_2025_12_01_11_29 par email (priorité)
        const { data: userData } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email')
          .eq('email', tenantDataFromTenants.email)
          .single();

        if (userData?.full_name) {
          // Utiliser les données de users_2025_12_01_11_29
          tenantData = {
            full_name: userData.full_name,
            email: userData.email || tenantDataFromTenants.email,
          };
        } else {
          // Fallback sur first_name + last_name de tenants
          tenantData = {
            full_name: `${tenantDataFromTenants.first_name || ''} ${tenantDataFromTenants.last_name || ''}`.trim() || 'Locataire',
            email: tenantDataFromTenants.email,
          };
        }
      } else if (tenantDataFromTenants) {
        // Pas d'email, utiliser first_name + last_name de tenants
        tenantData = {
          full_name: `${tenantDataFromTenants.first_name || ''} ${tenantDataFromTenants.last_name || ''}`.trim() || 'Locataire',
          email: tenantDataFromTenants.email || '',
        };
      }

      // Récupérer les informations du propriétaire
      let ownerData = null;
      if (propertyDetails && propertyDetails.owner_id) {
        const { data: owner, error: ownerError } = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email')
          .eq('id', propertyDetails.owner_id)
          .single();
        
        if (!ownerError && owner) {
          ownerData = owner;
        }
      }

      // Extraire le mois et l'année du paiement
      const paymentDate = new Date(paymentData.due_date);
      const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                          'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
      const month = monthNames[paymentDate.getMonth()];
      const year = paymentDate.getFullYear();

      // Générer le HTML de la quittance
      const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { color: #14B8A6; margin: 0; }
    .info-section { margin: 30px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .label { font-weight: bold; color: #374151; }
    .value { color: #1F2937; }
    .amount-box { background-color: #F0FDFA; border: 2px solid #14B8A6; padding: 20px; text-align: center; margin: 30px 0; border-radius: 8px; }
    .amount-box .amount { font-size: 32px; font-weight: bold; color: #14B8A6; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #6B7280; }
    .signature { margin-top: 60px; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h1>QUITTANCE DE LOYER</h1>
    <p>N° REC-${paymentData.id.substring(0, 8).toUpperCase()}</p>
  </div>

  <div class="info-section">
    <h3>Propriétaire</h3>
    <div class="info-row">
      <span class="label">Nom :</span>
      <span class="value">${ownerData?.full_name || rental.owner_name || 'Propriétaire'}</span>
    </div>
  </div>

  <div class="info-section">
    <h3>Locataire</h3>
    <div class="info-row">
      <span class="label">Nom :</span>
      <span class="value">${tenantData?.full_name || 'Locataire'}</span>
    </div>
    ${tenantData?.email ? `
    <div class="info-row">
      <span class="label">Email :</span>
      <span class="value">${tenantData.email}</span>
    </div>
    ` : ''}
  </div>

  <div class="info-section">
    <h3>Bien loué</h3>
    <div class="info-row">
      <span class="label">Adresse :</span>
      <span class="value">${rental.property_address || propertyDetails?.address || 'Adresse non renseignée'}</span>
    </div>
  </div>

  <div class="info-section">
    <h3>Détails du paiement</h3>
    <div class="info-row">
      <span class="label">Période :</span>
      <span class="value">${month} ${year}</span>
    </div>
    <div class="info-row">
      <span class="label">Date de paiement :</span>
      <span class="value">${new Date(paymentData.payment_date).toLocaleDateString('fr-FR')}</span>
    </div>
    <div class="info-row">
      <span class="label">Moyen de paiement :</span>
      <span class="value">${paymentData.payment_method === 'stripe' ? 'Carte bancaire (Stripe)' : paymentData.payment_method || 'Non spécifié'}</span>
    </div>
  </div>

  <div class="amount-box">
    <p style="margin: 0; color: #374151;">Montant payé</p>
    <div class="amount">${parseFloat(paymentData.amount).toLocaleString('fr-FR')} FCFA</div>
  </div>

  <p style="text-align: center; color: #6B7280;">
    Je soussigné(e) ${ownerData?.full_name || rental.owner_name || 'Propriétaire'}, propriétaire du bien situé ${rental.property_address || propertyDetails?.address || 'Adresse non renseignée'}, 
    certifie avoir reçu de ${tenantData?.full_name || 'Locataire'} la somme de ${parseFloat(paymentData.amount).toLocaleString('fr-FR')} FCFA au titre du loyer 
    pour la période de ${month} ${year}.
  </p>

  <div class="signature">
    <p>Fait le ${new Date(paymentData.payment_date).toLocaleDateString('fr-FR')}</p>
    <p style="margin-top: 40px;">Signature du propriétaire</p>
  </div>

  <div class="footer">
    <p>Mestoits - Gestion locative</p>
    <p>contact@mestoits.com</p>
  </div>
</body>
</html>`;

      // Créer un blob et télécharger
      const blob = new Blob([receiptHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quittance-${month}-${year}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Quittance téléchargée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la génération de la quittance:', error);
      alert(`Erreur lors de la génération de la quittance: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingMessage(true);
    setMessageError('');
    setMessageSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Récupérer les informations du propriétaire
      const { data: ownerData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name, email')
        .eq('id', rental.owner_id)
        .single();

      // Récupérer les informations de l'expéditeur
      const { data: senderData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Envoyer le message avec 'content' et 'read' (pas 'is_read')
      const { error } = await supabase.from('messages_2025_12_01_11_29').insert({
        sender_id: user.id,
        receiver_id: rental.owner_id,
        content: messageData.message.trim(), // Utiliser 'content' au lieu de 'message'
        property_02_id: rental.property_02_id || null,
        read: false, // Utiliser 'read' au lieu de 'is_read'
      });

      if (error) throw error;

      // Envoyer un email de notification au propriétaire
      if (ownerData && senderData) {
        const ownerName = ownerData.full_name || 'Propriétaire';
        const senderName = senderData.full_name || 'Locataire';
        
        const emailResult = await sendEmail('nouveau_message', {
          receiverEmail: ownerData.email,
          receiverName: ownerName,
          senderName: senderName,
          propertyTitle: rental.property_title,
          messagePreview: messageData.message.trim(),
          appUrl: window.location.origin,
        });

        // Ne pas bloquer l'interface si l'email échoue
        if (!emailResult.success) {
          console.warn('Email de notification non envoyé:', emailResult.error);
        }
      }

      setMessageSuccess(true);
      setMessageData({ message: '' });
      setTimeout(() => {
        setShowMessageModal(false);
        setMessageSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setMessageError(`Une erreur est survenue lors de l'envoi du message: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Fonction pour télécharger le PDF du bail
  const handleDownloadLeasePDF = async () => {
    try {
      setProcessingPayment(true);
      
      // Charger toutes les données nécessaires pour le PDF
      const leaseDataResult = await supabase
        .from('leases')
        .select('*, tenant_id')
        .eq('id', rental.id)
        .single();

      if (leaseDataResult.error) throw leaseDataResult.error;
      const leaseData = leaseDataResult.data;

      // Charger les données en parallèle
      const [propertyDataResult, tenantDataResult, ownerDataResult, currentUserResult] = await Promise.all([
        supabase
          .from('properties_02')
          .select('title, address, city, surface_area, rooms, bedrooms, bathrooms')
          .eq('id', rental.property_02_id)
          .single(),
        supabase
          .from('tenants')
          .select('first_name, last_name, email, phone')
          .eq('id', leaseData.tenant_id)
          .single(),
        supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email, phone')
          .eq('id', rental.owner_id)
          .single(),
        supabase.auth.getUser(),
      ]);

      if (propertyDataResult.error) throw propertyDataResult.error;
      if (tenantDataResult.error) throw tenantDataResult.error;
      if (ownerDataResult.error) throw ownerDataResult.error;

      const propertyData = propertyDataResult.data;
      const tenantData = tenantDataResult.data;
      const ownerData = ownerDataResult.data;
      const currentUser = currentUserResult.data.user;

      // Récupérer les informations du locataire depuis users_2025_12_01_11_29 si disponible
      let tenantName = tenantData ? `${tenantData.first_name || ''} ${tenantData.last_name || ''}`.trim() : 'Locataire';
      let tenantEmail = tenantData?.email || '';
      let tenantPhone = tenantData?.phone || '';

      if (tenantData?.email && currentUser) {
        const userDataResult = await supabase
          .from('users_2025_12_01_11_29')
          .select('full_name, email, phone')
          .eq('email', tenantData.email)
          .single();

        if (!userDataResult.error && userDataResult.data) {
          tenantName = userDataResult.data.full_name || tenantName;
          tenantEmail = userDataResult.data.email || tenantEmail;
          tenantPhone = userDataResult.data.phone || tenantPhone;
        }
      }

      // Préparer les données pour le PDF
      const pdfData = {
        id: leaseData.id,
        property_title: propertyData?.title || rental.property_title || 'Bien inconnu',
        property_address: propertyData?.address || '',
        property_city: propertyData?.city || '',
        property_surface_area: propertyData?.surface_area || null,
        property_rooms: propertyData?.rooms || null,
        property_bedrooms: propertyData?.bedrooms || null,
        property_bathrooms: propertyData?.bathrooms || null,
        tenant_name: tenantName,
        tenant_email: tenantEmail,
        tenant_phone: tenantPhone,
        owner_name: ownerData?.full_name || rental.owner_name || 'Propriétaire',
        owner_email: ownerData?.email || '',
        owner_phone: ownerData?.phone || '',
        start_date: leaseData.start_date,
        end_date: leaseData.end_date,
        monthly_rent: leaseData.monthly_rent,
        security_deposit: leaseData.security_deposit,
        advance_rent_amount: leaseData.advance_rent_amount,
        payment_due_day: leaseData.payment_due_day,
        contract_articles: leaseData.contract_articles,
        additional_notes: leaseData.additional_notes,
        signed_at: leaseData.signed_at,
        created_at: leaseData.created_at,
      };

      // Générer le PDF
      generateLeasePDF(pdfData);
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert(`Erreur lors de la génération du PDF: ${error.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm md:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <i className="ri-arrow-left-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
        Retour à mes locations
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-0">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">{rental.property_title}</h1>
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-600 mb-3 md:mb-4">
              <i className="ri-map-pin-line text-base md:text-lg w-4 h-4 md:w-5 md:h-5 flex items-center justify-center flex-shrink-0"></i>
              <span className="break-words">{rental.property_address}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <i className="ri-user-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0"></i>
                <span>Propriétaire: <span className="font-medium">{rental.owner_name}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <i className="ri-calendar-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0"></i>
                <span className="break-words">Du {new Date(rental.start_date).toLocaleDateString()} au {new Date(rental.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="text-left lg:text-right flex-shrink-0">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Loyer mensuel</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{rental.monthly_rent.toLocaleString()} FCFA</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadLeasePDF}
            disabled={processingPayment}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <i className="ri-file-download-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            Télécharger le PDF du bail
          </button>
          <button
            onClick={() => setShowMessageModal(true)}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <i className="ri-mail-send-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            Envoyer un message au propriétaire
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-1.5 sm:p-2">
        <div className="flex gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Loyers & Paiements
          </button>
          <button
            onClick={() => setActiveTab('property')}
            className={`flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'property'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Bien & États des lieux
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'property' && (
        <div className="space-y-4 md:space-y-6">
          {/* Property Description */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Description du bien</h2>
            {loadingProperty ? (
              <div className="text-center py-6 sm:py-8">
                <i className="ri-loader-4-line text-3xl sm:text-4xl text-teal-600 animate-spin"></i>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Chargement des détails du bien...</p>
              </div>
            ) : propertyDetails ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Type de bien</p>
                    <p className="text-sm sm:text-base font-medium text-gray-900">{propertyDetails.property_type || rental.type || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Surface</p>
                    <p className="text-sm sm:text-base font-medium text-gray-900">{propertyDetails.surface_area ? `${propertyDetails.surface_area} m²` : rental.surface || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Adresse</p>
                    <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{propertyDetails.address ? `${propertyDetails.address}, ${propertyDetails.city || ''}` : rental.address || 'Non spécifié'}</p>
                  </div>
                  {propertyDetails.bedrooms && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Chambres</p>
                      <p className="text-sm sm:text-base font-medium text-gray-900">{propertyDetails.bedrooms}</p>
                    </div>
                  )}
                  {propertyDetails.bathrooms && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">Salles de bain</p>
                      <p className="text-sm sm:text-base font-medium text-gray-900">{propertyDetails.bathrooms}</p>
                    </div>
                  )}
                </div>
                {propertyDetails.description && (
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">Description</p>
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{propertyDetails.description}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <p className="text-sm sm:text-base text-gray-500">Impossible de charger les détails du bien</p>
              </div>
            )}
          </div>

          {/* Inventories (Read-only) */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">États des lieux</h2>
            
            {loadingInventories ? (
              <div className="text-center py-6 sm:py-8">
                <i className="ri-loader-4-line text-3xl sm:text-4xl text-teal-600 animate-spin"></i>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Chargement des états des lieux...</p>
              </div>
            ) : inventories && inventories.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {inventories.map((inventory: any) => (
                  <div key={inventory.id} className="border-2 border-gray-100 rounded-lg md:rounded-xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg md:rounded-xl flex-shrink-0 ${
                          inventory.type === 'entry' ? 'bg-blue-100' : 'bg-orange-100'
                        }`}>
                          <i className={`${inventory.type === 'entry' ? 'ri-login-box-line text-blue-600' : 'ri-logout-box-line text-orange-600'} text-xl sm:text-2xl`}></i>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-gray-900">
                            {inventory.type === 'entry' ? 'État des lieux d\'entrée' : 'État des lieux de sortie'}
                          </h3>
                          {inventory.date && (
                            <p className="text-xs sm:text-sm text-gray-600">Réalisé le {new Date(inventory.date).toLocaleDateString('fr-FR')}</p>
                          )}
                        </div>
                      </div>
                      {inventory.date && (
                        <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-medium self-start sm:self-auto">
                          Complété
                        </span>
                      )}
                    </div>

                    {inventory.date ? (
                      <>
                        {/* Photo thumbnails */}
                        {inventory.photos && inventory.photos.length > 0 && (
                          <div className="mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 text-xs sm:text-sm text-gray-600">
                              <i className="ri-image-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                              <span>{inventory.photos.length} photo{inventory.photos.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {inventory.photos.slice(0, 4).map((photoUrl: string, index: number) => (
                                <div
                                  key={index}
                                  onClick={() => openPhotoGallery(inventory.photos, index)}
                                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-teal-500 transition-colors cursor-pointer group"
                                >
                                  <img
                                    src={photoUrl}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  {index === 3 && inventory.photos.length > 4 && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                      <span className="text-white font-semibold text-xs sm:text-sm">
                                        +{inventory.photos.length - 4}
                                      </span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {inventory.comments && (
                          <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg p-2 sm:p-3 break-words">
                            {inventory.comments}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-500 italic">Non réalisé</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <i className="ri-file-list-line text-3xl sm:text-4xl text-gray-300 mb-2 sm:mb-3"></i>
                <p className="text-sm sm:text-base text-gray-500">Aucun état des lieux disponible</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4 md:space-y-6">
          {/* Unpaid Rents */}
          {rental.unpaidRents && rental.unpaidRents.length > 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Loyers à payer</h2>
              <div className="space-y-3">
                {rental.unpaidRents.map((rent: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => rent.installmentPlan && (setSelectedRentForDetail(rent), setShowInstallmentDetailModal(true))}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-lg md:rounded-xl border-2 border-red-200 bg-red-50 ${rent.installmentPlan ? 'cursor-pointer hover:bg-red-100/80 transition-colors' : ''}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex-shrink-0">
                        <i className="ri-error-warning-line text-red-600 text-xl sm:text-2xl"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900">{rent.month}</p>
                        <p className="text-xs sm:text-sm text-gray-600">À payer avant le {rent.dueDate}</p>
                        {rent.installmentPlan && (
                          <p className="text-xs sm:text-sm text-amber-700 mt-1">
                            Paiement échelonné • Reste: <strong>{formatPrice(rent.installmentPlan.remainingAmount)}</strong>
                            {rent.installmentPlan.remainingAmount > 0 && (
                              <span className="ml-1">• Cliquez pour voir le détail</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <span className="text-lg sm:text-xl font-bold text-gray-900">
                        {rent.installmentPlan && rent.installmentPlan.remainingAmount > 0
                          ? formatPrice(rent.installmentPlan.remainingAmount)
                          : rent.amount}
                      </span>
                      {!rent.installmentPlan ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePayRent(rent); }}
                          className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
                        >
                          Payer maintenant
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedRentForDetail(rent); setShowInstallmentDetailModal(true); }}
                          className="px-4 sm:px-6 py-2 sm:py-2.5 bg-teal-50 text-teal-600 border-2 border-teal-200 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium hover:bg-teal-100 transition-all cursor-pointer whitespace-nowrap"
                        >
                          Voir les échéances
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Historique des paiements</h2>
            
            {rental.paidRents && rental.paidRents.length > 0 ? (
              <div className="space-y-3">
                {rental.paidRents.map((rent: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-lg md:rounded-xl border-2 border-gray-100 hover:border-teal-200 transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex-shrink-0">
                        <i className="ri-check-line text-green-600 text-xl sm:text-2xl"></i>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium text-gray-900">{rent.month}</p>
                        <p className="text-xs sm:text-sm text-gray-600">Payé le {rent.paidDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <span className="text-lg sm:text-xl font-bold text-gray-900">{rent.amount}</span>
                      <button
                        onClick={() => handleDownloadReceipt(rent)}
                        className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-teal-50 text-teal-600 rounded-lg text-xs sm:text-sm font-medium hover:bg-teal-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 sm:gap-2"
                      >
                        <i className="ri-download-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                        <span className="hidden sm:inline">Télécharger la quittance</span>
                        <span className="sm:hidden">Télécharger</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <i className="ri-file-list-line text-3xl sm:text-4xl text-gray-300 mb-2 sm:mb-3"></i>
                <p className="text-sm sm:text-base text-gray-500">Aucun paiement effectué</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedRent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Confirmer le paiement</h3>
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedRent(null); }}
                className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
              >
                <i className="ri-close-line text-xl sm:text-2xl"></i>
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg md:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Période</span>
                  <span className="font-medium text-gray-900 text-right break-words ml-2">{selectedRent.month}</span>
                </div>
                <div className="flex items-center justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Bien</span>
                  <span className="font-medium text-gray-900 text-right break-words ml-2">{rental.property}</span>
                </div>
                <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200">
                  <span className="text-base sm:text-lg font-bold text-gray-900">Montant total</span>
                  <span className="text-xl sm:text-2xl font-bold text-teal-600">{selectedRent.amount}</span>
                </div>
              </div>
            </div>

            {/* Sélection de la méthode de paiement */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-3">
                Choisir le mode de paiement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedPaymentMethod('stripe')}
                  className={`p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPaymentMethod === 'stripe'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'stripe'
                        ? 'border-teal-500 bg-teal-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'stripe' && (
                        <i className="ri-check-line text-white text-xs"></i>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Carte bancaire</div>
                    </div>
                    <i className="ri-bank-card-line text-xl text-gray-400"></i>
                  </div>
                </button>
                <button
                  onClick={() => setSelectedPaymentMethod('paydunya')}
                  className={`p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPaymentMethod === 'paydunya'
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPaymentMethod === 'paydunya'
                        ? 'border-teal-500 bg-teal-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'paydunya' && (
                        <i className="ri-check-line text-white text-xs"></i>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">Mobile Money</div>
                    </div>
                    <i className="ri-smartphone-line text-xl text-gray-400"></i>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg md:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex gap-2 sm:gap-3">
                <i className="ri-information-line text-blue-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0 mt-0.5"></i>
                <p className="text-xs sm:text-sm text-blue-900">
                  {selectedPaymentMethod === 'stripe' 
                    ? 'Vous allez être redirigé vers notre plateforme de paiement sécurisée Stripe. Une quittance de loyer vous sera envoyée par email après le paiement.'
                    : 'Un SMS avec un code de paiement vous sera envoyé sur votre numéro de téléphone. Suivez les instructions dans le SMS pour confirmer le paiement par Mobile Money. Une quittance de loyer vous sera envoyée par email après le paiement.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedRent(null);
                  setSelectedPaymentMethod('stripe');
                }}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-200 text-gray-700 rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={processingPayment}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {processingPayment ? (
                  <>
                    <i className="ri-loader-4-line text-lg sm:text-xl animate-spin w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    <span className="hidden sm:inline">
                      {selectedPaymentMethod === 'stripe' ? 'Redirection vers Stripe...' : 'Création de la demande de paiement...'}
                    </span>
                    <span className="sm:hidden">Redirection...</span>
                  </>
                ) : (
                  <>
                    {selectedPaymentMethod === 'stripe' ? (
                      <>
                        <i className="ri-bank-card-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                        Payer avec Stripe
                      </>
                    ) : (
                      <>
                        <i className="ri-smartphone-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                        Payer avec PayDunya
                      </>
                    )}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail des échéances (côté locataire) */}
      {showInstallmentDetailModal && selectedRentForDetail?.installmentPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowInstallmentDetailModal(false); setSelectedRentForDetail(null); }}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Détail des échéances - {selectedRentForDetail.month}</h3>
              <button onClick={() => { setShowInstallmentDetailModal(false); setSelectedRentForDetail(null); }} className="text-gray-400 hover:text-gray-600">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="mb-4 p-3 bg-amber-50 rounded-lg">
              <p className="text-sm font-medium text-amber-800">Montant restant à payer: {formatPrice(selectedRentForDetail.installmentPlan.remainingAmount)}</p>
            </div>
            <div className="space-y-2">
              {selectedRentForDetail.installmentPlan.installments.map((inst: any) => (
                <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <span className="font-medium">Échéance {inst.installment_number}</span>
                    <span className="text-sm text-gray-600 ml-2">- {formatDate(inst.due_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatPrice(inst.amount)}</span>
                    {inst.status === 'paid' ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Payé</span>
                    ) : (
                      <button
                        onClick={() => {
                          setShowInstallmentDetailModal(false);
                          handlePayRent({
                            id: inst.id,
                            month: `${selectedRentForDetail.month} - Échéance ${inst.installment_number}`,
                            amount: formatPrice(inst.amount),
                            amountNumber: inst.amount,
                            dueDate: formatDate(inst.due_date),
                          });
                          setSelectedRentForDetail(null);
                        }}
                        className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors cursor-pointer"
                      >
                        Payer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowInstallmentDetailModal(false); setSelectedRentForDetail(null); }} className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Envoyer un message au propriétaire</h3>
                <button
                  onClick={() => {
                    setShowMessageModal(false);
                    setMessageData({ message: '' });
                    setMessageError('');
                    setMessageSuccess(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
                >
                  <i className="ri-close-line text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </button>
              </div>
            </div>

            <form onSubmit={handleSendMessage} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {messageSuccess && (
                <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <i className="ri-check-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
                    <span className="text-xs sm:text-sm font-medium">Message envoyé avec succès !</span>
                  </div>
                </div>
              )}

              {messageError && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <i className="ri-error-warning-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
                    <span className="text-xs sm:text-sm font-medium break-words">{messageError}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Message *
                </label>
                <textarea
                  required
                  rows={5}
                  maxLength={500}
                  value={messageData.message}
                  onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Votre message..."
                />
                <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-right">
                  {messageData.message.length}/500 caractères
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMessageModal(false);
                    setMessageData({ message: '' });
                    setMessageError('');
                    setMessageSuccess(false);
                  }}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 text-gray-700 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sendingMessage}
                  className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  {sendingMessage ? (
                    <>
                      <i className="ri-loader-4-line text-lg sm:text-xl animate-spin w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      <span className="hidden sm:inline">Envoi en cours...</span>
                      <span className="sm:hidden">Envoi...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-fill text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      Envoyer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      {showPhotoGallery && currentPhotoList.length > 0 && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={() => setShowPhotoGallery(false)}
              className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
            >
              <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
            </button>

            {/* Previous Button */}
            {currentPhotoList.length > 1 && (
              <button
                onClick={goToPreviousPhoto}
                className="absolute left-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
              >
                <i className="ri-arrow-left-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            )}

            {/* Photo Display */}
            <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
              <img
                src={currentPhotoList[currentPhotoIndex]}
                alt={`Photo ${currentPhotoIndex + 1} sur ${currentPhotoList.length}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {/* Next Button */}
            {currentPhotoList.length > 1 && (
              <button
                onClick={goToNextPhoto}
                className="absolute right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer backdrop-blur-sm"
              >
                <i className="ri-arrow-right-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            )}

            {/* Photo Counter */}
            {currentPhotoList.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                {currentPhotoIndex + 1} / {currentPhotoList.length}
              </div>
            )}

            {/* Thumbnail Strip */}
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
    </div>
  );
}
