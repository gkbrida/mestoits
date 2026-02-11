import { useEffect } from 'react';

interface FeaturesStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function FeaturesStep({ data, onUpdate, onValidationChange }: FeaturesStepProps) {
  // FeaturesStep n'a pas de champs obligatoires, donc toujours valide
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    { value: 'elevator', label: 'Ascenseur', icon: 'ri-arrow-up-down-line' },
    { value: 'parking', label: 'Parking', icon: 'ri-parking-box-line' },
    { value: 'generator', label: 'Groupe électrogène', icon: 'ri-flashlight-line' },
    { value: 'water_tank', label: 'Citerne d\'eau', icon: 'ri-drop-line' },
    { value: 'solar_panel', label: 'Panneau solaire', icon: 'ri-sun-line' },
    { value: 'security', label: 'Sécurité (clôture, vigile, alarme, vidéosurveillance, interphone...)', icon: 'ri-shield-check-line' },
  ];

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
    { value: 'internal_wc', label: 'WC interne', icon: 'ri-door-lock-line' },
    { value: 'terrace', label: 'Terrasse', icon: 'ri-home-8-line' },
    { value: 'customer_parking', label: 'Parking clients', icon: 'ri-parking-box-line' },
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
    } else {
      // Pour Villa et Maison, garder tous les équipements
      features = residentialFeatures;
    }
  } else if (data.property_type === 'land') {
    features = landFeatures;
  } else if (data.property_type === 'commercial') {
    features = commercialFeatures;
  } else if (data.property_type === 'building') {
    features = buildingFeatures;
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

  const selectedCount = (data.features || []).length;

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Équipements</h2>
        <p className="text-sm md:text-base text-gray-600">
          Sélectionnez tous les équipements disponibles ({selectedCount} sélectionné{selectedCount > 1 ? 's' : ''})
        </p>
      </div>

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

      {/* Spécifique location courte durée */}
      {isResidentialType && data.operation_type === 'short-term-rental' && (
        <>
          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-200">
            <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Équipements location courte durée</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {shortTermRentalFeatures.map((feature) => {
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

      {selectedCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl p-4 sm:p-6 text-center">
          <i className="ri-information-line text-2xl sm:text-3xl text-amber-600 mb-2 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mx-auto"></i>
          <p className="text-xs md:text-sm text-amber-800 font-semibold">
            Sélectionnez au moins un équipement pour valoriser votre bien
          </p>
        </div>
      )}
    </div>
  );
}
