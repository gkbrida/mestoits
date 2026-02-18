-- ============================================
-- MIGRATION: Table temporaire pour réservations en attente de paiement
-- Les données ne sont transférées dans 'reservations' qu'après paiement confirmé
-- ============================================

CREATE TABLE IF NOT EXISTS reservations_temp (
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
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_temp_property_id ON reservations_temp(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_temp_created_at ON reservations_temp(created_at);

COMMENT ON TABLE reservations_temp IS 'Réservations en attente de paiement. Transférées vers reservations à la confirmation du paiement.';
