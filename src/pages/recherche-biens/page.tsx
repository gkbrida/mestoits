import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { usePropertiesCache } from '../../contexts/PropertiesCacheContext';
import type { Property } from '../../contexts/PropertiesCacheContext';
import { usePropertyTypes } from '../../hooks/usePropertyTypes';
import { useOperationTypes } from '../../hooks/useOperationTypes';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import PropertyCard from './components/PropertyCard';
import FiltersModal from './components/FiltersModal';

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

export default function RechercheBiensPage() {
  const { setProperties, getAllProperties } = usePropertiesCache();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [displayedProperties, setDisplayedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filters, setFilters] = useState<Filters>({});
  const [cities, setCities] = useState<string[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const ITEMS_PER_PAGE = 7;
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    // Charger d'abord depuis le cache si disponible
    loadFromCache();
    loadCities();
  }, []);

  const loadFromCache = useCallback(() => {
    // Récupérer toutes les propriétés du cache
    const cachedProperties = getAllProperties();
    if (cachedProperties.length > 0) {
      console.log(`Chargement de ${cachedProperties.length} biens depuis le cache`);
      setAllProperties(cachedProperties);
      setLoading(false);
      setCacheLoaded(true);
    } else {
      // Pas de cache, charger depuis Supabase
      loadProperties();
    }
  }, [getAllProperties]);

  useEffect(() => {
    // Si on a chargé depuis le cache, charger aussi depuis Supabase pour mettre à jour
    if (cacheLoaded) {
      loadProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheLoaded]);

  useEffect(() => {
    if (searchCity.trim().length > 0 && cities.length > 0) {
      const searchTerm = searchCity.toLowerCase().trim();
      const filtered = cities
        .filter(city => 
          city && typeof city === 'string' && city.toLowerCase().includes(searchTerm)
        )
        .slice(0, 5);
      
      setFilteredCities(filtered);
      setShowCityDropdown(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowCityDropdown(false);
    }
  }, [searchCity, cities]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.city-filter-container')) {
        setShowCityDropdown(false);
      }
    };

    if (showCityDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCityDropdown]);

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

  const loadProperties = async () => {
    try {
      // Charger toutes les données depuis properties_02
      const { data, error } = await supabase
        .from('properties_02')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const properties = (data || []).map((prop: any) => ({
        ...prop,
        // Utiliser uniquement operation_type depuis properties_02
        operation_type: prop.operation_type || 'sale',
      }));
      
      // Mettre à jour le cache avec les nouvelles données
      setProperties(properties);
      
      // Toujours mettre à jour l'état local avec les données fraîches
      setAllProperties(properties);
    } catch (error) {
      console.error('Erreur lors du chargement des biens:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProperties = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    // Charger le prochain lot immédiatement (les images sont déjà incluses dans les données)
    setDisplayedProperties((prev) => {
      const currentLength = prev.length;
      const nextBatch = filteredProperties.slice(currentLength, currentLength + ITEMS_PER_PAGE);
      
      if (nextBatch.length > 0) {
        const newLength = currentLength + nextBatch.length;
        setHasMore(newLength < filteredProperties.length);
        return [...prev, ...nextBatch];
      } else {
        setHasMore(false);
        return prev;
      }
    });
    
    setLoadingMore(false);
  }, [loadingMore, hasMore, filteredProperties]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [allProperties, filters, sortBy]);

  useEffect(() => {
    // Charger les premiers résultats (les images sont déjà incluses dans les données)
    if (filteredProperties.length > 0) {
      const firstBatch = filteredProperties.slice(0, ITEMS_PER_PAGE);
      setDisplayedProperties(firstBatch);
      setHasMore(filteredProperties.length > ITEMS_PER_PAGE);
    } else {
      setDisplayedProperties([]);
      setHasMore(false);
    }
  }, [filteredProperties]);

  useEffect(() => {
    // Nettoyer l'observer précédent
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Créer un nouvel observer pour l'avant-dernière annonce
    if (lastElementRef.current && hasMore && !loadingMore) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMoreProperties();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(lastElementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [displayedProperties.length, hasMore, loadingMore, loadMoreProperties]);

  const applyFiltersAndSort = () => {
    let filtered = [...allProperties];

    // Filtres
    if (filters.city) {
      filtered = filtered.filter((prop) => prop.city === filters.city);
    }
    // Filtrer par operation_type uniquement
    if (filters.operationType) {
      filtered = filtered.filter((prop: any) => prop.operation_type === filters.operationType);
    }
    if (filters.propertyType) {
      filtered = filtered.filter((prop) => prop.property_type === filters.propertyType);
    }
    if (filters.villaType && filters.villaType.length > 0 && filters.propertyType === 'villa') {
      filtered = filtered.filter((prop) => prop.villa_type && filters.villaType!.includes(prop.villa_type));
    }
    if (filters.minPrice) {
      filtered = filtered.filter((prop) => prop.price >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      filtered = filtered.filter((prop) => prop.price <= filters.maxPrice!);
    }
    if (filters.minSurface) {
      filtered = filtered.filter((prop) => prop.surface_area >= filters.minSurface!);
    }
    if (filters.maxSurface) {
      filtered = filtered.filter((prop) => prop.surface_area <= filters.maxSurface!);
    }
    if (filters.minRooms) {
      filtered = filtered.filter((prop) => (prop.bedrooms || 0) >= filters.minRooms!);
    }
    if (filters.maxRooms) {
      filtered = filtered.filter((prop) => (prop.bedrooms || 0) <= filters.maxRooms!);
    }
    if (filters.minBathrooms) {
      filtered = filtered.filter((prop) => (prop.bathrooms || 0) >= filters.minBathrooms!);
    }
    if (filters.maxBathrooms) {
      filtered = filtered.filter((prop) => (prop.bathrooms || 0) <= filters.maxBathrooms!);
    }
    if (filters.features && filters.features.length > 0) {
      filtered = filtered.filter((prop) =>
        filters.features!.every((feature) => prop.features?.includes(feature))
      );
    }
    if (filters.condition && filters.condition.length > 0) {
      filtered = filtered.filter((prop) => prop.condition && filters.condition!.includes(prop.condition));
    }
    if (filters.standing && filters.standing.length > 0) {
      filtered = filtered.filter((prop) => prop.standing && filters.standing!.includes(prop.standing));
    }
    if (filters.securityType) {
      filtered = filtered.filter((prop) => prop.security_type === filters.securityType);
    }
    if (filters.accessibility) {
      filtered = filtered.filter((prop) => prop.accessibility === filters.accessibility);
    }
    if (filters.landTitles && filters.landTitles.length > 0) {
      filtered = filtered.filter((prop) =>
        filters.landTitles!.some((title) => prop.land_titles?.includes(title))
      );
    }
    if (filters.offeredBy) {
      filtered = filtered.filter((prop) => prop.offered_by === filters.offeredBy);
    }

    // Tri
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
      default:
        // Déjà trié par created_at desc
        break;
    }

    setFilteredProperties(filtered);
  };

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    setShowFiltersModal(false);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchCity('');
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => filters[key as keyof Filters] !== undefined && filters[key as keyof Filters] !== ''
  ).length;

  const { propertyTypes, getPropertyTypeLabel } = usePropertyTypes();
  const { getOperationTypeLabel } = useOperationTypes();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl sm:text-5xl text-blue-600 animate-spin"></i>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Chargement des biens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-16 md:pt-24 pb-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">Rechercher un bien</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">
              {filteredProperties.length} bien{filteredProperties.length > 1 ? 's' : ''} disponible{filteredProperties.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Quick Filters Bar */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
              {/* Localisation Filter */}
              <div className="flex-1 min-w-[140px] sm:min-w-[150px] md:min-w-[200px] relative city-filter-container">
                <i className="ri-map-pin-line absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base md:text-lg w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center z-10"></i>
                <input
                  type="text"
                  placeholder="Localisation..."
                  value={searchCity}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchCity(value);
                    const cityExists = cities.some(city => 
                      city && city.toLowerCase().trim() === value.toLowerCase().trim()
                    );
                    if (value.trim() === '' || cityExists || filteredCities.some(c => c.toLowerCase() === value.toLowerCase())) {
                      setFilters({ ...filters, city: value || undefined });
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && !cities.some(city => city && city.toLowerCase().trim() === value.toLowerCase().trim())) {
                      setSearchCity('');
                      setFilters({ ...filters, city: undefined });
                      setShowCityDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (filteredCities.length > 0) {
                      setShowCityDropdown(true);
                    }
                  }}
                  className="w-full pl-7 sm:pl-9 md:pl-10 pr-2 sm:pr-3 md:pr-4 py-1.5 sm:py-2 md:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
                {showCityDropdown && filteredCities.length > 0 && (
                  <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-xl overflow-hidden top-full">
                    {filteredCities.slice(0, 5).map((city, index) => (
                      <button
                        key={`city-${city}-${index}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSearchCity(city);
                          setFilters({ ...filters, city });
                          setShowCityDropdown(false);
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

              {/* Type d'opération Filter */}
              <div className="min-w-[100px] sm:min-w-[120px] md:min-w-[150px]">
                <select
                  value={filters.operationType || filters.offerType || ''}
                  onChange={(e) => {
                    const value = e.target.value || undefined;
                    setFilters({ ...filters, operationType: value, offerType: undefined });
                  }}
                  className="w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm cursor-pointer"
                >
                  <option value="">Type d'offre</option>
                  <option value="sale">À vendre</option>
                  <option value="rental">À louer</option>
                  <option value="short-term-rental">Location meublée courte durée</option>
                </select>
              </div>

              {/* Type de bien Filter */}
              <div className="min-w-[100px] sm:min-w-[120px] md:min-w-[150px]">
                <select
                  value={filters.propertyType || ''}
                  onChange={(e) => {
                    const value = e.target.value || undefined;
                    setFilters({ ...filters, propertyType: value });
                  }}
                  className="w-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm cursor-pointer"
                >
                  <option value="">Type de bien</option>
                  {propertyTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prix min Filter - Hidden on mobile */}
              <div className="hidden md:block min-w-[100px] md:min-w-[120px]">
                <input
                  type="number"
                  placeholder="Prix min"
                  value={filters.minPrice || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    setFilters({ ...filters, minPrice: value });
                  }}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Prix max Filter - Hidden on mobile */}
              <div className="hidden md:block min-w-[100px] md:min-w-[120px]">
                <input
                  type="number"
                  placeholder="Prix max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    setFilters({ ...filters, maxPrice: value });
                  }}
                  className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Filters Button */}
              <button
                onClick={() => setShowFiltersModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap text-xs sm:text-sm md:text-base"
              >
                <i className="ri-filter-3-line text-sm sm:text-base md:text-lg w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                <span className="hidden sm:inline">Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1 sm:px-1.5 md:px-2 py-0.5 bg-blue-600 text-white text-[10px] sm:text-xs rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                <option value="newest">Plus récent</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
              </select>

              {/* Clear Filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer whitespace-nowrap text-xs sm:text-sm"
                >
                  <i className="ri-close-line text-sm sm:text-base md:text-lg w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                  <span className="hidden sm:inline">Effacer</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
              {filters.city && (
                <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                  Ville: {filters.city}
                </span>
              )}
              {(filters.operationType || filters.offerType) && (
                <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                  {getOperationTypeLabel(filters.operationType || filters.offerType || '')}
                </span>
              )}
              {filters.propertyType && (
                <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                  Type: {getPropertyTypeLabel(filters.propertyType || '')}
                </span>
              )}
              {filters.minPrice && (
                <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                  Prix min: {filters.minPrice.toLocaleString()}FCFA
                </span>
              )}
              {filters.maxPrice && (
                <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm">
                  Prix max: {filters.maxPrice.toLocaleString()}FCFA
                </span>
              )}
            </div>
          )}

          {/* Properties Grid */}
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12 sm:py-16 md:py-20 px-4">
              <i className="ri-home-smile-line text-4xl sm:text-5xl md:text-6xl text-gray-300 mb-3 sm:mb-4"></i>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">Aucun bien trouvé</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Essayez de modifier vos critères de recherche
              </p>
              <button
                onClick={clearFilters}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white text-sm sm:text-base rounded-full hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {displayedProperties.map((property, index) => (
                  <div
                    key={property.id}
                    ref={index === displayedProperties.length - 2 ? lastElementRef : null}
                  >
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>

              {/* Loading More Indicator */}
              {loadingMore && (
                <div className="flex items-center justify-center py-8 sm:py-10">
                  <i className="ri-loader-4-line text-2xl sm:text-3xl text-blue-600 animate-spin"></i>
                  <span className="ml-3 text-sm sm:text-base text-gray-600">Chargement...</span>
                </div>
              )}

              {/* End of Results Message */}
              {!hasMore && displayedProperties.length > 0 && (
                <div className="text-center py-8 sm:py-10 px-4">
                  <p className="text-sm sm:text-base text-gray-500">
                    Toutes les annonces ont été chargées
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />

      {/* Filters Modal */}
      {showFiltersModal && (
        <FiltersModal
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setShowFiltersModal(false)}
        />
      )}
    </div>
  );
}
