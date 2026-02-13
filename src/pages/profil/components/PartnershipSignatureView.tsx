import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';

interface PartnershipSignatureViewProps {
  userEmail: string;
  userName: string;
  percentage: number;
  durationMonths: number;
  onComplete: () => void;
  onCancel: () => void;
}

const DEFAULT_OBLIGATIONS = `
• Promouvoir la plateforme de manière loyale et conforme à ses valeurs.
• Ne pas utiliser de pratiques trompeuses ou de publicité mensongère pour recruter des affiliés.
• Fournir des informations exactes sur les services de la plateforme aux personnes que vous invitez.
• Respecter la confidentialité des données personnelles et ne pas les partager sans consentement.
• Informer les personnes invitées qu'elles seront affiliées via votre code et qu'elles génèreront des revenus pour vous.
• Respecter les conditions générales d'utilisation de la plateforme.
• La plateforme se réserve le droit de modifier les conditions du programme d'affiliation avec préavis.
`.trim();

export default function PartnershipSignatureView({
  userEmail,
  userName,
  percentage,
  durationMonths,
  onComplete,
  onCancel,
}: PartnershipSignatureViewProps) {
  const { sendEmail } = useEmail();
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendCode = async () => {
    if (!userEmail) {
      setError('Impossible de récupérer votre adresse email.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const code = generateVerificationCode();
      const expirationTime = Date.now() + 15 * 60 * 1000;
      localStorage.setItem('partnership_signature_code', JSON.stringify({
        code,
        expiresAt: expirationTime,
      }));

      const emailResult = await sendEmail('code_signature', {
        tenantEmail: userEmail,
        tenantName: userName,
        propertyTitle: 'Contrat de partenariat d\'affiliation',
        verificationCode: code,
      });

      if (emailResult.success) {
        setCodeSent(true);
        alert('Code de vérification envoyé par email !');
      } else {
        setError(`Erreur lors de l'envoi de l'email: ${emailResult.error || 'Erreur inconnue'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Une erreur est survenue: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    try {
      const storedData = localStorage.getItem('partnership_signature_code');
      if (!storedData) {
        setError('Code expiré ou invalide. Veuillez demander un nouveau code.');
        return;
      }

      const { code, expiresAt } = JSON.parse(storedData);
      if (Date.now() > expiresAt) {
        localStorage.removeItem('partnership_signature_code');
        setError('Code expiré. Veuillez demander un nouveau code.');
        return;
      }

      if (verificationCode === code) {
        localStorage.removeItem('partnership_signature_code');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Session expirée. Veuillez vous reconnecter.');
          return;
        }

        const { error: insertError } = await supabase
          .from('partnership_contracts')
          .upsert({
            user_id: user.id,
            percentage,
            duration_months: durationMonths,
            obligations: DEFAULT_OBLIGATIONS,
            signed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (insertError) throw insertError;
        onComplete();
      } else {
        setError('Code incorrect. Veuillez réessayer.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la vérification';
      setError(msg);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm md:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <i className="ri-arrow-left-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
        Annuler
      </button>

      <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          <i className="ri-file-contract-line mr-2 text-teal-600"></i>
          Contrat de partenariat d'affiliation
        </h1>

        <div className="bg-gray-50 rounded-lg md:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 max-h-80 sm:max-h-96 overflow-y-auto">
          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-bold text-lg text-gray-900">CONTRAT DE PARTENARIAT D'AFFILIATION</p>
            <p>Entre la plateforme Mestoits et le partenaire (ci-après « le Partenaire »).</p>

            <div>
              <p className="font-bold text-gray-900 mb-2">Article 1 - Objet</p>
              <p>Le Partenaire s'engage à promouvoir la plateforme Mestoits auprès de ses contacts et à bénéficier, en contrepartie, d'une commission sur les revenus générés par les utilisateurs qu'il aura affiliés.</p>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-2">Article 2 - Pourcentage et durée</p>
              <p>
                <strong>Pourcentage de commission :</strong> {percentage} % des revenus (abonnements + commissions) générés par chaque affilié.<br />
                <strong>Durée d'éligibilité :</strong> {durationMonths} mois à compter de l'inscription de chaque affilié.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-2">Article 3 - Obligations du Partenaire</p>
              <pre className="whitespace-pre-wrap font-sans text-gray-700">{DEFAULT_OBLIGATIONS}</pre>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-2">Article 4 - Revenus et versements</p>
              <p>Les commissions sont créditées sur le portefeuille du Partenaire et peuvent être retirées selon les modalités définies sur la plateforme.</p>
            </div>

            <div className="pt-4 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                Fait le {new Date().toLocaleDateString('fr-FR')}<br />
                En signant électroniquement, le Partenaire accepte l'intégralité des termes ci-dessus.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg md:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-blue-900">
            <i className="ri-information-line mr-2"></i>
            Pour signer ce contrat, saisissez le code de vérification envoyé à <strong>{userEmail}</strong>.
          </p>
        </div>

        {!codeSent ? (
          <button
            onClick={handleSendCode}
            disabled={sending || !userEmail}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <i className="ri-loader-4-line animate-spin inline-block mr-2"></i>
                Envoi en cours...
              </>
            ) : (
              <>
                Recevoir le code de vérification par email
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Code de vérification</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none text-center text-xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSendCode}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Renvoyer le code
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Signer le contrat
              </button>
            </div>
            <p className="text-xs text-gray-600 text-center">Le code est valide pendant 15 minutes</p>
          </div>
        )}
      </div>
    </div>
  );
}
