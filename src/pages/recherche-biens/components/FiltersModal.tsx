import { useState, useEffect } from 'react';
import { usePropertyTypes } from '../../../hooks/usePropertyTypes';
import { useOperationTypes } from '../../../hooks/useOperationTypes';
import { supabase } from '../../../lib/supabase';

interface Filters {
  city?: string;
  operationType?: string; // Nouveau : operation_type au lieu de offerType
  offerType?: string; // Gardé pour compatibilité avec l'ancien système
  propertyType?: string;
  villaType?: string[]; // Choix multiple
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  minRooms?: number;
  maxRooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  features?: string[];
  condition?: string[]; // Choix multiple
  standing?: string[]; // Choix multiple
  securityType?: string;
  accessibility?: string;
  landTitles?: string[];
  offeredBy?: string;
}

interface FiltersModalProps {
  filters: Filters;
  onApply: (filters: Filters) => void;
  onClose: () => void;
}

export default function FiltersModal({ filters, onApply, onClose }: FiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const [cities, setCities] = useState<string[]>([]);
  const [searchCity, setSearchCity] = useState(filters.city || '');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const { propertyTypes: propertyTypesData, getPropertyTypeByCode } = usePropertyTypes();
  const { operationTypes } = useOperationTypes();

  // Transformer les données de la base en format pour l'affichage
  const propertyTypes = propertyTypesData.map(type => ({
    value: type.code,
    label: type.label,
    icon: type.icon,
    offer_types: type.offer_types,
  }));

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

  // Vérifier si un type de bien est autorisé pour une opération (même logique que BasicInfoStep)
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

  // Filtrer les types de biens disponibles selon le type d'opération sélectionné
  const getAvailablePropertyTypes = () => {
    if (!localFilters.operationType) {
      return propertyTypes;
    }
    return propertyTypes.filter(type => 
      isPropertyAllowedForOperation(type.value, localFilters.operationType!)
    );
  };

  // Charger les communes depuis Supabase
  useEffect(() => {
    loadCities();
  }, []);

  // Mettre à jour searchCity quand localFilters.city change
  useEffect(() => {
    setSearchCity(localFilters.city || '');
  }, [localFilters.city]);

  // Filtrer les villes selon la recherche en temps réel
  useEffect(() => {
    if (searchCity.trim().length > 0 && cities.length > 0) {
      const searchTerm = searchCity.toLowerCase().trim();
      const filtered = cities
        .filter(city => 
          city && typeof city === 'string' && city.toLowerCase().includes(searchTerm)
        )
        .slice(0, 5);
      
      setFilteredCities(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowDropdown(false);
    }
  }, [searchCity, cities]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.city-search-container')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  const loadCities = async () => {
    try {
      const { data: localitiesData, error } = await supabase
        .from('localities')
        .select('commune')
        .not('commune', 'is', null);
      
      if (error) {
        console.error('Erreur lors du chargement des communes:', error);
        return;
      }

      const uniqueCities = [...new Set(localitiesData.map(item => item.commune).filter(Boolean))].sort();
      setCities(uniqueCities);
    } catch (error) {
      console.error('Erreur lors du chargement des communes:', error);
    }
  };

  const villaTypes = [
    { value: 'low-rise', label: 'Villa basse' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'triplex', label: 'Triplex' },
  ];

  // Équipements selon le type de bien (même logique que PropertyDetailsStep)
  const isResidentialType = ['villa', 'apartment', 'house', 'furnished-residence'].includes(localFilters.propertyType || '');
  const isApartment = localFilters.propertyType === 'apartment' || localFilters.propertyType === 'furnished-residence';

  // Équipements pour Villa / Appartement / Maison
  const residentialFeatures = [
    { value: 'front_yard', label: 'Cour avant', icon: 'ri-home-8-line' },
    { value: 'back_yard', label: 'Cour arrière', icon: 'ri-home-8-line' },
    { value: 'garden', label: 'Jardin', icon: 'ri-plant-line' },
    { value: 'dependency', label: 'Dépendance', icon: 'ri-building-line' },
    { value: 'pool', label: 'Piscine', icon: 'ri-water-flash-line' },
    { value: 'playground', label: 'Aire de jeux', icon: 'ri-gamepad-line' },
    { value: 'gym', label: 'Salle de sport', icon: 'ri-run-line' },
    { value: 'garage', label: 'Garage', icon: 'ri-car-line' },
    { value: 'air_conditioning', label: 'Climatisation', icon: 'ri-temp-cold-line' },
    { value: 'water_heater', label: 'Chauffe-eau', icon: 'ri-fire-line' },
    { value: 'storage', label: 'Placards / Buanderie', icon: 'ri-archive-line' },
    { value: 'parking', label: 'Parking', icon: 'ri-parking-box-line' },
    { value: 'generator', label: 'Groupe électrogène', icon: 'ri-flashlight-line' },
    { value: 'water_tank', label: 'Citerne d\'eau', icon: 'ri-drop-line' },
    { value: 'solar_panel', label: 'Panneau solaire', icon: 'ri-sun-line' },
    { value: 'security', label: 'Sécurité (clôture, vigile, alarme, vidéosurveillance, interphone...)', icon: 'ri-shield-check-line' },
  ];

  // Ascenseur uniquement pour Appartement et Immeuble
  const elevatorFeature = { value: 'elevator', label: 'Ascenseur', icon: 'ri-arrow-up-down-line' };

  // Spécifique location courte durée
  const shortTermRentalFeatures = [
    { value: 'has_sofa', label: 'Canapé', icon: 'ri-sofa-line' },
    { value: 'has_tv', label: 'Télévision', icon: 'ri-tv-line' },
    { value: 'has_internet', label: 'Internet', icon: 'ri-wifi-line' },
    { value: 'equipped_kitchen', label: 'Cuisine équipée', icon: 'ri-restaurant-line' },
    { value: 'has_washing_machine', label: 'Machine à laver', icon: 'ri-shirt-line' },
    { value: 'has_wifi', label: 'Wifi', icon: 'ri-wifi-line' },
    { value: 'has_netflix', label: 'Netflix', icon: 'ri-movie-line' },
  ];

  // Équipements pour Terrain
  const landFeatures = [
    { value: 'approved_subdivision', label: 'Lotissement approuvé', icon: 'ri-check-line' },
    { value: 'electricity_viabilized', label: 'Viabilisé en électricité', icon: 'ri-flashlight-line' },
    { value: 'water_viabilized', label: 'Viabilisé en eau', icon: 'ri-drop-line' },
    { value: 'fenced', label: 'Terrain clôturé', icon: 'ri-shield-line' },
    { value: 'flat_relief', label: 'Relief plat', icon: 'ri-landscape-line' },
  ];

  // Équipements pour Commerce
  const commercialFeatures = [
    { value: 'visible_facade', label: 'Façade visible', icon: 'ri-building-line' },
    { value: 'high_traffic_area', label: 'Zone passante', icon: 'ri-road-map-line' },
    { value: 'internal_wc', label: 'WC', icon: 'ri-door-lock-line' },
    { value: 'terrace', label: 'Terrasse', icon: 'ri-home-8-line' },
    { value: 'customer_parking', label: 'Parking clients', icon: 'ri-parking-box-line' },
    { value: 'office', label: 'Bureau', icon: 'ri-file-list-line' },
    { value: 'warehouse', label: 'Entrepôt', icon: 'ri-store-line' },
    { value: 'cold_room', label: 'Chambre froide', icon: 'ri-snowy-line' },
  ];

  // Équipements pour Immeuble
  const buildingFeatures = [
    { value: 'building_parking', label: 'Parking', icon: 'ri-parking-box-line' },
    { value: 'building_generator', label: 'Groupe électrogène', icon: 'ri-flashlight-line' },
  ];

  // Équipements pour Bureau
  const officeFeatures = [
    { value: 'meeting_room', label: 'Salle de réunion', icon: 'ri-group-line' },
    { value: 'office_air_conditioning', label: 'Climatisation', icon: 'ri-temp-cold-line' },
    { value: 'fiber_internet', label: 'Fibre internet disponible', icon: 'ri-wifi-line' },
    { value: 'reception', label: 'Réception', icon: 'ri-user-line' },
    { value: 'office_parking', label: 'Parking', icon: 'ri-parking-box-line' },
    { value: 'office_wc', label: 'WC', icon: 'ri-door-lock-line' },
    { value: 'office_kitchen', label: 'Cuisine', icon: 'ri-restaurant-line' },
  ];

  // Équipements pour Parking
  const parkingFeatures = [
    { value: 'covered_parking', label: 'Couvert', icon: 'ri-home-line' },
    { value: 'secure_access', label: 'Accès sécurisé', icon: 'ri-shield-check-line' },
  ];

  // Sélectionner les équipements selon le type de bien (même logique que PropertyDetailsStep)
  let features: typeof residentialFeatures = [];
  if (isResidentialType) {
    // Pour les appartements, exclure : Cour avant, Cour arrière, Jardin, Dépendance
    if (isApartment) {
      features = residentialFeatures.filter(f => 
        !['front_yard', 'back_yard', 'garden', 'dependency'].includes(f.value)
      );
      // Ajouter ascenseur uniquement pour Appartement
      features.push(elevatorFeature);
    } else {
      // Pour Villa et Maison, garder tous les équipements
      features = [...residentialFeatures];
    }
    // Pour location courte durée : fusionner tous les équipements ensemble
    if (localFilters.operationType === 'short-term-rental') {
      features = [...features, ...shortTermRentalFeatures];
    }
  } else if (localFilters.propertyType === 'land') {
    features = landFeatures;
  } else if (localFilters.propertyType === 'commercial') {
    features = commercialFeatures;
  } else if (localFilters.propertyType === 'building') {
    features = [...buildingFeatures, elevatorFeature];
  } else if (localFilters.propertyType === 'office') {
    features = officeFeatures;
  } else if (localFilters.propertyType === 'parking') {
    features = parkingFeatures;
  }

  const conditions = [
    { value: 'new', label: 'Neuf' },
    { value: 'excellent', label: 'Excellent état' },
    { value: 'good', label: 'Bon état' },
    { value: 'to-renovate', label: 'À rénover' },
    { value: 'unfinished', label: 'Inachevé' },
  ];

  const standings = [
    { value: 'low', label: 'Économique' },
    { value: 'medium', label: 'Moyen standing' },
    { value: 'high', label: 'Haut standing' },
    { value: 'luxury', label: 'Luxe' },
  ];

  const securityTypes = [
    { value: 'gated-community', label: 'Résidence fermée' },
    { value: 'security-equipment', label: 'Équipement de sécurité' },
    { value: 'none', label: 'Aucun' },
  ];

  const accessibilityOptions = [
    { value: 'paved', label: 'Route bitumée' },
    { value: 'unpaved', label: 'Voie non bitumée' },
  ];

  // Titres fonciers (seulement si en vente)
  const landTitles = [
    'ACD',
    'Attestation villageoise',
    'CPF',
    'Titre foncier',
    'Lettre d\'attribution',
    'Autre',
  ];

  const updateFilter = (key: keyof Filters, value: any) => {
    setLocalFilters((prev) => {
      const updated = { ...prev, [key]: value };
      
      // Si on change operationType, réinitialiser propertyType si incompatible
      if (key === 'operationType' && prev.propertyType) {
        if (!isPropertyAllowedForOperation(prev.propertyType, value || '')) {
          updated.propertyType = undefined;
          updated.villaType = undefined;
        }
      }
      
      // Si on change propertyType, réinitialiser villaType si ce n'est pas une villa
      if (key === 'propertyType' && value !== 'villa') {
        updated.villaType = undefined;
      }
      
      return updated;
    });
  };

  // Fonction pour gérer les filtres à choix multiple
  const toggleArrayFilter = (key: 'villaType' | 'condition' | 'standing' | 'features' | 'landTitles', value: string) => {
    setLocalFilters((prev) => {
      const current = (prev[key] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: updated.length > 0 ? updated : undefined };
    });
  };


  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
    setSearchCity('');
  };

  const selectedFeaturesCount = (localFilters.features || []).length;
  const availablePropertyTypes = getAvailablePropertyTypes();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl md:rounded-2xl lg:rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Filtres de recherche</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">Affinez votre recherche selon vos critères</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 hover:bg-gray-100 rounded-full transition-colors cursor-pointer flex-shrink-0 ml-2 sm:ml-4"
            aria-label="Fermer"
          >
            <i className="ri-close-line text-xl sm:text-2xl text-gray-600 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6 sm:space-y-8">
            {/* Localisation */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Localisation</h3>
              <div className="relative city-search-container">
                <i className="ri-search-line absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center z-10"></i>
                <input
                  type="text"
                  placeholder="Rechercher une ville ou une commune..."
                  value={searchCity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchCity(value);
                    const cityExists = cities.some(city => 
                      city && city.toLowerCase().trim() === value.toLowerCase().trim()
                    );
                    if (value.trim() === '' || cityExists || filteredCities.some(c => c.toLowerCase() === value.toLowerCase())) {
                      updateFilter('city', value || undefined);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && !cities.some(city => city && city.toLowerCase().trim() === value.toLowerCase().trim())) {
                      setSearchCity('');
                      updateFilter('city', undefined);
                      setShowDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (filteredCities.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                />
                {showDropdown && filteredCities.length > 0 && (
                  <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden top-full">
                    {filteredCities.map((city, index) => (
                      <button
                        key={`city-${city}-${index}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSearchCity(city);
                          updateFilter('city', city);
                          setShowDropdown(false);
                        }}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-teal-50 active:bg-teal-100 transition-colors flex items-center gap-1.5 sm:gap-2 border-b border-gray-100 last:border-b-0 cursor-pointer focus:outline-none focus:bg-teal-50"
                      >
                        <i className="ri-map-pin-line text-teal-600 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0"></i>
                        <span className="text-xs sm:text-sm text-gray-900 flex-1">{city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Type d'opération */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                Type d'offre
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {operationTypes.map((operation) => (
                  <button
                    key={operation.code}
                    type="button"
                    onClick={() => {
                      const newValue = localFilters.operationType === operation.code ? undefined : operation.code;
                      updateFilter('operationType', newValue);
                      // Supprimer offerType si operationType est défini
                      if (newValue) {
                        updateFilter('offerType', undefined);
                      }
                    }}
                    className={`p-3 sm:p-4 md:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      localFilters.operationType === operation.code
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${
                      operation.code === 'sale' ? 'ri-price-tag-3-line' :
                      operation.code === 'rental' ? 'ri-key-line' :
                      'ri-home-4-line'
                    } text-xl sm:text-2xl mb-1 sm:mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                      localFilters.operationType === operation.code ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                    <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">{operation.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Type de bien - Filtré selon operationType */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                Type de bien
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {availablePropertyTypes.map((type) => {
                  const isDisabled = localFilters.operationType && !isPropertyAllowedForOperation(type.value, localFilters.operationType);
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        updateFilter('propertyType', localFilters.propertyType === type.value ? undefined : type.value);
                        if (localFilters.propertyType === type.value) {
                          setLocalFilters((prev) => ({ ...prev, villaType: undefined }));
                        }
                      }}
                      disabled={!!isDisabled}
                      className={`p-3 sm:p-4 md:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                          : localFilters.propertyType === type.value
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <i className={`${type.icon} text-xl sm:text-2xl mb-1 sm:mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                        localFilters.propertyType === type.value ? 'text-teal-600' : 'text-gray-400'
                      }`}></i>
                      <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">{type.label}</div>
                      {isDisabled && (
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Non disponible</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type de villa (si villa sélectionnée) - Choix multiple */}
            {localFilters.propertyType === 'villa' && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                  Type de villa 
                </label>
                
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  {villaTypes.map((type) => {
                    const isSelected = ((localFilters.villaType as string[]) || []).includes(type.value);
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => toggleArrayFilter('villaType', type.value)}
                        className={`p-3 sm:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">{type.label}</div>
                        {isSelected && (
                          <div className="mt-1 sm:mt-2 flex items-center justify-center">
                            <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Caractéristiques principales */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Caractéristiques principales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Surface - Affichée pour tous sauf Parking */}
                {localFilters.propertyType !== 'parking' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">
                      {localFilters.propertyType === 'land' ? 'Superficie (m²) / lot' : 'Surface (m²)'}
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={localFilters.minSurface || ''}
                        onChange={(e) => updateFilter('minSurface', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={localFilters.maxSurface || ''}
                        onChange={(e) => updateFilter('maxSurface', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                )}
                {/* Nombre de pièces - Seulement pour résidentiels */}
                {isResidentialType && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">
                      Nombre de pièces
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={localFilters.minRooms || ''}
                        onChange={(e) => updateFilter('minRooms', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={localFilters.maxRooms || ''}
                        onChange={(e) => updateFilter('maxRooms', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                )}
                {/* Nombre de salles de bain - Seulement pour résidentiels */}
                {isResidentialType && (
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">
                      Nombre de salles de bain
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={localFilters.minBathrooms || ''}
                        onChange={(e) => updateFilter('minBathrooms', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                        min="0"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={localFilters.maxBathrooms || ''}
                        onChange={(e) => updateFilter('maxBathrooms', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                )}
                {/* Prix */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1 sm:mb-2">
                    Prix {
                      localFilters.operationType === 'rental' ? '(par mois)' :
                      localFilters.operationType === 'short-term-rental' ? '(par nuitée)' :
                      localFilters.offerType === 'rental' ? '(par mois)' :
                      ''
                    } (FCFA)
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={localFilters.minPrice || ''}
                      onChange={(e) => updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={localFilters.maxPrice || ''}
                      onChange={(e) => updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Équipements - Affichés seulement si un type de bien est sélectionné */}
            {localFilters.propertyType && (
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Équipements et caractéristiques</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Sélectionnez les équipements souhaités ({selectedFeaturesCount} sélectionné{selectedFeaturesCount > 1 ? 's' : ''})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {features.map((feature) => {
                    const isSelected = (localFilters.features || []).includes(feature.value);
                    return (
                      <button
                        key={feature.value}
                        type="button"
                        onClick={() => toggleArrayFilter('features', feature.value)}
                        className={`p-3 sm:p-4 md:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <i className={`${feature.icon} text-xl sm:text-2xl mb-1 sm:mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                          isSelected ? 'text-teal-600' : 'text-gray-400'
                        }`}></i>
                        <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">
                          {feature.label}
                        </div>
                        {isSelected && (
                          <div className="mt-1 sm:mt-2 flex items-center justify-center">
                            <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* État du bien - Seulement pour résidentiels - Choix multiple */}
            {isResidentialType && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                  État du bien 
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
                  {conditions.map((condition) => {
                    const isSelected = ((localFilters.condition as string[]) || []).includes(condition.value);
                    return (
                      <button
                        key={condition.value}
                        type="button"
                        onClick={() => toggleArrayFilter('condition', condition.value)}
                        className={`p-3 sm:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">
                          {condition.label}
                        </div>
                        {isSelected && (
                          <div className="mt-1 sm:mt-2 flex items-center justify-center">
                            <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standing - Seulement pour résidentiels - Choix multiple */}
            {isResidentialType && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                  Standing 
                </label>
                
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {standings.map((standing) => {
                    const isSelected = ((localFilters.standing as string[]) || []).includes(standing.value);
                    return (
                      <button
                        key={standing.value}
                        type="button"
                        onClick={() => toggleArrayFilter('standing', standing.value)}
                        className={`p-3 sm:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">
                          {standing.label}
                        </div>
                        {isSelected && (
                          <div className="mt-1 sm:mt-2 flex items-center justify-center">
                            <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sécurité - Seulement pour résidentiels */}
            {isResidentialType && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                  Sécurité
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                  {securityTypes.map((security) => (
                    <button
                      key={security.value}
                      type="button"
                      onClick={() => updateFilter('securityType', localFilters.securityType === security.value ? undefined : security.value)}
                      className={`p-3 sm:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                        localFilters.securityType === security.value
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">
                        {security.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Accessibilité */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                Accessibilité
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {accessibilityOptions.map((access) => (
                  <button
                    key={access.value}
                    type="button"
                    onClick={() => updateFilter('accessibility', localFilters.accessibility === access.value ? undefined : access.value)}
                    className={`p-3 sm:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      localFilters.accessibility === access.value
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">
                      {access.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Titres fonciers - Seulement si en vente */}
            {localFilters.operationType === 'sale' && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                  Titres fonciers 
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                  {landTitles.map((title) => (
                    <button
                      key={title}
                      type="button"
                      onClick={() => toggleArrayFilter('landTitles', title)}
                      className={`p-3 sm:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                        (localFilters.landTitles || []).includes(title)
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center text-xs sm:text-sm font-semibold text-gray-900">
                        {title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Offert par */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
                Offert par
              </label>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => updateFilter('offeredBy', localFilters.offeredBy === 'individual' ? undefined : 'individual')}
                  className={`p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                    localFilters.offeredBy === 'individual'
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <i className={`ri-user-line text-2xl sm:text-3xl mb-1 sm:mb-2 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mx-auto ${
                    localFilters.offeredBy === 'individual' ? 'text-teal-600' : 'text-gray-400'
                  }`}></i>
                  <div className="text-center text-xs sm:text-sm md:text-base font-semibold text-gray-900">Particulier</div>
                </button>
                <button
                  type="button"
                  onClick={() => updateFilter('offeredBy', localFilters.offeredBy === 'professional' ? undefined : 'professional')}
                  className={`p-4 sm:p-5 md:p-6 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                    localFilters.offeredBy === 'professional'
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <i className={`ri-building-line text-2xl sm:text-3xl mb-1 sm:mb-2 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mx-auto ${
                    localFilters.offeredBy === 'professional' ? 'text-teal-600' : 'text-gray-400'
                  }`}></i>
                  <div className="text-center text-xs sm:text-sm md:text-base font-semibold text-gray-900">Professionnel</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-gray-700 hover:bg-gray-100 rounded-lg md:rounded-xl text-sm sm:text-base font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Réinitialiser
          </button>
          <button
            onClick={handleApply}
            className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            Appliquer les filtres
          </button>
        </div>
      </div>
    </div>
  );
}
