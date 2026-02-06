-- ============================================
-- MIGRATION: Correction de la fonction update_property_favorites_count
-- Date: 2025-12-08
-- ============================================
-- Cette migration corrige la fonction pour qu'elle ne référence que la table 'properties'
-- et supprime les références à 'properties_2025_12_01_11_29' qui n'existe pas

-- Supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS update_favorites_count_on_insert ON favorites;
DROP TRIGGER IF EXISTS update_favorites_count_on_delete ON favorites;

-- Recréer la fonction sans référence à properties_2025_12_01_11_29
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

-- Recréer les triggers
CREATE TRIGGER update_favorites_count_on_insert
    AFTER INSERT ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_property_favorites_count();

CREATE TRIGGER update_favorites_count_on_delete
    AFTER DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_property_favorites_count();

