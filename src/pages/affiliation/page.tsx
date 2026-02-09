import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';

interface AffiliatedUser {
  id: string;
  full_name: string;
  created_at: string;
}

export default function AffiliationPage() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [affiliationCode, setAffiliationCode] = useState<string>('');
  const [affiliationLink, setAffiliationLink] = useState<string>('');
  const [affiliatedUsers, setAffiliatedUsers] = useState<AffiliatedUser[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (affiliationCode) {
      loadAffiliatedUsers();
    }
  }, [affiliationCode]);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/connexion');
        return;
      }

      // Charger le code d'affiliation de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users_2025_12_01_11_29')
        .select('affiliation_code')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Erreur lors du chargement du code d\'affiliation:', userError);
        throw userError;
      }

      if (userData?.affiliation_code) {
        setAffiliationCode(userData.affiliation_code);
        setAffiliationLink(`${window.location.origin}/affilier/${userData.affiliation_code}`);
      } else {
        // Si pas de code, en générer un (normalement fait par le trigger, mais au cas où)
        const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { error: updateError } = await supabase
          .from('users_2025_12_01_11_29')
          .update({ affiliation_code: randomCode })
          .eq('id', user.id);

        if (updateError) {
          console.error('Erreur lors de la génération du code:', updateError);
        } else {
          // Recharger le code
          const { data: updatedData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('affiliation_code')
            .eq('id', user.id)
            .single();

          if (updatedData?.affiliation_code) {
            setAffiliationCode(updatedData.affiliation_code);
            setAffiliationLink(`${window.location.origin}/affilier/${updatedData.affiliation_code}`);
          }
        }
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      navigate('/connexion');
    } finally {
      setLoading(false);
    }
  };

  const loadAffiliatedUsers = async () => {
    setLoadingAffiliates(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users_2025_12_01_11_29')
        .select('id, full_name, created_at')
        .eq('affiliated_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des affiliés:', error);
        return;
      }

      setAffiliatedUsers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des affiliés:', error);
    } finally {
      setLoadingAffiliates(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl sm:text-5xl text-orange-600 animate-spin"></i>
          <p className="mt-4 text-sm sm:text-base text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="pt-16 md:pt-24 pb-12 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Programme d'affiliation
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Partagez votre code d'affiliation et gagnez des avantages
            </p>
          </div>

          {/* Code d'affiliation */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              <i className="ri-gift-line mr-2"></i>
              Votre code d'affiliation
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Code</p>
                <p className="text-2xl font-bold text-gray-900 font-mono">{affiliationCode}</p>
              </div>
              <button
                onClick={() => copyToClipboard(affiliationCode, 'code')}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {copied === 'code' ? (
                  <>
                    <i className="ri-check-line"></i>
                    Copié !
                  </>
                ) : (
                  <>
                    <i className="ri-file-copy-line"></i>
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Lien d'affiliation */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              <i className="ri-link mr-2"></i>
              Votre lien d'affiliation
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 overflow-hidden">
                <p className="text-sm text-gray-600 mb-1">Lien</p>
                <p className="text-sm text-gray-900 break-all">{affiliationLink}</p>
              </div>
              <button
                onClick={() => copyToClipboard(affiliationLink, 'link')}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {copied === 'link' ? (
                  <>
                    <i className="ri-check-line"></i>
                    Copié !
                  </>
                ) : (
                  <>
                    <i className="ri-file-copy-line"></i>
                    Copier
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Partagez ce lien avec vos contacts. Lorsqu'ils s'inscrivent via ce lien, ils seront automatiquement affiliés à votre compte.
            </p>
          </div>

          {/* Liste des personnes affiliées */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              <i className="ri-group-line mr-2"></i>
              Personnes que vous avez affiliées
            </h2>
            
            {loadingAffiliates ? (
              <div className="text-center py-8">
                <i className="ri-loader-4-line text-3xl text-teal-600 animate-spin"></i>
                <p className="mt-4 text-sm text-gray-600">Chargement...</p>
              </div>
            ) : affiliatedUsers.length === 0 ? (
              <div className="text-center py-8">
                <i className="ri-user-add-line text-4xl text-gray-400 mb-4"></i>
                <p className="text-gray-600">Aucune personne affiliée pour le moment</p>
                <p className="text-sm text-gray-500 mt-2">
                  Partagez votre code ou votre lien d'affiliation pour commencer
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {affiliatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <i className="ri-user-line text-teal-600"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.full_name || 'Utilisateur'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
