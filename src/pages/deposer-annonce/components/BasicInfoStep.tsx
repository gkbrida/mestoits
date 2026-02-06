import { useEffect } from 'react';
import { usePropertyTypes } from '../../../hooks/usePropertyTypes';
// @ts-expect-error - Problème de cache TypeScript, le fichier existe bien
import { useOperationTypes } from '../../../hooks/useOperationTypes';

// Type local pour éviter les problèmes de cache TypeScript
interface OperationType {
  id: string;
  code: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

interface BasicInfoStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function BasicInfoStep({ data, onUpdate, onValidationChange }: BasicInfoStepProps) {
  const { propertyTypes: propertyTypesData, getPropertyTypeByCode } = usePropertyTypes();
  const { operationTypes, loading: loadingOperations } = useOperationTypes();

  // Transformer les données pour l'affichage
  const propertyTypes = propertyTypesData.map(type => ({
    value: type.code,
    label: type.label,
    icon: type.icon,
    offer_types: type.offer_types,
  }));

  // Valider le formulaire
  useEffect(() => {
    const isValid = validateForm();
    if (onValidationChange) {
      onValidationChange(isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.operation_type, data.property_type, data.price, data.standing, data.surface_area, data.surface_per_lot, data.available_lots, data.villa_type]);

  const validateForm = (): boolean => {
    // Champs obligatoires de base
    if (!data.operation_type || !data.property_type || !data.price || data.price <= 0) {
      return false;
    }
    
    // Pour villa : type de villa obligatoire
    if (data.property_type === 'villa' && !data.villa_type) {
      return false;
    }
    
    // Pour les terrains : superficie/lot et nombre de lots obligatoires
    if (data.property_type === 'land') {
      return !!(data.surface_per_lot && data.surface_per_lot > 0 && data.available_lots && data.available_lots > 0);
    }
    
    // Pour les autres types : superficie non obligatoire
    return true;
  };

  // Vérifier si un type d'opération est compatible avec un type de bien
  const isOperationAllowed = (operationCode: string, propertyCode: string): boolean => {
    const propertyType = getPropertyTypeByCode(propertyCode);
    if (!propertyType) return false;

    // Mapping des opérations vers les offer_types
    const operationToOfferType: Record<string, string> = {
      'sale': 'sale',
      'rental': 'rental',
      'short-term-rental': 'rental', // Location courte durée = rental
    };

    const offerType = operationToOfferType[operationCode];
    return propertyType.offer_types.includes(offerType);
  };

  // Vérifier si un type de bien est autorisé pour une opération
  const isPropertyAllowedForOperation = (propertyCode: string, operationCode: string): boolean => {
    // Restrictions spécifiques
    if (operationCode === 'short-term-rental') {
      // Location courte durée : pas applicable à Commerce, Bureau, Parking, Terrain, Immeuble
      const notAllowed = ['commercial', 'office', 'parking', 'land', 'building'];
      return !notAllowed.includes(propertyCode);
    }
    
    // Immeuble : seulement en vente
    if (propertyCode === 'building') {
      return operationCode === 'sale';
    }
    
    if (operationCode === 'sale') {
      // Vente : Terrain et Immeuble seulement en vente
      if (propertyCode === 'land' || propertyCode === 'building') return true;
    }

    return isOperationAllowed(operationCode, propertyCode);
  };

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Type de bien & Transaction</h2>
        <p className="text-sm md:text-base text-gray-600">Sélectionnez le type d'opération et le type de bien</p>
      </div>

      {/* 1. Type d'opération */}
      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
          Type d'opération <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {loadingOperations ? (
            <div className="col-span-3 text-center py-4 text-gray-500">Chargement...</div>
          ) : (
            operationTypes.map((operation: OperationType) => (
              <button
                key={operation.code}
                type="button"
                onClick={() => {
                  const updateData: any = { operation_type: operation.code };
                  // Ajuster offer_type pour compatibilité
                  if (operation.code === 'sale') {
                    updateData.offer_type = 'sale';
                  } else if (operation.code === 'rental' || operation.code === 'short-term-rental') {
                    updateData.offer_type = 'rental';
                  }
                  // Si le type de bien actuel n'est pas compatible, le réinitialiser
                  if (data.property_type && !isPropertyAllowedForOperation(data.property_type, operation.code)) {
                    updateData.property_type = undefined;
                  }
                  onUpdate(updateData);
                }}
                className={`p-4 md:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                  data.operation_type === operation.code
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center text-xs md:text-sm font-semibold text-gray-900">{operation.label}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. Type de bien */}
      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
          Type de bien <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {propertyTypes.map((type) => {
            const isDisabled = data.operation_type && !isPropertyAllowedForOperation(type.value, data.operation_type);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  const updateData: any = { property_type: type.value };
                  // Réinitialiser villa_type si ce n'est pas une villa
                  if (type.value !== 'villa') {
                    updateData.villa_type = undefined;
                  }
                  onUpdate(updateData);
                }}
                disabled={isDisabled}
                className={`p-4 md:p-5 rounded-lg md:rounded-xl border-2 transition-all ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                    : data.property_type === type.value
                    ? 'border-teal-600 bg-teal-50 cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                }`}
              >
                <i className={`${type.icon} text-xl md:text-2xl mb-2 w-5 h-5 md:w-6 md:h-6 flex items-center justify-center mx-auto ${
                  data.property_type === type.value ? 'text-teal-600' : 'text-gray-400'
                }`}></i>
                <div className="text-center text-xs md:text-sm font-semibold text-gray-900">{type.label}</div>
                {isDisabled && (
                  <div className="text-[10px] md:text-xs text-gray-500 mt-1">Non disponible</div>
                )}
               
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Prix */}
      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
          {data.operation_type === 'sale' 
            ? 'Prix de vente' 
            : data.operation_type === 'rental' 
            ? 'Loyer (Par mois)' 
            : data.operation_type === 'short-term-rental'
            ? 'Prix de la nuitée'
            : 'Prix'} <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3 md:space-y-4">
          <div className="relative">
            <input
              type="number"
              value={data.price || ''}
              onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-full px-3 md:px-4 py-2 md:py-3 pr-16 md:pr-20 lg:pr-24 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
              min="0"
            />
            <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs md:text-sm font-semibold">
              FCFA
            </div>
          </div>
          
          {/* Prix négociable */}
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm text-gray-700">Prix négociable ?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ price_negotiable: true })}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  data.price_negotiable === true
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ price_negotiable: false })}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  data.price_negotiable === false
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Non
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Conditions financières (si location longue durée uniquement) */}
      {data.operation_type === 'rental' && (
        <div>
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Conditions financières</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                Nombre de mois d'avance
              </label>
              <input
                type="number"
                value={data.advance_months || ''}
                onChange={(e) => onUpdate({ advance_months: parseInt(e.target.value) || undefined })}
                placeholder="0"
                min="0"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                Nombre de mois de caution
              </label>
              <input
                type="number"
                value={data.deposit_months || ''}
                onChange={(e) => onUpdate({ deposit_months: parseInt(e.target.value) || undefined })}
                placeholder="0"
                min="0"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                Frais d'agence (FCFA)
              </label>
              <input
                type="number"
                value={data.agency_fees || ''}
                onChange={(e) => onUpdate({ agency_fees: parseFloat(e.target.value) || undefined })}
                placeholder="0"
                min="0"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. État du bien (Pas applicable aux Terrain, Parking et Location courte durée) */}
      {data.property_type && 
       data.property_type !== 'land' && 
       data.property_type !== 'parking' && 
       data.operation_type !== 'short-term-rental' && (
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
            État du bien
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {[
              { value: 'new', label: 'Neuf' },
              { value: 'excellent', label: 'Excellent état' },
              { value: 'good', label: 'Bon état' },
              { value: 'to-renovate', label: 'À rénover' },
              { value: 'unfinished', label: 'Inachevé' },
            ].map((condition) => (
              <button
                key={condition.value}
                type="button"
                onClick={() => onUpdate({ condition: condition.value })}
                className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                  data.condition === condition.value
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center text-xs md:text-sm font-semibold text-gray-900">{condition.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Standing (Pas applicable aux Terrain et Parking) */}
      {data.property_type && data.property_type !== 'land' && data.property_type !== 'parking' && (
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
            Standing
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { value: 'low', label: 'Économique' },
              { value: 'medium', label: 'Moyen standing' },
              { value: 'high', label: 'Haut standing' },
              { value: 'luxury', label: 'Luxe' },
            ].map((standing) => (
              <button
                key={standing.value}
                type="button"
                onClick={() => onUpdate({ standing: standing.value })}
                className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                  data.standing === standing.value
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center text-xs md:text-sm font-semibold text-gray-900">{standing.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Type de villa (si villa sélectionnée) */}
      {data.property_type === 'villa' && (
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
            Type de villa <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { value: 'low-rise', label: 'Villa basse' },
              { value: 'duplex', label: 'Duplex' },
              { value: 'triplex', label: 'Triplex' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onUpdate({ villa_type: type.value })}
                className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                  data.villa_type === type.value
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center text-xs md:text-sm font-semibold text-gray-900">{type.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. Nombre de lots disponibles (pour les terrains) */}
      {data.property_type === 'land' && (
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
            Nombre de lots disponibles <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={data.available_lots ?? 1}
            onChange={(e) => onUpdate({ available_lots: parseInt(e.target.value) || 1 })}
            placeholder="1"
            min="1"
            className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
          />
        </div>
      )}

      {/* 7. Superficie (m²) / lot * (pour les terrains) */}
      {data.property_type === 'land' && (
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
            Superficie (m²) / lot <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.surface_per_lot || ''}
              onChange={(e) => onUpdate({ surface_per_lot: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-3 md:px-4 py-2 md:py-3 pr-12 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
            <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs md:text-sm font-semibold">
              m²
            </div>
          </div>
        </div>
      )}

      {/* 8. Superficie (m²) - Non obligatoire sauf pour terrains */}
      {data.property_type && data.property_type !== 'land' && (
        <div>
          <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
            Superficie (m²)
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.surface_area || ''}
              onChange={(e) => onUpdate({ surface_area: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-3 md:px-4 py-2 md:py-3 pr-12 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
            <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs md:text-sm font-semibold">
              m²
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
