-- ============================================
-- MIGRATION: Création table property_unavailable_periods
-- Date: 2026-02-04
-- À exécuter dans Supabase SQL Editor
-- Table pour stocker les périodes d'indisponibilité des biens en location courte durée
-- ============================================

CREATE TABLE IF NOT EXISTS property_unavailable_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties_02(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT, -- Raison de l'indisponibilité (optionnel)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contrainte : la date de fin doit être après la date de début
    CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_property_unavailable_periods_property_id ON property_unavailable_periods(property_id);
CREATE INDEX IF NOT EXISTS idx_property_unavailable_periods_owner_id ON property_unavailable_periods(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_unavailable_periods_dates ON property_unavailable_periods(start_date, end_date);

-- RLS (Row Level Security)
ALTER TABLE property_unavailable_periods ENABLE ROW LEVEL SECURITY;

-- Policy: Les propriétaires peuvent voir leurs périodes d'indisponibilité
CREATE POLICY "Propriétaires peuvent voir leurs périodes d'indisponibilité"
    ON property_unavailable_periods FOR SELECT
    USING (owner_id = auth.uid());

-- Policy: Les propriétaires peuvent créer des périodes d'indisponibilité
CREATE POLICY "Propriétaires peuvent créer des périodes d'indisponibilité"
    ON property_unavailable_periods FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Policy: Les propriétaires peuvent mettre à jour leurs périodes d'indisponibilité
CREATE POLICY "Propriétaires peuvent mettre à jour leurs périodes d'indisponibilité"
    ON property_unavailable_periods FOR UPDATE
    USING (owner_id = auth.uid());

-- Policy: Les propriétaires peuvent supprimer leurs périodes d'indisponibilité
CREATE POLICY "Propriétaires peuvent supprimer leurs périodes d'indisponibilité"
    ON property_unavailable_periods FOR DELETE
    USING (owner_id = auth.uid());

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
