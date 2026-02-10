interface RentalCardProps {
  rental: any;
  onClick: () => void;
}

export default function RentalCard({ rental, onClick }: RentalCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl md:rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
    >
      {/* Image */}
      <div className="relative w-full h-40 sm:h-48 bg-gray-200">
        {rental.image ? (
          <img
            src={rental.image}
            alt={rental.property || rental.property_title || 'Bien immobilier'}
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              // En cas d'erreur de chargement, masquer l'image
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <i className="ri-image-line text-4xl text-gray-400"></i>
          </div>
        )}
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col gap-1.5 sm:gap-2 items-end">
          {/* Tag de statut principal */}
          {rental.status === 'terminated' ? (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 text-gray-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <i className="ri-close-circle-line inline-block mr-0.5 sm:mr-1 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              Clôturé
            </span>
          ) : rental.status === 'active' ? (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <i className="ri-checkbox-circle-line inline-block mr-0.5 sm:mr-1 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              Actif
            </span>
          ) : rental.status === 'pending_signature' || rental.is_pending_signature ? (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <i className="ri-time-line inline-block mr-0.5 sm:mr-1 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              <span className="hidden sm:inline">En attente de signature</span>
              <span className="sm:hidden">En attente</span>
            </span>
          ) : rental.signed ? (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <i className="ri-check-line inline-block mr-0.5 sm:mr-1 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              Bail signé
            </span>
          ) : (
            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] sm:text-xs font-semibold">
              <i className="ri-alert-line inline-block mr-0.5 sm:mr-1 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"></i>
              <span className="hidden sm:inline">En attente de signature</span>
              <span className="sm:hidden">En attente</span>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2 line-clamp-2">
          {rental.property_title || rental.property || 'Bien inconnu'}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 flex items-start gap-1.5 sm:gap-2">
          <i className="ri-map-pin-line text-sm sm:text-base mt-0.5 w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0"></i>
          <span className="line-clamp-2">{rental.address}</span>
        </p>

        <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Propriétaire</span>
            <span className="font-medium text-gray-900 truncate ml-2">{rental.landlord}</span>
          </div>
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-600">Loyer mensuel</span>
            <span className="text-lg sm:text-xl font-bold text-teal-600">{rental.rent}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
            <span className="text-gray-600">Période</span>
            <span className="font-medium text-gray-900 text-right">{rental.startDate} - {rental.endDate}</span>
          </div>
        </div>

        {/* Status */}
        {!rental.signed ? (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg md:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <i className="ri-alert-line text-orange-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-orange-900">Action requise</p>
                <p className="text-[10px] sm:text-xs text-orange-700">Vous devez signer le bail électroniquement</p>
              </div>
            </div>
          </div>
        ) : rental.unpaidRents && rental.unpaidRents.length > 0 ? (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg md:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <i className="ri-error-warning-line text-red-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-red-900">Loyer impayé</p>
                <p className="text-[10px] sm:text-xs text-red-700">{rental.unpaidRents.length} paiement(s) en attente</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg md:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <i className="ri-check-line text-green-600 text-lg sm:text-xl w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0"></i>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-green-900">Tout est à jour</p>
                <p className="text-[10px] sm:text-xs text-green-700">Aucun paiement en attente</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
