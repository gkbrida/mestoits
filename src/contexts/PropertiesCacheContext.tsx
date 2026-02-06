import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';

export interface Property {
  id: string;
  title: string;
  description?: string;
  price: number;
  operation_type?: string; // Nouveau : type d'opération (sale, rental, short-term-rental)
  offer_type: string; // Gardé pour compatibilité avec l'ancien système
  property_type: string;
  villa_type?: string;
  address?: string; // Peut être null dans properties_02
  city: string;
  postal_code?: string;
  surface_area?: number; // Peut être null dans properties_02
  surface_per_lot?: number; // Pour terrains
  available_lots?: number; // Pour terrains
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  rooms?: number; // Nombre de pièces
  features?: string[];
  condition?: string;
  standing?: string;
  security_type?: string;
  accessibility?: string;
  land_titles?: string[];
  images?: string[];
  video_url?: string; // Nouveau : vidéo
  floor_plan_url?: string;
  virtual_tour_url?: string;
  price_per_sqm?: number; // Peut être calculé
  views_count: number;
  favorites_count?: number;
  owner_id: string;
  offered_by: 'professional' | 'individual';
  depositor_status?: string; // Statut du déposant (owner, agent, developer)
  agency_fees?: number;
  security_deposit?: number;
  advance_rent?: number;
  service_charges?: number;
  // Nouveaux champs du formulaire
  commerce_type?: string;
  building_floors?: number;
  total_units?: number;
  office_rooms?: number;
  parking_spaces?: number;
}

interface PropertiesCacheContextType {
  getProperty: (id: string) => Property | undefined;
  setProperty: (property: Property) => void;
  setProperties: (properties: Property[]) => void;
  clearCache: () => void;
  hasProperty: (id: string) => boolean;
  getAllProperties: () => Property[];
}

const PropertiesCacheContext = createContext<PropertiesCacheContextType | undefined>(undefined);

export function PropertiesCacheProvider({ children }: { children: ReactNode }) {
  // Utiliser useRef pour stocker le cache sans déclencher de re-renders
  const cacheRef = useRef<Map<string, Property>>(new Map());
  // Utiliser un compteur pour forcer les mises à jour si nécessaire
  const [, setCacheVersion] = useState(0);

  const getProperty = useCallback((id: string): Property | undefined => {
    return cacheRef.current.get(id);
  }, []);

  const setProperty = useCallback((property: Property) => {
    cacheRef.current.set(property.id, property);
    // Forcer une mise à jour si nécessaire
    setCacheVersion(prev => prev + 1);
  }, []);

  const setProperties = useCallback((newProperties: Property[]) => {
    newProperties.forEach(property => {
      cacheRef.current.set(property.id, property);
    });
    // Forcer une mise à jour si nécessaire
    setCacheVersion(prev => prev + 1);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    setCacheVersion(prev => prev + 1);
  }, []);

  const hasProperty = useCallback((id: string): boolean => {
    return cacheRef.current.has(id);
  }, []);

  const getAllProperties = useCallback((): Property[] => {
    return Array.from(cacheRef.current.values());
  }, []);

  return (
    <PropertiesCacheContext.Provider
      value={{
        getProperty,
        setProperty,
        setProperties,
        clearCache,
        hasProperty,
        getAllProperties,
      }}
    >
      {children}
    </PropertiesCacheContext.Provider>
  );
}

export function usePropertiesCache() {
  const context = useContext(PropertiesCacheContext);
  if (context === undefined) {
    throw new Error('usePropertiesCache must be used within a PropertiesCacheProvider');
  }
  return context;
}

