-- ============================================
-- MIGRATION: Ajustement des contraintes CHECK pour properties_02
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. AJUSTER LA CONTRAINTE accessibility
-- ============================================
-- La table properties_02 accepte seulement 'paved' et 'unpaved'
-- (pas 'close-to-paved' comme dans l'ancienne table properties)

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE properties_02 
DROP CONSTRAINT IF EXISTS properties_02_accessibility_check;

-- Ajouter la nouvelle contrainte avec seulement 'paved' et 'unpaved'
ALTER TABLE properties_02
ADD CONSTRAINT properties_02_accessibility_check 
CHECK (accessibility IS NULL OR accessibility IN ('paved', 'unpaved'));

-- Mettre à jour les valeurs 'close-to-paved' existantes vers 'unpaved' (ou NULL selon votre préférence)
-- Décommentez la ligne suivante si vous avez des données existantes à migrer :
-- UPDATE properties_02 SET accessibility = 'unpaved' WHERE accessibility = 'close-to-paved';

-- ============================================
-- 2. AJUSTER LA CONTRAINTE standing
-- ============================================
-- La table properties_02 accepte 'low', 'medium', 'high', 'luxury'
-- (ajout de 'luxury' par rapport à l'ancienne table properties)

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE properties_02 
DROP CONSTRAINT IF EXISTS properties_02_standing_check;

-- Ajouter la nouvelle contrainte avec 'low', 'medium', 'high', 'luxury'
ALTER TABLE properties_02
ADD CONSTRAINT properties_02_standing_check 
CHECK (standing IS NULL OR standing IN ('low', 'medium', 'high', 'luxury'));

-- ============================================
-- 3. VÉRIFICATION DES CONTRAINTES
-- ============================================

-- Vérifier que les contraintes sont bien appliquées
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties_02'::regclass
AND contype = 'c'
AND (conname LIKE '%accessibility%' OR conname LIKE '%standing%')
ORDER BY conname;

-- ============================================
-- NOTES
-- ============================================
-- 1. Ces contraintes correspondent aux valeurs acceptées dans le nouveau formulaire
-- 2. Si vous avez des données existantes avec 'close-to-paved', elles seront mises à jour vers 'unpaved'
-- 3. La valeur 'luxury' est maintenant disponible pour le standing
-- 4. Les contraintes permettent NULL pour ces champs (optionnels)

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
