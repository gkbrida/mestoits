
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import { supabase } from '../../lib/supabase';
interface FormData {
  propertyType: string;
  address: string;
  city: string;
  postalCode: string;
  surface: string;
  rooms: string;
  bedrooms: string;
  floor: string;
  totalFloors: string;
  constructionYear: string;
  condition: string;
  heating: string;
  parking: string;
  balcony: boolean;
  terrace: boolean;
  garden: boolean;
  elevator: boolean;
  cellar: boolean;
  energyClass: string;
}

export default function EstimationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    propertyType: 'apartment',
    address: '',
    city: '',
    postalCode: '',
    surface: '',
    rooms: '',
    bedrooms: '',
    floor: '',
    totalFloors: '',
    constructionYear: '',
    condition: 'good',
    heating: 'individual',
    parking: 'none',
    balcony: false,
    terrace: false,
    garden: false,
    elevator: false,
    cellar: false,
    energyClass: 'D',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.address || !formData.city || !formData.postalCode || !formData.surface) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      // Enregistrer l'estimation dans la base de données
      const { data, error: insertError } = await supabase
        .from('valuations_2025_12_01_11_29')
        .insert([{
          property_type: formData.propertyType,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          surface: parseFloat(formData.surface),
          rooms: parseInt(formData.rooms) || null,
          bedrooms: parseInt(formData.bedrooms) || null,
          floor: formData.floor ? parseInt(formData.floor) : null,
          total_floors: formData.totalFloors ? parseInt(formData.totalFloors) : null,
          construction_year: formData.constructionYear ? parseInt(formData.constructionYear) : null,
          condition: formData.condition,
          heating: formData.heating,
          parking: formData.parking,
          has_balcony: formData.balcony,
          has_terrace: formData.terrace,
          has_garden: formData.garden,
          has_elevator: formData.elevator,
          has_cellar: formData.cellar,
          energy_class: formData.energyClass,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Rediriger vers la page de résultats
      navigate(`/estimation/resultat/${data.id}`);
    } catch (err: any) {
      console.error('Erreur estimation:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'estimation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <div className="pt-16 md:pt-20 pb-12 md:pb-16 px-4 sm:px-6">
        <div className="max-w-[900px] mx-auto">
          {/* Message de développement en cours */}
          <div className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 rounded-xl md:rounded-2xl shadow-xl p-6 sm:p-8 md:p-12 mb-6 sm:mb-8 border-2 border-teal-200">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-teal-500 to-blue-600 rounded-full mb-4 sm:mb-5 md:mb-6 shadow-lg">
                <i className="ri-tools-line text-3xl sm:text-4xl md:text-5xl text-white w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center"></i>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                Estimateur en cours de réalisation
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-4 sm:mb-5 md:mb-6 max-w-2xl mx-auto px-2">
                Nous travaillons actuellement sur un outil d'estimation intelligent qui vous permettra d'obtenir une évaluation précise de votre bien immobilier en quelques minutes.
              </p>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-7 md:mb-8">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm">
                  <i className="ri-ai-generate text-teal-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">IA avancée</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm">
                  <i className="ri-database-2-line text-blue-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Données du marché</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm">
                  <i className="ri-speed-up-line text-purple-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Estimation rapide</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm">
                  <i className="ri-money-dollar-circle-line text-green-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">100% gratuit</span>
                </div>
              </div>
              <div className="bg-white/90 backdrop-blur-sm rounded-lg md:rounded-xl p-4 sm:p-5 md:p-6 shadow-md border border-teal-100">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <i className="ri-notification-3-line text-teal-600 text-xl sm:text-2xl w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center"></i>
                    </div>
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2">
                      Soyez informé en premier !
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                      Inscrivez-vous pour être notifié dès que l'estimateur sera disponible. Vous serez parmi les premiers à pouvoir l'utiliser gratuitement.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/inscription')}
                      className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
                    >
                      <i className="ri-user-add-line text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                      Créer un compte
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form - Masqué pour le moment */}
          <form onSubmit={handleSubmit} className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 opacity-50 pointer-events-none hidden">
            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
                {error}
              </div>
            )}

            {/* Type de bien */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Type de bien</h2>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                required
              >
                <option value="apartment">Appartement</option>
                <option value="house">Maison</option>
                <option value="studio">Studio</option>
                <option value="loft">Loft</option>
                <option value="duplex">Duplex</option>
              </select>
            </div>

            {/* Localisation */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Localisation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="12 rue de la République"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Ville *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Cocody"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Code postal *
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="75001"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Caractéristiques principales */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Caractéristiques principales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Surface (m²) *
                  </label>
                  <input
                    type="number"
                    name="surface"
                    value={formData.surface}
                    onChange={handleChange}
                    placeholder="75"
                    min="1"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Nombre de pièces
                  </label>
                  <input
                    type="number"
                    name="rooms"
                    value={formData.rooms}
                    onChange={handleChange}
                    placeholder="3"
                    min="1"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Chambres
                  </label>
                  <input
                    type="number"
                    name="bedrooms"
                    value={formData.bedrooms}
                    onChange={handleChange}
                    placeholder="2"
                    min="0"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Étage
                  </label>
                  <input
                    type="number"
                    name="floor"
                    value={formData.floor}
                    onChange={handleChange}
                    placeholder="3"
                    min="0"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Nombre d'étages
                  </label>
                  <input
                    type="number"
                    name="totalFloors"
                    value={formData.totalFloors}
                    onChange={handleChange}
                    placeholder="5"
                    min="1"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Détails du bien */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Détails du bien</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Année de construction
                  </label>
                  <input
                    type="number"
                    name="constructionYear"
                    value={formData.constructionYear}
                    onChange={handleChange}
                    placeholder="2010"
                    min="1800"
                    max={new Date().getFullYear()}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    État du bien
                  </label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="new">Neuf</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Bon</option>
                    <option value="average">Moyen</option>
                    <option value="to_renovate">À rénover</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Chauffage
                  </label>
                  <select
                    name="heating"
                    value={formData.heating}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="individual">Individuel</option>
                    <option value="collective">Collectif</option>
                    <option value="electric">Électrique</option>
                    <option value="gas">Gaz</option>
                    <option value="fuel">Fioul</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Parking
                  </label>
                  <select
                    name="parking"
                    value={formData.parking}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="none">Aucun</option>
                    <option value="street">Rue</option>
                    <option value="garage">Garage</option>
                    <option value="covered">Couvert</option>
                    <option value="box">Box</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Classe énergétique
                  </label>
                  <select
                    name="energyClass"
                    value={formData.energyClass}
                    onChange={handleChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                    <option value="G">G</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Équipements */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Équipements</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="balcony"
                    checked={formData.balcony}
                    onChange={handleChange}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Balcon</span>
                </label>
                <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="terrace"
                    checked={formData.terrace}
                    onChange={handleChange}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Terrasse</span>
                </label>
                <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="garden"
                    checked={formData.garden}
                    onChange={handleChange}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Jardin</span>
                </label>
                <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="elevator"
                    checked={formData.elevator}
                    onChange={handleChange}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Ascenseur</span>
                </label>
                <label className="flex items-center space-x-2 sm:space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="cellar"
                    checked={formData.cellar}
                    onChange={handleChange}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Cave</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4 sm:pt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap w-full sm:w-auto"
              >
                {loading ? 'Estimation en cours...' : 'Obtenir mon estimation gratuite'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
