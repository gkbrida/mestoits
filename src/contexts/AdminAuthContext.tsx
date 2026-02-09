import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Admin {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface AdminAuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si une session admin existe dans sessionStorage
    const storedAdmin = sessionStorage.getItem('admin_session');
    if (storedAdmin) {
      try {
        const adminData = JSON.parse(storedAdmin);
        setAdmin(adminData);
      } catch (error) {
        console.error('Erreur lors de la lecture de la session admin:', error);
        sessionStorage.removeItem('admin_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // En développement, utiliser le proxy Vite (/api)
      // En production, utiliser VITE_EMAIL_API_URL ou /api par défaut
      const isDevelopment = import.meta.env.DEV;
      const apiUrl = isDevelopment 
        ? '/api' 
        : (import.meta.env.VITE_EMAIL_API_URL || '/api');
      
      console.log('🔐 Tentative de connexion admin:', { 
        email, 
        apiUrl: `${apiUrl}/admin/login`,
        isDevelopment,
        env: import.meta.env.VITE_EMAIL_API_URL
      });
      
      const response = await fetch(`${apiUrl}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Réponse API:', { status: response.status, ok: response.ok });

      // Vérifier si la réponse est du JSON valide
      let data;
      try {
        const text = await response.text();
        console.log('📄 Réponse brute:', text);
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Erreur de parsing JSON:', parseError);
        throw new Error('Réponse invalide du serveur. Vérifiez que l\'API admin est correctement configurée.');
      }

      console.log('📦 Données parsées:', data);

      if (!response.ok || !data.success) {
        const errorMessage = data.error || `Erreur ${response.status}: ${response.statusText}`;
        console.error('❌ Erreur de connexion:', errorMessage);
        throw new Error(errorMessage);
      }

      // Stocker la session admin
      sessionStorage.setItem('admin_session', JSON.stringify(data.admin));
      setAdmin(data.admin);
      console.log('✅ Connexion admin réussie');
    } catch (error: any) {
      console.error('❌ Erreur lors de la connexion admin:', error);
      
      // Messages d'erreur plus détaillés
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion internet et que l\'API est accessible.');
      }
      
      throw error;
    }
  };

  const logout = () => {
    sessionStorage.removeItem('admin_session');
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

