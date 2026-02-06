interface ContactInfoStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

export default function ContactInfoStep({ data, onUpdate }: ContactInfoStepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Informations de contact</h2>
        <p className="text-gray-600">
          Ces informations seront visibles par les personnes intéressées
        </p>
      </div>

      {/* Type d'annonceur */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Vous êtes <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onUpdate({ offered_by: 'individual' })}
            className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${
              data.offered_by === 'individual'
                ? 'border-teal-600 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <i className={`ri-user-line text-3xl mb-2 w-8 h-8 flex items-center justify-center mx-auto ${
              data.offered_by === 'individual' ? 'text-teal-600' : 'text-gray-400'
            }`}></i>
            <div className="text-center font-semibold text-gray-900">Particulier</div>
            <div className="text-center text-xs text-gray-500 mt-1">
              Propriétaire du bien
            </div>
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ offered_by: 'professional' })}
            className={`p-6 rounded-xl border-2 transition-all cursor-pointer ${
              data.offered_by === 'professional'
                ? 'border-teal-600 bg-teal-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <i className={`ri-briefcase-line text-3xl mb-2 w-8 h-8 flex items-center justify-center mx-auto ${
              data.offered_by === 'professional' ? 'text-teal-600' : 'text-gray-400'
            }`}></i>
            <div className="text-center font-semibold text-gray-900">Professionnel</div>
            <div className="text-center text-xs text-gray-500 mt-1">
              Agence ou promoteur
            </div>
          </button>
        </div>
      </div>

      {/* Informations de contact */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Nom complet {data.offered_by === 'professional' && '/ Nom de l\'entreprise'} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.contact_name}
            onChange={(e) => onUpdate({ contact_name: e.target.value })}
            placeholder={data.offered_by === 'professional' ? 'Ex: Agence Immobilière ABC' : 'Ex: Jean Dupont'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={data.contact_email}
              onChange={(e) => onUpdate({ contact_email: e.target.value })}
              placeholder="exemple@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={data.contact_phone}
              onChange={(e) => onUpdate({ contact_phone: e.target.value })}
              placeholder="+33 76 96 32 09 6"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Préférences de contact */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <i className="ri-information-line text-2xl text-blue-600 mt-1 w-6 h-6 flex items-center justify-center"></i>
          <div>
            <div className="font-semibold text-blue-900 mb-2">
              Comment serez-vous contacté ?
            </div>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Les personnes intéressées pourront vous envoyer un message via le formulaire de contact</li>
              <li>• Votre numéro de téléphone sera visible uniquement pour les utilisateurs connectés</li>
              <li>• Vous recevrez une notification par email pour chaque demande de contact</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Conseils */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <i className="ri-lightbulb-line text-2xl text-teal-600 mt-1 w-6 h-6 flex items-center justify-center"></i>
          <div>
            <div className="font-semibold text-teal-900 mb-2">
              Conseils pour maximiser vos chances
            </div>
            <ul className="text-sm text-teal-800 space-y-1">
              <li>• Répondez rapidement aux demandes de contact</li>
              <li>• Soyez disponible pour organiser des visites</li>
              <li>• Préparez tous les documents nécessaires à l'avance</li>
              <li>• Soyez transparent sur l'état du bien</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
