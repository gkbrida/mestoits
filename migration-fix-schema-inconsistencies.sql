-- ============================================
-- MIGRATION: Correction des incohérences du schéma
-- Date: 2026-02-01
-- ============================================

-- 1. Renommer la colonne 'message' en 'content' dans messages_2025_12_01_11_29
ALTER TABLE messages_2025_12_01_11_29
RENAME COLUMN message TO content;

-- 2. Ajouter 'furnished-apartment' à la contrainte CHECK de property_type
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_property_type_check;

ALTER TABLE properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IN ('apartment', 'house', 'villa', 'land', 'commercial', 'office', 'parking', 'furnished-apartment'));

-- 3. Ajouter 'draft' au statut si ce n'est pas déjà fait
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE properties 
ADD CONSTRAINT properties_status_check 
CHECK (status IN ('draft', 'active', 'inactive', 'sold', 'rented'));

-- Note: Les tables properties_2025_12_01_11_29 et rental_properties_2025_12_01_11_29
-- n'existent pas dans la base de données, donc aucune action n'est nécessaire pour les supprimer.
-- Si elles existent dans votre environnement, vous pouvez les supprimer manuellement avec :
-- DROP TABLE IF EXISTS properties_2025_12_01_11_29 CASCADE;
-- DROP TABLE IF EXISTS rental_properties_2025_12_01_11_29 CASCADE;

-- 4. Mettre à jour la fonction increment_property_views pour supprimer la référence à properties_2025_12_01_11_29
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

-- 5. Mettre à jour la fonction update_property_favorites_count pour supprimer la référence à properties_2025_12_01_11_29
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

-- 6. Supprimer les triggers pour les tables qui n'existent pas (si elles existent)
DROP TRIGGER IF EXISTS update_properties_2025_updated_at ON properties_2025_12_01_11_29;
DROP TRIGGER IF EXISTS update_rental_properties_updated_at ON rental_properties_2025_12_01_11_29;

-- Vérification: Afficher les contraintes mises à jour
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
  AND conname IN ('properties_property_type_check', 'properties_status_check');
