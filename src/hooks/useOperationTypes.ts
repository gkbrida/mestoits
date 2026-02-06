import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OperationType {
  id: string;
  code: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

export function useOperationTypes() {
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOperationTypes();
  }, []);

  const loadOperationTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('operation_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setOperationTypes(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des types d\'opération:', err);
      setError(err.message || 'Erreur lors du chargement des types d\'opération');
      // En cas d'erreur, utiliser des valeurs par défaut
      setOperationTypes([
        { id: '1', code: 'sale', label: 'À vendre', display_order: 1, is_active: true },
        { id: '2', code: 'rental', label: 'À louer', display_order: 2, is_active: true },
        { id: '3', code: 'short-term-rental', label: 'Location courte durée', display_order: 3, is_active: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getOperationTypeByCode = (code: string): OperationType | undefined => {
    return operationTypes.find(type => type.code === code);
  };

  const getOperationTypeLabel = (code: string): string => {
    const type = getOperationTypeByCode(code);
    return type?.label || code;
  };

  return {
    operationTypes,
    loading,
    error,
    getOperationTypeByCode,
    getOperationTypeLabel,
    reload: loadOperationTypes,
  };
}
