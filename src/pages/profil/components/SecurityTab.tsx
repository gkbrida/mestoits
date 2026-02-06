import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface UserSession {
  id: string;
  device_name: string;
  location: string;
  ip_address: string;
  last_active_at: string;
  is_current: boolean;
}

export default function SecurityTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    loadUserData();
    loadSessions();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/connexion');
        return;
      }

      setUserId(user.id);

      // Charger les préférences de sécurité
      const { data: userData, error } = await supabase
        .from('users_2025_12_01_11_29')
        .select('two_factor_enabled, email_notifications, sms_notifications')
        .eq('id', user.id)
        .single();

      if (error) {
        // Si l'utilisateur n'existe pas encore dans la table, utiliser les valeurs par défaut
        if (error.code === 'PGRST116') {
          setTwoFactorEnabled(false);
          setEmailNotifications(true);
          setSmsNotifications(false);
        } else {
          console.error('Erreur chargement préférences:', error);
          // Utiliser les valeurs par défaut en cas d'erreur
          setTwoFactorEnabled(false);
          setEmailNotifications(true);
          setSmsNotifications(false);
        }
      } else if (userData) {
        setTwoFactorEnabled(userData.two_factor_enabled || false);
        setEmailNotifications(userData.email_notifications !== false); // Default true
        setSmsNotifications(userData.sms_notifications || false);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des données:', err);
      // En cas d'erreur, utiliser les valeurs par défaut
      setTwoFactorEnabled(false);
      setEmailNotifications(true);
      setSmsNotifications(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    // Éviter les appels concurrents
    if (loadingSessions) return;
    
    try {
      setLoadingSessions(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Charger les sessions depuis la table user_sessions
      const { data: sessionsData, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des sessions:', error);
        // Si la table n'existe pas encore, utiliser un tableau vide
        setSessions([]);
        return;
      }

      const currentSessionToken = session.access_token;
      
      // Filtrer les doublons basés sur session_token (garder le plus récent)
      const uniqueSessions = new Map<string, any>();
      if (sessionsData) {
        sessionsData.forEach((s: any) => {
          const existing = uniqueSessions.get(s.session_token);
          if (!existing || new Date(s.last_active_at) > new Date(existing.last_active_at)) {
            uniqueSessions.set(s.session_token, s);
          }
        });
      }
      
      const deduplicatedSessions = Array.from(uniqueSessions.values());
      
      // Vérifier si la session actuelle existe déjà
      const currentSessionExists = deduplicatedSessions.some((s: any) => s.session_token === currentSessionToken);

      if (!currentSessionExists && session) {
        // Si la session actuelle n'existe pas, la créer
        await createCurrentSession(session);
        // Recharger les sessions après création
        const { data: updatedSessionsData } = await supabase
          .from('user_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('last_active_at', { ascending: false });

        if (updatedSessionsData) {
          // Filtrer à nouveau les doublons
          const uniqueUpdatedSessions = new Map<string, any>();
          updatedSessionsData.forEach((s: any) => {
            const existing = uniqueUpdatedSessions.get(s.session_token);
            if (!existing || new Date(s.last_active_at) > new Date(existing.last_active_at)) {
              uniqueUpdatedSessions.set(s.session_token, s);
            }
          });
          
          const formattedSessions = Array.from(uniqueUpdatedSessions.values()).map((s: any) => ({
            id: s.id,
            device_name: s.device_name || 'Appareil inconnu',
            location: s.location || 'Localisation inconnue',
            ip_address: s.ip_address || 'N/A',
            last_active_at: s.last_active_at,
            is_current: s.session_token === currentSessionToken,
          }));
          setSessions(formattedSessions);
        }
      } else if (deduplicatedSessions.length > 0) {
        // Marquer la session actuelle et formater les sessions
        const formattedSessions = deduplicatedSessions.map((s: any) => ({
          id: s.id,
          device_name: s.device_name || 'Appareil inconnu',
          location: s.location || 'Localisation inconnue',
          ip_address: s.ip_address || 'N/A',
          last_active_at: s.last_active_at,
          is_current: s.session_token === currentSessionToken,
        }));

        setSessions(formattedSessions);
      } else {
        setSessions([]);
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des sessions:', err);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const createCurrentSession = async (session: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Vérifier si la session existe déjà (avec une requête qui peut retourner plusieurs résultats)
      const { data: existingSessions } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_token', session.access_token)
        .eq('user_id', user.id);

      if (existingSessions && existingSessions.length > 0) {
        // Si plusieurs sessions existent avec le même token, supprimer les doublons
        if (existingSessions.length > 1) {
          // Garder seulement la première et supprimer les autres
          const idsToDelete = existingSessions.slice(1).map(s => s.id);
          await supabase
            .from('user_sessions')
            .delete()
            .in('id', idsToDelete);
        }
        
        // Mettre à jour la dernière activité si la session existe déjà
        await supabase
          .from('user_sessions')
          .update({ last_active_at: new Date().toISOString(), is_current: true })
          .eq('id', existingSessions[0].id);
        return;
      }

      // Détecter les informations de l'appareil depuis user_agent
      const userAgent = navigator.userAgent;
      const deviceInfo = detectDeviceInfo(userAgent);

      // Marquer toutes les autres sessions comme non-actuelles
      await supabase
        .from('user_sessions')
        .update({ is_current: false })
        .eq('user_id', user.id);

      // Vérifier une dernière fois avant d'insérer pour éviter les doublons
      const { data: finalCheck } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_token', session.access_token)
        .eq('user_id', user.id)
        .limit(1);

      if (finalCheck && finalCheck.length > 0) {
        // La session a été créée entre-temps, juste la mettre à jour
        await supabase
          .from('user_sessions')
          .update({ last_active_at: new Date().toISOString(), is_current: true })
          .eq('id', finalCheck[0].id);
        return;
      }

      const { error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: session.access_token,
          device_name: deviceInfo.deviceName,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          ip_address: 'N/A', // Ne peut pas être récupéré côté client
          location: 'N/A', // Nécessiterait une API de géolocalisation IP
          user_agent: userAgent,
          is_current: true,
          last_active_at: new Date().toISOString(),
        });

      if (error) {
        // Si l'erreur est due à une contrainte unique, ignorer (la session existe déjà)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          console.log('Session déjà existante, ignorée');
          return;
        }
        throw error;
      }
    } catch (err: any) {
      console.error('Erreur lors de la création de la session:', err);
    }
  };

  const detectDeviceInfo = (userAgent: string) => {
    let deviceName = 'Appareil inconnu';
    let deviceType = 'desktop';
    let browser = 'Inconnu';
    let os = 'Inconnu';

    // Détecter le navigateur
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    }

    // Détecter l'OS
    if (userAgent.includes('Windows')) {
      os = 'Windows';
      deviceName = `${browser} sur Windows`;
    } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
      os = 'macOS';
      deviceName = `${browser} sur MacOS`;
    } else if (userAgent.includes('iPhone')) {
      os = 'iOS';
      deviceType = 'mobile';
      deviceName = `Safari sur iPhone`;
    } else if (userAgent.includes('iPad')) {
      os = 'iOS';
      deviceType = 'tablet';
      deviceName = `Safari sur iPad`;
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      deviceType = 'mobile';
      deviceName = `${browser} sur Android`;
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
      deviceName = `${browser} sur Linux`;
    }

    return { deviceName, deviceType, browser, os };
  };

  const updateLastActive = async () => {
    try {
      if (!userId) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Mettre à jour la dernière activité et marquer comme session actuelle
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          last_active_at: new Date().toISOString(),
          is_current: true
        })
        .eq('session_token', session.access_token)
        .eq('user_id', userId);

      if (error) {
        // Si la session n'existe pas, la créer
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          await createCurrentSession(session);
        } else {
          console.error('Erreur mise à jour session:', error);
        }
      } else {
        // Marquer toutes les autres sessions comme non-actuelles
        await supabase
          .from('user_sessions')
          .update({ is_current: false })
          .eq('user_id', userId)
          .neq('session_token', session.access_token);
      }
    } catch (err: any) {
      console.error('Erreur mise à jour dernière activité:', err);
    }
  };

  // Mettre à jour la dernière activité toutes les 5 minutes
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(() => {
      updateLastActive();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [userId]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Au moins 8 caractères');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Une lettre majuscule');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Une lettre minuscule');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Un chiffre');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Un caractère spécial');
    }

    return { valid: errors.length === 0, errors };
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setShowSuccess(false);
    
    if (!passwordData.currentPassword) {
      setPasswordError('Veuillez saisir votre mot de passe actuel');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    // Valider le mot de passe selon les critères
    const validation = validatePassword(passwordData.newPassword);
    if (!validation.valid) {
      setPasswordError(`Le mot de passe doit contenir : ${validation.errors.join(', ')}`);
      return;
    }

    try {
      // Vérifier le mot de passe actuel en essayant de se reconnecter
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error('Utilisateur non connecté');
      }

      // Vérifier le mot de passe actuel
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials') || signInError.message.includes('incorrect')) {
          setPasswordError('Le mot de passe actuel est incorrect');
        } else {
          setPasswordError('Erreur lors de la vérification du mot de passe actuel');
        }
        return;
      }

      // Mettre à jour le mot de passe via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        if (updateError.message.includes('same')) {
          setPasswordError('Le nouveau mot de passe doit être différent de l\'ancien');
        } else {
          throw updateError;
        }
        return;
      }

      setShowSuccess(true);
      setPasswordError('');
      setTimeout(() => setShowSuccess(false), 3000);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.error('Erreur changement mot de passe:', err);
      setPasswordError(err.message || 'Une erreur est survenue lors du changement de mot de passe');
    }
  };

  const handleToggleTwoFactor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newValue = !twoFactorEnabled;
      
      const { error } = await supabase
        .from('users_2025_12_01_11_29')
        .update({ two_factor_enabled: newValue })
        .eq('id', user.id);

      if (error) {
        // Si l'utilisateur n'existe pas dans la table, créer l'enregistrement
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          const { error: insertError } = await supabase
            .from('users_2025_12_01_11_29')
            .insert({
              id: user.id,
              email: user.email || '',
              two_factor_enabled: newValue,
            });
          
          if (insertError) throw insertError;
        } else {
          throw error;
        }
      }

      setTwoFactorEnabled(newValue);
    } catch (err: any) {
      console.error('Erreur mise à jour 2FA:', err);
      alert('Erreur lors de la mise à jour de l\'authentification à deux facteurs');
    }
  };

  const handleToggleEmailNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newValue = !emailNotifications;
      
      const { error } = await supabase
        .from('users_2025_12_01_11_29')
        .update({ email_notifications: newValue })
        .eq('id', user.id);

      if (error) {
        // Si l'utilisateur n'existe pas dans la table, créer l'enregistrement
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          const { error: insertError } = await supabase
            .from('users_2025_12_01_11_29')
            .insert({
              id: user.id,
              email: user.email || '',
              email_notifications: newValue,
            });
          
          if (insertError) throw insertError;
        } else {
          throw error;
        }
      }

      setEmailNotifications(newValue);
    } catch (err: any) {
      console.error('Erreur mise à jour notifications email:', err);
      alert('Erreur lors de la mise à jour des préférences');
    }
  };

  const handleToggleSmsNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newValue = !smsNotifications;
      
      const { error } = await supabase
        .from('users_2025_12_01_11_29')
        .update({ sms_notifications: newValue })
        .eq('id', user.id);

      if (error) {
        // Si l'utilisateur n'existe pas dans la table, créer l'enregistrement
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          const { error: insertError } = await supabase
            .from('users_2025_12_01_11_29')
            .insert({
              id: user.id,
              email: user.email || '',
              sms_notifications: newValue,
            });
          
          if (insertError) throw insertError;
        } else {
          throw error;
        }
      }

      setSmsNotifications(newValue);
    } catch (err: any) {
      console.error('Erreur mise à jour notifications SMS:', err);
      alert('Erreur lors de la mise à jour des préférences');
    }
  };

  const handleDisconnectSession = async (sessionId: string) => {
    try {
      if (!userId) return;

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;

      // Recharger les sessions
      await loadSessions();
    } catch (err: any) {
      console.error('Erreur déconnexion session:', err);
      alert('Erreur lors de la déconnexion de la session');
    }
  };

  const handleDisconnectAllSessions = async () => {
    try {
      if (!userId) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Supprimer toutes les sessions sauf la session actuelle
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)
        .neq('session_token', session.access_token);

      if (error) throw error;

      // Recharger les sessions
      await loadSessions();
    } catch (err: any) {
      console.error('Erreur déconnexion toutes sessions:', err);
      alert('Erreur lors de la déconnexion des sessions');
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Maintenant';
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      alert('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    setDeletingAccount(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Aucune session active');
      }

      // Appeler l'API route Vercel pour supprimer l'utilisateur de auth.users et users_2025_12_01_11_29
      // Utilisation de l'API route au lieu de l'Edge Function pour contourner les problèmes CORS
      const apiUrl = import.meta.env.VITE_EMAIL_API_URL || '/api';
      const deleteResponse = await fetch(`${apiUrl}/delete-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur HTTP ${deleteResponse.status}`);
      }

      const deleteData = await deleteResponse.json();
      
      if (!deleteData.success) {
        throw new Error(deleteData.error || 'Erreur lors de la suppression du compte');
      }

      // Essayer de déconnecter l'utilisateur
      // Note: Si l'utilisateur a déjà été supprimé, signOut() peut retourner une erreur 403
      // C'est normal et on continue quand même car l'utilisateur est déjà supprimé
      try {
        await supabase.auth.signOut();
      } catch (signOutError: any) {
        // Ignorer l'erreur 403 car l'utilisateur est déjà supprimé
        // L'erreur peut être dans error.status, error.message, ou dans la réponse HTTP
        const is403Error = signOutError?.status === 403 || 
                          signOutError?.message?.includes('403') ||
                          signOutError?.message?.includes('Forbidden');
        
        if (!is403Error) {
          console.warn('Erreur lors de la déconnexion:', signOutError);
        }
      }

      // Nettoyer le localStorage manuellement pour être sûr
      try {
        localStorage.removeItem('sb-' + import.meta.env.VITE_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token');
        localStorage.clear();
      } catch (e) {
        // Ignorer les erreurs de nettoyage
      }

      // Rediriger vers la page d'accueil
      navigate('/');
    } catch (error: any) {
      console.error('Erreur suppression compte:', error);
      alert(`Une erreur est survenue lors de la suppression du compte: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setDeletingAccount(false);
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

  return (
    <div>
      {/* Change Password */}
      <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
          <i className="ri-lock-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
          Changer le mot de passe
        </h3>

        <form onSubmit={handlePasswordSubmit}>
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Mot de passe actuel
            </label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-[10px] sm:text-xs text-gray-700 mb-2 font-semibold">
              Le mot de passe doit contenir :
            </p>
            <ul className="text-[10px] sm:text-xs text-gray-600 space-y-1">
              <li className="flex items-center gap-2">
                <i className="ri-check-line text-green-600 w-3 h-3 flex items-center justify-center"></i>
                Au moins 8 caractères
              </li>
              <li className="flex items-center gap-2">
                <i className="ri-check-line text-green-600 w-3 h-3 flex items-center justify-center"></i>
                Une lettre majuscule et une minuscule
              </li>
              <li className="flex items-center gap-2">
                <i className="ri-check-line text-green-600 w-3 h-3 flex items-center justify-center"></i>
                Un chiffre et un caractère spécial
              </li>
            </ul>
          </div>

          {passwordError && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 sm:gap-3">
              <i className="ri-error-warning-line text-red-600 text-lg sm:text-xl flex-shrink-0 mt-0.5"></i>
              <p className="text-xs sm:text-sm text-red-800">{passwordError}</p>
            </div>
          )}

          {showSuccess && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 sm:gap-3">
              <i className="ri-check-circle-fill text-green-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
              <span className="text-xs sm:text-sm font-medium text-green-800">
                Votre mot de passe a été modifié avec succès
              </span>
            </div>
          )}

          <button
            type="submit"
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap"
          >
            <span className="hidden sm:inline">Mettre à jour le mot de passe</span>
            <span className="sm:hidden">Mettre à jour</span>
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
          <i className="ri-shield-check-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
          Authentification à deux facteurs
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg mb-3 sm:mb-4">
          <div className="flex-1">
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
              Activer l'authentification à deux facteurs
            </h4>
            <p className="text-xs sm:text-sm text-gray-600">
              Ajoutez une couche de sécurité supplémentaire à votre compte
            </p>
          </div>
          <button
            onClick={handleToggleTwoFactor}
            className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-all cursor-pointer flex-shrink-0 ${
              twoFactorEnabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                twoFactorEnabled ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'
              }`}
            ></span>
          </button>
        </div>

        {twoFactorEnabled && (
          <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2 sm:gap-3">
              <i className="ri-check-circle-fill text-green-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center mt-0.5 flex-shrink-0"></i>
              <div className="text-xs sm:text-sm text-gray-700">
                <p className="font-semibold mb-1">Authentification à deux facteurs activée</p>
                <p className="text-[10px] sm:text-xs">
                  Vous recevrez un code de vérification par SMS à chaque connexion depuis un nouvel appareil.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
          <i className="ri-notification-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
          Préférences de notification
        </h3>

        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                Notifications par email
              </h4>
              <p className="text-xs sm:text-sm text-gray-600">
                Recevoir des alertes de sécurité par email
              </p>
            </div>
            <button
              onClick={handleToggleEmailNotifications}
              className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-all cursor-pointer flex-shrink-0 ${
                emailNotifications ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  emailNotifications ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'
                }`}
              ></span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex-1">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                Notifications par SMS
              </h4>
              <p className="text-xs sm:text-sm text-gray-600">
                Recevoir des alertes de sécurité par SMS
              </p>
            </div>
            <button
              onClick={handleToggleSmsNotifications}
              className={`relative w-12 h-6 sm:w-14 sm:h-7 rounded-full transition-all cursor-pointer flex-shrink-0 ${
                smsNotifications ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  smsNotifications ? 'translate-x-6 sm:translate-x-7' : 'translate-x-0'
                }`}
              ></span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
          <i className="ri-device-line text-orange-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
          Sessions actives
        </h3>

        {sessions.length === 0 ? (
          <div className="p-4 sm:p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-xs sm:text-sm text-gray-600">Aucune session active</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 sm:space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="ri-computer-line text-white text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900">
                          {session.device_name}
                        </h4>
                        {session.is_current && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap">
                            Session actuelle
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-600 break-words">
                         {formatLastActive(session.last_active_at)}
                      </p>
                    </div>
                  </div>
                  {!session.is_current && (
                    <button
                      onClick={() => handleDisconnectSession(session.id)}
                      className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2 text-red-600 text-xs sm:text-sm font-semibold hover:bg-red-50 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                    >
                      Déconnecter
                    </button>
                  )}
                </div>
              ))}
            </div>

            {sessions.filter(s => !s.is_current).length > 0 && (
              <button
                onClick={handleDisconnectAllSessions}
                className="mt-4 sm:mt-6 w-full px-4 sm:px-6 py-2 sm:py-3 border border-red-300 text-red-600 text-xs sm:text-sm font-semibold rounded-lg hover:bg-red-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Déconnecter toutes les autres sessions
              </button>
            )}
          </>
        )}
      </div>

      {/* Delete Account Section */}
      <div className="pt-6 sm:pt-8 border-t border-gray-200">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
          <i className="ri-delete-bin-line text-red-500 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
          Supprimer mon compte
        </h3>

        <div className="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg sm:rounded-xl">
          <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
            <i className="ri-error-warning-line text-red-600 text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mt-1 flex-shrink-0"></i>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2">
                Attention : Cette action est irréversible
              </h4>
              <p className="text-xs sm:text-sm text-gray-700 mb-2 sm:mb-3">
                La suppression de votre compte entraînera :
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
                <li>La suppression définitive de toutes vos données personnelles</li>
                <li>La suppression de toutes vos annonces</li>
                <li>La perte de votre historique de messages</li>
                <li>La perte de vos favoris et recherches sauvegardées</li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-red-700 transition-all cursor-pointer whitespace-nowrap"
          >
            Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 sm:px-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-[500px] w-full p-4 sm:p-6 md:p-8">
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <i className="ri-error-warning-line text-red-600 text-2xl sm:text-3xl w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Confirmer la suppression
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Cette action est définitive et ne peut pas être annulée
              </p>
            </div>

            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                Tapez <strong>SUPPRIMER</strong> pour confirmer
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="SUPPRIMER"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                disabled={deletingAccount}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmation !== 'SUPPRIMER'}
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-red-700 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAccount ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                    Suppression...
                  </span>
                ) : (
                  'Supprimer définitivement'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
