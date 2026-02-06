-- ============================================
-- MIGRATION: Ajout du champ profession_type pour stocker le type principal de professionnel
-- Date: 2025-12-08
-- ============================================

-- Ajouter la colonne profession_type pour stocker le type principal de professionnel
-- Cette valeur correspond au champ 'name' de la table professional_types
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS profession_type TEXT;

-- Créer un index pour les recherches rapides par type de profession
CREATE INDEX IF NOT EXISTS idx_users_profession_type ON users_2025_12_01_11_29(profession_type);

-- Ajouter une contrainte de clé étrangère pour s'assurer que le type existe dans professional_types
-- (optionnel, peut être commenté si on veut permettre des valeurs non référencées)
-- ALTER TABLE users_2025_12_01_11_29
-- ADD CONSTRAINT fk_users_profession_type 
-- FOREIGN KEY (profession_type) REFERENCES professional_types(name);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN users_2025_12_01_11_29.profession_type IS 'Type principal de professionnel (référence à professional_types.name). Exemples: Agent immobilier, Gestionnaire locatif, Expert en estimation, etc.';

