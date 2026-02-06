-- ============================================
-- MIGRATION: Création table pour tous les types de revenus
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Créer la table revenues pour gérer tous les types de revenus
CREATE TABLE IF NOT EXISTS revenues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    revenue_type TEXT CHECK (revenue_type IN ('lease', 'sale', 'other')) NOT NULL,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties_02(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE,
    due_date DATE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    payment_method TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Contrainte: au moins un lien doit être présent selon le type
    CONSTRAINT check_revenue_links CHECK (
        (revenue_type = 'lease' AND lease_id IS NOT NULL) OR
        (revenue_type = 'sale' AND property_id IS NOT NULL) OR
        (revenue_type = 'other')
    )
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_revenues_owner_id ON revenues(owner_id);
CREATE INDEX IF NOT EXISTS idx_revenues_revenue_type ON revenues(revenue_type);
CREATE INDEX IF NOT EXISTS idx_revenues_lease_id ON revenues(lease_id);
CREATE INDEX IF NOT EXISTS idx_revenues_property_id ON revenues(property_id);
CREATE INDEX IF NOT EXISTS idx_revenues_status ON revenues(status);
CREATE INDEX IF NOT EXISTS idx_revenues_due_date ON revenues(due_date);
CREATE INDEX IF NOT EXISTS idx_revenues_payment_date ON revenues(payment_date);

-- Commentaires
COMMENT ON TABLE revenues IS 'Tous les types de revenus (baux, ventes, autres)';
COMMENT ON COLUMN revenues.revenue_type IS 'Type de revenu: lease (bail), sale (vente), other (autre)';
COMMENT ON COLUMN revenues.lease_id IS 'ID du bail si revenue_type = lease';
COMMENT ON COLUMN revenues.property_id IS 'ID du bien si revenue_type = sale';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
