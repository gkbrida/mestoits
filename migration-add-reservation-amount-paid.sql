-- ============================================
-- MIGRATION: amount_paid pour les réservations
-- Permet de gérer le surplus lors des modifications de prix
-- ============================================

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) DEFAULT NULL;

COMMENT ON COLUMN reservations.amount_paid IS 'Montant déjà payé par le client. Si < total_amount et status=confirmed, le client doit payer le surplus.';
