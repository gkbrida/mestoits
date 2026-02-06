import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../../lib/supabase';
import { usePropertyTypes } from '../../hooks/usePropertyTypes';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
// Custom red marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface PriceData {
  commune: string;
  type_bien: string;
  offres: string;
  prix_m2_min: number | null;
  prix_m2_moy: number | null;
  prix_m2_max: number | null;
  prix_piece_min: number | null;
  prix_piece_moy: number | null;
  prix_piece_max: number | null;
  nb_annonces: number | null;
  latitude: number | null;
  longitude: number | null;
}

export default function CartePrixPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [filteredData, setFilteredData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchCity, setSearchCity] = useState('');
  const [propertyType, setPropertyType] = useState('terrains');
  const [offerType, setOfferType] = useState('Vente');
  const [cities, setCities] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [offerTypes, setOfferTypes] = useState<string[]>([]);
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadPriceData();
  }, []);

  // Set default filter values when options are loaded
  useEffect(() => {
    if (propertyTypes.length > 0 && !propertyType) {
      // Par défaut, utiliser 'terrains' s'il existe, sinon le premier disponible
      const defaultType = propertyTypes.includes('terrains') ? 'terrains' : propertyTypes[0];
      setPropertyType(defaultType);
    }
  }, [propertyTypes]);

  useEffect(() => {
    if (offerTypes.length > 0 && !offerType) {
      // Par défaut, utiliser 'Vente' s'il existe, sinon le premier disponible
      const defaultOffer = offerTypes.includes('Vente') ? 'Vente' : offerTypes[0];
      setOfferType(defaultOffer);
    }
  }, [offerTypes]);


  // Validate that selected city exists in the table
  const handleCitySelect = (city: string) => {
    if (cities.includes(city)) {
      setSearchCity(city);
      setShowCityDropdown(false);
    }
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchCity(value);
    // Show dropdown when typing
    if (value.trim() !== '') {
      const filtered = cities
        .filter(city => city.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setFilteredCities(filtered);
      setShowCityDropdown(filtered.length > 0);
    } else {
      setFilteredCities([]);
      setShowCityDropdown(false);
    }
  };

  const handleCityBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Don't close if clicking on dropdown
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('.city-dropdown')) {
      return;
    }
    
    // Validate on blur - reset if not in the list
    setTimeout(() => {
      if (searchCity && !cities.includes(searchCity)) {
        setSearchCity('');
      }
      setShowCityDropdown(false);
    }, 200);
  };

  useEffect(() => {
    applyFilters();
  }, [priceData, searchCity, propertyType, offerType]);

  const loadPriceData = async () => {
    try {
      setLoading(true);
      
      // Load price data from table_globale
      const { data: priceData, error: priceError } = await supabase
        .from('table_globale')
        .select('*');

      if (priceError) throw priceError;

      // Load localities data
      const { data: localitiesData, error: localitiesError } = await supabase
        .from('localities')
        .select('commune, latitude, longitude')
        .not('commune', 'is', null)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (localitiesError) throw localitiesError;

      if (!priceData || priceData.length === 0) {
        setPriceData([]);
        setFilteredData([]);
        return;
      }

      // Create a map of communes to coordinates
      const communeMap = new Map<string, { latitude: number; longitude: number }>();
      if (localitiesData) {
        localitiesData.forEach(loc => {
          if (loc.commune && loc.latitude && loc.longitude) {
            communeMap.set(loc.commune, {
              latitude: loc.latitude,
              longitude: loc.longitude,
            });
          }
        });
      }

      // Join price data with localities data
      const transformedData: PriceData[] = priceData
        .filter(item => {
          const coords = communeMap.get(item.commune);
          return coords !== undefined;
        })
        .map(item => {
          const coords = communeMap.get(item.commune)!;
          return {
            commune: item.commune,
            type_bien: item.type_bien,
            offres: item.offres,
            prix_m2_min: item.prix_m2_min,
            prix_m2_moy: item.prix_m2_moy,
            prix_m2_max: item.prix_m2_max,
            prix_piece_min: item.prix_piece_min,
            prix_piece_moy: item.prix_piece_moy,
            prix_piece_max: item.prix_piece_max,
            nb_annonces: item.nb_annonces,
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
        });

      setPriceData(transformedData);
      
      // Extract filter options from loaded data
      if (transformedData.length > 0) {
        const uniqueCommunes = [...new Set(transformedData.map(item => item.commune).filter(Boolean))];
        setCities(uniqueCommunes.sort());

        const uniquePropertyTypes = [...new Set(transformedData.map(item => item.type_bien).filter(Boolean))];
        setPropertyTypes(uniquePropertyTypes.sort());

        const uniqueOfferTypes = [...new Set(transformedData.map(item => item.offres).filter(Boolean))];
        setOfferTypes(uniqueOfferTypes.sort());

        // Set default values: Terrain en Vente
        if (!propertyType && uniquePropertyTypes.length > 0) {
          const defaultType = uniquePropertyTypes.includes('terrains') ? 'terrains' : uniquePropertyTypes[0];
          setPropertyType(defaultType);
        }
        if (!offerType && uniqueOfferTypes.length > 0) {
          const defaultOffer = uniqueOfferTypes.includes('Vente') ? 'Vente' : uniqueOfferTypes[0];
          setOfferType(defaultOffer);
        }
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données de prix:', error);
      setPriceData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };


  const applyFilters = () => {
    let filtered = [...priceData];

    if (searchCity) {
      filtered = filtered.filter(item => 
        item.commune.toLowerCase().includes(searchCity.toLowerCase())
      );
    }

    if (propertyType) {
      filtered = filtered.filter(item => item.type_bien === propertyType);
    }

    if (offerType) {
      filtered = filtered.filter(item => item.offres === offerType);
    }

    setFilteredData(filtered);
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M FCFA`;
    }
    return `${(price / 1000).toFixed(0)}K FCFA`;
  };

  const { getPropertyTypeLabel: getLabelFromHook } = usePropertyTypes();
  
  const getPropertyTypeLabel = (type: string) => {
    // Mapper les anciens noms vers les nouveaux codes si nécessaire
    const typeMapping: Record<string, string> = {
      'terrains': 'land',
      'appartements': 'apartment',
      'villas': 'villa',
      'maisons': 'house',
      'immeubles': 'building',
      'commerces': 'commercial',
      'bureaux': 'office',
      'parkings': 'parking',
      'residences-meubles': 'furnished-residence',
    };
    
    const mappedType = typeMapping[type.toLowerCase()] || type;
    return getLabelFromHook(mappedType) || type;
    const labels: Record<string, string> = {
      'apartment': 'Appartement',
      'house': 'Maison',
      'villa': 'Villa',
      'land': 'Terrain',
      'commercial': 'Commercial',
      'office': 'Bureau'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl sm:text-5xl text-blue-600 animate-spin"></i>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Mobile: Full screen map */}
      <div className="lg:hidden fixed inset-0 top-16 bottom-0" style={{ zIndex: 10 }}>
        <MapContainer
          center={[5.3599, -3.9870]}
          zoom={11}
          style={{ height: '100%', width: '100%', zIndex: 10 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {filteredData
            .filter(item => item.latitude && item.longitude)
            .map((item, index) => (
            <Marker
              key={`${item.commune}-${item.type_bien}-${item.offres}-${index}`}
              position={[item.latitude!, item.longitude!]}
              icon={redIcon}
            >
              <Popup>
                <div className="p-2 min-w-[180px] max-w-[280px]">
                  <h3 className="text-sm font-bold text-gray-900 mb-1.5">
                    {item.commune}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">
                    {getPropertyTypeLabel(item.type_bien)} - {item.offres === 'Vente' ? 'Vente' : 'Location'}
                  </p>
                  
                  <div className="space-y-1.5">
                    {/* Prix par m² */}
                    <div className="pt-1.5 border-t border-gray-200">
                      <p className="text-[10px] font-semibold text-gray-700 mb-1">Prix au m²</p>
                      {item.prix_m2_moy && (
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-600">Moyen:</span>
                          <span className="text-xs font-semibold text-blue-600">
                            {formatPrice(item.prix_m2_moy)}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 text-[10px]">
                        {item.prix_m2_min && (
                          <span className="text-gray-600">Min: <span className="font-medium text-gray-900">{formatPrice(item.prix_m2_min)}</span></span>
                        )}
                        {item.prix_m2_max && (
                          <span className="text-gray-600">Max: <span className="font-medium text-gray-900">{formatPrice(item.prix_m2_max)}</span></span>
                        )}
                      </div>
                    </div>
                    
                    {/* Prix par pièce */}
                    <div className="pt-1.5 border-t border-gray-200">
                      <p className="text-[10px] font-semibold text-gray-700 mb-1">Prix par pièce</p>
                      {item.prix_piece_moy && (
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs text-gray-600">Moyen:</span>
                          <span className="text-xs font-semibold text-blue-600">
                            {formatPrice(item.prix_piece_moy)}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2 text-[10px]">
                        {item.prix_piece_min && (
                          <span className="text-gray-600">Min: <span className="font-medium text-gray-900">{formatPrice(item.prix_piece_min)}</span></span>
                        )}
                        {item.prix_piece_max && (
                          <span className="text-gray-600">Max: <span className="font-medium text-gray-900">{formatPrice(item.prix_piece_max)}</span></span>
                        )}
                      </div>
                    </div>
                    
                    {item.nb_annonces && (
                      <div className="pt-1.5 border-t border-gray-200">
                        <p className="text-[10px] text-gray-500 text-center">
                          Basé sur {item.nb_annonces} annonce{item.nb_annonces > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Mobile: Active filters chips at top */}
        {(searchCity || propertyType || offerType) && (
          <div className="absolute top-2 left-2 right-2 z-[1000] flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {searchCity && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-md text-xs">
                <i className="ri-map-pin-line text-blue-600"></i>
                <span className="text-gray-700">{searchCity}</span>
                <button
                  onClick={() => setSearchCity('')}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            )}
            {propertyType && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-md text-xs">
                <span className="text-gray-700">{getPropertyTypeLabel(propertyType)}</span>
                <button
                  onClick={() => setPropertyType('')}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            )}
            {offerType && (
              <div className="flex items-center gap-1 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full shadow-md text-xs">
                <span className="text-gray-700">{offerType === 'sale' ? 'Vente' : offerType === 'rental' ? 'Location' : offerType}</span>
                <button
                  onClick={() => setOfferType('')}
                  className="ml-1 text-gray-500 hover:text-gray-700"
                >
                  <i className="ri-close-line text-sm"></i>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile: Results count badge */}
        <div className="absolute top-2 right-2 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-2 py-1">
          <p className="text-xs font-semibold text-gray-700">
            <span className="text-blue-600">{filteredData.length}</span> résultat{filteredData.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Mobile: Floating filter button */}
        <button
          onClick={() => setShowFilters(true)}
          className="fixed bottom-6 right-4 z-[1000] w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all"
        >
          <i className="ri-filter-3-line text-2xl"></i>
        </button>
      </div>

      {/* Desktop: Original layout */}
      <div className="hidden lg:flex pt-20 h-[calc(100vh-80px)]">
        <div className="flex flex-row w-full">
          {/* Map Section - 75% on desktop */}
          <div className="w-3/4 relative h-full" style={{ zIndex: 0 }}>
            <MapContainer
              center={[5.3599, -3.9870]}
              zoom={11}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {filteredData
                .filter(item => item.latitude && item.longitude)
                .map((item, index) => (
                <Marker
                  key={`${item.commune}-${item.type_bien}-${item.offres}-${index}`}
                  position={[item.latitude!, item.longitude!]}
                  icon={redIcon}
                >
                  <Popup>
                    <div className="p-2 min-w-[280px]">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {item.commune}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {getPropertyTypeLabel(item.type_bien)} - {item.offres === 'Vente' ? 'Vente' : 'Location'}
                      </p>
                      
                      <div className="space-y-2">
                        {/* Prix par m² */}
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Prix au m²</p>
                          {item.prix_m2_moy && (
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Moyen:</span>
                              <span className="text-sm font-semibold text-blue-600">
                                {formatPrice(item.prix_m2_moy)}
                              </span>
                            </div>
                          )}
                          {item.prix_m2_min && (
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Min:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(item.prix_m2_min)}
                              </span>
                            </div>
                          )}
                          {item.prix_m2_max && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Max:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(item.prix_m2_max)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Prix par pièce */}
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Prix par pièce</p>
                          {item.prix_piece_moy && (
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Moyen:</span>
                              <span className="text-sm font-semibold text-blue-600">
                                {formatPrice(item.prix_piece_moy)}
                              </span>
                            </div>
                          )}
                          {item.prix_piece_min && (
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Min:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(item.prix_piece_min)}
                              </span>
                            </div>
                          )}
                          {item.prix_piece_max && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Max:</span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(item.prix_piece_max)}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {item.nb_annonces && (
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 text-center">
                              Basé sur {item.nb_annonces} annonce{item.nb_annonces > 1 ? 's' : ''}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Filter Panel - 25% on desktop */}
          <div className="w-1/4 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Filtres</h2>
              </div>

              {/* Search City */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Localité
                </label>
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg w-5 h-5 flex items-center justify-center z-10"></i>
                  <input
                    type="text"
                    placeholder="Rechercher une localité..."
                    value={searchCity}
                    onChange={handleCityChange}
                    onFocus={() => {
                      if (searchCity.trim() !== '') {
                        const filtered = cities
                          .filter(city => city.toLowerCase().includes(searchCity.toLowerCase()))
                          .slice(0, 5);
                        setFilteredCities(filtered);
                        setShowCityDropdown(filtered.length > 0);
                      }
                    }}
                    onBlur={handleCityBlur}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {showCityDropdown && filteredCities.length > 0 && (
                    <div className="city-dropdown absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleCitySelect(city)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Property Type */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Type de bien
                </label>
                <div className="space-y-2">
                  {propertyTypes.length > 0 ? (
                    propertyTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setPropertyType(type)}
                        className={`w-full px-4 py-3 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap text-left ${
                          propertyType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getPropertyTypeLabel(type)}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Chargement...</p>
                  )}
                </div>
              </div>

              {/* Offer Type */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Type d'offre
                </label>
                <div className="space-y-2">
                  {offerTypes.length > 0 ? (
                    offerTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setOfferType(type)}
                        className={`w-full px-4 py-3 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                          offerType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type === 'sale' ? 'Vente' : type === 'rental' ? 'Location' : type}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Chargement...</p>
                  )}
                </div>
              </div>

              {/* Results Summary */}
              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong className="text-blue-600">{filteredData.length}</strong> résultat{filteredData.length > 1 ? 's' : ''} trouvé{filteredData.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Cliquez sur les marqueurs rouges pour voir les détails des prix
                </p>
              </div>

              {/* Legend */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Légende</h3>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <i className="ri-map-pin-fill text-2xl text-red-600"></i>
                  </div>
                  <span className="text-sm text-gray-700">Localité avec données de prix</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Bottom Sheet Filter Drawer */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-[2000] top-16"
            onClick={() => setShowFilters(false)}
          ></div>
          
          {/* Drawer */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[2001] bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Filtres</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Search City */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Localité
                </label>
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base w-4 h-4 flex items-center justify-center z-10"></i>
                  <input
                    type="text"
                    placeholder="Rechercher une localité..."
                    value={searchCity}
                    onChange={handleCityChange}
                    onFocus={() => {
                      if (searchCity.trim() !== '') {
                        const filtered = cities
                          .filter(city => city.toLowerCase().includes(searchCity.toLowerCase()))
                          .slice(0, 5);
                        setFilteredCities(filtered);
                        setShowCityDropdown(filtered.length > 0);
                      }
                    }}
                    onBlur={handleCityBlur}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {showCityDropdown && filteredCities.length > 0 && (
                    <div className="city-dropdown absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => handleCitySelect(city)}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Property Type */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Type de bien
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {propertyTypes.length > 0 ? (
                    propertyTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setPropertyType(type)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          propertyType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {getPropertyTypeLabel(type)}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 col-span-2">Chargement...</p>
                  )}
                </div>
              </div>

              {/* Offer Type */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Type d'offre
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {offerTypes.length > 0 ? (
                    offerTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => setOfferType(type)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                          offerType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type === 'sale' ? 'Vente' : type === 'rental' ? 'Location' : type}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 col-span-2">Chargement...</p>
                  )}
                </div>
              </div>

              {/* Results Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong className="text-blue-600">{filteredData.length}</strong> résultat{filteredData.length > 1 ? 's' : ''} trouvé{filteredData.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Footer with apply button */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}
