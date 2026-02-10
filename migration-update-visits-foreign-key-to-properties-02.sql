-- ============================================
-- MIGRATION: Mise à jour de la clé étrangère property_id de visits pour référencer properties_02
-- Date: 2026-02-01
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- 1. Supprimer la contrainte de clé étrangère existante pour property_id
ALTER TABLE visits
DROP CONSTRAINT IF EXISTS visits_property_id_fkey;

-- 2. Ajouter la nouvelle contrainte pour property_id référençant properties_02
ALTER TABLE visits
ADD CONSTRAINT visits_property_id_fkey
FOREIGN KEY (property_id)
REFERENCES properties_02(id)
ON DELETE CASCADE;

-- 3. Vérification : Afficher les contraintes de la table visits
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    a.attname AS column_name,
    af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'visits'::regclass
  AND conname = 'visits_property_id_fkey'
ORDER BY conname;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
