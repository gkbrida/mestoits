-- ============================================
-- MIGRATION: Ajout des champs TikTok et YouTube
-- Date: 2025-12-08
-- ============================================

-- Ajouter la colonne tiktok_url pour le lien TikTok
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS tiktok_url TEXT;

-- Ajouter la colonne youtube_url pour le lien YouTube
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN users_2025_12_01_11_29.tiktok_url IS 'URL du profil TikTok professionnel';
COMMENT ON COLUMN users_2025_12_01_11_29.youtube_url IS 'URL de la chaîne YouTube professionnelle';

