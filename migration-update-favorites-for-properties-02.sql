-- ============================================
-- MIGRATION: Mise à jour de la table favorites pour accepter properties_02
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. RENDRE property_id NULLABLE
-- ============================================
-- Rendre property_id nullable pour permettre d'utiliser soit property_id soit property_02_id
ALTER TABLE favorites 
ALTER COLUMN property_id DROP NOT NULL;

-- ============================================
-- 2. AJOUTER LA COLONNE property_02_id
-- ============================================
-- Ajouter une colonne pour référencer properties_02
ALTER TABLE favorites 
ADD COLUMN IF NOT EXISTS property_02_id UUID REFERENCES properties_02(id) ON DELETE CASCADE;

-- ============================================
-- 3. MODIFIER LA CONTRAINTE UNIQUE
-- ============================================
-- Supprimer l'ancienne contrainte unique
ALTER TABLE favorites 
DROP CONSTRAINT IF EXISTS favorites_user_id_property_id_key;

-- Ajouter une nouvelle contrainte unique qui permet soit property_id soit property_02_id
-- Mais pas les deux en même temps pour le même utilisateur
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_property_unique 
ON favorites(user_id, COALESCE(property_id::text, ''), COALESCE(property_02_id::text, ''));

-- Contrainte CHECK pour s'assurer qu'au moins une des deux colonnes est remplie
ALTER TABLE favorites 
DROP CONSTRAINT IF EXISTS favorites_property_check;

ALTER TABLE favorites 
ADD CONSTRAINT favorites_property_check 
CHECK (
  (property_id IS NOT NULL AND property_02_id IS NULL) OR 
  (property_id IS NULL AND property_02_id IS NOT NULL)
);

-- ============================================
-- 4. CRÉER DES INDEX POUR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_favorites_property_02_id ON favorites(property_02_id);

-- ============================================
-- 5. METTRE À JOUR LA FONCTION DE COMPTAGE DES FAVORIS
-- ============================================
-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS update_favorites_count_on_insert ON favorites;
DROP TRIGGER IF EXISTS update_favorites_count_on_delete ON favorites;

-- Recréer la fonction pour gérer les deux tables
CREATE OR REPLACE FUNCTION update_property_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Mettre à jour properties si property_id est défini
        IF NEW.property_id IS NOT NULL THEN
            UPDATE properties
            SET favorites_count = (
                SELECT COUNT(*) FROM favorites WHERE property_id = NEW.property_id
            )
            WHERE id = NEW.property_id;
        END IF;
        
        -- Mettre à jour properties_02 si property_02_id est défini
        IF NEW.property_02_id IS NOT NULL THEN
            UPDATE properties_02
            SET favorites_count = (
                SELECT COUNT(*) FROM favorites WHERE property_02_id = NEW.property_02_id
            )
            WHERE id = NEW.property_02_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Mettre à jour properties si property_id est défini
        IF OLD.property_id IS NOT NULL THEN
            UPDATE properties
            SET favorites_count = (
                SELECT COUNT(*) FROM favorites WHERE property_id = OLD.property_id
            )
            WHERE id = OLD.property_id;
        END IF;
        
        -- Mettre à jour properties_02 si property_02_id est défini
        IF OLD.property_02_id IS NOT NULL THEN
            UPDATE properties_02
            SET favorites_count = (
                SELECT COUNT(*) FROM favorites WHERE property_02_id = OLD.property_02_id
            )
            WHERE id = OLD.property_02_id;
        END IF;
        
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

-- ============================================
-- 6. COMMENTAIRES
-- ============================================
COMMENT ON COLUMN favorites.property_id IS 'Référence vers properties (ancienne table)';
COMMENT ON COLUMN favorites.property_02_id IS 'Référence vers properties_02 (nouvelle table)';

-- ============================================
-- 7. VÉRIFICATION
-- ============================================
-- Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'favorites'
ORDER BY ordinal_position;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
