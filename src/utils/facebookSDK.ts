/**
 * Utilitaire pour charger et initialiser le SDK Facebook
 */

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

/**
 * Charge le SDK Facebook de manière asynchrone
 */
export function loadFacebookSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Vérifier si le SDK est déjà chargé
    if (window.FB) {
      resolve();
      return;
    }

    // Vérifier si le script est déjà en cours de chargement
    if (document.getElementById('facebook-jssdk')) {
      // Attendre que FB soit disponible
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB);
          resolve();
        }
      }, 100);
      return;
    }

    // Initialiser FB avant de charger le script
    window.fbAsyncInit = function() {
      const appId = import.meta.env.VITE_FACEBOOK_APP_ID || '';
      const apiVersion = import.meta.env.VITE_FACEBOOK_API_VERSION || 'v18.0';
      
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: apiVersion
      });
      
      window.FB.AppEvents.logPageView();
      resolve();
    };

    // Charger le script
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
    
    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  });
}

/**
 * Initialise le SDK Facebook (à appeler au démarrage de l'application)
 */
export async function initFacebookSDK(): Promise<void> {
  try {
    await loadFacebookSDK();
  } catch (error) {
    console.error('Erreur lors du chargement du SDK Facebook:', error);
  }
}

/**
 * Interface pour la réponse de getLoginStatus
 */
export interface FacebookLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
}

/**
 * Vérifie le statut de connexion Facebook
 * @param callback Fonction callback appelée avec le statut de connexion
 */
export function checkFacebookLoginStatus(
  callback: (response: FacebookLoginStatusResponse) => void
): void {
  if (!window.FB) {
    console.warn('Facebook SDK not loaded');
    callback({ status: 'unknown' });
    return;
  }

  window.FB.getLoginStatus((response: FacebookLoginStatusResponse) => {
    callback(response);
  });
}

/**
 * Vérifie le statut de connexion Facebook de manière asynchrone
 */
export async function getFacebookLoginStatus(): Promise<FacebookLoginStatusResponse> {
  return new Promise((resolve) => {
    if (!window.FB) {
      // Charger le SDK d'abord
      loadFacebookSDK().then(() => {
        checkFacebookLoginStatus(resolve);
      }).catch(() => {
        resolve({ status: 'unknown' });
      });
    } else {
      checkFacebookLoginStatus(resolve);
    }
  });
}

