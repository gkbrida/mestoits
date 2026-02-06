import { useVisitorTracking } from '../hooks/useVisitorTracking';

/**
 * Composant wrapper pour le tracking des visiteurs
 * À placer dans App.tsx pour tracker toutes les pages
 */
export function VisitorTracker() {
  useVisitorTracking();
  return null; // Ce composant ne rend rien visuellement
}

