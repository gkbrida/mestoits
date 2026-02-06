-- ============================================
-- MIGRATION: Ajout des colonnes manquantes pour les professionnels
-- Date: 2025-12-08
-- ============================================

-- Ajouter la colonne website pour le site web professionnel
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS website TEXT;

-- Ajouter la colonne postal_code pour le code postal de l'entreprise
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Ajouter un commentaire pour documenter les colonnes
COMMENT ON COLUMN users_2025_12_01_11_29.website IS 'Site web professionnel de l''entreprise';
COMMENT ON COLUMN users_2025_12_01_11_29.postal_code IS 'Code postal de l''adresse de l''entreprise';

