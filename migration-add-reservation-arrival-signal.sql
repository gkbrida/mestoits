-- ============================================
-- MIGRATION: Signaler l'arrivée du client dans le logement
-- Le client peut confirmer son arrivée dès que la réservation a débuté
-- ============================================

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS arrival_signaled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS arrival_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN reservations.arrival_signaled_at IS 'Date/heure à laquelle le client a signalé son arrivée dans le logement';
COMMENT ON COLUMN reservations.arrival_reminder_sent_at IS 'Date/heure à laquelle le rappel de signaler l''arrivée a été envoyé au locataire';
