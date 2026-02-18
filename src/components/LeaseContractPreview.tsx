/**
 * Aperçu du contrat de bail à usage d'habitation
 * Conforme aux dispositions du Code de la Construction et de l'Habitat - Art. 408 et suivants
 * Articles 1 à 17 modifiables (contract_articles)
 */

import {
  ARTICLE_TITLES,
  getArticleContent,
  type ArticleReplacements,
} from '../utils/leaseContractArticles';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  'furnished-residence': 'Résidence meublée',
};

export interface LeaseContractPreviewData {
  owner?: {
    full_name?: string;
    company_address?: string;
    phone?: string;
    email?: string;
  } | null;
  tenant?: {
    first_name?: string;
    last_name?: string;
    profession?: string;
    phone?: string;
    email?: string;
    identity_document?: string;
  } | null;
  property?: {
    address?: string;
    city?: string;
    property_type?: string;
    surface_area?: number;
    bedrooms?: number;
    features?: string[] | string;
  } | null;
  lease?: {
    start_date?: string;
    end_date?: string;
    monthly_rent?: number | string;
    security_deposit?: number | string;
    advance_rent_amount?: number | string;
    payment_due_day?: number | string;
    additional_notes?: string;
    contract_articles?: Record<string, string> | null;
  } | null;
}

interface LeaseContractPreviewProps {
  data: LeaseContractPreviewData;
  className?: string;
  maxHeight?: string;
  /** Affiche "Lu et approuvé" pour le bailleur dans la section signatures */
  showBailleurLuEtApprouve?: boolean;
  /** Affiche "Lu et approuvé" pour le locataire dans la section signatures */
  showLocataireLuEtApprouve?: boolean;
  /** Affiche "Signé électroniquement" dans la section signatures */
  showSigneElectroniquement?: boolean;
}

export default function LeaseContractPreview({
  data,
  className = '',
  maxHeight = 'max-h-80 sm:max-h-96',
  showBailleurLuEtApprouve = false,
  showLocataireLuEtApprouve = false,
  showSigneElectroniquement = true,
}: LeaseContractPreviewProps) {
  const owner = data.owner;
  const tenant = data.tenant;
  const property = data.property;
  const lease = data.lease;

  const tenantName = tenant
    ? `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || '—'
    : '—';
  const ownerName = owner?.full_name || '—';
  const propertyAddress = property?.address || '—';
  const propertyCity = property?.city ? `, ${property.city}` : '';
  const propertyType =
    PROPERTY_TYPE_LABELS[String(property?.property_type || '')] ||
    property?.property_type ||
    'Appartement/Villa';
  const surface =
    property?.surface_area != null ? `${property.surface_area} m²` : '';
  const bedrooms = property?.bedrooms ? `${property.bedrooms} pièce(s)` : '';
  const consistance = [propertyType, bedrooms, surface].filter(Boolean).join(', ') || '—';
  const rawEquipments = lease?.additional_notes ||
    (Array.isArray(property?.features)
      ? property.features.join(', ')
      : typeof property?.features === 'string'
        ? property.features
        : null);
  const equipments = typeof rawEquipments === 'string' ? rawEquipments : '—';

  const startDate = lease?.start_date
    ? new Date(lease.start_date).toLocaleDateString('fr-FR')
    : '—';
  const durationYears =
    lease?.start_date && lease?.end_date
      ? (() => {
          const d1 = new Date(lease.start_date);
          const d2 = new Date(lease.end_date);
          const years = Math.round(
            (d2.getTime() - d1.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );
          return years >= 1 ? `${years} an(s)` : '1 an';
        })()
      : '—';

  const monthlyRent =
    typeof lease?.monthly_rent === 'number'
      ? lease.monthly_rent.toLocaleString('fr-FR')
      : String(lease?.monthly_rent || '0');
  const paymentDueDay = String(lease?.payment_due_day ?? 5);
  const advanceAmount =
    lease?.advance_rent_amount != null
      ? Number(lease.advance_rent_amount).toLocaleString('fr-FR')
      : '0';
  const depositAmount =
    lease?.security_deposit != null
      ? Number(lease.security_deposit).toLocaleString('fr-FR')
      : '0';

  const replacements: ArticleReplacements = {
    property_address: propertyAddress,
    property_city: propertyCity,
    consistance,
    equipments,
    duration_years: durationYears,
    start_date: startDate,
    monthly_rent: monthlyRent,
    payment_due_day: paymentDueDay,
    advance_amount: advanceAmount,
    deposit_amount: depositAmount,
  };

  const contractArticles = lease?.contract_articles || {};

  return (
    <div
      className={`bg-gray-50 rounded-lg md:rounded-xl p-4 sm:p-6 overflow-y-auto ${maxHeight} ${className}`}
    >
      <div className="space-y-3 text-xs sm:text-sm text-gray-700">
        <p className="font-bold text-base sm:text-lg text-gray-900 text-center">
          CONTRAT DE BAIL À USAGE D&apos;HABITATION
        </p>
        <p className="text-center text-gray-600 italic">
          (Conforme aux dispositions du Code de la Construction et de
          l&apos;Habitat - Art. 408 et suivants)
        </p>
        <p className="font-semibold text-gray-800">ENTRE LES SOUSSIGNÉS :</p>

        {/* Tables Bailleur et Locataire */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-300 rounded-lg overflow-hidden">
          <div className="bg-white p-3">
            <p className="font-bold text-gray-900 mb-2 text-sm">
              LE BAILLEUR (Le Propriétaire) :
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-0.5 text-gray-600">
                    Nom et Prénoms / Dénomination :
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">{ownerName}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-gray-600">Adresse / Siège social :</td>
                </tr>
                <tr>
                  <td className="font-medium">
                    {owner?.company_address || propertyAddress}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 text-gray-600">Téléphone :</td>
                </tr>
                <tr>
                  <td className="font-medium">{owner?.phone || '—'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-gray-600">Email :</td>
                </tr>
                <tr>
                  <td className="font-medium">{owner?.email || '—'}</td>
                </tr>
                <tr>
                  <td
                    colSpan={1}
                    className="py-1 text-xs text-gray-600 italic"
                  >
                    Si le bien est en indivision, le bailleur déclare avoir
                    l&apos;accord de tous les co-indivisaires (Conformément à
                    l&apos;Article 418).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-white p-3">
            <p className="font-bold text-gray-900 mb-2 text-sm">ET</p>
            <p className="font-bold text-gray-900 mb-2 text-sm">
              LE LOCATAIRE (Le Preneur) :
            </p>
            <table className="w-full text-xs">
              <tbody>
                <tr>
                  <td className="py-0.5 text-gray-600">Nom et Prénoms :</td>
                </tr>
                <tr>
                  <td className="font-medium">{tenantName}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-gray-600">Profession :</td>
                </tr>
                <tr>
                  <td className="font-medium">{tenant?.profession || '—'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-gray-600">Téléphone :</td>
                </tr>
                <tr>
                  <td className="font-medium">{tenant?.phone || '—'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-gray-600">Email :</td>
                </tr>
                <tr>
                  <td className="font-medium">{tenant?.email || '—'}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-gray-600">
                    Identité (CNI / Passeport) N° :
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">
                    {tenant?.identity_document || '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className="font-semibold text-gray-800 italic">
          IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :
        </p>

        {/* Articles 1 à 17 */}
        {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const).map((num) => {
          const rawCustom = contractArticles[String(num)];
          const customText = typeof rawCustom === 'string' ? rawCustom : null;
          const content = getArticleContent(num, customText, replacements);
          const text = typeof content === 'string' ? content : '';
          if (!text) return null;
          return (
            <p key={num}>
              <strong>ARTICLE {num} : {ARTICLE_TITLES[num]}</strong>
              <br />
              {text.split('\n').map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {String(line ?? '')}
                </span>
              ))}
            </p>
          );
        })}

        <div className="pt-4 border-t border-gray-300 mt-4">
          <p className="text-xs text-gray-600">
            Fait à {property?.city || 'Abidjan'}, le{" "}
            {new Date().toLocaleDateString('fr-FR')}
            <br />
            En trois (3) exemplaires originaux (Un pour le Bailleur, un pour le
            Locataire, un pour l&apos;Enregistrement).
            <br />
            <br />
            <strong>LE BAILLEUR</strong>
            {showBailleurLuEtApprouve ? (
              <>
                <br />
                <span className="font-medium text-gray-800">Lu et approuvé</span>
                <br />
              </>
            ) : (
              <>
                <br />
                (Signature précédée de la mention &quot;Lu et approuvé&quot;)
                <br />
              </>
            )}
            {showSigneElectroniquement && (
              <>
                <span className="text-[10px] italic">Signé électroniquement</span>
                <br />
              </>
            )}
            <br />
            <strong>LE LOCATAIRE</strong>
            {showLocataireLuEtApprouve ? (
              <>
                <br />
                <span className="font-medium text-gray-800">Lu et approuvé</span>
                <br />
              </>
            ) : (
              <>
                <br />
                (Signature précédée de la mention &quot;Lu et approuvé&quot;)
                <br />
              </>
            )}
            {showSigneElectroniquement && (
              <>
                <span className="text-[10px] italic">Signé électroniquement</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
