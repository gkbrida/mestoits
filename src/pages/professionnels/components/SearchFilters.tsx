import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface SearchFiltersProps {
  selectedCity: string;
  selectedType: string;
  searchQuery: string;
  onCityChange: (city: string) => void;
  onTypeChange: (type: string) => void;
  onSearchChange: (query: string) => void;
}

interface ProfessionalType {
  name: string;
  label: string;
  icon: string;
}

export default function SearchFilters({
  selectedCity,
  selectedType,
  searchQuery,
  onCityChange,
  onTypeChange,
  onSearchChange,
}: SearchFiltersProps) {
  const [citiesFromDb, setCitiesFromDb] = useState<string[]>([]);
  const [searchCity, setSearchCity] = useState(selectedCity || '');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [professionalTypes, setProfessionalTypes] = useState<ProfessionalType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);

  useEffect(() => {
    loadCities();
    loadProfessionalTypes();
  }, []);

  useEffect(() => {
    setSearchCity(selectedCity || '');
  }, [selectedCity]);

  useEffect(() => {
    if (searchCity.trim().length > 0 && citiesFromDb.length > 0) {
      const searchTerm = searchCity.toLowerCase().trim();
      const filtered = citiesFromDb
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
  }, [searchCity, citiesFromDb]);

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
      setCitiesFromDb(uniqueCities);
    } catch (error) {
      console.error('Erreur lors du chargement des communes:', error);
    }
  };

  const loadProfessionalTypes = async () => {
    try {
      setLoadingTypes(true);
      const { data, error } = await supabase
        .from('professional_types')
        .select('name, label, icon')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des types de professionnels:', error);
        return;
      }

      if (data && data.length > 0) {
        setProfessionalTypes(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types de professionnels:', error);
    } finally {
      setLoadingTypes(false);
    }
  };
  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-5 md:p-6 mb-6 sm:mb-8">
      {/* Search Bar */}
      <div className="mb-4 sm:mb-5 md:mb-6">
        <div className="relative">
          <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
            <i className="ri-search-line text-lg sm:text-xl text-gray-400"></i>
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, entreprise ou ville..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-4 text-sm sm:text-base border border-gray-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-6">
        {/* City Filter */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            <i className="ri-map-pin-line mr-1 sm:mr-2 text-sm sm:text-base"></i>
            Ville
          </label>
          <div className="relative city-search-container">
            <i className="ri-search-line absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center z-10"></i>
            <input
              type="text"
              placeholder="Rechercher une ville ou une commune..."
              value={searchCity}
              onChange={(e) => {
                const value = e.target.value;
                setSearchCity(value);
                const cityExists = citiesFromDb.some(city => 
                  city && city.toLowerCase().trim() === value.toLowerCase().trim()
                );
                if (value.trim() === '' || cityExists || filteredCities.some(c => c.toLowerCase() === value.toLowerCase())) {
                  onCityChange(value);
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && !citiesFromDb.some(city => city && city.toLowerCase().trim() === value.toLowerCase().trim())) {
                  setSearchCity('');
                  onCityChange('');
                  setShowDropdown(false);
                }
              }}
              onFocus={() => {
                if (filteredCities.length > 0) {
                  setShowDropdown(true);
                }
              }}
              className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border border-gray-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {/* Dropdown avec les résultats de recherche */}
            {showDropdown && filteredCities.length > 0 && (
              <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden top-full">
                {filteredCities.slice(0, 5).map((city, index) => (
                  <button
                    key={`city-${city}-${index}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSearchCity(city);
                      onCityChange(city);
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-1.5 sm:gap-2 border-b border-gray-100 last:border-b-0 cursor-pointer focus:outline-none focus:bg-blue-50"
                  >
                    <i className="ri-map-pin-line text-blue-600 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0"></i>
                    <span className="text-xs sm:text-sm text-gray-900 flex-1">{city}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            <i className="ri-briefcase-line mr-1 sm:mr-2 text-sm sm:text-base"></i>
            Type de professionnel
          </label>
          {loadingTypes ? (
            <div className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border border-gray-200 rounded-lg md:rounded-xl flex items-center justify-center">
              <i className="ri-loader-4-line text-gray-400 animate-spin text-base sm:text-lg"></i>
            </div>
          ) : (
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border border-gray-200 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="">Tous les types</option>
              {professionalTypes.map((type) => (
                <option key={type.name} value={type.name}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Quick Type Filters */}
      {!loadingTypes && professionalTypes.length > 0 && (
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Filtres rapides :</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {professionalTypes.slice(0, 8).map((type) => (
              <button
                key={type.name}
                onClick={() => onTypeChange(selectedType === type.name ? '' : type.name)}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === type.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <i className={`${type.icon} mr-1 sm:mr-2 text-xs sm:text-sm`}></i>
                {type.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters */}
      {(selectedCity || selectedType || searchQuery) && (
        <div className="mt-4 sm:mt-5 md:mt-6 pt-4 sm:pt-5 md:pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm">
                  <span className="hidden sm:inline">Recherche: </span>
                  <span className="sm:hidden">R: </span>
                  "{searchQuery}"
                  <button
                    onClick={() => onSearchChange('')}
                    className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center hover:bg-blue-100 rounded-full cursor-pointer flex-shrink-0"
                  >
                    <i className="ri-close-line text-xs sm:text-sm"></i>
                  </button>
                </span>
              )}
              {selectedCity && (
                <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm">
                  <i className="ri-map-pin-line text-xs sm:text-sm"></i>
                  {selectedCity}
                  <button
                    onClick={() => onCityChange('')}
                    className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center hover:bg-blue-100 rounded-full cursor-pointer flex-shrink-0"
                  >
                    <i className="ri-close-line text-xs sm:text-sm"></i>
                  </button>
                </span>
              )}
              {selectedType && (
                <span className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm">
                  <i className="ri-briefcase-line text-xs sm:text-sm"></i>
                  {selectedType}
                  <button
                    onClick={() => onTypeChange('')}
                    className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center hover:bg-blue-100 rounded-full cursor-pointer flex-shrink-0"
                  >
                    <i className="ri-close-line text-xs sm:text-sm"></i>
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                onCityChange('');
                onTypeChange('');
                onSearchChange('');
              }}
              className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              Tout effacer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
