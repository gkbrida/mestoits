import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { usePropertyTypes } from '../../../hooks/usePropertyTypes';

interface PriceComparisonProps {
  pricePerSqm: number;
  city: string;
  propertyType: string;
  offerType: string;
}

export default function PriceComparison({ pricePerSqm, city, propertyType, offerType }: PriceComparisonProps) {
  const [averagePrice, setAveragePrice] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const { getPropertyTypeLabel } = usePropertyTypes();

  const mapPropertyType = (type: string): string => {
    const mapping: Record<string, string> = {
      'apartment': 'appartements',
      'house': 'maisons',
      'villa': 'villas',
      'land': 'terrains',
      'commercial': 'commerces',
      'office': 'bureaux',
      'parking': 'parkings',
      'furnished-residence': 'residences-meubles',
      'building': 'immeubles',
    };
    return mapping[type] || 'appartements';
  };

  const mapOfferType = (type: string): string => {
    if (type === 'sale') return 'Vente';
    if (type === 'rental') return 'Location';
    if (type === 'short-term-rental') return 'Location'; // Location courte durée = Location
    return 'Vente';
  };

  useEffect(() => {
    const loadPriceData = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('table_globale')
          .select('prix_m2_min, prix_m2_moy, prix_m2_max')
          .eq('commune', city)
          .eq('type_bien', mapPropertyType(propertyType))
          .eq('offres', mapOfferType(offerType))
          .single();

        if (error || !data) {
          setAveragePrice(null);
          setMinPrice(null);
          setMaxPrice(null);
          return;
        }

        setAveragePrice(data.prix_m2_moy || null);
        setMinPrice(data.prix_m2_min || null);
        setMaxPrice(data.prix_m2_max || null);
      } catch (error) {
        console.error('Erreur lors du chargement des données de prix:', error);
        setAveragePrice(null);
        setMinPrice(null);
        setMaxPrice(null);
      } finally {
        setLoading(false);
      }
    };

    if (city && propertyType && offerType) {
      loadPriceData();
    }
  }, [city, propertyType, offerType]);

  const getPosition = () => {
    if (!minPrice || !maxPrice || minPrice === maxPrice) return 50;
    const range = maxPrice - minPrice;
    const position = ((pricePerSqm - minPrice) / range) * 100;
    return Math.max(0, Math.min(100, position));
  };

  const position = minPrice && maxPrice ? getPosition() : 50;
  const getColor = () => position < 33 ? 'text-blue-600' : position < 66 ? 'text-yellow-600' : 'text-red-600';
  const getLabel = () => position < 33 ? 'Prix attractif' : position < 66 ? 'Prix dans la moyenne' : 'Prix élevé';

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Comparaison des prix</h2>

      <div className="space-y-4 sm:space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <i className="ri-loader-4-line text-3xl text-gray-400 animate-spin mb-3"></i>
            <span className="text-sm text-gray-600">Chargement des données de comparaison...</span>
          </div>
        ) : minPrice !== null && maxPrice !== null && averagePrice !== null ? (
          <>
            {/* Current Price */}
            <div className="text-center">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Prix de ce bien</div>
              <div className={`text-2xl sm:text-3xl font-bold ${getColor()}`}>
                {pricePerSqm.toLocaleString()} FCFA/m²
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-1">{getLabel()}</div>
            </div>

            {/* Price Gauge */}
            <div className="relative">
              {/* Gradient Bar */}
              <div className="h-6 sm:h-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500"></div>

              {/* Marker */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500"
                style={{ left: `${position}%` }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-0.5 sm:w-1 h-10 sm:h-12 bg-gray-900"></div>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-900 rounded-full border-2 border-white shadow-lg"></div>
                </div>
              </div>
            </div>

            {/* Price Range Labels */}
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
              <div className="text-left">
                <div className="font-semibold text-blue-600 text-xs sm:text-sm">{minPrice.toLocaleString()} FCFA</div>
                <div className="text-[10px] sm:text-xs">Prix min</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900 text-xs sm:text-sm">{averagePrice.toLocaleString()} FCFA</div>
                <div className="text-[10px] sm:text-xs">Moyenne</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-red-600 text-xs sm:text-sm">{maxPrice.toLocaleString()} FCFA</div>
                <div className="text-[10px] sm:text-xs">Prix max</div>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2 sm:gap-3">
                <i className="ri-information-line text-lg sm:text-xl text-blue-600 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
                <div className="text-xs sm:text-sm text-blue-900 min-w-0">
                  <p className="font-medium mb-1">Comparaison basée sur les prix du marché</p>
                  <p className="text-blue-700 break-words">
                    {getPropertyTypeLabel(propertyType)} à {city} en {offerType === 'sale' ? 'vente' : 'location'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-start gap-2 sm:gap-3">
              <i className="ri-information-line text-lg sm:text-xl text-yellow-600 mt-0.5 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
              <div className="text-xs sm:text-sm text-yellow-900">
                <p className="font-medium mb-1">Données non disponibles</p>
                <p className="text-yellow-700">
                  Aucune donnée de prix trouvée pour {getPropertyTypeLabel(propertyType)} à {city} en {offerType === 'sale' ? 'vente' : 'location'}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
