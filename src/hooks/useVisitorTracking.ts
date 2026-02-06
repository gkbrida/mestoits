import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getBrowserInfo, generateVisitorId, generateSessionId } from '../utils/browserInfo';

interface TrackingData {
  visitor_id: string;
  session_id: string;
  page_path: string;
  page_title: string;
  referrer: string | null;
  user_agent: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  ip_hash?: string;
  country?: string;
  region?: string;
  city?: string;
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  language: string;
  timezone: string;
  session_start: string;
  time_on_page?: number;
  user_id?: string;
}

/**
 * Hook pour tracker les visites des utilisateurs anonymes
 */
export function useVisitorTracking() {
  const location = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const trackingSent = useRef<boolean>(false);
  const sessionStartTime = useRef<number>(
    parseInt(sessionStorage.getItem('session_start') || Date.now().toString())
  );

  useEffect(() => {
    // Réinitialiser le temps de page à chaque changement de route
    pageStartTime.current = Date.now();
    trackingSent.current = false;

    // Fonction pour envoyer le tracking
    const sendTracking = async () => {
      // Éviter d'envoyer plusieurs fois pour la même page
      if (trackingSent.current) return;
      trackingSent.current = true;

      try {
        // Générer les IDs si nécessaire
        const visitorId = generateVisitorId();
        const sessionId = generateSessionId();

        // Récupérer les informations du navigateur
        const browserInfo = await getBrowserInfo();

        // Calculer le temps passé sur la page précédente (si applicable)
        const timeOnPage = Math.floor((Date.now() - pageStartTime.current) / 1000);

        // Préparer les données de tracking
        const trackingData: TrackingData = {
          visitor_id: visitorId,
          session_id: sessionId,
          page_path: location.pathname + location.search,
          page_title: document.title,
          referrer: document.referrer || null,
          user_agent: browserInfo.userAgent,
          browser: browserInfo.browser,
          browser_version: browserInfo.browserVersion,
          os: browserInfo.os,
          os_version: browserInfo.osVersion,
          device_type: browserInfo.deviceType,
          ip_hash: browserInfo.ipHash,
          screen_width: browserInfo.screenWidth,
          screen_height: browserInfo.screenHeight,
          viewport_width: browserInfo.viewportWidth,
          viewport_height: browserInfo.viewportHeight,
          language: browserInfo.language,
          timezone: browserInfo.timezone,
          session_start: new Date(sessionStartTime.current).toISOString(),
          time_on_page: timeOnPage > 0 ? timeOnPage : undefined,
        };

        // Vérifier si l'utilisateur est connecté
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          trackingData.user_id = user.id;
        }

        // Envoyer les données à Supabase
        const { error } = await supabase
          .from('visitor_tracking')
          .insert([trackingData]);

        if (error) {
          console.error('Erreur lors de l\'envoi du tracking:', error);
        }
      } catch (error) {
        console.error('Erreur lors de la collecte des données de tracking:', error);
      }
    };

    // Envoyer le tracking après un court délai pour s'assurer que la page est chargée
    const timeoutId = setTimeout(() => {
      sendTracking();
    }, 1000);

    // Nettoyer le timeout si le composant est démonté avant
    return () => {
      clearTimeout(timeoutId);
    };
  }, [location.pathname, location.search]);

  // Tracker le temps passé sur la page avant de quitter
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée - mettre à jour le temps passé
        const timeOnPage = Math.floor((Date.now() - pageStartTime.current) / 1000);
        // Note: On pourrait mettre à jour la dernière entrée ici si nécessaire
        // Pour l'instant, le temps est calculé lors de la prochaine visite
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}

