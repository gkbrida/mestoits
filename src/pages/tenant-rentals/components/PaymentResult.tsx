import { useEffect, useState } from 'react';

interface PaymentResultProps {
  status: 'success' | 'cancelled';
  onClose: () => void;
}

export default function PaymentResult({ status, onClose }: PaymentResultProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    console.log('🎯 PaymentResult monté avec status:', status);
    console.log('🔗 URL actuelle:', window.location.href);
    
    // Compte à rebours
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Utiliser window.location pour forcer le rechargement complet de la page
          const redirectUrl = window.location.origin + '/mes-locations';
          console.log('🔄 Redirection vers:', redirectUrl);
          window.location.href = redirectUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const isSuccess = status === 'success';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center">
        {/* Icône */}
        <div className={`flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto mb-4 sm:mb-6 ${
          isSuccess ? 'bg-green-100' : 'bg-orange-100'
        }`}>
          {isSuccess ? (
            <i className="ri-check-line text-green-600 text-4xl sm:text-5xl"></i>
          ) : (
            <i className="ri-close-circle-line text-orange-600 text-4xl sm:text-5xl"></i>
          )}
        </div>

        {/* Titre */}
        <h2 className={`text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 ${
          isSuccess ? 'text-green-600' : 'text-orange-600'
        }`}>
          {isSuccess ? 'Paiement réussi !' : 'Paiement annulé'}
        </h2>

        {/* Message */}
        <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
          {isSuccess ? (
            <>
              Votre paiement a été effectué avec succès.<br />
              Votre quittance vous sera envoyée par email.
            </>
          ) : (
            <>
              Le paiement a été annulé.<br />
              Vous pouvez réessayer à tout moment.
            </>
          )}
        </p>

        {/* Compte à rebours */}
        <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">Redirection automatique dans</p>
          <p className="text-2xl sm:text-3xl font-bold text-teal-600">{countdown}s</p>
        </div>

        {/* Bouton pour rediriger immédiatement */}
        <button
          onClick={() => {
            const redirectUrl = window.location.origin + '/mes-locations';
            console.log('🔄 Redirection manuelle vers:', redirectUrl);
            window.location.href = redirectUrl;
          }}
          className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-lg md:rounded-xl text-sm sm:text-base font-semibold hover:shadow-lg transition-all cursor-pointer"
        >
          Retour à mes locations
        </button>
      </div>
    </div>
  );
}

