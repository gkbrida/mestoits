import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PropertyType {
  id: string;
  code: string;
  label: string;
  icon: string;
  offer_types: string[];
  requires_surface: boolean;
  requires_bedrooms: boolean;
  requires_bathrooms: boolean;
  allows_villa_type: boolean;
  display_order: number;
  is_active: boolean;
}

export function usePropertyTypes() {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPropertyTypes();
  }, []);

  const loadPropertyTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('property_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setPropertyTypes(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des types de biens:', err);
      setError(err.message || 'Erreur lors du chargement des types de biens');
    } finally {
      setLoading(false);
    }
  };

  const getPropertyTypeByCode = (code: string): PropertyType | undefined => {
    return propertyTypes.find(type => type.code === code);
  };

  const getPropertyTypeLabel = (code: string): string => {
    const type = getPropertyTypeByCode(code);
    return type?.label || code;
  };

  const getPropertyTypeIcon = (code: string): string => {
    const type = getPropertyTypeByCode(code);
    return type?.icon || 'ri-home-line';
  };

  const isOfferTypeAllowed = (propertyTypeCode: string, offerType: string): boolean => {
    const type = getPropertyTypeByCode(propertyTypeCode);
    return type?.offer_types.includes(offerType) || false;
  };

  return {
    propertyTypes,
    loading,
    error,
    getPropertyTypeByCode,
    getPropertyTypeLabel,
    getPropertyTypeIcon,
    isOfferTypeAllowed,
    reload: loadPropertyTypes,
  };
}
