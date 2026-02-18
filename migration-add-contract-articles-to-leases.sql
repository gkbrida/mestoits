-- MIGRATION: Ajout de la colonne contract_articles à la table leases
-- Stocke les 17 articles du contrat modifiés par l'utilisateur (JSONB)
-- Structure: {"1": "texte article 1", "2": "texte article 2", ... "17": "texte article 17"}
-- Si un article est absent, le texte par défaut légal est utilisé

ALTER TABLE leases
ADD COLUMN IF NOT EXISTS contract_articles JSONB DEFAULT NULL;

COMMENT ON COLUMN leases.contract_articles IS 'Articles 1 à 17 du contrat personnalisés par l''utilisateur. Clés "1" à "17". Valeur null = utiliser les textes par défaut.';
