-- ============================================
-- MIGRATION: Colonne source pour distinguer réservations propriétaire vs plateforme
-- Réservations "plateforme" = client a réservé via bien-detail
-- Réservations "owner" = propriétaire a créé manuellement dans ReservationsPage
-- ============================================

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'owner' CHECK (source IN ('owner', 'platform'));

COMMENT ON COLUMN reservations.source IS 'owner = créée par le propriétaire, platform = réservation effectuée par le client sur la plateforme';
