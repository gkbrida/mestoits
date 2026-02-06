-- ============================================
-- MIGRATION: Ajout du champ media pour les messages
-- Date: 2025-12-09
-- ============================================

-- Ajouter la colonne media (JSONB) pour stocker les médias attachés aux messages
ALTER TABLE messages_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS media JSONB DEFAULT NULL;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN messages_2025_12_01_11_29.media IS 'Médias attachés au message (images, vidéos, fichiers) stockés en JSONB. Structure: [{"type": "image|video|file", "url": "...", "name": "...", "size": "...", "thumbnail": "..."}]';

-- Structure attendue du JSONB:
-- [
--   {
--     "type": "image" | "video" | "file",
--     "url": "https://...",
--     "name": "photo.jpg",
--     "size": "2.4 MB",
--     "thumbnail": "https://..." (optionnel, pour les vidéos)
--   }
-- ]

