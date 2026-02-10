import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useEmail } from '../../../hooks/useEmail';

interface SignatureViewProps {
  rental: any;
  onBack: () => void;
  onComplete: () => void;
}

export default function SignatureView({ rental, onBack, onComplete }: SignatureViewProps) {
  const { sendEmail } = useEmail();
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [leaseDetails, setLeaseDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tenantEmail, setTenantEmail] = useState<string>('');

  // Charger les détails complets du bail depuis Supabase
  useEffect(() => {
    loadLeaseDetails();
  }, [rental.id]);

  const loadLeaseDetails = async () => {
    try {
      setLoading(true);
      
      // Charger les détails du bail
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select('*')
        .eq('id', rental.id)
        .single();

      if (leaseError) throw leaseError;

      if (!leaseData) {
        setLoading(false);
        return;
      }

      // Charger la propriété séparément depuis properties_02
      let propertyData = null;
      if (leaseData.property_02_id) {
        const { data: propData, error: propError } = await supabase
          .from('properties_02')
          .select('*')
          .eq('id', leaseData.property_02_id)
          .maybeSingle();

        if (propError) {
          console.error('Erreur lors du chargement de la propriété:', propError);
        } else if (propData) {
          propertyData = propData;
        } else {
          console.warn('Propriété non trouvée pour property_02_id:', leaseData.property_02_id);
        }
      }

      // Charger les informations du locataire séparément
      let tenantData = null;
      if (leaseData.tenant_id) {
        const { data: tenantInfo, error: tenantError } = await supabase
          .from('tenants')
          .select('id, email, first_name, last_name')
          .eq('id', leaseData.tenant_id)
          .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter l'erreur si aucune ligne

        if (tenantError) {
          console.error('Erreur lors du chargement du locataire:', tenantError);
        } else if (tenantInfo) {
          tenantData = tenantInfo;
        } else {
          console.warn('Locataire non trouvé pour tenant_id:', leaseData.tenant_id);
        }
      }

      // Fusionner les données
      setLeaseDetails({
        ...leaseData,
        properties: propertyData,
        tenants: tenantData
      });
      
      setTenantEmail(tenantData?.email || '');
    } catch (error) {
      console.error('Erreur lors du chargement des détails du bail:', error);
    } finally {
      setLoading(false);
    }
  };

  // Générer un code de vérification à 6 chiffres
  const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendCode = async () => {
    if (!tenantEmail) {
      setError('Impossible de récupérer votre adresse email. Veuillez réessayer.');
      return;
    }

    setSending(true);
    setError('');

    try {
      // Générer un nouveau code
      const code = generateVerificationCode();
      
      // Stocker le code dans localStorage avec expiration (15 minutes)
      const expirationTime = Date.now() + 15 * 60 * 1000; // 15 minutes
      localStorage.setItem(`signature_code_${rental.id}`, JSON.stringify({
        code,
        expiresAt: expirationTime
      }));

      // Récupérer les informations du locataire
      const tenantName = leaseDetails?.tenants 
        ? `${leaseDetails.tenants.first_name} ${leaseDetails.tenants.last_name}`
        : 'Locataire';
      
      const propertyTitle = leaseDetails?.properties?.title || rental.property_title || 'Bien immobilier';

      // Envoyer l'email avec le code
      const emailResult = await sendEmail('code_signature', {
        tenantEmail,
        tenantName,
        propertyTitle,
        verificationCode: code,
      });

      if (emailResult.success) {
        setCodeSent(true);
        alert('Code de vérification envoyé par email !');
      } else {
        setError(`Erreur lors de l'envoi de l'email: ${emailResult.error || 'Erreur inconnue'}`);
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'envoi du code:', err);
      setError(`Une erreur est survenue: ${err.message || 'Erreur inconnue'}`);
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
      // Récupérer le code stocké
      const storedData = localStorage.getItem(`signature_code_${rental.id}`);
      
      if (!storedData) {
        setError('Code expiré ou invalide. Veuillez demander un nouveau code.');
        return;
      }

      const { code, expiresAt } = JSON.parse(storedData);

      // Vérifier l'expiration
      if (Date.now() > expiresAt) {
        localStorage.removeItem(`signature_code_${rental.id}`);
        setError('Code expiré. Veuillez demander un nouveau code.');
        return;
      }

      // Vérifier le code
      if (verificationCode === code) {
        // Code correct, supprimer le code stocké
        localStorage.removeItem(`signature_code_${rental.id}`);
        
        // Envoyer un email au propriétaire pour l'informer de la signature
        try {
          // Récupérer les informations du propriétaire
          if (leaseDetails?.owner_id) {
            const { data: ownerData, error: ownerError } = await supabase
              .from('users_2025_12_01_11_29')
              .select('email, full_name')
              .eq('id', leaseDetails.owner_id)
              .maybeSingle();

            if (!ownerError && ownerData && ownerData.email) {
              const tenantName = leaseDetails?.tenants 
                ? `${leaseDetails.tenants.first_name} ${leaseDetails.tenants.last_name}`
                : 'Locataire';
              
              const propertyTitle = leaseDetails?.properties?.title || rental.property_title || 'Bien immobilier';
              const propertyAddress = leaseDetails?.properties?.address || '';
              const propertyCity = leaseDetails?.properties?.city || '';
              const monthlyRent = leaseDetails?.monthly_rent || rental.rent || 0;
              const startDate = leaseDetails?.start_date || rental.start_date || '';
              const endDate = leaseDetails?.end_date || rental.end_date || '';
              const signedDate = new Date().toISOString();

              const emailResult = await sendEmail('contrat_signe', {
                ownerEmail: ownerData.email,
                ownerName: ownerData.full_name || 'Propriétaire',
                tenantName,
                propertyTitle,
                propertyAddress,
                propertyCity,
                monthlyRent,
                startDate,
                endDate,
                signedDate,
                appUrl: window.location.origin,
              });

              if (!emailResult.success) {
                console.error('Erreur lors de l\'envoi de l\'email au propriétaire:', emailResult.error);
              }
            }
          }
        } catch (emailError) {
          console.error('Erreur lors de l\'envoi de l\'email au propriétaire:', emailError);
          // Ne pas bloquer la signature si l'email échoue
        }
        
        // Procéder à la signature
        onComplete();
      } else {
        setError('Code incorrect. Veuillez réessayer.');
      }
    } catch (err) {
      console.error('Erreur lors de la vérification du code:', err);
      setError('Une erreur est survenue lors de la vérification du code.');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm md:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <i className="ri-arrow-left-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
        Retour à mes locations
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <div className="flex items-start gap-3 sm:gap-4 md:gap-6">
          <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-orange-100 rounded-xl md:rounded-2xl flex-shrink-0">
            <i className="ri-file-text-line text-2xl sm:text-3xl text-orange-600"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Signature du bail</h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-3 sm:mb-4 break-words">{rental.property}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 md:gap-6 text-xs sm:text-sm text-gray-600">
              <span className="flex items-center gap-1.5 sm:gap-2">
                <i className="ri-map-pin-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0"></i>
                <span className="break-words">{rental.address}</span>
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <i className="ri-calendar-line w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0"></i>
                <span className="break-words">Du {rental.start_date ? new Date(rental.start_date).toLocaleDateString('fr-FR') : 'N/A'} au {rental.end_date ? new Date(rental.end_date).toLocaleDateString('fr-FR') : 'N/A'}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Preview */}
      <div className="bg-white rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Contrat de location</h2>
        
        <div className="bg-gray-50 rounded-lg md:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 max-h-80 sm:max-h-96 overflow-y-auto">
          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-bold text-lg text-gray-900">CONTRAT DE LOCATION</p>
            
            <div>
              <p className="font-bold text-gray-900 mb-2">Article 1 - Objet du contrat</p>
              <p>Le présent contrat a pour objet la location du bien suivant :</p>
              <p className="ml-4 mt-2">
                <strong>Adresse :</strong> {rental.address}<br />
                <strong>Type :</strong> {rental.type}<br />
                <strong>Surface :</strong> {rental.surface}
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-2">Article 2 - Durée du bail</p>
              <p>Le bail est conclu pour une durée déterminée :</p>
              <p className="ml-4 mt-2">
                <strong>Date de début :</strong> {rental.start_date ? new Date(rental.start_date).toLocaleDateString('fr-FR') : 'N/A'}<br />
                <strong>Date de fin :</strong> {rental.end_date ? new Date(rental.end_date).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-2">Article 3 - Loyer</p>
              <p>Le loyer mensuel est fixé à <strong>{rental.rent}</strong>, charges comprises.</p>
              <p className="mt-2">Le loyer est payable le 5 de chaque mois par virement bancaire.</p>
            </div>

            <div>
              <p className="font-bold text-gray-900 mb-2">Article 4 - Dépôt de garantie</p>
              <p>Un dépôt de garantie d'un montant de <strong>{rental.security_deposit ? `${rental.security_deposit.toLocaleString('fr-FR')} FCFA` : 'non spécifié'}</strong> est versé à la signature du présent contrat.</p>
            </div>

            {leaseDetails?.article5 && (
              <div>
                <p className="font-bold text-gray-900 mb-2">Article 5</p>
                <p>{leaseDetails.article5}</p>
              </div>
            )}

            {leaseDetails?.article6 && (
              <div>
                <p className="font-bold text-gray-900 mb-2">Article 6</p>
                <p>{leaseDetails.article6}</p>
              </div>
            )}

            {leaseDetails?.article7 && (
              <div>
                <p className="font-bold text-gray-900 mb-2">Article 7</p>
                <p>{leaseDetails.article7}</p>
              </div>
            )}

            {leaseDetails?.article8 && (
              <div>
                <p className="font-bold text-gray-900 mb-2">Article 8</p>
                <p>{leaseDetails.article8}</p>
              </div>
            )}

            {leaseDetails?.article9 && (
              <div>
                <p className="font-bold text-gray-900 mb-2">Article 9</p>
                <p>{leaseDetails.article9}</p>
              </div>
            )}

            {leaseDetails?.article10 && (
              <div>
                <p className="font-bold text-gray-900 mb-2">Article 10</p>
                <p>{leaseDetails.article10}</p>
              </div>
            )}

            {leaseDetails?.additional_notes && (
              <div className="pt-4 border-t border-gray-300">
                <p className="font-bold text-gray-900 mb-2">Notes additionnelles</p>
                <p>{leaseDetails.additional_notes}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                Fait en deux exemplaires originaux<br />
                À Abidjan, le {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg md:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex gap-2 sm:gap-3">
            <i className="ri-information-line text-blue-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0 mt-0.5"></i>
            <p className="text-xs sm:text-sm text-blue-900">
              Pour signer ce contrat électroniquement, vous devez confirmer votre identité en saisissant le code de vérification qui vous sera envoyé par email.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6 sm:py-8">
            <i className="ri-loader-4-line text-3xl sm:text-4xl text-teal-600 animate-spin"></i>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600">Chargement du contrat...</p>
          </div>
        ) : !codeSent ? (
          <button
            onClick={handleSendCode}
            disabled={sending || !tenantEmail}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <i className="ri-loader-4-line animate-spin inline-block mr-2 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="hidden sm:inline">Envoi en cours...</span>
                <span className="sm:hidden">Envoi...</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Recevoir le code de vérification par email</span>
                <span className="sm:hidden">Recevoir le code</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Code de vérification
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  setError('');
                }}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg md:rounded-xl focus:border-teal-500 focus:outline-none transition-colors text-center text-xl sm:text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              {error && (
                <p className="text-xs sm:text-sm text-red-600 mt-1 sm:mt-2">{error}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleSendCode}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-200 text-gray-700 rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                Renvoyer le code
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Signer le contrat
              </button>
            </div>

            <p className="text-[10px] sm:text-xs text-gray-600 text-center">
              Le code est valide pendant 15 minutes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
