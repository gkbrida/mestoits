import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

export default function AdminIndexPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/admin/login', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Afficher un loader pendant la vérification
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
        <p className="mt-4 text-sm text-gray-600">Redirection...</p>
      </div>
    </div>
  );
}

