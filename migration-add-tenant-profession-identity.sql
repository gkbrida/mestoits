-- MIGRATION: Ajout des colonnes profession et identity_document à la table tenants
-- Ces champs sont utilisés dans le contrat de bail (Articles 1-17, Code de la Construction)
-- pour identifier le locataire (profession, CNI/Passeport)

-- Ajouter la colonne profession
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS profession TEXT;

-- Ajouter la colonne identity_document (numéro CNI ou Passeport)
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS identity_document TEXT;

COMMENT ON COLUMN tenants.profession IS 'Profession du locataire (utilisé dans le contrat de bail)';
COMMENT ON COLUMN tenants.identity_document IS 'Numéro de la pièce d''identité (CNI ou Passeport) du locataire (utilisé dans le contrat de bail)';
