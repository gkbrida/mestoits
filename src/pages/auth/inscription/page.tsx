import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
export default function InscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    siret: '',
    professionalCard: '',
    companyAddress: '',
    city: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Empêcher les doubles soumissions
    if (loading) return;
    
    setError('');
    setLoading(true);

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (formData.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      if (isProfessional && (!formData.companyName || !formData.siret)) {
        throw new Error('Veuillez remplir tous les champs obligatoires pour les professionnels');
      }

      // Vérifier si l'email existe déjà dans la table users_2025_12_01_11_29
      const { data: existingProfile } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, email')
        .eq('email', formData.email.toLowerCase().trim())
        .maybeSingle();

      if (existingProfile) {
        throw new Error('Cet email est déjà associé à un compte. Veuillez vous connecter ou utiliser un autre email.');
      }

      // Créer l'utilisateur avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm`,
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
          }
        }
      });

      if (authError) {
        // Gérer les erreurs spécifiques de Supabase pour les emails déjà enregistrés
        const errorMessage = authError.message?.toLowerCase() || '';
        if (errorMessage.includes('already registered') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('user already registered') ||
            errorMessage.includes('email already') ||
            authError.status === 422) {
          throw new Error('Cet email est déjà associé à un compte. Veuillez vous connecter ou utiliser un autre email.');
        }
        throw authError;
      }

      if (authData.user) {
        // Créer ou mettre à jour le profil utilisateur (upsert)
        // Cela évite les erreurs de clé dupliquée si l'utilisateur existe déjà
        const { error: profileError } = await supabase
          .from('users_2025_12_01_11_29')
          .upsert({
            id: authData.user.id,
            email: formData.email,
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            user_type: isProfessional ? 'professional' : 'individual',
            company_name: isProfessional ? formData.companyName : null,
            siret: isProfessional ? formData.siret : null,
            professional_card: isProfessional ? formData.professionalCard : null,
            company_address: isProfessional ? formData.companyAddress : null,
            city: isProfessional ? formData.city : null,
            is_verified: false,
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          // Si l'erreur persiste, on la log mais on continue car l'utilisateur est créé dans auth.users
          console.error('Erreur lors de la création du profil:', profileError);
          // On ne bloque pas l'inscription car l'utilisateur est déjà créé dans auth.users
        }

        setShowSuccess(true);
      }
    } catch (err: any) {
      console.error('Erreur inscription:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-[500px] w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-mail-check-line text-3xl text-teal-600"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Vérifiez votre email
          </h2>
          <p className="text-gray-600 mb-8">
            Un email de confirmation a été envoyé à <strong>{formData.email}</strong>. 
            Veuillez cliquer sur le lien dans l'email pour activer votre compte.
          </p>
          <Link
            to="/connexion"
            className="inline-flex items-center justify-center px-6 py-3 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-[600px] w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Mestoits" 
              className="w-16 h-16"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer un compte</h1>
          <p className="text-gray-600">Rejoignez notre plateforme immobilière</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <i className="ri-error-warning-line text-red-600 text-xl flex-shrink-0 mt-0.5"></i>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="nom@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Téléphone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="06 12 34 56 78"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <i className={showPassword ? 'ri-eye-off-line text-xl' : 'ri-eye-line text-xl'}></i>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <i className={showConfirmPassword ? 'ri-eye-off-line text-xl' : 'ri-eye-line text-xl'}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Toggle Professionnel */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="isProfessional"
              checked={isProfessional}
              onChange={(e) => setIsProfessional(e.target.checked)}
              className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="isProfessional" className="text-sm font-medium text-gray-700 cursor-pointer">
              Je suis un professionnel de l'immobilier
            </label>
          </div>

          {/* Champs professionnels */}
          {isProfessional && (
            <div className="space-y-4 p-6 bg-teal-50 rounded-lg border border-teal-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informations professionnelles
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'entreprise *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required={isProfessional}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  placeholder="Agence Immobilière Dupont"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIRET *
                  </label>
                  <input
                    type="text"
                    name="siret"
                    value={formData.siret}
                    onChange={handleChange}
                    required={isProfessional}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                    placeholder="123 456 789 00012"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carte professionnelle
                  </label>
                  <input
                    type="text"
                    name="professionalCard"
                    value={formData.professionalCard}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                    placeholder="CPI 1234 5678 9012"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse de l'entreprise
                </label>
                <input
                  type="text"
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  placeholder="123 Rue de la République"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  placeholder="Paris"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-4 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="ri-loader-4-line animate-spin"></i>
                Création en cours...
              </span>
            ) : (
              'Créer mon compte'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous avez déjà un compte ?{' '}
            <Link to="/connexion" className="text-teal-600 font-medium hover:text-teal-700">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
