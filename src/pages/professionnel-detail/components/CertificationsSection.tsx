
interface CertificationsSectionProps {
  siret: string;
  professionalCard: string;
  professionalDocuments?: any;
}

export default function CertificationsSection({ siret, professionalCard, professionalDocuments }: CertificationsSectionProps) {
  const getDocumentStatus = (docType: string) => {
    if (!professionalDocuments) return null;
    const doc = professionalDocuments[docType];
    if (!doc) return null;
    return doc.status || 'pending';
  };

  const getStatusDisplay = (status: string | null) => {
    if (!status) return null;
    switch (status) {
      case 'verified':
        return { text: 'Vérifié', color: 'text-green-600', icon: 'ri-checkbox-circle-fill' };
      case 'pending':
        return { text: 'En attente', color: 'text-yellow-600', icon: 'ri-time-line' };
      case 'rejected':
        return { text: 'Rejeté', color: 'text-red-600', icon: 'ri-close-circle-fill' };
      default:
        return null;
    }
  };
  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
        <i className="ri-shield-check-line mr-1.5 sm:mr-2 text-teal-600 text-lg sm:text-xl md:text-2xl"></i>
        Certifications et agréments
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* SIRET */}
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 bg-gray-50 rounded-lg md:rounded-xl">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
            <i className="ri-building-line text-lg sm:text-xl text-teal-600"></i>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Numéro du régistre de commerce</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">Numéro d'identification de l'entreprise</p>
            <p className="text-xs sm:text-sm font-mono text-gray-900 font-medium break-all">{siret}</p>
          </div>
        </div>

        {/* Professional Card */}
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 bg-gray-50 rounded-lg md:rounded-xl">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
            <i className="ri-bank-card-line text-lg sm:text-xl text-teal-600"></i>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Carte professionnelle</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">Carte T délivrée par la CCI</p>
            <p className="text-xs sm:text-sm font-mono text-gray-900 font-medium break-all">{professionalCard}</p>
          </div>
        </div>

        {/* Insurance */}
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 bg-gray-50 rounded-lg md:rounded-xl">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
            <i className="ri-shield-check-line text-lg sm:text-xl text-teal-600"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Assurance RC Pro</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">Attestation d'assurance responsabilité civile professionnelle</p>
            {(() => {
              const status = getDocumentStatus('insurance_certificate');
              const statusDisplay = getStatusDisplay(status);
              if (statusDisplay && status === 'verified') {
                return (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <i className={`${statusDisplay.icon} ${statusDisplay.color} text-sm sm:text-base`}></i>
                    <span className={`${statusDisplay.color} text-xs sm:text-sm font-medium`}>{statusDisplay.text}</span>
                  </div>
                );
              }
              if (statusDisplay) {
                return (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <i className={`${statusDisplay.icon} ${statusDisplay.color} text-sm sm:text-base`}></i>
                    <span className={`${statusDisplay.color} text-xs sm:text-sm font-medium`}>{statusDisplay.text}</span>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <i className="ri-close-circle-fill text-gray-400 text-sm sm:text-base"></i>
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">Non téléchargé</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Professional Identity */}
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-6 bg-gray-50 rounded-lg md:rounded-xl">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-teal-100 rounded-lg md:rounded-xl flex-shrink-0">
            <i className="ri-user-id-line text-lg sm:text-xl text-teal-600"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">Identité du professionnel</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">Pièce d'identité du représentant légal</p>
            {(() => {
              const status = getDocumentStatus('id_card');
              const statusDisplay = getStatusDisplay(status);
              if (statusDisplay && status === 'verified') {
                return (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <i className={`${statusDisplay.icon} ${statusDisplay.color} text-sm sm:text-base`}></i>
                    <span className={`${statusDisplay.color} text-xs sm:text-sm font-medium`}>{statusDisplay.text}</span>
                  </div>
                );
              }
              if (statusDisplay) {
                return (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <i className={`${statusDisplay.icon} ${statusDisplay.color} text-sm sm:text-base`}></i>
                    <span className={`${statusDisplay.color} text-xs sm:text-sm font-medium`}>{statusDisplay.text}</span>
                  </div>
                );
              }
              return (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <i className="ri-close-circle-fill text-gray-400 text-sm sm:text-base"></i>
                  <span className="text-xs sm:text-sm text-gray-500 font-medium">Non téléchargé</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

     
    </div>
  );
}
