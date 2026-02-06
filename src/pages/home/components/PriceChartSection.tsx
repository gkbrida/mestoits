import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../../../lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  prix_m2_moy: number | null;
  prix_piece_moy: number | null;
  latitude: number;
  longitude: number;
}

const LOCALITIES = ['Abobo', 'Adjame', 'Cocody', 'Yopougon', 'Marcory'];

export default function PriceChartSection() {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriceData();
  }, []);

  const loadPriceData = async () => {
    try {
      setLoading(true);

      // Charger les données de prix pour les terrains en vente (par défaut)
      const { data: priceData, error: priceError } = await supabase
        .from('table_globale')
        .select('commune, prix_m2_moy, prix_piece_moy')
        .in('commune', LOCALITIES)
        .eq('type_bien', 'terrains')
        .eq('offres', 'Vente');

      if (priceError) {
        console.error('Erreur lors du chargement des données de prix:', priceError);
      }

      // Charger les coordonnées des localités
      const { data: localitiesData, error: localitiesError } = await supabase
        .from('localities')
        .select('commune, latitude, longitude')
        .in('commune', LOCALITIES)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (localitiesError) {
        console.error('Erreur lors du chargement des localités:', localitiesError);
      }

      // Créer une map des coordonnées par commune
      const communeCoordsMap = new Map<string, { latitude: number; longitude: number }>();
      if (localitiesData) {
        localitiesData.forEach(loc => {
          if (loc.commune && loc.latitude && loc.longitude) {
            communeCoordsMap.set(loc.commune, {
              latitude: loc.latitude,
              longitude: loc.longitude,
            });
          }
        });
      }

      // Créer une map des prix par commune
      const priceMap = new Map<string, { prix_m2_moy: number | null; prix_piece_moy: number | null }>();
      if (priceData) {
        priceData.forEach((item: any) => {
          if (LOCALITIES.includes(item.commune)) {
            priceMap.set(item.commune, {
              prix_m2_moy: item.prix_m2_moy,
              prix_piece_moy: item.prix_piece_moy,
            });
          }
        });
      }

      // Combiner les données avec les coordonnées
      const combinedData: PriceData[] = LOCALITIES
        .filter(loc => communeCoordsMap.has(loc))
        .map(loc => {
          const coords = communeCoordsMap.get(loc)!;
          const prices = priceMap.get(loc) || { prix_m2_moy: null, prix_piece_moy: null };
          return {
            commune: loc,
            prix_m2_moy: prices.prix_m2_moy,
            prix_piece_moy: prices.prix_piece_moy,
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
        });

      setPriceData(combinedData);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setPriceData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null): string => {
    if (price === null || price === undefined) return 'N/A';
    return new Intl.NumberFormat('fr-FR').format(Math.round(price)) + ' FCFA';
  };

  return (
    <section className="py-10 md:py-20 bg-white">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="bg-white border border-gray-200 rounded-2xl md:rounded-3xl p-6 md:p-12 lg:p-16 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4">
              Prix Immobiliers par Localité
            </h2>
            <p className="text-sm md:text-base text-gray-600 max-w-[600px] mx-auto">
              Consultez les prix moyens au m² et par pièce dans les principales villes et communes
            </p>
          </div>

          {/* Map Preview */}
          {loading ? (
            <div className="flex items-center justify-center py-12 md:py-16">
              <div className="text-center">
                <i className="ri-loader-4-line text-4xl md:text-5xl text-blue-600 animate-spin mb-4"></i>
                <p className="text-sm md:text-base text-gray-600">Chargement de la carte...</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 md:mb-8">
              <div className="relative w-full h-[400px] md:h-[500px] rounded-xl md:rounded-2xl overflow-hidden border border-gray-200 shadow-lg" style={{ zIndex: 0 }}>
                <MapContainer
                  center={[5.3599, -3.9870]}
                  zoom={11}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                  scrollWheelZoom={false}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {priceData
                    .filter(item => item.latitude && item.longitude)
                    .map((item) => (
                    <Marker
                      key={item.commune}
                      position={[item.latitude, item.longitude]}
                      icon={redIcon}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <h3 className="text-base font-bold text-gray-900 mb-2">
                            {item.commune}
                          </h3>
                          <div className="space-y-2">
                            {item.prix_m2_moy && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Prix au m²</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {formatPrice(item.prix_m2_moy)}
                                </p>
                              </div>
                            )}
                            {item.prix_piece_moy && (
                              <div className="pt-2 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Prix par pièce</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {formatPrice(item.prix_piece_moy)}
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
            </div>
          )}

          {/* CTA Button */}
          <div className="text-center">
            <a
              href="/carte-prix"
              className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white border-2 border-blue-600 text-blue-600 text-sm md:text-base font-semibold rounded-full hover:bg-blue-600 hover:text-white transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-map-pin-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
              <span className="hidden sm:inline">Voir la carte complète</span>
              <span className="sm:hidden">Carte complète</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
