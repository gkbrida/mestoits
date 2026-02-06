import { usePropertyTypes } from '../../../hooks/usePropertyTypes';

interface PreviewStepProps {
  data: any;
}

export default function PreviewStep({ data }: PreviewStepProps) {
  const { getPropertyTypeLabel } = usePropertyTypes();

  const getFeatureLabel = (feature: string) => {
    const features: Record<string, string> = {
      // Résidentiels
      front_yard: 'Cour avant',
      back_yard: 'Cour arrière',
      garden: 'Jardin',
      dependency: 'Dépendance',
      pool: 'Piscine',
      playground: 'Aire de jeux',
      gym: 'Salle de sport',
      garage: 'Garage',
      air_conditioning: 'Climatisation',
      water_heater: 'Chauffe-eau',
      storage: 'Placards / Buanderie',
      elevator: 'Ascenseur',
      parking: 'Parking',
      generator: 'Groupe électrogène',
      water_tank: 'Citerne d\'eau',
      solar_panel: 'Panneau solaire',
      security: 'Sécurité',
      // Location courte durée
      has_sofa: 'Canapé',
      has_tv: 'Télévision',
      has_internet: 'Internet',
      equipped_kitchen: 'Cuisine équipée',
      has_washing_machine: 'Machine à laver',
      has_wifi: 'Wifi',
      has_netflix: 'Netflix',
      // Terrain
      approved_subdivision: 'Lotissement approuvé',
      electricity_viabilized: 'Viabilisé en électricité',
      water_viabilized: 'Viabilisé en eau',
      fenced: 'Terrain clôturé',
      flat_relief: 'Relief plat',
      // Commerce
      visible_facade: 'Façade visible',
      high_traffic_area: 'Zone passante',
      internal_wc: 'WC',
      terrace: 'Terrasse',
      customer_parking: 'Parking clients',
      office: 'Bureau',
      warehouse: 'Entrepôt',
      cold_room: 'Chambre froide',
      // Immeuble
      building_parking: 'Parking',
      building_generator: 'Groupe électrogène',
      // Bureau
      meeting_room: 'Salle de réunion',
      office_air_conditioning: 'Climatisation',
      fiber_internet: 'Fibre internet disponible',
      reception: 'Réception',
      office_parking: 'Parking',
      office_wc: 'WC',
      office_kitchen: 'Cuisine',
      // Parking
      covered_parking: 'Couvert',
      secure_access: 'Accès sécurisé',
    };
    return features[feature] || feature;
  };

  const getVillaTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'low-rise': 'Villa basse',
      'duplex': 'Duplex',
      'triplex': 'Triplex',
    };
    return types[type] || type;
  };

  const getDepositorStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      owner: 'Propriétaire direct',
      agent: 'Mandataire',
      developer: 'Promoteur',
    };
    return statuses[status] || status;
  };


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };



  const getPriceSuffix = () => {
    if (data.operation_type === 'rental') return 'mois';
    if (data.operation_type === 'short-term-rental') return 'nuit';
    return '';
  };

  const totalFees = (data.agency_fees || 0) + (data.security_deposit || 0) + 
                    (data.advance_rent || 0) + (data.service_charges || 0);


  const isCommercial = data.property_type === 'commercial';
  const isBuilding = data.property_type === 'building';


  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">Aperçu de votre annonce</h2>
        <p className="text-sm md:text-base text-gray-600">
          Vérifiez que toutes les informations sont correctes avant de publier
        </p>
      </div>

      {/* Aperçu visuel */}
      <div className="bg-white border-2 border-gray-200 rounded-xl md:rounded-2xl overflow-hidden">
        {/* Images */}
        {(data.images || []).length > 0 && (
          <div className="relative h-64 sm:h-80 bg-gray-100">
            <img
              src={data.images[0]}
              alt={data.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white px-2 sm:px-3 py-1 rounded md:rounded-lg text-xs sm:text-sm font-semibold">
              {(data.images || []).length} photo{(data.images || []).length > 1 ? 's' : ''}
              {data.video_url && ' + vidéo'}
            </div>
            
          </div>
        )}

        <div className="p-4 sm:p-6">
          {/* Prix */}
          <div className="flex items-baseline gap-2 mb-3 sm:mb-4">
            <div className="text-2xl sm:text-3xl font-bold text-teal-600">
              {formatPrice(data.price)} FCFA
            </div>
            {getPriceSuffix() && (
              <div className="text-sm sm:text-base text-gray-500">/{getPriceSuffix()}</div>
            )}
            {data.price_negotiable && (
              <div className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">Négociable</div>
            )}
          </div>

          {/* Titre */}
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2"> { getPropertyTypeLabel(data.property_type)} en {data.operation_type === 'sale' ? 'vente' : data.operation_type === 'rental' ? 'location' : 'location courte durée'}</h3>

          {/* Type de bien et type de villa */}
          <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
    
            {data.villa_type && (
              <div className="px-2 sm:px-3 py-1 bg-gray-100 rounded-md text-xs sm:text-sm font-semibold text-gray-700">
                {getVillaTypeLabel(data.villa_type)}
              </div>
            )}
            {data.standing && (
              <div className="px-2 sm:px-3 py-1 bg-gray-100 rounded-md text-xs sm:text-sm font-semibold text-gray-700">
                {data.standing === 'low' ? 'Bas standing' : data.standing === 'medium' ? 'Moyen standing' : data.standing === 'high' ? 'Haut standing' : 'Luxe'}
              </div>
            )}
            {/* État du bien - Pas pour location courte durée */}
            {data.condition && data.operation_type !== 'short-term-rental' && (
              <div className="px-2 sm:px-3 py-1 bg-gray-100 rounded-md text-xs sm:text-sm font-semibold text-gray-700">
                {data.condition === 'new' ? 'Neuf' : 
                 data.condition === 'excellent' ? 'Excellent état' : 
                 data.condition === 'good' ? 'Bon état' : 
                 data.condition === 'to-renovate' ? 'À rénover' : 
                 data.condition === 'unfinished' ? 'Inachevé' : data.condition}
              </div>
            )}
          </div>

          {/* Localisation */}
          <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
            <i className="ri-map-pin-line w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
            <span className="break-words">
              {data.address ? `${data.address}, ` : ''}{data.city}
              {data.postal_code && ` (${data.postal_code})`}
            </span>
          </div>

          {/* Caractéristiques principales */}
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Surface */}
            {data.surface_area && (
              <div className="flex items-center gap-2">
                <i className="ri-ruler-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.surface_area} m²</span>
              </div>
            )}
            {/* Surface par lot (terrains) */}
            {data.surface_per_lot && (
              <div className="flex items-center gap-2">
                <i className="ri-ruler-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">
                  {data.surface_per_lot} m²/lot
                  {data.available_lots && ` (${data.available_lots} lot${data.available_lots > 1 ? 's' : ''})`}
                </span>
              </div>
            )}
            {/* Pièces */}
            {data.rooms > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-home-4-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.rooms} pièce{data.rooms > 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Chambres */}
            {data.bedrooms > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-hotel-bed-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.bedrooms} chambre{data.bedrooms > 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Salles de bain */}
            {data.bathrooms > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-drop-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.bathrooms} salle{data.bathrooms > 1 ? 's' : ''} de bain</span>
              </div>
            )}
            {/* Capacité (location courte durée) */}
            {data.capacity > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-user-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.capacity} personne{data.capacity > 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Nombre d'étages (villa/maison) */}
            {data.floors > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-building-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.floors} étage{data.floors > 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Nombre d'étages (immeuble) */}
            {data.building_floors > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-building-2-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.building_floors} étage{data.building_floors > 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Nombre d'unités (immeuble) */}
            {data.total_units > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-home-3-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.total_units} unité{data.total_units > 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Nombre de pièces (bureau) */}
            {data.office_rooms > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-file-list-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.office_rooms} pièce{data.office_rooms > 1 ? 's' : ''}</span>
              </div>
            )}
            {/* Nombre de places (parking) */}
            {data.parking_spaces > 0 && (
              <div className="flex items-center gap-2">
                <i className="ri-parking-box-line text-gray-400 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"></i>
                <span className="text-sm sm:text-base text-gray-900 font-semibold">{data.parking_spaces} place{data.parking_spaces > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Informations spécifiques selon le type */}
          {isCommercial && data.commerce_type && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2">Type de commerce</h4>
              <p className="text-xs sm:text-sm text-gray-600">{data.commerce_type}</p>
            </div>
          )}

          {/* Situation juridique */}
          {(data.depositor_status || (data.land_titles && data.land_titles.length > 0)) && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Déposant</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                {data.depositor_status && (
                  <div className="flex items-center gap-2">
                    <span>{getDepositorStatusLabel(data.depositor_status)}</span>
                  </div>
                )}
                {data.land_titles && data.land_titles.length > 0 && (
                  <div>
                    <span className="text-gray-600">Document(s) foncier(s):</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {data.land_titles.map((title: string) => (
                        <span key={title} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Réseaux et accessibilité */}
          {/* Caractéristiques - Masquer certaines pour location courte durée */}
          {((data.operation_type !== 'short-term-rental' && (data.water_supply !== undefined || data.electricity !== undefined || data.personal_meter !== undefined)) || data.accessibility || data.in_gated_community !== undefined) && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Caractéristiques</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                {/* Eau courante - Pas pour location courte durée */}
                {data.water_supply !== undefined && data.operation_type !== 'short-term-rental' && (
                  <div className="flex items-center gap-2">
                    <i className={`ri-${data.water_supply ? 'check' : 'close'}-line text-${data.water_supply ? 'green' : 'red'}-600 w-4 h-4 flex items-center justify-center`}></i>
                    <span className="text-gray-600">Eau courante</span>
                  </div>
                )}
                {/* Électricité - Pas pour location courte durée */}
                {data.electricity !== undefined && data.operation_type !== 'short-term-rental' && (
                  <div className="flex items-center gap-2">
                    <i className={`ri-${data.electricity ? 'check' : 'close'}-line text-${data.electricity ? 'green' : 'red'}-600 w-4 h-4 flex items-center justify-center`}></i>
                    <span className="text-gray-600">Électricité</span>
                  </div>
                )}
                {/* Compteur personnel - Pas pour location courte durée */}
                {data.personal_meter !== undefined && data.operation_type !== 'short-term-rental' && (
                  <div className="flex items-center gap-2">
                    <i className={`ri-${data.personal_meter ? 'check' : 'close'}-line text-${data.personal_meter ? 'green' : 'red'}-600 w-4 h-4 flex items-center justify-center`}></i>
                    <span className="text-gray-600">Compteur personnel</span>
                  </div>
                )}
                {data.accessibility && (
                  <div className="flex items-center gap-2">
                    <i className="ri-road-map-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
                    <span className="text-gray-600">Accessibilité: {data.accessibility === 'paved' ? 'Route bitumée' : 'Voie non bitumée'}</span>
                  </div>
                )}
                {data.in_gated_community !== undefined && (
                  <div className="flex items-center gap-2">
                    <i className={`ri-${data.in_gated_community ? 'check' : 'close'}-line text-${data.in_gated_community ? 'green' : 'red'}-600 w-4 h-4 flex items-center justify-center`}></i>
                    <span className="text-gray-600">Situé dans une cité</span>
                  </div>
                )}
                {data.floor_number !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Numéro d'étage:</span>
                    <span className="font-semibold">{data.floor_number}</span>
                  </div>
                )}
                {data.kitchen_closed !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Cuisine fermée:</span>
                    <span className="font-semibold">{data.kitchen_closed ? 'Oui' : 'Non'}</span>
                  </div>
                )}
                {data.has_balcony !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Balcon:</span>
                    <span className="font-semibold">{data.has_balcony ? 'Oui' : 'Non'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        

          {/* Description */}
          <div className="mb-4 sm:mb-6">
            <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2">Description</h4>
            <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-line">{data.description || 'Aucune description'}</p>
          </div>

          {/* Équipements */}
          {(data.features || []).length > 0 && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Équipements</h4>
              <div className="flex flex-wrap gap-2">
                {(data.features || []).map((feature: string) => (
                  <div
                    key={feature}
                    className="px-2 sm:px-3 py-1 bg-gray-100 text-gray-700 rounded md:rounded-lg text-xs sm:text-sm"
                  >
                    {getFeatureLabel(feature)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Médias */}
          {(data.video_url || data.virtual_tour_url) && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Médias</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                {data.video_url && (
                  <div className="flex items-center gap-2">
                    <i className="ri-video-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
                    <span className="text-gray-600">Vidéo disponible</span>
                  </div>
                )}
                {data.virtual_tour_url && (
                  <div className="flex items-center gap-2">
                    <i className="ri-video-360-line text-gray-400 w-4 h-4 flex items-center justify-center"></i>
                    <a href={data.virtual_tour_url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                      Visite virtuelle 3D
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Frais additionnels */}
          {data.operation_type === 'rental' && totalFees > 0 && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Frais additionnels</h4>
              <div className="space-y-2 text-xs sm:text-sm">
                {data.advance_months > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avance ({data.advance_months} mois)</span>
                    <span className="font-semibold">{formatPrice(data.price * data.advance_months)} FCFA</span>
                  </div>
                )}
                {data.deposit_months > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Caution ({data.deposit_months} mois)</span>
                    <span className="font-semibold">{formatPrice(data.price * data.deposit_months)} FCFA</span>
                  </div>
                )}
                {data.agency_fees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frais d'agence</span>
                    <span className="font-semibold">{formatPrice(data.agency_fees)} FCFA</span>
                  </div>
                )}
                {data.security_deposit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dépôt de garantie</span>
                    <span className="font-semibold">{formatPrice(data.security_deposit)} FCFA</span>
                  </div>
                )}
                {data.advance_rent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avance sur loyer</span>
                    <span className="font-semibold">{formatPrice(data.advance_rent)} FCFA</span>
                  </div>
                )}
                {data.service_charges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Charges mensuelles</span>
                    <span className="font-semibold">{formatPrice(data.service_charges)} FCFA</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Revenu locatif (immeuble) */}
          {isBuilding && data.monthly_rental_income > 0 && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3">Revenu locatif</h4>
              <div className="text-xs sm:text-sm">
                <span className="text-gray-600">Revenu locatif mensuel:</span>
                <span className="font-semibold ml-2">{formatPrice(data.monthly_rental_income)} FCFA</span>
              </div>
              {data.building_occupied !== undefined && (
                <div className="mt-2 text-xs sm:text-sm">
                  <span className="text-gray-600">Occupé:</span>
                  <span className="font-semibold ml-2">{data.building_occupied ? 'Oui' : 'Non'}</span>
                </div>
              )}
            </div>
          )}

          {/* Année de construction */}
          {data.construction_year && (
            <div className="mb-4 sm:mb-6">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2">Construction</h4>
              <p className="text-xs sm:text-sm text-gray-600">Année: {data.construction_year}</p>
            </div>
          )}
        </div>
      </div>

      {/* Avertissement */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg md:rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-3">
          <i className="ri-error-warning-line text-xl sm:text-2xl text-amber-600 mt-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0"></i>
          <div>
            <div className="text-sm sm:text-base font-semibold text-amber-900 mb-1 sm:mb-2">
              Avant de publier
            </div>
            <ul className="text-xs sm:text-sm text-amber-800 space-y-1">
              <li>• Vérifiez que toutes les informations sont exactes</li>
              <li>• Assurez-vous que les photos sont de bonne qualité</li>
              <li>• Votre annonce sera visible publiquement après publication</li>
              <li>• Vous pourrez modifier ou supprimer votre annonce à tout moment</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
