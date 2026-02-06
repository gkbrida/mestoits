-- ============================================
-- MIGRATION: Ajout des nouveaux types de biens
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. METTRE À JOUR LA CONTRAINTE CHECK DE property_type
-- Remplacer 'furnished-apartment' par 'furnished-residence'
-- Ajouter 'building' (Immeuble)
-- ============================================

-- Supprimer l'ancienne contrainte
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Ajouter la nouvelle contrainte avec tous les types de biens
ALTER TABLE properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IN (
    'apartment',           -- Appartement
    'house',              -- Maison
    'villa',              -- Villa
    'land',               -- Terrain
    'commercial',         -- Commerce
    'office',             -- Bureau
    'parking',            -- Parking
    'furnished-residence', -- Résidence-meublé (remplace furnished-apartment)
    'building'            -- Immeuble (nouveau)
));

-- ============================================
-- 2. METTRE À JOUR LES DONNÉES EXISTANTES
-- Remplacer 'furnished-apartment' par 'furnished-residence' dans les données existantes
-- ============================================

UPDATE properties
SET property_type = 'furnished-residence'
WHERE property_type = 'furnished-apartment';

-- ============================================
-- VÉRIFICATIONS (Optionnel - pour confirmer que tout est correct)
-- ============================================

-- Vérifier la contrainte CHECK mise à jour
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
  AND conname = 'properties_property_type_check';

-- Vérifier les types de biens existants dans la base
SELECT DISTINCT property_type, COUNT(*) as count
FROM properties
GROUP BY property_type
ORDER BY property_type;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
