-- ============================================
-- MIGRATION: Ajout de la colonne payment_due_day à la table installment_plans
-- Date: 2026-02-01
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Ajouter la colonne payment_due_day (jour d'échéance de paiement, 1-31)
ALTER TABLE installment_plans
ADD COLUMN IF NOT EXISTS payment_due_day INTEGER CHECK (payment_due_day >= 1 AND payment_due_day <= 31);

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN installment_plans.payment_due_day IS 'Jour du mois où le payeur doit effectuer les paiements (1-31). Utilisé pour les fréquences mensuelles et trimestrielles.';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
