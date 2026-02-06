interface CostsDetailsProps {
  agencyFees?: number;
  securityDeposit?: number;
  advanceRent?: number;
  serviceCharges?: number;
  advanceMonths?: number;
  depositMonths?: number;
  price?: number;
}

export default function CostsDetails({
  agencyFees,
  securityDeposit,
  advanceRent,
  serviceCharges,
  advanceMonths,
  depositMonths,
  price,
}: CostsDetailsProps) {
  // Calculer les montants si on a les mois et le prix
  const calculatedAdvance = advanceMonths && price ? advanceMonths * price : advanceRent;
  const calculatedDeposit = depositMonths && price ? depositMonths * price : securityDeposit;

  const costs = [
    {
      label: 'Frais d\'agence',
      value: agencyFees,
      icon: 'ri-briefcase-line',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: depositMonths ? `Dépôt de garantie (${depositMonths} mois)` : 'Dépôt de garantie',
      value: calculatedDeposit,
      icon: 'ri-shield-check-line',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      label: advanceMonths ? `Avance sur loyer (${advanceMonths} mois)` : 'Avance sur loyer',
      value: calculatedAdvance,
      icon: 'ri-calendar-check-line',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Charges',
      value: serviceCharges,
      icon: 'ri-file-list-line',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ].filter((cost) => cost.value !== undefined && cost.value !== null && cost.value > 0);

  if (costs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Détails des frais</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {costs.map((cost, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg md:rounded-xl hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 ${cost.bgColor} rounded-lg flex-shrink-0`}>
                <i className={`${cost.icon} text-lg sm:text-xl ${cost.color} w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center`}></i>
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-700 truncate">{cost.label}</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-gray-900 flex-shrink-0 ml-2">
              {cost.value?.toLocaleString()} FCFA
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold text-gray-900">Total des frais</span>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            {costs.reduce((sum, cost) => sum + (cost.value || 0), 0).toLocaleString()} FCFA
          </span>
        </div>
      </div>
    </div>
  );
}
