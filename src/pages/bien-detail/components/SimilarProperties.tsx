import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
interface Property {
  id: string;
  title: string;
  price: number;
  city: string;
  surface_area: number;
  bedrooms?: number;
  images?: string[];
  price_per_sqm: number;
  property_type: string;
}

interface SimilarPropertiesProps {
  currentPropertyId: string;
  city: string;
  propertyType: string;
  offerType?: string;
  operationType?: string;
}

export default function SimilarProperties({
  currentPropertyId,
  city,
  propertyType,
  offerType,
  operationType,
}: SimilarPropertiesProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSimilarProperties();
  }, [currentPropertyId, city, propertyType, offerType, operationType]);

  const loadSimilarProperties = async () => {
    try {
      let query = supabase
        .from('properties_02')
        .select('*')
        .eq('status', 'active')
        .eq('city', city)
        .eq('property_type', propertyType)
        .neq('id', currentPropertyId);

      // Filtrer par operation_type uniquement
      // Utiliser operationType en priorité, sinon convertir offerType en operationType
      const finalOperationType = operationType || (offerType === 'sale' ? 'sale' : offerType === 'rental' ? 'rental' : undefined);
      if (finalOperationType) {
        query = query.eq('operation_type', finalOperationType);
      }

      const { data, error } = await query.limit(3);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des biens similaires:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-8 sm:mt-12 md:mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8">Biens similaires</h2>
        <div className="flex items-center justify-center py-8 sm:py-12">
          <i className="ri-loader-4-line text-3xl sm:text-4xl text-blue-600 animate-spin"></i>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 sm:mt-12 md:mt-16">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6 md:mb-8">Biens similaires</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {properties.map((property) => {
          const mainImage =
            property.images && property.images.length > 0
              ? property.images[0]
              : `https://readdy.ai/api/search-image?query=Modern%20$%7Bproperty.property_type%7D%20property%20exterior%20with%20clean%20architecture%2C%20bright%20natural%20lighting%2C%20simple%20background%20showcasing%20elegant%20residential%20real%20estate%20for%20listing&width=640&height=480&seq=similar${property.id}&orientation=landscape`;

          return (
            <a
              key={property.id}
              href={`/bien/${property.id}`}
              className="block bg-white rounded-xl md:rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-[180px] sm:h-[200px] rounded-t-xl md:rounded-t-2xl overflow-hidden">
                <img
                  src={mainImage}
                  alt={property.title}
                  className="w-full h-full object-cover object-top"
                />
                {/* Price Badge */}
                <div className="absolute top-2 sm:top-3 md:top-4 left-2 sm:left-3 md:left-4 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-black/80 backdrop-blur-sm text-white text-xs sm:text-sm font-bold rounded-lg">
                  {property.price ? property.price.toLocaleString() : '0'} FCFA
                </div>
              </div>

              {/* Content */}
              <div className="p-3 sm:p-4 md:p-5">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-2 leading-snug">
                  {property.title}
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  <i className="ri-map-pin-line text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                  {property.city}
                </div>

                {/* Features */}
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-200">
                  {property.bedrooms && (
                    <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
                      <i className="ri-hotel-bed-line text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                      {property.bedrooms}
                    </div>
                  )}
                  {property.surface_area && (
                    <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
                      <i className="ri-ruler-line text-sm sm:text-base w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
                      {property.surface_area}m²
                    </div>
                  )}
                </div>

                {/* Price per sqm */}
                {property.price_per_sqm && (
                  <div className="text-xs sm:text-sm text-gray-600">
                    <span className="font-semibold">{property.price_per_sqm.toLocaleString()}FCFA/m²</span>
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
