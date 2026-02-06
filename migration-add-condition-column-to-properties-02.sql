-- ============================================
-- MIGRATION: Ajout de la colonne condition à properties_02
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Ajouter la colonne condition si elle n'existe pas déjà
ALTER TABLE properties_02 
ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('new', 'excellent', 'good', 'to-renovate', 'unfinished'));

-- Ajouter un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_properties_02_condition ON properties_02(condition);

-- Commentaire sur la colonne
COMMENT ON COLUMN properties_02.condition IS 'État du bien : new (Neuf), excellent (Excellent état), good (Bon état), to-renovate (À rénover), unfinished (Inachevé)';

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'properties_02'
AND column_name = 'condition';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
