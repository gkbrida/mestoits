-- ============================================
-- MIGRATION: Suppression de la colonne offer_type de properties_02
-- Date: 2026-02-04
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Supprimer la colonne offer_type de properties_02
-- Cette colonne est remplacée par operation_type qui est plus précise
ALTER TABLE properties_02 
DROP COLUMN IF EXISTS offer_type;

-- Vérifier que la colonne a bien été supprimée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'properties_02'
  AND column_name = 'offer_type';

-- Si la requête ci-dessus ne retourne aucune ligne, la colonne a bien été supprimée
-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
