-- Script SQL pour corriger les clés étrangères de la table leases
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Supprimer la contrainte de clé étrangère existante pour tenant_id
ALTER TABLE leases 
DROP CONSTRAINT IF EXISTS leases_tenant_id_fkey;

-- 2. Supprimer la contrainte de clé étrangère existante pour property_id (si elle existe)
ALTER TABLE leases 
DROP CONSTRAINT IF EXISTS leases_property_id_fkey;

-- 3. Ajouter la nouvelle contrainte pour tenant_id référençant tenants
ALTER TABLE leases 
ADD CONSTRAINT leases_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES tenants(id) 
ON DELETE CASCADE;

-- 4. Ajouter la nouvelle contrainte pour property_id référençant properties
ALTER TABLE leases 
ADD CONSTRAINT leases_property_id_fkey 
FOREIGN KEY (property_id) 
REFERENCES properties(id) 
ON DELETE CASCADE;

-- Vérification : Afficher les contraintes de la table leases
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    a.attname AS column_name,
    af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'leases'::regclass
ORDER BY conname;

