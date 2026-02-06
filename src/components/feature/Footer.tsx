import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Veuillez entrer une adresse email valide' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Vérifier si l'email existe déjà
      const { data: existing } = await supabase
        .from('newsletter_subscriptions')
        .select('id, is_active')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (existing) {
        if (existing.is_active) {
          setMessage({ type: 'error', text: 'Cet email est déjà abonné à la newsletter' });
        } else {
          // Réactiver l'abonnement
          const { error: updateError } = await supabase
            .from('newsletter_subscriptions')
            .update({ 
              is_active: true,
              subscribed_at: new Date().toISOString(),
              unsubscribed_at: null
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          setMessage({ type: 'success', text: 'Merci ! Votre abonnement a été réactivé.' });
          setEmail('');
        }
      } else {
        // Créer un nouvel abonnement
        const { error: insertError } = await supabase
          .from('newsletter_subscriptions')
          .insert({
            email: email.toLowerCase().trim(),
            source: 'footer',
            is_active: true
          });

        if (insertError) throw insertError;
        setMessage({ type: 'success', text: 'Merci ! Vous êtes maintenant abonné à la newsletter.' });
        setEmail('');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'abonnement:', error);
      if (error.code === '23505') {
        // Violation de contrainte UNIQUE
        setMessage({ type: 'error', text: 'Cet email est déjà abonné à la newsletter' });
      } else {
        setMessage({ type: 'error', text: 'Une erreur est survenue. Veuillez réessayer.' });
      }
    } finally {
      setLoading(false);
      // Effacer le message après 5 secondes
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <footer>
      {/* Main Footer Content */}
      <div className="bg-[#0F172A] py-10 md:py-16 lg:py-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 lg:gap-12">
            {/* Newsletter Column - Full width on mobile, double width on tablet */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <img 
                  src="/logo.png" 
                  alt="Mestoits" 
                  className="w-10 h-10 md:w-12 md:h-12"
                />
                <span className="text-white text-2xl md:text-3xl font-bold">Mestoits</span>
              </div>
              <h3 className="text-white text-xl md:text-2xl lg:text-3xl font-light mb-3 md:mb-4">Restez Informé</h3>
              <p className="text-gray-400 text-xs md:text-sm mb-6 md:mb-8 leading-relaxed">
                Recevez les dernières actualités immobilières, les nouvelles annonces et les conseils d'experts directement dans votre boîte mail.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    required
                    disabled={loading}
                    className="flex-1 bg-transparent border-b border-white/30 text-white placeholder-gray-500 py-2 md:py-3 px-2 text-sm md:text-base focus:outline-none focus:border-white transition-colors disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-white text-gray-900 rounded-full text-sm md:text-base font-medium hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="ri-loader-4-line animate-spin"></i>
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <i className="ri-mail-send-line"></i>
                        <span>S'abonner</span>
                      </>
                    )}
                  </button>
                </div>
                {message && (
                  <div className={`text-xs md:text-sm ${
                    message.type === 'success' 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {message.text}
                  </div>
                )}
              </form>
            </div>

            {/* Navigation Column */}
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Navigation</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    Accueil
                  </a>
                </li>
                <li>
                  <a href="/recherche-biens" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    Rechercher
                  </a>
                </li>
                <li>
                  <a href="/deposer-annonce" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    Déposer une annonce
                  </a>
                </li>
                <li>
                  <a href="/professionnels" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    Professionnels
                  </a>
                </li>
                <li>
                  <a href="/a-propos" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    À propos
                  </a>
                </li>
                <li>
                  <a href="/aide" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    Aide
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Légal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/mentions-legales" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    Mentions légales
                  </a>
                </li>
                <li>
                  <a href="/confidentialite" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    Politique de confidentialité
                  </a>
                </li>
                <li>
                  <a href="/cgu" className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm md:text-base">
                    CGU
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Social Bar */}
      <div className="bg-[#020617] py-4 md:py-5">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            {/* Social Icons */}
            <div className="flex items-center gap-3 md:gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 border border-gray-600 rounded-full text-gray-400 hover:bg-white hover:text-gray-900 transition-all cursor-pointer"
                aria-label="Facebook"
              >
                <i className="ri-facebook-fill text-base md:text-lg"></i>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 border border-gray-600 rounded-full text-gray-400 hover:bg-white hover:text-gray-900 transition-all cursor-pointer"
                aria-label="Instagram"
              >
                <i className="ri-instagram-line text-base md:text-lg"></i>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 border border-gray-600 rounded-full text-gray-400 hover:bg-white hover:text-gray-900 transition-all cursor-pointer"
                aria-label="LinkedIn"
              >
                <i className="ri-linkedin-fill text-base md:text-lg"></i>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 border border-gray-600 rounded-full text-gray-400 hover:bg-white hover:text-gray-900 transition-all cursor-pointer"
                aria-label="Twitter"
              >
                <i className="ri-twitter-x-line text-base md:text-lg"></i>
              </a>
            </div>

            {/* Copyright */}
            <div className="text-gray-500 text-xs md:text-sm text-center md:text-left">
              © 2025 Mestoits. Tous droits réservés.
            </div>

            {/* Legal Links */}
            <div className="flex items-center gap-3 md:gap-4 text-gray-500 text-xs md:text-sm">
              <a href="/confidentialite" className="hover:text-white hover:underline transition-colors cursor-pointer">
                Confidentialité
              </a>
              <span className="hidden md:inline">|</span>
              <a href="/cgu" className="hover:text-white hover:underline transition-colors cursor-pointer">
                CGU
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
