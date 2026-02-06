-- ============================================
-- MIGRATION: Corrections des incohérences du schéma
-- Date: 2026-02-01
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. RENOMMER LA COLONNE 'message' EN 'content' DANS messages_2025_12_01_11_29
-- ============================================
ALTER TABLE messages_2025_12_01_11_29
RENAME COLUMN message TO content;

-- ============================================
-- 2. AJOUTER 'furnished-apartment' À LA CONTRAINTE CHECK DE property_type
-- ============================================
-- Supprimer l'ancienne contrainte
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Ajouter la nouvelle contrainte avec 'furnished-apartment'
ALTER TABLE properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IN ('apartment', 'house', 'villa', 'land', 'commercial', 'office', 'immeuble', 'furnished-apartment'));

-- ============================================
-- 3. S'ASSURER QUE 'draft' EST DANS LA CONTRAINTE CHECK DE status
-- ============================================
-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_status_check;

-- Ajouter la nouvelle contrainte avec 'draft'
ALTER TABLE properties 
ADD CONSTRAINT properties_status_check 
CHECK (status IN ('draft', 'active', 'inactive', 'sold', 'rented'));

-- ============================================
-- 4. METTRE À JOUR LA FONCTION increment_property_views
-- Supprimer la référence à properties_2025_12_01_11_29 qui n'existe pas
-- ============================================
CREATE OR REPLACE FUNCTION increment_property_views(property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE properties
    SET views_count = views_count + 1
    WHERE id = property_id;
END;
$$;

-- ============================================
-- 5. METTRE À JOUR LA FONCTION update_property_favorites_count
-- Supprimer la référence à properties_2025_12_01_11_29 qui n'existe pas
-- ============================================
CREATE OR REPLACE FUNCTION update_property_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE properties
        SET favorites_count = (
            SELECT COUNT(*) FROM favorites WHERE property_id = NEW.property_id
        )
        WHERE id = NEW.property_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE properties
        SET favorites_count = (
            SELECT COUNT(*) FROM favorites WHERE property_id = OLD.property_id
        )
        WHERE id = OLD.property_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- ============================================
-- 6. SUPPRIMER LES TRIGGERS POUR LES TABLES QUI N'EXISTENT PAS
-- (Si ces triggers existent, ils seront supprimés)
-- ============================================
DROP TRIGGER IF EXISTS update_properties_2025_updated_at ON properties_2025_12_01_11_29;
DROP TRIGGER IF EXISTS update_rental_properties_updated_at ON rental_properties_2025_12_01_11_29;

-- ============================================
-- VÉRIFICATIONS (Optionnel - pour confirmer que tout est correct)
-- ============================================

-- Vérifier que la colonne 'content' existe dans messages_2025_12_01_11_29
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages_2025_12_01_11_29' 
  AND column_name = 'content';

-- Vérifier les contraintes CHECK sur properties
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
  AND conname IN ('properties_property_type_check', 'properties_status_check');

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
