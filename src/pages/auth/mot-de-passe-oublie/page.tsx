
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
export default function MotDePasseOubliePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
      });

      if (resetError) throw resetError;

      setShowSuccess(true);
    } catch (err: any) {
      console.error('Erreur réinitialisation:', err);
      setError(err?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-[500px] w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="ri-mail-check-line text-green-600 text-4xl w-10 h-10 flex items-center justify-center"></i>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Email envoyé
          </h2>
          <p className="text-base text-gray-600 mb-8">
            Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>. 
            Cliquez sur le lien pour créer un nouveau mot de passe.
          </p>
          <Link
            to="/connexion"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-base font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Mot de passe oublié</h2>
          <p className="text-base text-gray-600">
            Entrez votre email pour réinitialiser votre mot de passe
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="nom@example.com"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <i className="ri-error-warning-line text-red-600 text-xl w-5 h-5 flex items-center justify-center"></i>
                <span className="text-sm font-medium text-red-800">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 bg-gray-900 text-white text-base font-semibold rounded-lg hover:bg-gray-800 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                  Envoi...
                </span>
              ) : (
                'Envoyer le lien'
              )}
            </button>

            {/* Back Link */}
            <Link
              to="/connexion"
              className="block text-center text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Retour à la connexion
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
