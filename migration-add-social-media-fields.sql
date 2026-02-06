-- ============================================
-- MIGRATION: Ajout des champs pour les réseaux sociaux
-- Date: 2025-12-08
-- ============================================

-- Ajouter la colonne facebook_url pour le lien Facebook
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- Ajouter la colonne instagram_url pour le lien Instagram
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- Ajouter la colonne linkedin_url pour le lien LinkedIn
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN users_2025_12_01_11_29.facebook_url IS 'URL du profil Facebook professionnel';
COMMENT ON COLUMN users_2025_12_01_11_29.instagram_url IS 'URL du profil Instagram professionnel';
COMMENT ON COLUMN users_2025_12_01_11_29.linkedin_url IS 'URL du profil LinkedIn professionnel';

