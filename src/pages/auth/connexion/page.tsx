
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function ConnexionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Vérifier si l'utilisateur est déjà connecté
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // L'utilisateur est déjà connecté, rediriger vers la page d'accueil
        navigate('/');
      }
    };

    checkSession();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Vérifier le statut is_active de l'utilisateur
        const { data: userData, error: userError } = await supabase
          .from('users_2025_12_01_11_29')
          .select('is_active')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          console.error('Erreur lors de la vérification du statut utilisateur:', userError);
          throw new Error('Erreur lors de la vérification de votre compte');
        }

        // Si le compte est désactivé, déconnecter et afficher un message
        if (userData && userData.is_active === false) {
          await supabase.auth.signOut();
          setError('Votre compte a été désactivé. Veuillez contacter l\'équipe mestoits.com pour plus d\'informations à contact@mestoits.com');
          return;
        }

        // Rediriger vers la page d'accueil
        navigate('/');
      }
    } catch (err: any) {
      console.error('Erreur connexion:', err);
      if (err.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email avant de vous connecter');
      } else {
        setError(err.message || 'Une erreur est survenue lors de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-[500px] w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Mestoits" 
              className="w-16 h-16"
            />
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
          <p className="text-base text-gray-600">
            Accédez à votre espace personnel
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="nom@example.com"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <i className="ri-error-warning-line text-red-600 text-xl w-5 h-5 flex items-center justify-center"></i>
                <span className="text-sm font-medium text-red-800">{error}</span>
              </div>
            )}

            {/* Forgot Password Link */}
            <div className="mb-6 text-right">
              <Link
                to="/mot-de-passe-oublie"
                className="text-sm text-teal-600 font-semibold hover:text-teal-700 cursor-pointer"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gray-900 text-white text-base font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous n'avez pas de compte ?{' '}
              <Link
                to="/inscription"
                className="text-teal-600 font-semibold hover:text-teal-700 cursor-pointer"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
