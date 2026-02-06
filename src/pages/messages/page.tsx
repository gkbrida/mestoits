import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useEmail } from '../../hooks/useEmail';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
interface Conversation {
  id: string; // Clé unique : other_user_id + property_id (ou 'null')
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  other_user_type?: string; // 'professional' ou 'individual'
  company_name?: string; // Pour les professionnels
  last_message: string;
  last_message_time: string;
  unread_count: number;
  property_id?: string | null;
  property_title?: string;
}

interface MediaAttachment {
  type: 'image' | 'video' | 'file';
  url: string;
  name: string;
  size: string;
  thumbnail?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string; // Utiliser 'content' au lieu de 'message'
  created_at: string;
  read: boolean;
  property_id?: string;
  media?: MediaAttachment[];
}

export default function MessagesPage() {
  const { sendEmail } = useEmail();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConversationRef = useRef<Conversation | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadConversations(true); // Premier chargement
      const interval = setInterval(() => loadConversations(false), 10000); // Rafraîchissements silencieux
      return () => clearInterval(interval);
    }
  }, [currentUserId]);

  // Mettre à jour la référence quand selectedConversation change
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Notifier Navbar et SideMenu du changement de compteur après la mise à jour de conversations
  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
    window.dispatchEvent(new CustomEvent('unreadMessagesUpdated', { detail: { count: totalUnread } }));
  }, [conversations]);

  useEffect(() => {
    if (selectedConversation && currentUserId) {
      // Utiliser une référence pour éviter les boucles infinies
      const convId = selectedConversation.id;
      const otherUserId = selectedConversation.other_user_id;
      const propertyId = selectedConversation.property_id;
      
      loadMessages(otherUserId, propertyId).then(() => {
        // Marquer comme lu après avoir chargé les messages
        // Vérifier que la conversation sélectionnée n'a pas changé avant de marquer comme lu
        // Utiliser la référence pour éviter les problèmes de closure
        if (selectedConversationRef.current?.id === convId) {
          markAsRead(otherUserId, propertyId);
        }
      });
    }
  }, [selectedConversation?.id, currentUserId]); // Utiliser selectedConversation?.id au lieu de selectedConversation complet

  // Scroll automatique désactivé - l'utilisateur contrôle manuellement le scroll

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadConversations = async (isInitial = false) => {
    try {
      // Ne montrer le loading que lors du premier chargement
      if (isInitial) {
        setLoading(true);
      }
      
      if (!currentUserId) {
        setConversations([]);
        if (isInitial) {
          setLoading(false);
        }
        return;
      }
      
      // Récupérer tous les messages où l'utilisateur est impliqué
      const { data: messagesData, error } = await supabase
        .from('messages_2025_12_01_11_29')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement messages:', error);
        setConversations([]);
        if (isInitial) {
          setLoading(false);
        }
        return;
      }

      if (!messagesData || messagesData.length === 0) {
        setConversations([]);
        if (isInitial) {
          setLoading(false);
        }
        return;
      }

      // Récupérer tous les IDs uniques des autres utilisateurs
      const otherUserIds = [...new Set(
        messagesData.map(msg => 
          msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
        )
      )];

      // Récupérer tous les IDs uniques des propriétés
      const propertyIds = [...new Set(
        messagesData.filter(msg => msg.property_id).map(msg => msg.property_id)
      )];

      // Charger toutes les infos utilisateurs en une seule requête (inclure user_type et company_name)
      const { data: usersData, error: usersError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name, avatar_url, user_type, company_name')
        .in('id', otherUserIds);

      if (usersError) {
        console.error('Erreur chargement utilisateurs:', usersError);
      }

      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);

      // Charger toutes les infos propriétés en une seule requête
      let propertiesMap = new Map();
      if (propertyIds.length > 0) {
        const { data: propertiesData, error: propsError } = await supabase
          .from('properties')
          .select('id, title')
          .in('id', propertyIds);
        
        if (propsError) {
          console.error('Erreur chargement propriétés:', propsError);
        }
        
        propertiesMap = new Map(propertiesData?.map(p => [p.id, p]) || []);
      }

      // Grouper par conversation (clé unique = otherUserId + property_id)
      // Cela permet d'avoir des conversations séparées pour le même utilisateur selon qu'elles sont associées à un bien ou non
      const conversationsMap = new Map<string, Conversation>();

      for (const msg of messagesData) {
        const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
        const propertyId = msg.property_id || null;
        
        // Créer une clé unique combinant l'utilisateur et le bien (ou 'null' si pas de bien)
        const conversationKey = `${otherUserId}_${propertyId || 'null'}`;
        
        if (!conversationsMap.has(conversationKey)) {
          const userData = usersMap.get(otherUserId);
          
          // Compter les messages non lus pour cette conversation spécifique (même utilisateur + même bien)
          const unreadCount = messagesData.filter(
            m => {
              const mOtherUserId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
              const mPropertyId = m.property_id || null;
              return mOtherUserId === otherUserId && 
                     mPropertyId === propertyId &&
                     m.sender_id === otherUserId && 
                     m.receiver_id === currentUserId && 
                     !m.read;
            }
          ).length;

          const propertyData = propertyId ? propertiesMap.get(propertyId) : null;

          conversationsMap.set(conversationKey, {
            id: conversationKey,
            other_user_id: otherUserId,
            other_user_name: userData?.full_name || 'Utilisateur',
            other_user_avatar: userData?.avatar_url,
            other_user_type: userData?.user_type,
            company_name: userData?.company_name,
            last_message: msg.content || '',
            last_message_time: msg.created_at,
            unread_count: unreadCount,
            property_id: propertyId,
            property_title: propertyData?.title || '',
          });
        } else {
          // Mettre à jour le dernier message si ce message est plus récent
          const existingConv = conversationsMap.get(conversationKey)!;
          if (new Date(msg.created_at) > new Date(existingConv.last_message_time)) {
            existingConv.last_message = msg.content || '';
            existingConv.last_message_time = msg.created_at;
          }
        }
      }

      // Trier les conversations par date (plus récentes en premier)
      const sortedConversations = Array.from(conversationsMap.values()).sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );
      
      setConversations(sortedConversations);
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
      setConversations([]);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const loadMessages = async (otherUserId: string, propertyId?: string | null): Promise<void> => {
    try {
      let query = supabase
        .from('messages_2025_12_01_11_29')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`);

      // Filtrer par property_id si spécifié (null pour les conversations sans bien)
      if (propertyId !== undefined) {
        if (propertyId === null) {
          // Conversation sans bien : property_id doit être null
          query = query.is('property_id', null);
        } else {
          // Conversation avec bien : property_id doit correspondre
          query = query.eq('property_id', propertyId);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;
      
      // Mapper les données du message
      const mappedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content || '',
        created_at: msg.created_at,
        read: msg.read || false,
        property_id: msg.property_id,
        media: msg.media || undefined,
      }));
      
      setMessages(mappedMessages);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
    }
  };

  const markAsRead = async (otherUserId: string, propertyId?: string | null) => {
    if (!currentUserId || !otherUserId) {
      console.warn('markAsRead: currentUserId ou otherUserId manquant');
      return;
    }

    try {
      // Construire la requête pour marquer les messages comme lus
      let query = supabase
        .from('messages_2025_12_01_11_29')
        .update({ read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', currentUserId)
        .eq('read', false);

      // Filtrer par property_id si spécifié
      if (propertyId !== undefined) {
        if (propertyId === null) {
          query = query.is('property_id', null);
        } else {
          query = query.eq('property_id', propertyId);
        }
      }

      const { data, error } = await query.select();

      if (error) {
        console.error('Erreur lors du marquage comme lu:', error);
        return;
      }

      console.log(`✅ ${data?.length || 0} message(s) marqué(s) comme lu(s) pour la conversation avec ${otherUserId}`);

      // Mettre à jour les messages locaux pour refléter le changement
      setMessages(prev =>
        prev.map(msg =>
          msg.sender_id === otherUserId && msg.receiver_id === currentUserId && !msg.read
            ? { ...msg, read: true }
            : msg
        )
      );

      // Mettre à jour le compteur local
      setConversations(prev => {
        const updated = prev.map(conv => {
          // Vérifier que c'est la bonne conversation (même utilisateur + même bien)
          const convPropertyId = conv.property_id || null;
          const matchesProperty = propertyId === undefined || convPropertyId === propertyId;
          
          if (conv.other_user_id === otherUserId && matchesProperty) {
            return { ...conv, unread_count: 0 };
          }
          return conv;
        });
        
        // Mettre à jour selectedConversation seulement si c'est la conversation actuelle
        // Utiliser une fonction pour éviter les références obsolètes
        setSelectedConversation(prevConv => {
          if (prevConv) {
            const prevPropertyId = prevConv.property_id || null;
            const matchesProperty = propertyId === undefined || prevPropertyId === propertyId;
            
            if (prevConv.other_user_id === otherUserId && matchesProperty) {
              return { ...prevConv, unread_count: 0 };
            }
          }
          return prevConv;
        });
        
        return updated;
      });
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const uploadMediaFiles = async (files: File[]): Promise<MediaAttachment[]> => {
    if (files.length === 0) return [];

    setUploadingMedia(true);
    const uploadedMedia: MediaAttachment[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = `${currentUserId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `messages/${currentUserId}/${fileName}`;

        // Déterminer le type de média
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const mediaType: 'image' | 'video' | 'file' = isImage ? 'image' : isVideo ? 'video' : 'file';

        // Upload vers Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('professional-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Erreur upload média:', uploadError);
          throw new Error(`Erreur lors de l'upload de ${file.name}: ${uploadError.message}`);
        }

        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('professional-assets')
          .getPublicUrl(filePath);

        const fileSize = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

        uploadedMedia.push({
          type: mediaType,
          url: publicUrl,
          name: file.name,
          size: fileSize,
          thumbnail: isVideo ? undefined : publicUrl, // Pour les vidéos, on pourrait générer une thumbnail plus tard
        });
      }

      return uploadedMedia;
    } catch (error: any) {
      console.error('Erreur lors de l\'upload des médias:', error);
      throw error;
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limiter à 5 fichiers maximum
    const filesArray = Array.from(files).slice(0, 5);
    setSelectedFiles(prev => [...prev, ...filesArray]);

    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedConversation || sending || !currentUserId) return;

    setSending(true);
    try {
      // Upload des médias si présents
      let uploadedMedia: MediaAttachment[] = [];
      if (selectedFiles.length > 0) {
        uploadedMedia = await uploadMediaFiles(selectedFiles);
      }

      // Récupérer les informations du destinataire et de l'expéditeur
      const [receiverData, senderData, propertyData] = await Promise.all([
        supabase
          .from('users_2025_12_01_11_29')
          .select('id, full_name, email')
          .eq('id', selectedConversation.other_user_id)
          .single(),
        supabase
          .from('users_2025_12_01_11_29')
          .select('id, full_name')
          .eq('id', currentUserId)
          .single(),
        selectedConversation.property_id
          ? supabase
              .from('properties')
              .select('id, title')
              .eq('id', selectedConversation.property_id)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      // Préparer les données du message
      const messageData: any = {
        sender_id: currentUserId,
        receiver_id: selectedConversation.other_user_id,
        content: newMessage.trim() || '', // Permettre les messages sans texte si seulement des médias
        property_id: selectedConversation.property_id || null,
        read: false,
      };

      // Ajouter les médias si présents
      if (uploadedMedia.length > 0) {
        messageData.media = uploadedMedia;
      }

      // Envoyer le message
      const { error } = await supabase.from('messages_2025_12_01_11_29').insert(messageData);

      if (error) throw error;

      // Envoyer un email de notification au destinataire
      if (receiverData.data && senderData.data) {
        const receiverName = receiverData.data.full_name || 'Utilisateur';
        const senderName = senderData.data.full_name || 'Un utilisateur';
        const propertyTitle = propertyData.data?.title;

        const emailResult = await sendEmail('nouveau_message', {
          receiverEmail: receiverData.data.email,
          receiverName: receiverName,
          senderName: senderName,
          propertyTitle: propertyTitle,
          messagePreview: newMessage.trim() || (uploadedMedia.length > 0 ? `${uploadedMedia.length} média(x) partagé(s)` : ''),
          appUrl: window.location.origin,
        });

        // Ne pas bloquer l'interface si l'email échoue
        // Les erreurs sont gérées silencieusement (serveur non démarré, etc.)
        if (!emailResult.success) {
          // Log silencieux uniquement en mode développement très détaillé
          console.debug('ℹ️ Email non envoyé (serveur non disponible). Le message a été enregistré.');
        }
      }

      setNewMessage('');
      setSelectedFiles([]);
      await loadMessages(selectedConversation.other_user_id, selectedConversation.property_id);
      await loadConversations(false); // Rafraîchissement silencieux
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert(`Une erreur est survenue lors de l'envoi du message: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.property_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

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
        
        <div className="pt-24 pb-20">
          <div className="max-w-[1600px] mx-auto px-6">
            <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 300px)' }}>
              <div className="bg-white rounded-2xl shadow-lg p-12 max-w-[600px] w-full text-center">
                <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="ri-message-3-line text-4xl text-teal-600 w-10 h-10 flex items-center justify-center"></i>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Messages</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Pour accéder à vos messages et communiquer avec d'autres utilisateurs, vous devez être connecté à votre compte
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="/connexion"
                    className="px-8 py-4 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-login-box-line text-xl w-5 h-5 flex items-center justify-center inline-block mr-2"></i>
                    Se connecter
                  </a>
                  <a
                    href="/inscription"
                    className="px-8 py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-user-add-line text-xl w-5 h-5 flex items-center justify-center inline-block mr-2"></i>
                    Créer un compte
                  </a>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-4">Pourquoi créer un compte ?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Échanger avec les propriétaires</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Recevoir des réponses rapides</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Historique de conversations</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <i className="ri-check-line text-teal-600 text-xl w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1"></i>
                      <span className="text-sm text-gray-600">Notifications en temps réel</span>
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

      <div className="pt-16 md:pt-24 pb-20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-4 md:mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900">Messages</h1>
            </div>
            <p className="text-sm md:text-base text-gray-600">
              Communiquez avec les propriétaires et les acheteurs
              {totalUnread > 0 && (
                <span className="ml-2 px-2 md:px-3 py-1 bg-red-500 text-white text-xs md:text-sm font-semibold rounded-full">
                  {totalUnread} nouveau{totalUnread > 1 ? 'x' : ''}
                </span>
              )}
            </p>
          </div>

          {/* Messages Container */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full relative">
              {/* Conversations List - Always visible on mobile when no conversation selected, always visible on desktop */}
              <div className={`${!selectedConversation ? 'block' : 'hidden'} lg:block absolute lg:relative inset-0 lg:inset-auto z-20 lg:z-auto col-span-1 lg:col-span-4 border-r border-gray-200 flex flex-col h-full overflow-hidden bg-white`}>
                {/* Search */}
                <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200">
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher..."
                      className="w-full pl-10 md:pl-12 pr-4 py-2 md:py-3 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                  </div>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <i className="ri-message-3-line text-6xl text-gray-300 mb-4"></i>
                      <p className="text-gray-600 font-medium mb-2">Aucune conversation</p>
                      <p className="text-sm text-gray-500">
                        Vos conversations apparaîtront ici
                      </p>
                    </div>
                  ) : (
                    filteredConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setSelectedConversation(conv);
                        }}
                        className={`p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                          selectedConversation?.id === conv.id ? 'bg-teal-50 border-l-4 border-l-teal-600' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            {conv.other_user_avatar ? (
                              <img
                                src={conv.other_user_avatar}
                                alt={conv.other_user_name}
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-base md:text-lg">
                                  {conv.other_user_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            {conv.unread_count > 0 && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{conv.unread_count}</span>
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              {conv.property_id ? (
                                // Conversation avec bien : nom cliquable vers le bien
                                <p
                                  className="font-semibold text-gray-900 truncate hover:text-teal-600 transition-colors cursor-pointer"
                                >
                                  {conv.other_user_name}
                                </p>
                              ) : conv.other_user_type === 'professional' && conv.company_name ? (
                                // Conversation sans bien avec professionnel : nom cliquable vers la page du professionnel
                                <p
                                  className="font-semibold text-gray-900 truncate hover:text-teal-600 transition-colors cursor-pointer"
                                >
                                  {conv.company_name}
                                </p>
                              ) : (
                                // Conversation sans bien avec particulier : nom non cliquable
                                <h3 className="font-semibold text-gray-900 truncate">
                                  {conv.other_user_name}
                                </h3>
                              )}
                              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                {formatTime(conv.last_message_time)}
                              </span>
                            </div>
                            {conv.property_title ? (
                              <p
                                className="flex items-center gap-1 text-xs text-teal-600 mb-1 truncate hover:text-teal-700 transition-colors cursor-pointer"
                              >
                                <i className="ri-home-4-line w-3 h-3 flex items-center justify-center"></i>
                                {conv.property_title}
                              </p>
                            ) : conv.other_user_type === 'professional' && conv.company_name ? (
                              <p className="text-xs text-gray-500 mb-1 truncate">
                                {conv.other_user_name}
                              </p>
                            ) : null}
                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                              {conv.last_message}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="col-span-1 lg:col-span-8 flex flex-col h-full overflow-hidden">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="flex-shrink-0 p-3 md:p-4 border-b border-gray-200 bg-white">
                      <div className="flex items-center gap-2 md:gap-3">
                        {/* Mobile: Back button */}
                        <button
                          onClick={() => {
                            setSelectedConversation(null);
                          }}
                          className="lg:hidden text-gray-500 hover:text-gray-700"
                        >
                          <i className="ri-arrow-left-line text-xl"></i>
                        </button>
                        {selectedConversation.other_user_avatar ? (
                          <img
                            src={selectedConversation.other_user_avatar}
                            alt={selectedConversation.other_user_name}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-base md:text-lg">
                              {selectedConversation.other_user_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          {selectedConversation.property_id ? (
                            <>
                              <a
                                href={`/bien/${selectedConversation.property_id}`}
                                className="font-bold text-gray-900 hover:text-teal-600 transition-colors cursor-pointer"
                              >
                                {selectedConversation.other_user_name}
                              </a>
                              <a
                                href={`/bien/${selectedConversation.property_id}`}
                                className="text-sm text-gray-600 flex items-center gap-1 hover:text-teal-600 transition-colors cursor-pointer mt-1"
                              >
                                <i className="ri-home-4-line w-4 h-4 flex items-center justify-center"></i>
                                {selectedConversation.property_title}
                              </a>
                            </>
                          ) : selectedConversation.other_user_type === 'professional' && selectedConversation.company_name ? (
                            <>
                              <a
                                href={`/professionnel/${selectedConversation.other_user_id}`}
                                className="font-bold text-gray-900 hover:text-teal-600 transition-colors cursor-pointer"
                              >
                                {selectedConversation.company_name}
                              </a>
                              <p className="text-sm text-gray-600 mt-1">
                                {selectedConversation.other_user_name}
                              </p>
                            </>
                          ) : (
                            <h2 className="font-bold text-gray-900">{selectedConversation.other_user_name}</h2>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedConversation.property_id && (
                            <a
                              href={`/bien/${selectedConversation.property_id}`}
                              className="px-3 md:px-4 py-1.5 md:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs md:text-sm font-medium cursor-pointer whitespace-nowrap"
                            >
                              <span className="hidden sm:inline">Voir le bien</span>
                              <i className="ri-home-4-line sm:hidden"></i>
                            </a>
                          )}
                          {!selectedConversation.property_id && selectedConversation.other_user_type === 'professional' && (
                            <a
                              href={`/professionnel/${selectedConversation.other_user_id}`}
                              className="px-3 md:px-4 py-1.5 md:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs md:text-sm font-medium cursor-pointer whitespace-nowrap"
                            >
                              <span className="hidden sm:inline">Voir le professionnel</span>
                              <i className="ri-user-line sm:hidden"></i>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 bg-gray-50 min-h-0">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <i className="ri-chat-3-line text-6xl text-gray-300 mb-4"></i>
                          <p className="text-gray-600 font-medium mb-2">Aucun message</p>
                          <p className="text-sm text-gray-500">
                            Commencez la conversation en envoyant un message
                          </p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isOwn = msg.sender_id === currentUserId;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[85%] md:max-w-[70%] rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 ${
                                  isOwn
                                    ? 'bg-teal-600 text-white rounded-br-sm'
                                    : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                                }`}
                              >
                                {/* Afficher les médias */}
                                {msg.media && msg.media.length > 0 && (
                                  <div className="mb-2 space-y-2">
                                    {msg.media.map((media, index) => (
                                      <div key={index} className="rounded-lg overflow-hidden">
                                        {media.type === 'image' && (
                                          <a
                                            href={media.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                          >
                                            <img
                                              src={media.url}
                                              alt={media.name}
                                              className="max-w-full max-h-64 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            />
                                          </a>
                                        )}
                                        {media.type === 'video' && (
                                          <video
                                            src={media.url}
                                            controls
                                            className="max-w-full max-h-64 rounded-lg"
                                          >
                                            Votre navigateur ne supporte pas la lecture de vidéos.
                                          </video>
                                        )}
                                        {media.type === 'file' && (
                                          <a
                                            href={media.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-2 p-2 rounded-lg border ${
                                              isOwn
                                                ? 'bg-teal-700 border-teal-500'
                                                : 'bg-gray-100 border-gray-300'
                                            } hover:opacity-80 transition-opacity`}
                                          >
                                            <i className="ri-file-line text-xl"></i>
                                            <div className="flex-1 min-w-0">
                                              <p className={`text-sm font-medium truncate ${
                                                isOwn ? 'text-white' : 'text-gray-900'
                                              }`}>
                                                {media.name}
                                              </p>
                                              <p className={`text-xs ${
                                                isOwn ? 'text-teal-100' : 'text-gray-500'
                                              }`}>
                                                {media.size}
                                              </p>
                                            </div>
                                            <i className={`ri-download-line ${
                                              isOwn ? 'text-white' : 'text-gray-600'
                                            }`}></i>
                                          </a>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Afficher le texte du message */}
                                {msg.content && (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                    {msg.content}
                                  </p>
                                )}
                                
                                <div
                                  className={`text-xs mt-1 ${
                                    isOwn ? 'text-teal-100' : 'text-gray-500'
                                  }`}
                                >
                                  {formatTime(msg.created_at)}
                                  {isOwn && msg.read && (
                                    <i className="ri-check-double-line ml-1 w-3 h-3 flex items-center justify-center inline-block"></i>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="flex-shrink-0 p-3 md:p-4 border-t border-gray-200 bg-white">
                      {/* Afficher les fichiers sélectionnés */}
                      {selectedFiles.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-300"
                            >
                              <i className={`ri-${
                                file.type.startsWith('image/') ? 'image-line' :
                                file.type.startsWith('video/') ? 'video-line' :
                                'file-line'
                              } text-teal-600`}></i>
                              <span className="text-sm text-gray-700 truncate max-w-[150px]">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                              >
                                <i className="ri-close-line"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <form onSubmit={sendMessage} className="flex items-end gap-2 md:gap-3">
                        <div className="flex-1 flex flex-col gap-2">
                          <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(e);
                              }
                            }}
                            placeholder="Écrivez votre message..."
                            rows={1}
                            maxLength={500}
                            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-sm"
                            style={{ minHeight: '44px', maxHeight: '120px' }}
                          />
                          <div className="flex items-center gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-input"
                            />
                            <label
                              htmlFor="file-input"
                              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-teal-600 cursor-pointer transition-colors"
                            >
                              <i className="ri-attachment-line text-lg"></i>
                              <span className="hidden sm:inline">Joindre</span>
                            </label>
                            <div className="text-xs text-gray-500 flex-1">
                              {newMessage.length}/500 caractères
                              {selectedFiles.length > 0 && ` • ${selectedFiles.length} fichier(s)`}
                            </div>
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || uploadingMedia}
                          className="px-4 md:px-6 py-2 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center gap-1 md:gap-2"
                        >
                          {(sending || uploadingMedia) ? (
                            <>
                              <i className="ri-loader-4-line text-lg md:text-xl animate-spin w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                              <span className="hidden sm:inline">
                                {uploadingMedia ? 'Upload...' : 'Envoi...'}
                              </span>
                            </>
                          ) : (
                            <>
                              <i className="ri-send-plane-fill text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                              <span className="hidden sm:inline">Envoyer</span>
                            </>
                          )}
                        </button>
                      </form>
                      <div className="text-xs text-gray-500 mt-1 md:mt-2 hidden sm:block">
                        Appuyez sur Entrée pour envoyer • Maximum 5 fichiers
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <i className="ri-chat-smile-3-line text-8xl text-gray-300 mb-6"></i>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Sélectionnez une conversation
                    </h3>
                    <p className="text-gray-600 max-w-md">
                      Choisissez une conversation dans la liste pour commencer à échanger des messages
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
