-- ============================================
-- MIGRATION: Ajout des informations du payeur aux plans de paiement échelonnés
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Ajouter les colonnes pour les informations du payeur
ALTER TABLE installment_plans 
ADD COLUMN IF NOT EXISTS payer_first_name TEXT,
ADD COLUMN IF NOT EXISTS payer_last_name TEXT,
ADD COLUMN IF NOT EXISTS payer_birth_date DATE,
ADD COLUMN IF NOT EXISTS payer_phone TEXT,
ADD COLUMN IF NOT EXISTS payer_email TEXT,
ADD COLUMN IF NOT EXISTS payer_address TEXT;

-- Commentaires
COMMENT ON COLUMN installment_plans.payer_first_name IS 'Prénom du payeur';
COMMENT ON COLUMN installment_plans.payer_last_name IS 'Nom du payeur';
COMMENT ON COLUMN installment_plans.payer_birth_date IS 'Date de naissance du payeur';
COMMENT ON COLUMN installment_plans.payer_phone IS 'Numéro de téléphone du payeur';
COMMENT ON COLUMN installment_plans.payer_email IS 'Email du payeur';
COMMENT ON COLUMN installment_plans.payer_address IS 'Adresse du payeur';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
