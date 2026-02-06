-- ============================================
-- MIGRATION: Ajouter le statut 'draft' et rendre certains champs optionnels pour les brouillons
-- Date: 2025-12-08
-- ============================================

-- Étape 1: Supprimer l'ancienne contrainte CHECK sur status
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_status_check;

-- Étape 2: Ajouter la nouvelle contrainte CHECK avec 'draft' inclus
ALTER TABLE properties 
ADD CONSTRAINT properties_status_check 
CHECK (status IN ('draft', 'active', 'inactive', 'sold', 'rented'));

-- Étape 3: Rendre certains champs optionnels pour permettre les brouillons
-- Seuls les champs obligatoires de BasicInfoStep restent NOT NULL :
-- title, offer_type, property_type, city, price
-- Les autres peuvent être NULL pour les brouillons

-- Rendre description nullable (déjà nullable mais on s'assure)
ALTER TABLE properties 
ALTER COLUMN description DROP NOT NULL;

-- Rendre surface_area nullable pour les brouillons
ALTER TABLE properties 
ALTER COLUMN surface_area DROP NOT NULL;

-- Vérification: Afficher la structure mise à jour
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'properties' 
  AND column_name IN ('title', 'description', 'offer_type', 'property_type', 'city', 'surface_area', 'price', 'status')
ORDER BY column_name;

-- Vérifier que la contrainte est bien appliquée
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
  AND conname = 'properties_status_check';

