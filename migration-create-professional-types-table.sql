-- ============================================
-- MIGRATION: Création de la table professional_types
-- Date: 2025-12-08
-- ============================================

-- Créer la table professional_types
CREATE TABLE IF NOT EXISTS professional_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer un index sur le nom pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_professional_types_name ON professional_types(name);
CREATE INDEX IF NOT EXISTS idx_professional_types_active ON professional_types(is_active);

-- Insérer les types de professionnels par défaut
INSERT INTO professional_types (name, label, icon, display_order) VALUES
    ('Agent immobilier', 'Agent immobilier', 'ri-home-4-line', 1),
    ('Gestionnaire locatif', 'Gestionnaire locatif', 'ri-building-line', 2),
    ('Expert en estimation', 'Expert en estimation', 'ri-line-chart-line', 3),
    ('Conseiller en investissement', 'Conseiller en investissement', 'ri-money-euro-circle-line', 4),
    ('Syndic de copropriété', 'Syndic de copropriété', 'ri-community-line', 5),
    ('Diagnostiqueur immobilier', 'Diagnostiqueur immobilier', 'ri-file-search-line', 6)
ON CONFLICT (name) DO NOTHING;

-- Créer le trigger pour mettre à jour updated_at
CREATE TRIGGER update_professional_types_updated_at 
    BEFORE UPDATE ON professional_types
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documenter la table
COMMENT ON TABLE professional_types IS 'Types de professionnels disponibles dans l''application';
COMMENT ON COLUMN professional_types.name IS 'Nom unique du type (utilisé pour le filtrage)';
COMMENT ON COLUMN professional_types.label IS 'Libellé affiché à l''utilisateur';
COMMENT ON COLUMN professional_types.icon IS 'Icône Remix Icon à utiliser';
COMMENT ON COLUMN professional_types.display_order IS 'Ordre d''affichage dans les filtres';

