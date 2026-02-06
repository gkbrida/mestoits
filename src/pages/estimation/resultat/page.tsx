import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../../components/feature/Navbar';
import SideMenu from '../../../components/feature/SideMenu';
import Footer from '../../../components/feature/Footer';
import { supabase } from '../../../lib/supabase';
interface ValuationData {
  id: string;
  property_type: string;
  address: string;
  city: string;
  postal_code: string;
  surface: number;
  rooms: number;
  bedrooms: number;
  condition: string;
  estimated_price?: number;
  min_price?: number;
  max_price?: number;
}

export default function EstimationResultatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [priceData, setPriceData] = useState<any>(null);

  useEffect(() => {
    loadValuation();
  }, [id]);

  const loadValuation = async () => {
    try {
      // Charger les données de l'estimation
      const { data: valuationData, error: valuationError } = await supabase
        .from('valuations_2025_12_01_11_29')
        .select('*')
        .eq('id', id)
        .single();

      if (valuationError) throw valuationError;

      // Charger les données de prix pour la ville
      const { data: priceDataResult, error: priceError } = await supabase
        .from('price_data_2025_12_01_11_29')
        .select('*')
        .eq('city', valuationData.city)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (!priceError && priceDataResult) {
        setPriceData(priceDataResult);
      }

      // Calculer l'estimation
      const basePrice = calculateEstimatedPrice(valuationData, priceDataResult);
      const minPrice = Math.round(basePrice * 0.9);
      const maxPrice = Math.round(basePrice * 1.1);

      // Mettre à jour l'estimation dans la base de données
      await supabase
        .from('valuations_2025_12_01_11_29')
        .update({
          estimated_price: basePrice,
          min_price: minPrice,
          max_price: maxPrice,
        })
        .eq('id', id);

      setValuation({
        ...valuationData,
        estimated_price: basePrice,
        min_price: minPrice,
        max_price: maxPrice,
      });
    } catch (err) {
      console.error('Erreur chargement estimation:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedPrice = (data: any, cityPriceData: any): number => {
    // Prix de base par m² selon la ville (ou prix moyen si pas de données)
    let pricePerSqm = 3500; // Prix par défaut
    
    if (cityPriceData && cityPriceData.average_price_per_sqm) {
      pricePerSqm = cityPriceData.average_price_per_sqm;
    }

    // Calcul de base
    let estimatedPrice = data.surface * pricePerSqm;

    // Ajustements selon le type de bien
    const typeMultipliers: { [key: string]: number } = {
      apartment: 1.0,
      house: 1.15,
      studio: 0.85,
      loft: 1.1,
      duplex: 1.05,
    };
    estimatedPrice *= typeMultipliers[data.property_type] || 1.0;

    // Ajustements selon l'état
    const conditionMultipliers: { [key: string]: number } = {
      new: 1.2,
      excellent: 1.1,
      good: 1.0,
      average: 0.9,
      to_renovate: 0.75,
    };
    estimatedPrice *= conditionMultipliers[data.condition] || 1.0;

    // Ajustements selon les équipements
    if (data.has_balcony) estimatedPrice *= 1.03;
    if (data.has_terrace) estimatedPrice *= 1.05;
    if (data.has_garden) estimatedPrice *= 1.08;
    if (data.has_elevator) estimatedPrice *= 1.02;
    if (data.parking !== 'none') estimatedPrice *= 1.05;

    // Ajustement selon la classe énergétique
    const energyMultipliers: { [key: string]: number } = {
      A: 1.08,
      B: 1.05,
      C: 1.02,
      D: 1.0,
      E: 0.97,
      F: 0.93,
      G: 0.88,
    };
    estimatedPrice *= energyMultipliers[data.energy_class] || 1.0;

    return Math.round(estimatedPrice);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      apartment: 'Appartement',
      house: 'Maison',
      studio: 'Studio',
      loft: 'Loft',
      duplex: 'Duplex',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Calcul de votre estimation...</p>
        </div>
      </div>
    );
  }

  if (!valuation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Estimation introuvable</p>
          <button
            onClick={() => navigate('/estimation')}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Nouvelle estimation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SideMenu />
      
      <div className="pt-20 pb-16 px-6">
        <div className="max-w-[1000px] mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <i className="ri-check-line text-4xl text-green-600"></i>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Votre estimation est prête !
            </h1>
            <p className="text-lg text-gray-600">
              Voici l'estimation de votre bien immobilier
            </p>
          </div>

          {/* Résultat principal */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-8 md:p-12 mb-8 text-white">
            <div className="text-center">
              <p className="text-lg mb-2 opacity-90">Estimation de votre bien</p>
              <div className="text-5xl md:text-6xl font-bold mb-6">
                {formatPrice(valuation.estimated_price || 0)}
              </div>
              <div className="flex items-center justify-center space-x-4 text-base">
                <div className="flex items-center space-x-2">
                  <span className="opacity-90">Fourchette :</span>
                  <span className="font-semibold">{formatPrice(valuation.min_price || 0)}</span>
                </div>
                <span className="opacity-60">-</span>
                <div>
                  <span className="font-semibold">{formatPrice(valuation.max_price || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Détails du bien */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Détails du bien estimé</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ri-home-4-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type de bien</p>
                  <p className="text-base font-semibold text-gray-900">
                    {getPropertyTypeLabel(valuation.property_type)}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ri-map-pin-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Localisation</p>
                  <p className="text-base font-semibold text-gray-900">
                    {valuation.city} ({valuation.postal_code})
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ri-ruler-line text-xl text-blue-600"></i>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Surface</p>
                  <p className="text-base font-semibold text-gray-900">{valuation.surface} m²</p>
                </div>
              </div>
              {valuation.rooms > 0 && (
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="ri-layout-grid-line text-xl text-blue-600"></i>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nombre de pièces</p>
                    <p className="text-base font-semibold text-gray-900">{valuation.rooms} pièces</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prix du marché local */}
          {priceData && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Prix du marché à {valuation.city}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">Prix moyen au m²</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(priceData.average_price_per_sqm)}
                  </p>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">Prix minimum</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(priceData.min_price_per_sqm)}
                  </p>
                </div>
                <div className="text-center p-6 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-2">Prix maximum</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(priceData.max_price_per_sqm)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Que souhaitez-vous faire maintenant ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/deposer-annonce')}
                className="px-6 py-4 bg-blue-600 text-white text-base font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-add-line mr-2"></i>
                Publier une annonce
              </button>
              <button
                onClick={() => navigate('/estimation')}
                className="px-6 py-4 bg-white text-blue-600 text-base font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-2"></i>
                Nouvelle estimation
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
