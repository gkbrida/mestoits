-- ============================================
-- MIGRATION: Création de la table property_types
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CRÉER LA TABLE property_types
-- ============================================
CREATE TABLE IF NOT EXISTS property_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- Code unique du type (ex: 'apartment', 'villa')
    label TEXT NOT NULL, -- Libellé affiché (ex: 'Appartement', 'Villa')
    icon TEXT NOT NULL, -- Icône RemixIcon (ex: 'ri-building-line')
    offer_types TEXT[] NOT NULL DEFAULT ARRAY['sale', 'rental'], -- Types d'offre autorisés
    requires_surface BOOLEAN DEFAULT TRUE, -- Nécessite une surface
    requires_bedrooms BOOLEAN DEFAULT TRUE, -- Nécessite des chambres
    requires_bathrooms BOOLEAN DEFAULT TRUE, -- Nécessite des salles de bain
    allows_villa_type BOOLEAN DEFAULT FALSE, -- Permet de spécifier le type de villa
    display_order INTEGER DEFAULT 0, -- Ordre d'affichage
    is_active BOOLEAN DEFAULT TRUE, -- Actif ou non
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_property_types_code ON property_types(code);
CREATE INDEX IF NOT EXISTS idx_property_types_active ON property_types(is_active);
CREATE INDEX IF NOT EXISTS idx_property_types_display_order ON property_types(display_order);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_property_types_updated_at 
    BEFORE UPDATE ON property_types
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. INSÉRER LES TYPES DE BIENS
-- ============================================
INSERT INTO property_types (code, label, icon, offer_types, requires_surface, requires_bedrooms, requires_bathrooms, allows_villa_type, display_order) VALUES
('villa', 'Villa', 'ri-home-smile-line', ARRAY['sale', 'rental'], TRUE, TRUE, TRUE, TRUE, 1),
('apartment', 'Appartement', 'ri-building-line', ARRAY['sale', 'rental'], TRUE, TRUE, TRUE, FALSE, 2),
('furnished-residence', 'Résidence-meublé', 'ri-home-4-line', ARRAY['rental'], TRUE, TRUE, TRUE, FALSE, 3),
('house', 'Maison', 'ri-home-3-line', ARRAY['sale', 'rental'], TRUE, TRUE, TRUE, FALSE, 4),
('building', 'Immeuble', 'ri-building-2-line', ARRAY['sale', 'rental'], TRUE, FALSE, FALSE, FALSE, 5),
('commercial', 'Commerce', 'ri-store-3-line', ARRAY['sale', 'rental'], TRUE, FALSE, FALSE, FALSE, 6),
('land', 'Terrain', 'ri-landscape-line', ARRAY['sale'], TRUE, FALSE, FALSE, FALSE, 7),
('office', 'Bureau', 'ri-building-line', ARRAY['sale', 'rental'], TRUE, FALSE, FALSE, FALSE, 8),
('parking', 'Parking', 'ri-parking-box-line', ARRAY['sale', 'rental'], FALSE, FALSE, FALSE, FALSE, 9)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. METTRE À JOUR LA CONTRAINTE CHECK DE properties
-- Utiliser une FOREIGN KEY vers property_types au lieu d'une CHECK
-- ============================================

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE properties 
DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Ajouter une FOREIGN KEY vers property_types
ALTER TABLE properties
ADD CONSTRAINT properties_property_type_fkey 
FOREIGN KEY (property_type) 
REFERENCES property_types(code)
ON DELETE RESTRICT;

-- ============================================
-- VÉRIFICATIONS (Optionnel - pour confirmer que tout est correct)
-- ============================================

-- Vérifier que tous les types ont été insérés
SELECT code, label, icon, offer_types, display_order 
FROM property_types 
WHERE is_active = TRUE 
ORDER BY display_order;

-- Vérifier la contrainte FOREIGN KEY
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'properties'::regclass
  AND conname = 'properties_property_type_fkey';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
