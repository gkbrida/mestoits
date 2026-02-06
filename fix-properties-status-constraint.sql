-- ============================================
-- Script SQL pour corriger la contrainte CHECK du statut dans la table properties
-- ============================================

-- Étape 1: Supprimer l'ancienne contrainte CHECK si elle existe
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_status_check;

-- Étape 2: Ajouter la nouvelle contrainte CHECK avec les valeurs autorisées
ALTER TABLE properties 
ADD CONSTRAINT properties_status_check 
CHECK (status IN ('active', 'inactive', 'sold', 'rented'));

-- Vérification: Afficher les contraintes de la table properties
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
AND conname = 'properties_status_check';

