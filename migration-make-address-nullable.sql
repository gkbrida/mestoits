-- ============================================
-- MIGRATION: Rendre la colonne 'address' nullable dans la table properties
-- Date: 2025-12-08
-- ============================================

-- Modifier la colonne address pour permettre les valeurs NULL
ALTER TABLE properties 
ALTER COLUMN address DROP NOT NULL;

-- Vérification : Afficher la structure mise à jour
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'properties' 
  AND column_name = 'address';

