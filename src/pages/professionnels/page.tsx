import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import SearchFilters from './components/SearchFilters';
import ProfessionalCard from './components/ProfessionalCard';
interface Professional {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  photo_url: string | null; // Photo de couverture
  avatar_url: string | null; // Photo de profil
  company_name: string;
  profession_type: string | null;
  siret: string;
  professional_card: string;
  company_address: string;
  city: string;
  specialties: string[];
  is_verified: boolean;
  rating: number;
  reviews_count: number;
  description: string;
}

export default function ProfessionalsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    initializeProfessionals();
  }, []);

  useEffect(() => {
    filterProfessionals();
  }, [selectedCity, selectedType, searchQuery, professionals]);

  const initializeProfessionals = async () => {
    try {
      setLoading(true);
      
      // Vérifier s'il existe déjà des professionnels
      const { data: existingPros, error: fetchError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name, email, phone, photo_url, avatar_url, company_name, profession_type, siret, professional_card, company_address, city, specialties, is_verified, rating, reviews_count, description')
        .eq('user_type', 'professional');

      if (fetchError) throw fetchError;

      // Si aucun professionnel n'existe, créer les professionnels fictifs
      if (!existingPros || existingPros.length === 0) {
        const mockProfessionals = [
          {
            user_type: 'professional',
            full_name: 'Sophie Martin',
            email: 'sophie.martin@immoexpert-paris.fr',
            phone: '01 42 56 78 90',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20business%20woman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20confident%20smile%20professional%20attire%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof1&orientation=squarish',
            company_name: 'ImmoExpert Paris',
            profession_type: 'Agent immobilier',
            siret: '123 456 789 00012',
            professional_card: 'CPI 7501 2023 000 123 456',
            company_address: '45 Avenue des Champs-Élysées',
            city: 'Paris',
            specialties: ['Agent immobilier', 'Expert en estimation', 'Conseil en investissement'],
            is_verified: true,
            rating: 4.8,
            reviews_count: 127,
            description: 'Forte de 15 ans d\'expérience dans l\'immobilier parisien, je vous accompagne dans tous vos projets immobiliers avec professionnalisme et expertise. Spécialisée dans les biens de prestige et l\'investissement locatif, je mets mon réseau et mes compétences à votre service pour concrétiser vos ambitions immobilières.',
          },
          {
            user_type: 'professional',
            full_name: 'Thomas Dubois',
            email: 'thomas.dubois@gestionloc-lyon.fr',
            phone: '04 78 92 34 56',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20businessman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20confident%20expression%20business%20suit%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof2&orientation=squarish',
            company_name: 'GestionLoc Lyon',
            profession_type: 'Gestionnaire locatif',
            siret: '234 567 890 00023',
            professional_card: 'CPI 6901 2022 000 234 567',
            company_address: '12 Rue de la République',
            city: 'Lyon',
            specialties: ['Gestionnaire locatif', 'Syndic de copropriété', 'Administration de biens'],
            is_verified: true,
            rating: 4.9,
            reviews_count: 203,
            description: 'Expert en gestion locative depuis 12 ans, je propose une gestion complète et personnalisée de vos biens immobiliers. Mon équipe et moi assurons la tranquillité de nos propriétaires grâce à un suivi rigoureux et une disponibilité permanente. Spécialiste de la gestion de copropriété et de l\'administration de biens.',
          },
          {
            user_type: 'professional',
            full_name: 'Marie Lefebvre',
            email: 'marie.lefebvre@investimmo-bordeaux.fr',
            phone: '05 56 78 90 12',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20business%20woman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20warm%20smile%20elegant%20professional%20attire%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof3&orientation=squarish',
            company_name: 'InvestImmo Bordeaux',
            profession_type: 'Conseiller en investissement',
            siret: '345 678 901 00034',
            professional_card: 'CPI 3301 2021 000 345 678',
            company_address: '78 Cours de l\'Intendance',
            city: 'Bordeaux',
            specialties: ['Conseiller en investissement', 'Défiscalisation', 'Patrimoine immobilier'],
            is_verified: true,
            rating: 4.7,
            reviews_count: 156,
            description: 'Conseillère en investissement immobilier certifiée, je vous aide à optimiser votre patrimoine et à construire votre avenir financier. Spécialisée dans les dispositifs de défiscalisation (Pinel, Malraux, LMNP), je vous propose des solutions sur-mesure adaptées à vos objectifs et à votre situation.',
          },
          {
            user_type: 'professional',
            full_name: 'Pierre Rousseau',
            email: 'pierre.rousseau@diagnostimmo-marseille.fr',
            phone: '04 91 23 45 67',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20businessman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20friendly%20smile%20business%20casual%20attire%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof4&orientation=squarish',
            company_name: 'DiagnostImmo Marseille',
            profession_type: 'Diagnostiqueur immobilier',
            siret: '456 789 012 00045',
            professional_card: 'CPI 1301 2020 000 456 789',
            company_address: '23 La Canebière',
            city: 'Marseille',
            specialties: ['Diagnostiqueur immobilier', 'DPE', 'Amiante et plomb'],
            is_verified: true,
            rating: 4.9,
            reviews_count: 289,
            description: 'Diagnostiqueur immobilier certifié avec plus de 10 ans d\'expérience, j\'interviens rapidement pour tous vos diagnostics obligatoires. DPE, amiante, plomb, électricité, gaz... Je vous garantis des rapports précis et conformes à la réglementation, avec des délais d\'intervention courts et des tarifs compétitifs.',
          },
          {
            user_type: 'professional',
            full_name: 'Julie Bernard',
            email: 'julie.bernard@immoconseil-toulouse.fr',
            phone: '05 61 34 56 78',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20business%20woman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20confident%20professional%20smile%20elegant%20business%20attire%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof5&orientation=squarish',
            company_name: 'ImmoConseil Toulouse',
            profession_type: 'Agent immobilier',
            siret: '567 890 123 00056',
            professional_card: 'CPI 3101 2023 000 567 890',
            company_address: '56 Rue Alsace Lorraine',
            city: 'Toulouse',
            specialties: ['Agent immobilier', 'Transaction', 'Négociation'],
            is_verified: true,
            rating: 4.6,
            reviews_count: 94,
            description: 'Agent immobilier passionnée, je vous accompagne dans vos projets d\'achat et de vente avec écoute et professionnalisme. Ma connaissance approfondie du marché toulousain et mes compétences en négociation vous garantissent les meilleures conditions pour vos transactions immobilières.',
          },
          {
            user_type: 'professional',
            full_name: 'Alexandre Petit',
            email: 'alexandre.petit@syndicpro-nice.fr',
            phone: '04 93 45 67 89',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20businessman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20professional%20expression%20business%20suit%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof6&orientation=squarish',
            company_name: 'Syndic Pro Nice',
            profession_type: 'Syndic de copropriété',
            siret: '678 901 234 00067',
            professional_card: 'CPI 0601 2022 000 678 901',
            company_address: '34 Promenade des Anglais',
            city: 'Nice',
            specialties: ['Syndic de copropriété', 'Gestion de copropriété', 'Conseil syndical'],
            is_verified: true,
            rating: 4.8,
            reviews_count: 178,
            description: 'Syndic professionnel depuis 18 ans, je gère vos copropriétés avec rigueur et transparence. Mon équipe et moi assurons une gestion optimale de votre immeuble : entretien, travaux, comptabilité, assemblées générales. Nous privilégions le dialogue et la proximité avec les copropriétaires.',
          },
          {
            user_type: 'professional',
            full_name: 'Camille Moreau',
            email: 'camille.moreau@estimation-expert-nantes.fr',
            phone: '02 40 56 78 90',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20business%20woman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20warm%20professional%20smile%20business%20attire%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof7&orientation=squarish',
            company_name: 'Estimation Expert Nantes',
            profession_type: 'Expert en estimation',
            siret: '789 012 345 00078',
            professional_card: 'CPI 4401 2021 000 789 012',
            company_address: '89 Rue Crébillon',
            city: 'Nantes',
            specialties: ['Expert en estimation', 'Évaluation immobilière', 'Expertise judiciaire'],
            is_verified: true,
            rating: 4.9,
            reviews_count: 167,
            description: 'Experte en estimation immobilière certifiée, j\'interviens pour tous types de biens et toutes situations : vente, succession, divorce, expertise judiciaire. Mon analyse précise du marché et ma méthodologie rigoureuse vous garantissent une évaluation juste et argumentée de votre patrimoine immobilier.',
          },
          {
            user_type: 'professional',
            full_name: 'Lucas Girard',
            email: 'lucas.girard@immobilier-strasbourg.fr',
            phone: '03 88 67 89 01',
            photo_url: 'https://readdy.ai/api/search-image?query=professional%20businessman%20portrait%20in%20modern%20office%20with%20clean%20white%20background%20friendly%20confident%20smile%20business%20casual%20attire%20natural%20lighting%20high%20quality%20corporate%20headshot%20photography&width=400&height=400&seq=prof8&orientation=squarish',
            company_name: 'Immobilier Strasbourg',
            profession_type: 'Agent immobilier',
            siret: '890 123 456 00089',
            professional_card: 'CPI 6701 2023 000 890 123',
            company_address: '12 Place Kléber',
            city: 'Strasbourg',
            specialties: ['Agent immobilier', 'Immobilier neuf', 'Programmes neufs'],
            is_verified: true,
            rating: 4.7,
            reviews_count: 112,
            description: 'Agent immobilier spécialisé dans l\'immobilier neuf, je vous propose les meilleurs programmes de la région strasbourgeoise. Mon expertise des dispositifs de défiscalisation et ma connaissance du marché local vous permettent d\'investir en toute sérénité dans des biens de qualité.',
          },
        ];

        // Insérer les professionnels fictifs dans la base de données
        const { error: insertError } = await supabase
          .from('users_2025_12_01_11_29')
          .insert(mockProfessionals);

        if (insertError) {
          console.error('Erreur lors de la création des professionnels:', insertError);
        }

        // Recharger les professionnels après insertion
        const { data: newPros } = await supabase
          .from('users_2025_12_01_11_29')
          .select('*')
          .eq('user_type', 'professional');

        setProfessionals(newPros || []);
      } else {
        setProfessionals(existingPros);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des professionnels:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProfessionals = () => {
    let filtered = [...professionals];

    if (selectedCity) {
      filtered = filtered.filter(prof => 
        prof.city?.toLowerCase().includes(selectedCity.toLowerCase())
      );
    }

    if (selectedType) {
      filtered = filtered.filter(prof => 
        prof.profession_type === selectedType
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(prof => 
        prof.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prof.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProfessionals(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="pt-16 md:pt-24 pb-12 md:pb-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8 md:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4">
              Trouvez votre <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Professionnel</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Découvrez des professionnels de l'immobilier certifiés et vérifiés près de chez vous
            </p>
          </div>

          {/* Search Filters */}
          <SearchFilters
            selectedCity={selectedCity}
            selectedType={selectedType}
            searchQuery={searchQuery}
            onCityChange={setSelectedCity}
            onTypeChange={setSelectedType}
            onSearchChange={setSearchQuery}
          />

          {/* Results Count */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <p className="text-xs sm:text-sm md:text-base text-gray-600">
              <span className="font-semibold text-gray-900">{filteredProfessionals.length}</span> professionnel{filteredProfessionals.length > 1 ? 's' : ''} trouvé{filteredProfessionals.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Professionals Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12 sm:py-16 md:py-20">
              <div className="flex flex-col items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm sm:text-base text-gray-600">Chargement des professionnels...</p>
              </div>
            </div>
          ) : filteredProfessionals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20 px-4 bg-white rounded-xl md:rounded-2xl">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-gray-100 rounded-full mb-4 sm:mb-6">
                <i className="ri-search-line text-3xl sm:text-4xl text-gray-400"></i>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1 sm:mb-2">Aucun professionnel trouvé</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 text-center">Essayez de modifier vos critères de recherche</p>
              <button
                onClick={() => {
                  setSelectedCity('');
                  setSelectedType('');
                  setSearchQuery('');
                }}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-teal-600 text-white text-sm sm:text-base font-medium rounded-full hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredProfessionals.map((professional) => (
                <ProfessionalCard key={professional.id} professional={professional} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
