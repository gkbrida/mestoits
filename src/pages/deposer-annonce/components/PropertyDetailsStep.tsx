import { useEffect } from 'react';
import { usePropertyTypes } from '../../../hooks/usePropertyTypes';

interface PropertyDetailsStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function PropertyDetailsStep({ data, onUpdate, onValidationChange }: PropertyDetailsStepProps) {
  const { getPropertyTypeByCode } = usePropertyTypes();

  useEffect(() => {
    const isValid = validateForm();
    if (onValidationChange) {
      onValidationChange(isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.property_type, data.rooms, data.bedrooms, data.commerce_type, data.parking_spaces, data.building_floors, data.total_units, data.description, data.available_lots, onValidationChange]);

  const validateForm = (): boolean => {
    const propertyType = getPropertyTypeByCode(data.property_type);
    if (!propertyType) return false;

    // Pour Villa/Appartement/Maison : rooms et bedrooms obligatoires
    if (['villa', 'apartment', 'house', 'furnished-residence'].includes(data.property_type)) {
      return !!(data.rooms && data.rooms > 0 && data.bedrooms !== undefined && data.bedrooms >= 0 && data.description && data.description.trim().length > 0);
    }

    // Pour Commerce : type et description obligatoires
    if (data.property_type === 'commercial') {
      return !!(data.commerce_type && data.commerce_type.trim().length > 0 && data.description && data.description.trim().length > 0);
    }

    // Pour Bureau : description obligatoire (surface non obligatoire)
    if (data.property_type === 'office') {
      return !!(data.description && data.description.trim().length > 0);
    }

    // Pour Parking : nombre de places et description obligatoires
    if (data.property_type === 'parking') {
      return !!(data.parking_spaces && data.parking_spaces > 0 && data.description && data.description.trim().length > 0);
    }

    // Pour Immeuble : nombre d'étages, unités et description obligatoires
    if (data.property_type === 'building') {
      return !!(data.building_floors && data.building_floors > 0 && data.total_units && data.total_units > 0 && data.description && data.description.trim().length > 0);
    }

    // Pour Terrain : description et nombre de lots obligatoires
    if (data.property_type === 'land') {
      return !!(data.description && data.description.trim().length > 0 && data.available_lots && data.available_lots > 0);
    }

    return true;
  };

  const isResidentialType = ['villa', 'apartment', 'house', 'furnished-residence'].includes(data.property_type);
  const isApartment = data.property_type === 'apartment' || data.property_type === 'furnished-residence';

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

  // Sélectionner les équipements selon le type de bien
  let features: typeof residentialFeatures = [];
  if (isResidentialType) {
    // Pour les appartements, exclure : Cour avant, Cour arrière, Jardin, Dépendance
    if (isApartment) {
      features = residentialFeatures.filter(f => 
        !['front_yard', 'back_yard', 'garden', 'dependency'].includes(f.value)
      );
      // Ajouter ascenseur uniquement pour Appartement et Immeuble
      features.push(elevatorFeature);
    } else {
      // Pour Villa et Maison, garder tous les équipements
      features = [...residentialFeatures];
    }
    // Pour location courte durée : fusionner tous les équipements ensemble
    if (data.operation_type === 'short-term-rental') {
      features = [...features, ...shortTermRentalFeatures];
    }
  } else if (data.property_type === 'land') {
    features = landFeatures;
  } else if (data.property_type === 'commercial') {
    features = commercialFeatures;
  } else if (data.property_type === 'building') {
    features = [...buildingFeatures, elevatorFeature];
  } else if (data.property_type === 'office') {
    features = officeFeatures;
  } else if (data.property_type === 'parking') {
    features = parkingFeatures;
  }

  const toggleFeature = (feature: string) => {
    const current = data.features || [];
    if (current.includes(feature)) {
      onUpdate({ features: current.filter((f: string) => f !== feature) });
    } else {
      onUpdate({ features: [...current, feature] });
    }
  };



  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Caractéristiques & Équipements</h2>
        <p className="text-sm md:text-base text-gray-600">Détails spécifiques et équipements selon le type de bien</p>
      </div>

      {/* Pour Villa / Appartement / Maison */}
      {isResidentialType && (
        <>
          {/* Distribution */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Nombre de pièces <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={data.rooms || ''}
                  onChange={(e) => onUpdate({ rooms: parseInt(e.target.value) || undefined })}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Nombre de chambres <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={data.bedrooms || ''}
                  onChange={(e) => onUpdate({ bedrooms: parseInt(e.target.value) || undefined })}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Nombre de douches/WC
                </label>
                <input
                  type="number"
                  value={data.bathrooms || ''}
                  onChange={(e) => onUpdate({ bathrooms: parseInt(e.target.value) || undefined })}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
                />
              </div>
            </div>

            {/* Capacité (location courte durée) */}
            {data.operation_type === 'short-term-rental' && (
              <div className="mt-3 md:mt-4">
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Capacité (nombre de personnes)
                </label>
                <input
                  type="number"
                  value={data.capacity || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || value === null || value === undefined) {
                      onUpdate({ capacity: undefined });
                    } else {
                      const numValue = parseInt(value, 10);
                      if (!isNaN(numValue) && numValue > 0) {
                        onUpdate({ capacity: numValue });
                      } else {
                        onUpdate({ capacity: undefined });
                      }
                    }
                  }}
                  placeholder="0"
                  min="1"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
                />
              </div>
            )}

            {/* Numéro d'étage (si appartement) */}
            {isApartment && (
              <div className="mt-3 md:mt-4">
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                  Numéro d'étage
                </label>
                <input
                  type="number"
                  value={data.floor_number || ''}
                  onChange={(e) => onUpdate({ floor_number: parseInt(e.target.value) || undefined })}
                  placeholder="0"
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
                />
              </div>
            )}

            {/* Cuisine Fermée */}
            <div className="mt-3 md:mt-4">
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2">
                Cuisine Fermée
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate({ kitchen_closed: true })}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                    data.kitchen_closed === true
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Oui
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ kitchen_closed: false })}
                  className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                    data.kitchen_closed === false
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Non
                </button>
              </div>
            </div>

            {/* Balcon (si appartement) */}
            {isApartment && (
              <div className="mt-3 md:mt-4">
                <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2">
                  Balcon ?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate({ has_balcony: true })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.has_balcony === true
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ has_balcony: false })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.has_balcony === false
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Équipements */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Équipements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {features.map((feature) => {
                const isSelected = (data.features || []).includes(feature.value);
                return (
                  <button
                    key={feature.value}
                    type="button"
                    onClick={() => toggleFeature(feature.value)}
                    className={`p-4 sm:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${feature.icon} text-xl sm:text-2xl mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                      isSelected ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                    <div className="text-center text-xs md:text-sm font-semibold text-gray-900">
                      {feature.label}
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center justify-center">
                        <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </>
      )}

      {/* Pour Terrain */}
      {data.property_type === 'land' && (
        <div className="space-y-4">
          {/* Équipements */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Équipements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {landFeatures.map((feature) => {
                const isSelected = (data.features || []).includes(feature.value);
                return (
                  <button
                    key={feature.value}
                    type="button"
                    onClick={() => toggleFeature(feature.value)}
                    className={`p-4 sm:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${feature.icon} text-xl sm:text-2xl mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                      isSelected ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                    <div className="text-center text-xs md:text-sm font-semibold text-gray-900">
                      {feature.label}
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center justify-center">
                        <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pour Commerce */}
      {data.property_type === 'commercial' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
              Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={data.commerce_type || ''}
              onChange={(e) => onUpdate({ commerce_type: e.target.value })}
              placeholder="Ex: Boutique, Restaurant, Magasin..."
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
          </div>
          
          {/* Équipements */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Équipements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {commercialFeatures.map((feature) => {
                const isSelected = (data.features || []).includes(feature.value);
                return (
                  <button
                    key={feature.value}
                    type="button"
                    onClick={() => toggleFeature(feature.value)}
                    className={`p-4 sm:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${feature.icon} text-xl sm:text-2xl mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                      isSelected ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                    <div className="text-center text-xs md:text-sm font-semibold text-gray-900">
                      {feature.label}
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center justify-center">
                        <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pour Immeuble */}
      {data.property_type === 'building' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                Nombre d'étages
              </label>
              <input
                type="number"
                value={data.building_floors || ''}
                onChange={(e) => onUpdate({ building_floors: parseInt(e.target.value) || undefined })}
                placeholder="0"
                min="0"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
                Nombre total d'unités <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={data.total_units || ''}
                onChange={(e) => onUpdate({ total_units: parseInt(e.target.value) || undefined })}
                placeholder="0"
                min="0"
                className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
              Revenu locatif mensuel (FCFA)
            </label>
            <input
              type="number"
              value={data.monthly_rental_income || ''}
              onChange={(e) => onUpdate({ monthly_rental_income: parseFloat(e.target.value) || undefined })}
              placeholder="0"
              min="0"
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-gray-700">Occupé ?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ building_occupied: true })}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  data.building_occupied === true
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ building_occupied: false })}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  data.building_occupied === false
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Non
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
              Année de construction
            </label>
            <input
              type="number"
              value={data.construction_year || ''}
              onChange={(e) => onUpdate({ construction_year: parseInt(e.target.value) || undefined })}
              placeholder="Ex: 2020"
              min="1900"
              max={new Date().getFullYear()}
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
          </div>

          {/* Équipements */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Équipements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {buildingFeatures.map((feature) => {
                const isSelected = (data.features || []).includes(feature.value);
                return (
                  <button
                    key={feature.value}
                    type="button"
                    onClick={() => toggleFeature(feature.value)}
                    className={`p-4 sm:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${feature.icon} text-xl sm:text-2xl mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                      isSelected ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                    <div className="text-center text-xs md:text-sm font-semibold text-gray-900">
                      {feature.label}
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center justify-center">
                        <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pour Bureau */}
      {data.property_type === 'office' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
              Nombre de pièces
            </label>
            <input
              type="number"
              value={data.office_rooms || ''}
              onChange={(e) => onUpdate({ office_rooms: parseInt(e.target.value) || undefined })}
              placeholder="0"
              min="0"
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
          </div>

          {/* Équipements */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Équipements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {officeFeatures.map((feature) => {
                const isSelected = (data.features || []).includes(feature.value);
                return (
                  <button
                    key={feature.value}
                    type="button"
                    onClick={() => toggleFeature(feature.value)}
                    className={`p-4 sm:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${feature.icon} text-xl sm:text-2xl mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                      isSelected ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                    <div className="text-center text-xs md:text-sm font-semibold text-gray-900">
                      {feature.label}
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center justify-center">
                        <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pour Parking */}
      {data.property_type === 'parking' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
              Nombre de places <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={data.parking_spaces || ''}
              onChange={(e) => onUpdate({ parking_spaces: parseInt(e.target.value) || undefined })}
              placeholder="0"
              min="1"
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
          </div>

          {/* Équipements */}
          <div>
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Équipements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {parkingFeatures.map((feature) => {
                const isSelected = (data.features || []).includes(feature.value);
                return (
                  <button
                    key={feature.value}
                    type="button"
                    onClick={() => toggleFeature(feature.value)}
                    className={`p-4 sm:p-5 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <i className={`${feature.icon} text-xl sm:text-2xl mb-2 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto ${
                      isSelected ? 'text-teal-600' : 'text-gray-400'
                    }`}></i>
                    <div className="text-center text-xs md:text-sm font-semibold text-gray-900">
                      {feature.label}
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center justify-center">
                        <i className="ri-check-line text-teal-600 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Description - Pour tous */}
      <div>
        <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={data.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Décrivez votre bien en détail : caractéristiques, environnement, points forts..."
          rows={5}
          className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm resize-none"
          maxLength={2000}
        />
        <div className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2">{(data.description || '').length}/2000 caractères</div>
      </div>
    </div>
  );
}
