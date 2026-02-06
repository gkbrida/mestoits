-- ============================================
-- MIGRATION: Rendre payment_date nullable dans payments
-- Date: 2025-12-08
-- ============================================
-- Cette migration permet d'avoir des paiements en attente
-- sans date de paiement (payment_date peut être NULL)

-- Modifier la colonne payment_date pour permettre NULL
ALTER TABLE payments
ALTER COLUMN payment_date DROP NOT NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN payments.payment_date IS 'Date de paiement effectif. NULL pour les paiements en attente.';

