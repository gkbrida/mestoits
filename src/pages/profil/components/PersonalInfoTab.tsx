import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
export default function PersonalInfoTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    birthDate: '',
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [filteredCities, setFilteredCities] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadUserData();
    loadCities();
  }, []);

  // Mettre à jour searchCity quand formData.city change
  useEffect(() => {
    setSearchCity(formData.city || '');
  }, [formData.city]);

  // Filtrer les villes selon la recherche en temps réel et afficher les 5 premiers résultats
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

  // Fermer le dropdown si on clique en dehors
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
      setCities(uniqueCities);
    } catch (error) {
      console.error('Erreur lors du chargement des communes:', error);
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/connexion');
        return;
      }

      setUserId(user.id);

      // Charger les données depuis la table users
      const { data: userData, error: fetchError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      if (userData) {
        // Séparer le nom complet en prénom et nom
        const nameParts = (userData.full_name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setFormData({
          firstName,
          lastName,
          email: userData.email || user.email || '',
          phone: userData.phone || '',
          address: userData.company_address || '',
          city: userData.city || '',
          birthDate: '',
        });

        setAvatarUrl(userData.avatar_url || '');
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setShowSuccess(false);

    try {
      if (!userId) {
        throw new Error('Utilisateur non connecté');
      }

      const { error: updateError } = await supabase
        .from('users_2025_12_01_11_29')
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          company_address: formData.address,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Mettre à jour aussi l'email dans auth.users si nécessaire
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email !== formData.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        if (emailError) {
          console.error('Erreur mise à jour email:', emailError);
        }
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err.message || 'Une erreur est survenue lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId) return;

    try {
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-avatar-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('professional-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('professional-assets')
        .getPublicUrl(filePath);

      // Mettre à jour l'URL de l'avatar dans la base
      const { error: updateError } = await supabase
        .from('users_2025_12_01_11_29')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      console.error('Erreur upload avatar:', err);
      setError('Erreur lors du téléchargement de la photo');
    }
  };

  const getInitials = () => {
    const first = formData.firstName?.[0] || '';
    const last = formData.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 sm:py-20">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl sm:text-5xl text-orange-600 animate-spin"></i>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Profile Picture */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
              {getInitials()}
            </div>
          )}
          <label className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 bg-gray-900 rounded-full flex items-center justify-center text-white hover:bg-gray-800 transition-all cursor-pointer">
            <i className="ri-camera-line text-xs sm:text-sm w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Photo de profil</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">JPG, PNG ou GIF. Max 5MB.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 sm:gap-3">
          <i className="ri-error-warning-line text-red-600 text-lg sm:text-xl flex-shrink-0 mt-0.5"></i>
          <p className="text-xs sm:text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Prénom
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Nom
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="sm:col-span-1">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
              Ville/Commune
            </label>
            <div className="relative city-search-container">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center z-10"></i>
              <input
                type="text"
                placeholder="Rechercher une ville..."
                value={searchCity}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchCity(value);
                  const cityExists = cities.some(city => 
                    city && city.toLowerCase().trim() === value.toLowerCase().trim()
                  );
                  if (value.trim() === '' || cityExists || filteredCities.some(c => c.toLowerCase() === value.toLowerCase())) {
                    setFormData({ ...formData, city: value });
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && !cities.some(city => city && city.toLowerCase().trim() === value.toLowerCase().trim())) {
                    setSearchCity('');
                    setFormData({ ...formData, city: '' });
                    setShowDropdown(false);
                  }
                }}
                onFocus={() => {
                  if (filteredCities.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
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
                        setFormData({ ...formData, city: city });
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-orange-50 active:bg-orange-100 transition-colors flex items-center gap-2 border-b border-gray-100 last:border-b-0 cursor-pointer focus:outline-none focus:bg-orange-50"
                    >
                      <i className="ri-map-pin-line text-orange-600 w-4 h-4 flex items-center justify-center flex-shrink-0"></i>
                      <span className="text-sm text-gray-900 flex-1">{city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
            Adresse
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        

        <div className="mb-6 sm:mb-8">
          <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2">
            Date de naissance
          </label>
          <input
            type="date"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleChange}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 sm:gap-3">
            <i className="ri-check-circle-fill text-green-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            <span className="text-xs sm:text-sm font-medium text-green-800">
              Vos informations ont été mises à jour avec succès
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            type="button"
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gray-900 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <i className="ri-loader-4-line animate-spin w-4 h-4 flex items-center justify-center"></i>
                <span className="hidden sm:inline">Enregistrement...</span>
                <span className="sm:hidden">Enregistrement</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Enregistrer les modifications</span>
                <span className="sm:hidden">Enregistrer</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
