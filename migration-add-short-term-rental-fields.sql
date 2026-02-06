-- ============================================
-- MIGRATION: Ajout des champs pour location courte durée
-- Date: 2026-02-01
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Ajouter les colonnes pour la location courte durée dans properties_02
ALTER TABLE properties_02
ADD COLUMN IF NOT EXISTS check_in_time TIME, -- Heure d'arrivée (format HH:mm)
ADD COLUMN IF NOT EXISTS check_out_time TIME, -- Heure de départ (format HH:mm)
ADD COLUMN IF NOT EXISTS min_nights INTEGER DEFAULT 1 CHECK (min_nights > 0); -- Nombre minimal de nuitées à réserver

-- Commentaires pour documentation
COMMENT ON COLUMN properties_02.check_in_time IS 'Heure d''arrivée pour les locations courte durée (format HH:mm)';
COMMENT ON COLUMN properties_02.check_out_time IS 'Heure de départ pour les locations courte durée (format HH:mm)';
COMMENT ON COLUMN properties_02.min_nights IS 'Nombre minimal de nuitées requises pour une réservation en location courte durée';

-- Index pour améliorer les performances des requêtes de recherche
CREATE INDEX IF NOT EXISTS idx_properties_02_min_nights ON properties_02(min_nights) WHERE operation_type = 'short-term-rental';
