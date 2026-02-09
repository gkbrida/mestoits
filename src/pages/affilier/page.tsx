import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function AffilierRedirectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Rediriger vers la page d'inscription avec le code d'affiliation dans l'URL
      navigate(`/inscription?affiliation=${code}`);
    } else {
      // Si pas de code, rediriger vers l'inscription normale
      navigate('/inscription');
    }
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <i className="ri-loader-4-line text-4xl sm:text-5xl text-orange-600 animate-spin"></i>
        <p className="mt-4 text-sm sm:text-base text-gray-600">Redirection...</p>
      </div>
    </div>
  );
}
