/**
 * Utilitaires pour extraire les informations du navigateur
 */

export interface BrowserInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  language: string;
  timezone: string;
  userAgent: string;
}

/**
 * Détecte le type d'appareil basé sur la largeur de l'écran et le user agent
 */
function detectDeviceType(): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();

  // Détection des tablettes
  if (
    /tablet|ipad|playbook|silk/i.test(userAgent) ||
    (width >= 768 && width <= 1024 && /touch/i.test(userAgent))
  ) {
    return 'tablet';
  }

  // Détection des mobiles
  if (
    /mobile|android|iphone|ipod|blackberry|opera|mini|windows\s+phone|palm|iemobile|wpdesktop/i.test(userAgent) ||
    width < 768
  ) {
    return 'mobile';
  }

  // Desktop par défaut
  if (width >= 1024) {
    return 'desktop';
  }

  return 'unknown';
}

/**
 * Extrait le nom et la version du navigateur
 */
function extractBrowserInfo(): { browser: string; browserVersion: string } {
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';
  let browserVersion = 'Unknown';

  // Chrome
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  // Edge
  else if (userAgent.indexOf('Edg') > -1) {
    browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  // Firefox
  else if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  // Safari
  else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }
  // Opera
  else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
    browser = 'Opera';
    const match = userAgent.match(/(?:Opera|OPR)\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }

  return { browser, browserVersion };
}

/**
 * Extrait le nom et la version de l'OS
 */
function getOSInfo(): { os: string; osVersion: string } {
  const userAgent = navigator.userAgent;
  let os = 'Unknown';
  let osVersion = 'Unknown';

  // Windows
  if (userAgent.indexOf('Windows') > -1) {
    os = 'Windows';
    if (userAgent.indexOf('Windows NT 10.0') > -1) osVersion = '10';
    else if (userAgent.indexOf('Windows NT 6.3') > -1) osVersion = '8.1';
    else if (userAgent.indexOf('Windows NT 6.2') > -1) osVersion = '8';
    else if (userAgent.indexOf('Windows NT 6.1') > -1) osVersion = '7';
    else if (userAgent.indexOf('Windows NT 6.0') > -1) osVersion = 'Vista';
    else if (userAgent.indexOf('Windows NT 5.1') > -1) osVersion = 'XP';
  }
  // macOS
  else if (userAgent.indexOf('Mac OS X') > -1) {
    os = 'macOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : 'Unknown';
  }
  // iOS
  else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
    os = 'iOS';
    const match = userAgent.match(/OS (\d+[._]\d+)/);
    osVersion = match ? match[1].replace('_', '.') : 'Unknown';
  }
  // Android
  else if (userAgent.indexOf('Android') > -1) {
    os = 'Android';
    const match = userAgent.match(/Android (\d+[._]\d+)/);
    osVersion = match ? match[1] : 'Unknown';
  }
  // Linux
  else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux';
    osVersion = 'Unknown';
  }

  return { os, osVersion };
}

/**
 * Génère un hash SHA-256 d'une chaîne (pour anonymiser les IPs)
 */
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Récupère toutes les informations du navigateur
 */
export async function getBrowserInfo(): Promise<BrowserInfo & { ipHash?: string }> {
  const { browser, browserVersion } = extractBrowserInfo();
  const { os, osVersion } = getOSInfo();
  const deviceType = detectDeviceType();

  // Récupération de l'IP via une API externe (optionnel, peut être fait côté serveur)
  let ipHash: string | undefined;
  try {
    // Note: Cette API est gratuite mais limitée. Vous pouvez utiliser votre propre API.
    // Le hashage nécessite HTTPS, donc on vérifie d'abord
    if (window.isSecureContext && crypto.subtle) {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      if (data.ip) {
        ipHash = await hashString(data.ip);
      }
    }
  } catch (error) {
    // Ignorer les erreurs de récupération d'IP (peut être bloqué par CORS ou autres)
    console.debug('Impossible de récupérer l\'IP:', error);
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    language: navigator.language || 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    userAgent: navigator.userAgent,
    ipHash,
  };
}

/**
 * Génère un identifiant unique pour le visiteur
 */
export function generateVisitorId(): string {
  // Vérifier si un ID existe déjà dans localStorage
  const existingId = localStorage.getItem('visitor_id');
  if (existingId) {
    return existingId;
  }

  // Générer un nouvel ID
  const newId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem('visitor_id', newId);
  return newId;
}

/**
 * Génère un identifiant unique pour la session
 */
export function generateSessionId(): string {
  // Vérifier si une session existe déjà dans sessionStorage
  const existingSession = sessionStorage.getItem('session_id');
  if (existingSession) {
    return existingSession;
  }

  // Générer une nouvelle session
  const newSession = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem('session_id', newSession);
  sessionStorage.setItem('session_start', Date.now().toString());
  return newSession;
}

