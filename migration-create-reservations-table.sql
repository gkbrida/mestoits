-- ============================================
-- MIGRATION: Création table reservations pour location courte durée
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Créer la table reservations si elle n'existe pas
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties_02(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    nights INTEGER NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_reservations_property_id ON reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_owner_id ON reservations(owner_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_start_date ON reservations(start_date);
CREATE INDEX IF NOT EXISTS idx_reservations_end_date ON reservations(end_date);

-- Commentaires
COMMENT ON TABLE reservations IS 'Réservations pour location courte durée';
COMMENT ON COLUMN reservations.nights IS 'Nombre de nuits calculé automatiquement';
COMMENT ON COLUMN reservations.total_amount IS 'Montant total de la réservation (prix par nuit × nombre de nuits)';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
