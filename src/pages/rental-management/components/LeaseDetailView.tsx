import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';

interface LeaseDetailViewProps {
  lease: any;
  onBack: () => void;
}

interface Inventory {
  id: string;
  type: 'entry' | 'exit';
  date: string;
  photos: string[];
  comments: string;
  created_at: string;
}

interface RentPayment {
  id: string;
  month: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
  payment_method?: string;
}

export default function LeaseDetailView({ lease, onBack }: LeaseDetailViewProps) {
  const { sendEmail } = useEmail();
  const [activeTab, setActiveTab] = useState<'property' | 'rent' | 'tenant'>('rent');
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
  const [userId, setUserId] = useState<string>('');
  
  // Statistiques des paiements (récupérées depuis la DB)
  const [paymentStats, setPaymentStats] = useState({
    totalPaid: 0,
    totalUnpaid: 0,
    totalOverdue: 0,
    paidCount: 0,
    unpaidCount: 0,
    overdueCount: 0,
  });
  
  // Modals
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [currentPhotoList, setCurrentPhotoList] = useState<string[]>([]);
  
  // Forms
  const [inventoryForm, setInventoryForm] = useState({
    type: 'entry' as 'entry' | 'exit',
    date: new Date().toISOString().split('T')[0],
    photos: [] as string[],
    comments: '',
    editingId: null as string | null,
  });
  
  const [receiptForm, setReceiptForm] = useState({
    month: '',
    year: new Date().getFullYear().toString(),
    dueDate: '',
  });
  
  const [markPaidForm, setMarkPaidForm] = useState({
    paymentId: '',
    paidDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
  });
  
  const [messageContent, setMessageContent] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Photo upload states
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (lease?.id) {
    loadInventories();
    loadRentPayments();
    }
  }, [lease?.id]);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadInventories = async () => {
    try {
      const { data, error } = await supabase
        .from('lease_inventories')
        .select('*')
        .eq('lease_id', lease.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const inventories: Inventory[] = (data || []).map((inv: any) => ({
        id: inv.id,
        type: inv.type as 'entry' | 'exit',
        date: inv.date,
        photos: inv.photos || [],
        comments: inv.comments,
        created_at: inv.created_at,
      }));

      setInventories(inventories);
    } catch (error) {
      console.error('Erreur lors du chargement des états des lieux:', error);
      setInventories([]);
    }
  };

  const loadRentPayments = async () => {
    try {
      // Charger UNIQUEMENT les paiements existants depuis la base de données
      const { data: existingPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', lease.id)
        .order('due_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Convertir les paiements de la DB en format RentPayment
      const payments: RentPayment[] = (existingPayments || []).map((p: any) => {
        const paymentDate = new Date(p.due_date);
        const monthName = paymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        
        return {
          id: p.id,
        month: monthName,
          amount: parseFloat(p.amount),
          due_date: p.due_date,
          paid: p.status === 'paid',
          paid_date: p.status === 'paid' && p.payment_date ? p.payment_date : undefined,
          payment_method: p.payment_method || undefined,
        };
      });
    
    setRentPayments(payments);
      
      // Calculer les statistiques directement depuis les données de la DB
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const paid = payments.filter(p => p.paid);
      const unpaid = payments.filter(p => !p.paid);
      const overdue = payments.filter(p => {
        if (p.paid) return false;
        const dueDate = new Date(p.due_date);
        return dueDate < today;
      });
      
      setPaymentStats({
        totalPaid: paid.reduce((sum, p) => sum + p.amount, 0),
        totalUnpaid: unpaid.reduce((sum, p) => sum + p.amount, 0),
        totalOverdue: overdue.reduce((sum, p) => sum + p.amount, 0),
        paidCount: paid.length,
        unpaidCount: unpaid.length,
        overdueCount: overdue.length,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des paiements:', error);
      setRentPayments([]);
      setPaymentStats({
        totalPaid: 0,
        totalUnpaid: 0,
        totalOverdue: 0,
        paidCount: 0,
        unpaidCount: 0,
        overdueCount: 0,
      });
    }
  };

  const handleSaveInventory = async () => {
    // Vérifier que le bail n'est pas en attente de signature ou clôturé
    if (lease.status === 'pending_signature') {
      alert('Impossible d\'ajouter un état des lieux tant que le bail est en attente de signature.');
      return;
    }
    if (lease.status === 'terminated') {
      alert('Impossible d\'ajouter un état des lieux pour un bail clôturé. Le bail est en mode consultation uniquement.');
      return;
    }

    setActionLoading(true);
    try {
      // Uploader les nouvelles photos d'abord
      const photoUrls = await uploadPhotosToStorage();
      
      if (inventoryForm.editingId) {
        // Mise à jour
        const { error } = await supabase
          .from('lease_inventories')
          .update({
            type: inventoryForm.type,
                  date: inventoryForm.date,
                  comments: inventoryForm.comments,
            photos: photoUrls,
          })
          .eq('id', inventoryForm.editingId)
          .eq('lease_id', lease.id);

        if (error) throw error;
      } else {
        // Création
        const { error } = await supabase
          .from('lease_inventories')
          .insert([{
            lease_id: lease.id,
          type: inventoryForm.type,
          date: inventoryForm.date,
          comments: inventoryForm.comments,
            photos: photoUrls,
          }]);

        if (error) throw error;
      }
      
      // Recharger les inventaires
      await loadInventories();
      setShowInventoryModal(false);
      resetInventoryForm();
      alert('État des lieux enregistré avec succès !');
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Une erreur est survenue: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet état des lieux ?')) return;
    
    try {
      const { error } = await supabase
        .from('lease_inventories')
        .delete()
        .eq('id', id)
        .eq('lease_id', lease.id);

      if (error) throw error;

      // Recharger les inventaires
      await loadInventories();
      alert('État des lieux supprimé avec succès !');
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Une erreur est survenue: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleGenerateReceipt = async () => {
    // Vérifier que le bail n'est pas en attente de signature ou clôturé
    if (lease.status === 'pending_signature') {
      alert('Impossible de générer une quittance tant que le bail est en attente de signature.');
      return;
    }
    if (lease.status === 'terminated') {
      alert('Impossible de générer une quittance pour un bail clôturé. Le bail est en mode consultation uniquement.');
      return;
    }

    setActionLoading(true);
    try {
      // Vérifier que la date d'échéance est renseignée
      if (!receiptForm.dueDate) {
        alert('Veuillez renseigner la date d\'échéance.');
        return;
      }

      const dueDateString = receiptForm.dueDate;

      // Vérifier si un paiement existe déjà pour cette échéance
      let matchingPayment: RentPayment | undefined;

      const { data: existingPayment, error: checkError } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', lease.id)
        .eq('due_date', dueDateString)
        .maybeSingle();

      if (checkError) {
        console.error('Erreur lors de la vérification du paiement:', checkError);
      }

      if (existingPayment) {
        // Utiliser le paiement existant
        const paymentDate = new Date(existingPayment.due_date);
        const monthName = paymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        
        matchingPayment = {
          id: existingPayment.id,
          month: monthName,
          amount: parseFloat(existingPayment.amount),
          due_date: existingPayment.due_date,
          paid: existingPayment.status === 'paid',
          paid_date: existingPayment.status === 'paid' && existingPayment.payment_date ? existingPayment.payment_date : undefined,
          payment_method: existingPayment.payment_method || undefined,
        };
      } else {
        // Créer un nouveau paiement dans la table payments avec statut 'pending'
        // La génération de quittance crée une ligne de loyer impayé
        const { data: newPayment, error: createError } = await supabase
          .from('payments')
          .insert([{
            lease_id: lease.id,
            amount: lease.monthly_rent,
            due_date: dueDateString,
            status: 'pending', // Créer comme impayé
            payment_date: null,
          }])
          .select()
          .single();

        if (createError) {
          throw new Error(`Erreur lors de la création du paiement: ${createError.message}`);
        }

        // Créer l'objet matchingPayment pour la génération de la quittance
        const paymentDate = new Date(newPayment.due_date);
        const monthName = paymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        
        matchingPayment = {
          id: newPayment.id,
          month: monthName,
          amount: parseFloat(newPayment.amount),
          due_date: newPayment.due_date,
          paid: false,
          paid_date: undefined,
          payment_method: undefined,
        };

        // Recharger les paiements pour mettre à jour l'affichage
        await loadRentPayments();
      }

      if (!matchingPayment) {
        throw new Error('Impossible de trouver ou créer un paiement pour générer la quittance.');
      }

      // La quittance est générée côté serveur (via email) et le paiement est créé dans la DB
      
      // Envoyer un email au locataire pour l'informer du nouveau loyer à payer
      // (envoyé à chaque génération de quittance, même si le paiement existe déjà)
      let emailSent = false;
      let emailError: string | null = null;
      
      if (lease.tenant_email) {
        try {
          const emailResult = await sendEmail('nouveau_loyer', {
            tenantEmail: lease.tenant_email,
            tenantName: lease.tenant_name,
            propertyTitle: lease.property_title,
            propertyAddress: lease.property_address,
            month: receiptForm.month,
            year: receiptForm.year,
            amount: matchingPayment.amount,
            dueDate: matchingPayment.due_date,
            appUrl: window.location.origin,
          });

          if (emailResult.success) {
            emailSent = true;
          } else {
            emailError = emailResult.error || 'Erreur inconnue';
            console.error('Erreur lors de l\'envoi de l\'email:', emailError);
          }
        } catch (emailException: any) {
          emailError = emailException.message || 'Erreur lors de l\'envoi de l\'email';
          console.error('Exception lors de l\'envoi de l\'email:', emailException);
        }
      }

      setShowReceiptModal(false);
      setReceiptForm({
        month: '',
        year: new Date().getFullYear().toString(),
        dueDate: '',
      });
      
      // Message de confirmation avec détails
      if (emailSent) {
        alert('✅ Quittance générée avec succès !\n📧 Email envoyé au locataire.');
      } else if (emailError) {
        alert(`✅ Quittance générée avec succès !\n\n⚠️ L'email n'a pas pu être envoyé:\n${emailError}`);
      } else {
        alert('✅ Quittance générée avec succès !');
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Une erreur est survenue lors de la génération de la quittance: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    // Vérifier que le bail n'est pas clôturé
    if (lease.status === 'terminated') {
      alert('Impossible de modifier un paiement pour un bail clôturé. Le bail est en mode consultation uniquement.');
      setShowMarkPaidModal(false);
      return;
    }
    
    setActionLoading(true);
    try {
      const payment = rentPayments.find(p => p.id === markPaidForm.paymentId);
      if (!payment) throw new Error('Paiement non trouvé');

      // Mettre à jour le paiement existant dans la base de données
      const { error } = await supabase
        .from('payments')
        .update({
          payment_date: markPaidForm.paidDate,
          status: 'paid',
                payment_method: markPaidForm.paymentMethod,
        })
        .eq('id', payment.id)
        .eq('lease_id', lease.id);

      if (error) throw error;
      
      // Récupérer les informations du locataire pour l'email
      // Privilégier users_2025_12_01_11_29, sinon utiliser tenants
      let tenantEmail = '';
      let tenantName = '';
      
      if (lease.tenant_id) {
        // D'abord récupérer l'email depuis tenants
        const { data: tenantDataFromTenants } = await supabase
          .from('tenants')
          .select('email, first_name, last_name')
          .eq('id', lease.tenant_id)
          .single();
        
        if (tenantDataFromTenants?.email) {
          tenantEmail = tenantDataFromTenants.email;
          
          // Chercher dans users_2025_12_01_11_29 par email (priorité)
          const { data: userData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('full_name')
            .eq('email', tenantDataFromTenants.email)
            .single();

          if (userData?.full_name) {
            // Utiliser le full_name de users_2025_12_01_11_29
            tenantName = userData.full_name;
          } else {
            // Fallback sur first_name + last_name de tenants
            tenantName = `${tenantDataFromTenants.first_name || ''} ${tenantDataFromTenants.last_name || ''}`.trim() || 'Locataire';
          }
        }
      }

      // Envoyer un email au locataire pour l'informer que le paiement a été pris en compte
      if (tenantEmail && tenantName) {
        try {
          // Extraire le mois et l'année du paiement
          const paymentDate = new Date(payment.due_date);
          const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
          const month = monthNames[paymentDate.getMonth()];
          const year = paymentDate.getFullYear();

          // Récupérer les informations du propriétaire
          const { data: ownerData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('full_name')
            .eq('id', userId)
            .single();

          const ownerName = ownerData?.full_name || 'Votre propriétaire';

          const emailResult = await sendEmail('loyer_marque_paye', {
            tenantEmail: tenantEmail,
            tenantName: tenantName,
            ownerName: ownerName,
            propertyTitle: lease.property_title,
            propertyAddress: lease.property_address,
            month: month,
            year: year,
            amount: payment.amount,
            paymentDate: markPaidForm.paidDate,
            paymentMethod: markPaidForm.paymentMethod,
            appUrl: window.location.origin,
          });

          if (!emailResult.success) {
            console.error('Email non envoyé:', emailResult.error);
          }
        } catch (emailException: any) {
          console.error('Exception lors de l\'envoi de l\'email:', emailException);
          // Ne pas bloquer le processus si l'email échoue
        }
      }
      
      // Recharger les paiements
      await loadRentPayments();
      setShowMarkPaidModal(false);
      setMarkPaidForm({
        paymentId: '',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
      });
      alert('Paiement marqué comme payé ! Un email de confirmation a été envoyé au locataire.');
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Une erreur est survenue: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Fonction pour marquer un paiement comme impayé (annuler le paiement)
  const handleMarkAsUnpaid = async (paymentId: string) => {
    // Vérifier que le bail n'est pas clôturé
    if (lease.status === 'terminated') {
      alert('Impossible de modifier un paiement pour un bail clôturé. Le bail est en mode consultation uniquement.');
      return;
    }
    if (!confirm('Êtes-vous sûr de vouloir marquer ce paiement comme impayé ?')) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          payment_date: null,
          status: 'pending',
          payment_method: null,
        })
        .eq('id', paymentId)
        .eq('lease_id', lease.id);

      if (error) throw error;

      await loadRentPayments();
      alert('Paiement marqué comme impayé !');
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Une erreur est survenue: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent.trim()) return;

    setActionLoading(true);
    try {
      // Récupérer l'email et le nom du locataire depuis la table tenants
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('email, first_name, last_name')
        .eq('id', lease.tenant_id)
        .single();

      if (tenantError) throw tenantError;
      if (!tenantData) throw new Error('Locataire non trouvé');

      // Chercher l'utilisateur correspondant par email dans users_2025_12_01_11_29
      const { data: userData, error: userError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name')
        .eq('email', tenantData.email)
        .single();

      if (userError || !userData) {
        alert('Le locataire n\'a pas de compte utilisateur. Impossible d\'envoyer un message.');
        setActionLoading(false);
        return;
      }

      // Récupérer les informations de l'expéditeur
      const { data: senderData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('full_name')
        .eq('id', userId)
        .single();

      // Envoyer le message avec l'ID utilisateur trouvé
      const { error } = await supabase.from('messages_2025_12_01_11_29').insert({
        sender_id: userId,
        receiver_id: userData.id,
        content: messageContent.trim(), // Utiliser 'content' au lieu de 'message'
        property_id: lease.property_id,
        read: false,
      });

      if (error) throw error;

      // Envoyer un email de notification au destinataire
      const tenantName = userData.full_name || `${tenantData.first_name} ${tenantData.last_name}`;
      const senderName = senderData?.full_name || 'Votre propriétaire';
      
      const emailResult = await sendEmail('nouveau_message', {
        receiverEmail: tenantData.email,
        receiverName: tenantName,
        senderName: senderName,
        propertyTitle: lease.property_title,
        messagePreview: messageContent.trim(),
        appUrl: window.location.origin,
      });

      if (emailResult.success) {
        alert('Message envoyé avec succès ! Un email de notification a été envoyé au destinataire.');
      } else {
        alert(`Message envoyé avec succès !\n\n⚠️ L'email de notification n'a pas pu être envoyé.\nErreur: ${emailResult.error || 'Erreur inconnue'}`);
      }

      setShowMessageModal(false);
      setMessageContent('');
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`Une erreur est survenue lors de l'envoi du message: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const resetInventoryForm = () => {
    setInventoryForm({
      type: 'entry',
      date: new Date().toISOString().split('T')[0],
      photos: [],
      comments: '',
      editingId: null,
    });
    setPhotoPreviewUrls([]);
    setPhotoFiles([]);
  };

  const openEditInventory = (inventory: Inventory) => {
    setInventoryForm({
      type: inventory.type,
      date: inventory.date,
      photos: inventory.photos || [],
      comments: inventory.comments,
      editingId: inventory.id,
    });
    // Ne pas mettre les photos existantes dans photoPreviewUrls
    // photoPreviewUrls est uniquement pour les nouvelles photos ajoutées
    setPhotoPreviewUrls([]);
    setPhotoFiles([]); // Pas de nouveaux fichiers pour l'édition
    setShowInventoryModal(true);
  };

  // Fonction pour valider les fichiers images
  const validateImageFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10 Mo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Format non supporté. Utilisez JPG, PNG ou WEBP.';
    }
    
    if (file.size > maxSize) {
      return 'La taille du fichier dépasse 10 Mo.';
    }
    
    return null;
  };

  // Fonction pour gérer le drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Fonction pour gérer la sélection de fichiers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  // Fonction principale pour traiter les fichiers
  const handleFiles = async (files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Valider chaque fichier
    files.forEach((file) => {
      const error = validateImageFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(`Erreurs:\n${errors.join('\n')}`);
    }

    if (validFiles.length === 0) return;

    // Créer des URLs de prévisualisation
    const newPreviewUrls: string[] = [];
    validFiles.forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      newPreviewUrls.push(previewUrl);
    });

    setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    setPhotoFiles((prev) => [...prev, ...validFiles]);
  };

  // Fonction pour supprimer une photo
  const handleRemovePhoto = (index: number) => {
    // Si c'est une photo existante (dans inventoryForm.photos)
    if (index < inventoryForm.photos.length) {
      setInventoryForm((prev) => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index),
      }));
    } else {
      // C'est une nouvelle photo (dans photoPreviewUrls)
      const newIndex = index - inventoryForm.photos.length;
      setPhotoPreviewUrls((prev) => {
        const newUrls = [...prev];
        URL.revokeObjectURL(newUrls[newIndex]);
        newUrls.splice(newIndex, 1);
        return newUrls;
      });
      setPhotoFiles((prev) => {
        const newFiles = [...prev];
        newFiles.splice(newIndex, 1);
        return newFiles;
      });
    }
  };

  // Fonction pour uploader les photos vers Supabase Storage
  const uploadPhotosToStorage = async (): Promise<string[]> => {
    if (photoFiles.length === 0) {
      return inventoryForm.photos; // Retourner les photos existantes si aucune nouvelle
    }

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [...inventoryForm.photos]; // Conserver les photos existantes

    try {
      for (const file of photoFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${lease.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `lease-inventories/${lease.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('professional-assets')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Erreur upload photo:', uploadError);
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('professional-assets')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      console.error('Erreur upload photos:', error);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Espèces',
      bank_transfer: 'Virement bancaire',
      check: 'Chèque',
      mobile_money: 'Mobile Money',
    };
    return methods[method] || method;
  };

  // Fonction pour ouvrir la galerie de photos
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

  // Filtrer les paiements pour l'affichage (basé sur les données de la DB)
  const unpaidPayments = rentPayments.filter(p => !p.paid);
  const paidPayments = rentPayments.filter(p => p.paid);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <i className="ri-arrow-left-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
        <span className="hidden sm:inline">Retour aux baux</span>
        <span className="sm:hidden">Retour</span>
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">{lease.property_title}</h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-3 sm:mb-4 flex items-center gap-2 break-words">
              <i className="ri-map-pin-line w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
              {lease.property_address}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm text-gray-600">
              <span>Locataire: <strong className="text-gray-900">{lease.tenant_name}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span className="break-words">Du {formatDate(lease.start_date)} au {formatDate(lease.end_date)}</span>
            </div>
          </div>
          <div className="text-left sm:text-right sm:ml-6 flex-shrink-0">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Loyer mensuel</p>
            <p className="text-2xl sm:text-3xl font-bold text-teal-600">{formatPrice(lease.monthly_rent)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-1.5 sm:p-2">
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('rent')}
            className={`flex-1 px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 ${
              activeTab === 'rent'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="ri-money-euro-circle-line text-base sm:text-lg md:text-xl"></i>
            <span>Loyers</span>
          </button>
          <button
            onClick={() => setActiveTab('property')}
            className={`flex-1 px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 ${
              activeTab === 'property'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="ri-building-line text-base sm:text-lg md:text-xl"></i>
            <span>Bien</span>
          </button>
          <button
            onClick={() => setActiveTab('tenant')}
            className={`flex-1 px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 ${
              activeTab === 'tenant'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <i className="ri-user-line text-base sm:text-lg md:text-xl"></i>
            <span>Locataire</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'property' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Inventories */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">États des lieux</h2>
              {lease.status === 'pending_signature' || lease.status === 'terminated' ? (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-200 text-gray-500 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium cursor-not-allowed whitespace-nowrap">
                  <i className="ri-lock-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  <span className="hidden sm:inline">Ajouter un état des lieux</span>
                  <span className="sm:hidden">Ajouter</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    resetInventoryForm();
                    setShowInventoryModal(true);
                  }}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-add-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  <span className="hidden sm:inline">Ajouter un état des lieux</span>
                  <span className="sm:hidden">Ajouter</span>
                </button>
              )}
            </div>

            {lease.status === 'pending_signature' && (
              <div className="mb-4 sm:mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg md:rounded-xl p-3 sm:p-4">
                <div className="flex gap-2 sm:gap-3">
                  <i className="ri-information-line text-yellow-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
                  <p className="text-xs sm:text-sm text-yellow-900">
                    Les états des lieux ne peuvent être ajoutés qu'après la signature du bail. Le bail est actuellement en attente de signature.
                  </p>
                </div>
              </div>
            )}

            {lease.status === 'terminated' && (
              <div className="mb-4 sm:mb-6 bg-gray-50 border-2 border-gray-200 rounded-lg md:rounded-xl p-3 sm:p-4">
                <div className="flex gap-2 sm:gap-3">
                  <i className="ri-information-line text-gray-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
                  <p className="text-xs sm:text-sm text-gray-900">
                    Ce bail est clôturé. Les états des lieux ne peuvent plus être modifiés. Mode consultation uniquement.
                  </p>
                </div>
              </div>
            )}

            {inventories.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <i className="ri-file-list-line text-4xl sm:text-6xl text-gray-300 mb-3 sm:mb-4"></i>
                <p className="text-sm sm:text-base text-gray-500">Aucun état des lieux enregistré</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inventories.map((inventory) => (
                  <div key={inventory.id} className="border-2 border-gray-100 rounded-lg md:rounded-xl p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg md:rounded-xl flex-shrink-0 ${
                          inventory.type === 'entry' ? 'bg-blue-100' : 'bg-orange-100'
                        }`}>
                          <i className={`${
                            inventory.type === 'entry' ? 'ri-login-box-line text-blue-600' : 'ri-logout-box-line text-orange-600'
                          } text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center`}></i>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 break-words">
                            {inventory.type === 'entry' ? 'État des lieux d\'entrée' : 'État des lieux de sortie'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 break-words">Réalisé le {formatDate(inventory.date)}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => openEditInventory(inventory)}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <i className="ri-edit-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteInventory(inventory.id)}
                          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 mb-3 text-xs sm:text-sm text-gray-600">
                      <span className="flex items-center gap-1.5 sm:gap-2">
                        <i className="ri-image-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                        {inventory.photos.length} photo{inventory.photos.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    {/* Photo thumbnails */}
                    {inventory.photos.length > 0 && (
                      <div className="mb-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {inventory.photos.slice(0, 4).map((photoUrl, index) => (
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
                    
                    <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 rounded-lg p-2 sm:p-3 break-words">
                      {inventory.comments}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rent' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Total payé</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{formatPrice(paymentStats.totalPaid)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-check-line text-green-600 text-lg sm:text-xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{paymentStats.paidCount} paiement{paymentStats.paidCount > 1 ? 's' : ''}</p>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">En attente</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{formatPrice(paymentStats.totalUnpaid)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-time-line text-yellow-600 text-lg sm:text-xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{paymentStats.unpaidCount} paiement{paymentStats.unpaidCount > 1 ? 's' : ''}</p>
            </div>

            <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-sm sm:col-span-2 md:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">En retard</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{formatPrice(paymentStats.totalOverdue)}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-error-warning-line text-red-600 text-lg sm:text-xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{paymentStats.overdueCount} paiement{paymentStats.overdueCount > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Generate Receipt Button */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 shadow-sm">
            <button
              onClick={() => setShowReceiptModal(true)}
              disabled={lease.status === 'pending_signature' || lease.status === 'terminated'}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-semibold hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-file-text-line text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
              <span className="hidden sm:inline">Générer une quittance de loyer</span>
              <span className="sm:hidden">Générer quittance</span>
            </button>
            {lease.status === 'pending_signature' && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                La génération de quittance n'est disponible qu'après la signature du bail
              </p>
            )}
            {lease.status === 'terminated' && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                La génération de quittance n'est plus disponible pour un bail clôturé. Mode consultation uniquement.
              </p>
            )}
          </div>

          {/* Unpaid Rents */}
          {unpaidPayments.length > 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Loyers impayés</h2>
              <div className="space-y-3">
                {unpaidPayments.map((payment) => (
                  <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-lg md:rounded-xl border-2 border-red-200 bg-red-50">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 flex-shrink-0">
                        <i className="ri-error-warning-line text-red-600 text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base text-gray-900 capitalize break-words">{payment.month}</p>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">Échéance: {formatDate(payment.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-shrink-0">
                      <span className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">{formatPrice(payment.amount)}</span>
                      <button
                        onClick={() => {
                          setMarkPaidForm({
                            paymentId: payment.id,
                            paidDate: new Date().toISOString().split('T')[0],
                            paymentMethod: 'cash',
                          });
                          setShowMarkPaidModal(true);
                        }}
                        disabled={lease.status === 'terminated'}
                        className={`px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-lg md:rounded-xl text-xs sm:text-sm md:text-base font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          lease.status === 'terminated'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                        title={lease.status === 'terminated' ? 'Impossible de modifier un paiement pour un bail clôturé' : 'Marquer comme payé'}
                      >
                        <span className="hidden sm:inline">Marquer comme payé</span>
                        <span className="sm:hidden">Marquer payé</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid Rents */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Historique des paiements</h2>
            
            {paidPayments.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <i className="ri-file-list-line text-4xl sm:text-6xl text-gray-300 mb-3 sm:mb-4"></i>
                <p className="text-sm sm:text-base text-gray-500">Aucun paiement enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paidPayments.map((payment) => (
                  <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-5 rounded-lg md:rounded-xl border-2 border-gray-100 hover:border-teal-200 transition-colors">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100 flex-shrink-0">
                        <i className="ri-check-line text-green-600 text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base text-gray-900 capitalize break-words">{payment.month}</p>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">
                          Payé le {formatDate(payment.paid_date!)} • {getPaymentMethodLabel(payment.payment_method!)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      <span className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">{formatPrice(payment.amount)}</span>
                      <button
                        onClick={() => handleMarkAsUnpaid(payment.id)}
                        disabled={lease.status === 'terminated'}
                        className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors cursor-pointer flex-shrink-0 ${
                          lease.status === 'terminated'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={lease.status === 'terminated' ? 'Impossible de modifier un paiement pour un bail clôturé' : 'Marquer comme impayé'}
                      >
                        <i className="ri-close-circle-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tenant' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Tenant Info */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Informations du locataire</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Nom complet</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{lease.tenant_name}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Email</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 break-all">{lease.tenant_email}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Téléphone</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900 break-words">{lease.tenant_phone}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Dépôt de garantie</p>
                <p className="text-base sm:text-lg font-semibold text-teal-600">{formatPrice(lease.security_deposit)}</p>
              </div>
            </div>
          </div>

          {/* Messaging */}
          <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Communication</h2>
            <button
              onClick={() => setShowMessageModal(true)}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-semibold hover:shadow-lg transition-all cursor-pointer"
            >
              <i className="ri-message-3-line text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
              <span className="hidden sm:inline">Envoyer un message au locataire</span>
              <span className="sm:hidden">Envoyer un message</span>
            </button>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-[700px] w-full p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {inventoryForm.editingId ? 'Modifier' : 'Ajouter'} un état des lieux
              </h3>
              <button
                onClick={() => {
                  setShowInventoryModal(false);
                  resetInventoryForm();
                }}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={inventoryForm.type}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, type: e.target.value as 'entry' | 'exit' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                >
                  <option value="entry">État des lieux d'entrée</option>
                  <option value="exit">État des lieux de sortie</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={inventoryForm.date}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Commentaires</label>
                <textarea
                  value={inventoryForm.comments}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, comments: e.target.value })}
                  placeholder="Décrivez l'état du bien..."
                  rows={6}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {inventoryForm.comments.length}/500 caractères
                </div>
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photos de l'état des lieux
                </label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="file"
                    id="photo-upload"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-200">
                      <i className="ri-image-add-line text-3xl text-gray-500 w-8 h-8 flex items-center justify-center"></i>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        Cliquez pour ajouter des photos
                      </p>
                      <p className="text-sm text-gray-500">
                        ou glissez-déposez vos images ici
                  </p>
                </div>
                    <p className="text-xs text-gray-400 mt-2">
                      JPG, PNG ou WEBP (max. 10 Mo par image)
                    </p>
                  </label>
              </div>

                {/* Photo Preview Grid */}
                {(photoPreviewUrls.length > 0 || inventoryForm.photos.length > 0) && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      {photoPreviewUrls.length + inventoryForm.photos.length} photo{photoPreviewUrls.length + inventoryForm.photos.length > 1 ? 's' : ''} ajoutée{photoPreviewUrls.length + inventoryForm.photos.length > 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-4 gap-3">
                      {/* Photos existantes */}
                      {inventoryForm.photos.map((photoUrl, index) => (
                        <div key={`existing-${index}`} className="relative group">
                          <img
                            src={photoUrl}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <i className="ri-close-line text-sm w-4 h-4 flex items-center justify-center"></i>
                          </button>
                        </div>
                      ))}
                      {/* Nouvelles photos */}
                      {photoPreviewUrls.map((previewUrl, index) => (
                        <div key={`new-${index}`} className="relative group">
                          <img
                            src={previewUrl}
                            alt={`Nouvelle photo ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            onClick={() => handleRemovePhoto(inventoryForm.photos.length + index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <i className="ri-close-line text-sm w-4 h-4 flex items-center justify-center"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadingPhotos && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-teal-600">
                    <i className="ri-loader-4-line animate-spin w-4 h-4 flex items-center justify-center"></i>
                    <span>Upload des photos en cours...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowInventoryModal(false);
                  resetInventoryForm();
                }}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveInventory}
                disabled={actionLoading || !inventoryForm.comments.trim()}
                className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                    Enregistrement...
                  </>
                ) : (
                  inventoryForm.editingId ? 'Modifier' : 'Ajouter'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-[500px] w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Générer une quittance</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mois</label>
                <select
                  value={receiptForm.month}
                  onChange={(e) => setReceiptForm({ ...receiptForm, month: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                >
                  <option value="">Sélectionner un mois</option>
                  <option value="janvier">Janvier</option>
                  <option value="février">Février</option>
                  <option value="mars">Mars</option>
                  <option value="avril">Avril</option>
                  <option value="mai">Mai</option>
                  <option value="juin">Juin</option>
                  <option value="juillet">Juillet</option>
                  <option value="août">Août</option>
                  <option value="septembre">Septembre</option>
                  <option value="octobre">Octobre</option>
                  <option value="novembre">Novembre</option>
                  <option value="décembre">Décembre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
                <input
                  type="number"
                  value={receiptForm.year}
                  onChange={(e) => setReceiptForm({ ...receiptForm, year: e.target.value })}
                  min="2020"
                  max="2030"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'échéance <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={receiptForm.dueDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Date limite pour le paiement du loyer
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowReceiptModal(false)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateReceipt}
                disabled={actionLoading || !receiptForm.month || !receiptForm.dueDate}
                className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                    Génération...
                  </>
                ) : (
                  <>
                    <i className="ri-download-line w-5 h-5 flex items-center justify-center"></i>
                    Générer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-[500px] w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Marquer comme payé</h3>
              <button
                onClick={() => setShowMarkPaidModal(false)}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de paiement</label>
                <input
                  type="date"
                  value={markPaidForm.paidDate}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, paidDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Moyen de paiement</label>
                <select
                  value={markPaidForm.paymentMethod}
                  onChange={(e) => setMarkPaidForm({ ...markPaidForm, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
                >
                  <option value="cash">Espèces</option>
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="check">Chèque</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowMarkPaidModal(false)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                    Enregistrement...
                  </>
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
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

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-[600px] w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Envoyer un message
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageContent('');
                }}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            </div>
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-1">À</div>
              <div className="font-semibold text-gray-900">{lease.tenant_name}</div>
              <div className="text-sm text-gray-600">{lease.tenant_email}</div>
            </div>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Écrivez votre message..."
              rows={6}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm mb-2"
            />
            <div className="text-xs text-gray-500 mb-6">
              {messageContent.length}/500 caractères
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageContent('');
                }}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSendMessage}
                disabled={actionLoading || !messageContent.trim()}
                className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                    Envoi...
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-fill w-5 h-5 flex items-center justify-center"></i>
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
