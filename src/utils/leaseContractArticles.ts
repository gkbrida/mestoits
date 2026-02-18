/**
 * Templates des 17 articles du contrat de bail (Code de la Construction - Art. 408 et suivants)
 * Placeholders: {{property_address}}, {{property_city}}, {{consistance}}, {{equipments}},
 * {{duration_years}}, {{start_date}}, {{monthly_rent}}, {{payment_due_day}}, {{advance_amount}}, {{deposit_amount}}
 */

export const ARTICLE_TITLES: Record<number, string> = {
  1: 'OBJET DU CONTRAT (Art. 409 & 411)',
  2: 'DÉSIGNATION DES LIEUX',
  3: 'CARACTÈRE INTUITU PERSONAE & INCESSIBILITÉ (Art. 412)',
  4: 'DURÉE ET TACITE RECONDUCTION (Art. 414 & 439)',
  5: 'RÉSILIATION ET CONGÉ (Art. 442, 443, 444)',
  6: 'LOYER (Art. 421 & 422)',
  7: 'RÉVISION DU LOYER (Art. 423 & 424)',
  8: 'AVANCE ET DÉPÔT DE GARANTIE (Art. 415 & 416)',
  9: 'CHARGES LOCATIVES (Art. 417)',
  10: 'OBLIGATIONS DU BAILLEUR (Art. 426 à 431)',
  11: 'OBLIGATIONS DU LOCATAIRE (Art. 435 à 438)',
  12: 'ÉTAT DES LIEUX (Art. 416 & 427)',
  13: 'DÉCÈS OU ABANDON DE DOMICILE (Art. 450 & 451)',
  14: 'DESTRUCTION DES LIEUX (Art. 452)',
  15: 'VENTE - DROIT DE PRÉEMPTION (Art. 453 & 454)',
  16: 'ENREGISTREMENT FISCAL (Art. 414)',
  17: 'ATTRIBUTION DE JURIDICTION',
};

export const DEFAULT_ARTICLES: Record<number, string> = {
  1: 'Le Bailleur donne en location, à titre de bail à usage d\'habitation, au Locataire qui accepte, les locaux désignés ci-après. Le bail est libre et nul ne peut y être contraint (Art. 411).',
  2: 'Situation géographique : {{property_address}}{{property_city}}\nConsistance du local : {{consistance}}\nÉquipements inclus : {{equipments}}\nDestination : Les lieux sont loués exclusivement pour l\'habitation (Art. 409). Toute activité commerciale, industrielle ou artisanale est exclue, sauf accord express (Art. 410).',
  3: 'Ce contrat est conclu en considération de la personne du Locataire (Intuitu Personae).\nInterdiction : Le Locataire ne peut ni céder son bail, ni sous-louer, ni laisser les lieux à la disposition de tiers (même gratuitement) sans l\'autorisation expresse et écrite du Bailleur.\nException légale : Cette interdiction ne s\'applique pas aux ascendants et descendants directs du Locataire, à condition que ce dernier continue d\'honorer ses obligations contractuelles.',
  4: 'Le présent bail est consenti pour une durée de {{duration_years}} à compter du {{start_date}}.\nTacite Reconduction : À l\'arrivée du terme, si aucune des parties ne donne congé, le bail est renouvelé par tacite reconduction aux mêmes conditions contractuelles, au bénéfice du Locataire de bonne foi (Art. 439).',
  5: 'Le contrat peut être résilié :\nPar le Locataire : À tout moment, moyennant un préavis de trois (3) mois.\nPar le Bailleur : À l\'expiration du bail, uniquement pour les motifs suivants (Art. 439) :\nBesoin de reprendre les lieux pour les occuper lui-même ou les faire occuper par ses ascendants/descendants (jusqu\'au 3ème degré).\nManquement du Locataire à ses obligations.\nMotifs graves et légitimes.\nForme du congé : La lettre de demande de résiliation doit être écrite, motivée et notifiée par acte de Commissaire de Justice ou par lettre recommandée/courrier avec décharge. Le délai de préavis est de trois (3) mois (Art. 443, 444).',
  6: 'Le loyer mensuel est fixé à la somme de : {{monthly_rent}} FCFA.\nIl est payable mensuellement, au plus tard le {{payment_due_day}} de chaque mois.\nObligation de quittance (Art. 425) : Le Bailleur est tenu de délivrer une quittance au Locataire pour preuve de paiement.',
  7: 'Le loyer peut être révisé tous les trois (3) ans.\nLa partie qui sollicite l\'augmentation ou la réduction doit le notifier par écrit au moins trois (3) mois avant la date anniversaire.',
  8: 'Lors de la signature, le Locataire verse :\nAvance sur loyer : La somme de {{advance_amount}} FCFA .\nDépôt de garantie (Caution) : La somme de {{deposit_amount}} FCFA.\nCe dépôt sert à garantir l\'exécution des obligations (dégradations, impayés). Il ne produit pas d\'intérêts.\nRemboursement : Il est restituable dans un délai d\'un (1) mois après la restitution des clés, déduction faite des sommes dues.',
  9: 'Le Locataire acquittera ses consommations personnelles (eau, électricité, gaz) et les taxes liées à l\'usage du logement. Si des charges communes (copropriété, gardiennage) sont intégrées au loyer, le Bailleur doit en communiquer le détail précis.',
  10: 'Le Bailleur s\'engage à :\nDélivrer un logement décent, sécurisé et en bon état de fonctionnement (Art. 428, 429).\nGarantir le Locataire contre les vices ou défauts empêchant l\'usage (Art. 428).\nEffectuer toutes les grosses réparations (murs, toitures, fosses, clôtures, canalisations) (Art. 431).\nNe pas changer la forme des lieux pendant la durée du bail (Art. 430).',
  11: 'Le Locataire s\'engage à :\nPayer le loyer à la date convenue.\nEffectuer les menues réparations et l\'entretien courant (Art. 438).\nNe pas transformer les locaux sans accord écrit du Bailleur. Si des aménagements sont faits sans accord, le Bailleur peut exiger la remise en état ou les conserver sans indemnité (Art. 437).\nLaisser exécuter les travaux urgents nécessaires, sous réserve d\'indemnisation si cela dure plus de 21 jours (Art. 431).',
  12: 'Un état des lieux contradictoire est établi obligatoirement à l\'entrée et à la sortie du Locataire. À défaut d\'état des lieux d\'entrée, le logement est présumé avoir été délivré en bon état.',
  13: 'En cas de décès du Locataire : Le contrat continue au profit du conjoint, des descendants ou ascendants qui vivaient notoirement avec lui.\nEn cas d\'abandon de domicile : Le bail se poursuit au profit du conjoint ou des membres de la famille qui vivaient avec lui et continuent de payer le loyer.',
  14: 'Totale : Le bail est résilié de plein droit.\nPartielle : Le Locataire peut demander une diminution du prix ou la résiliation du bail.',
  15: 'Le Locataire bénéficie d\'un droit de préemption (priorité d\'achat) si le Bailleur décide de vendre le logement.\nLe Bailleur doit notifier l\'offre de vente au Locataire (prix et conditions).\nLe Locataire dispose d\'un délai de un (1) mois pour accepter. Son silence vaut refus.',
  16: 'Le présent contrat doit être enregistré auprès de l\'Administration fiscale dans un délai de trente (30) jours. Le Bailleur doit remettre un exemplaire enregistré au Locataire.',
  17: 'En cas de litige et à défaut de règlement amiable, les tribunaux compétents sont ceux du lieu de situation de l\'immeuble.',
};

export interface ArticleReplacements {
  property_address: string;
  property_city: string;
  consistance: string;
  equipments: string;
  duration_years: string;
  start_date: string;
  monthly_rent: string;
  payment_due_day: string;
  advance_amount: string;
  deposit_amount: string;
}

function ensureString(val: unknown): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return '—';
  return String(val);
}

/** Nettoie contract_articles pour l'insertion : seules les valeurs string sont conservées */
export function sanitizeContractArticlesForDb(
  articles: Record<string, unknown> | null | undefined
): Record<string, string> | null {
  if (!articles || typeof articles !== 'object') return null;
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(articles)) {
    if (typeof v === 'string' && v.trim()) cleaned[k] = v.trim();
  }
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function getArticleContent(
  articleNum: number,
  customText: string | null | undefined,
  replacements: ArticleReplacements
): string {
  const rawTemplate = customText && typeof customText === 'string' ? customText.trim() : '';
  const template = rawTemplate || DEFAULT_ARTICLES[articleNum as keyof typeof DEFAULT_ARTICLES] || '';
  return template
    .replace(/\{\{property_address\}\}/g, ensureString(replacements.property_address))
    .replace(/\{\{property_city\}\}/g, ensureString(replacements.property_city))
    .replace(/\{\{consistance\}\}/g, ensureString(replacements.consistance))
    .replace(/\{\{equipments\}\}/g, ensureString(replacements.equipments))
    .replace(/\{\{duration_years\}\}/g, ensureString(replacements.duration_years))
    .replace(/\{\{start_date\}\}/g, ensureString(replacements.start_date))
    .replace(/\{\{monthly_rent\}\}/g, ensureString(replacements.monthly_rent))
    .replace(/\{\{payment_due_day\}\}/g, ensureString(replacements.payment_due_day))
    .replace(/\{\{advance_amount\}\}/g, ensureString(replacements.advance_amount))
    .replace(/\{\{deposit_amount\}\}/g, ensureString(replacements.deposit_amount));
}

export function getDefaultArticleWithPlaceholders(articleNum: number): string {
  return DEFAULT_ARTICLES[articleNum as keyof typeof DEFAULT_ARTICLES] || '';
}
