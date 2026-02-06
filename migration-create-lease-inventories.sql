-- ============================================
-- MIGRATION: Créer la table lease_inventories
-- Date: 2025-12-08
-- ============================================

CREATE TABLE IF NOT EXISTS lease_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('entry', 'exit')) NOT NULL,
    date DATE NOT NULL,
    photos TEXT[] DEFAULT '{}',
    comments TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_lease_inventories_lease_id ON lease_inventories(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_inventories_type ON lease_inventories(type);
CREATE INDEX IF NOT EXISTS idx_lease_inventories_date ON lease_inventories(date DESC);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_lease_inventories_updated_at 
    BEFORE UPDATE ON lease_inventories
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

