-- ============================================
-- MIGRATION: Ajout des colonnes advance_rent_amount et payment_due_day à la table leases
-- Date: 2026-02-04
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Ajouter la colonne advance_rent_amount (montant d'avance sur loyer)
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS advance_rent_amount DECIMAL(15, 2);

-- Ajouter la colonne payment_due_day (jour d'échéance de paiement, 1-31)
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS payment_due_day INTEGER CHECK (payment_due_day >= 1 AND payment_due_day <= 31);

-- Ajouter un commentaire pour documenter les colonnes
COMMENT ON COLUMN leases.advance_rent_amount IS 'Montant d''avance sur loyer payé par le locataire lors de la signature du bail';
COMMENT ON COLUMN leases.payment_due_day IS 'Jour du mois où le locataire doit payer le loyer (1-31). Au-delà de ce jour, le paiement est considéré comme impayé.';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
