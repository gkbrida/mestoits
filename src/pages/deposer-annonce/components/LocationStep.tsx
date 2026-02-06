import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface LocationStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export default function LocationStep({ data, onUpdate, onValidationChange }: LocationStepProps) {
  const [cities, setCities] = useState<string[]>([]);
  const [searchCity, setSearchCity] = useState(data.city || '');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    setSearchCity(data.city || '');
  }, [data.city]);

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

  useEffect(() => {
    const isValid = validateForm();
    if (onValidationChange) {
      onValidationChange(isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.city, cities]);

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

  const validateForm = (): boolean => {
    const cityExists = cities.some(city => 
      city && city.toLowerCase().trim() === (data.city || '').toLowerCase().trim()
    );
    
    return !!(data.city && data.city.trim().length > 0 && cityExists);
  };

  const landTitles = [
    'ACD',
    'Attestation villageoise',
    'CPF',
    'Titre foncier',
    'Lettre d\'attribution',
    'Autre',
  ];

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Localisation & Situation juridique</h2>
        <p className="text-sm md:text-base text-gray-600">Informations sur la localisation et la situation du bien</p>
      </div>

      {/* Localisation */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Localisation</h3>
        <div className="space-y-3 md:space-y-4">
          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
              Ville / Commune <span className="text-red-500">*</span>
            </label>
            <div className="relative city-search-container">
              <i className="ri-search-line absolute left-2 md:left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base md:text-lg w-4 h-4 md:w-5 md:h-5 flex items-center justify-center z-10"></i>
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
                    onUpdate({ city: value });
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && !cities.some(city => city && city.toLowerCase().trim() === value.toLowerCase().trim())) {
                    setSearchCity('');
                    onUpdate({ city: '' });
                    setShowDropdown(false);
                  }
                }}
                onFocus={() => {
                  if (filteredCities.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
              />
              {showDropdown && filteredCities.length > 0 && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg md:rounded-xl shadow-xl overflow-hidden top-full">
                  {filteredCities.slice(0, 5).map((city, index) => (
                    <button
                      key={`city-${city}-${index}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSearchCity(city);
                        onUpdate({ city: city });
                        setShowDropdown(false);
                      }}
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-left hover:bg-teal-50 active:bg-teal-100 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0 cursor-pointer focus:outline-none focus:bg-teal-50"
                    >
                      <i className="ri-map-pin-line text-teal-600 w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
                      <span className="text-xs md:text-sm text-gray-900 flex-1">{city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-xs md:text-sm font-semibold text-gray-900 mb-1 md:mb-2">
              Adresse / Repère
            </label>
            <input
              type="text"
              value={data.address || ''}
              onChange={(e) => onUpdate({ address: e.target.value })}
              placeholder="Ex: Cocody, Riviera Golf, Rue des Jardins"
              className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs md:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Accès */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Accès</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {[
              { value: 'paved', label: 'Route bitumée' },
              { value: 'unpaved', label: 'Voie non bitumée' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onUpdate({ accessibility: option.value })}
                className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                  data.accessibility === option.value
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center text-xs md:text-sm font-semibold text-gray-900">{option.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Réseaux - Pas pour location courte durée */}
      {data.property_type && 
       data.property_type !== 'parking' && 
       data.property_type !== 'land' && 
       data.operation_type !== 'short-term-rental' && (
        <div>
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Réseaux</h3>
          <div className="space-y-4">
            {/* Eau courante - Pas pour location courte durée */}
            {data.operation_type !== 'short-term-rental' && (
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-700">Eau courante</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate({ water_supply: true })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.water_supply === true
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ water_supply: false })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.water_supply === false
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>
            )}
            {/* Électricité - Pas pour location courte durée */}
            {data.operation_type !== 'short-term-rental' && (
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-700">Électricité</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate({ electricity: true })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.electricity === true
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ electricity: false })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.electricity === false
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Non
                  </button>
                </div>
              </div>
            )}
            {/* Compteur personnel - Pas pour location courte durée */}
            {data.property_type !== 'building' && 
             data.property_type !== 'land' && 
             data.property_type !== 'parking' && 
             data.operation_type !== 'short-term-rental' && (
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-700">Compteur personnel</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate({ personal_meter: true })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.personal_meter === true
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Oui
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdate({ personal_meter: false })}
                    className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                      data.personal_meter === false
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
        </div>
      )}

      {/* Situation du bien */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Situation du bien</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs md:text-sm text-gray-700">Situé dans une cité ?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ in_gated_community: true })}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  data.in_gated_community === true
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Oui
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ in_gated_community: false })}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                  data.in_gated_community === false
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

      {/* Statut du déposant */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Statut du déposant</h3>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {[
            { value: 'owner', label: 'Propriétaire direct' },
            { value: 'agent', label: 'Mandataire' },
            { value: 'developer', label: 'Promoteur' },
          ].map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => onUpdate({ depositor_status: status.value })}
              className={`p-3 md:p-4 rounded-lg md:rounded-xl border-2 transition-all cursor-pointer ${
                data.depositor_status === status.value
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center text-xs md:text-sm font-semibold text-gray-900">{status.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Document foncier (seulement si en vente) */}
      {data.operation_type === 'sale' && (
        <div>
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Document foncier</h3>
          <div className="space-y-3">
            {landTitles.map((title) => {
              const isSelected = (data.land_titles || []).includes(title);
              return (
                <div key={title} className="flex items-center justify-between">
                  <span className="text-xs md:text-sm text-gray-700">{title}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const currentTitles = data.land_titles || [];
                        if (!isSelected) {
                          onUpdate({ land_titles: [...currentTitles, title] });
                        } else {
                          onUpdate({ land_titles: currentTitles.filter((t: string) => t !== title) });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentTitles = data.land_titles || [];
                        if (isSelected) {
                          onUpdate({ land_titles: currentTitles.filter((t: string) => t !== title) });
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                        !isSelected
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Non
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
