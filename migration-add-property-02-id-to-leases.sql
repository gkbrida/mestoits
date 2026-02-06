-- ============================================
-- MIGRATION: Ajout de la colonne property_02_id à la table leases
-- Date: 2026-02-04
-- À exécuter dans Supabase SQL Editor
-- Cette colonne référence properties_02 au lieu de properties
-- ============================================

-- Ajouter la colonne property_02_id qui référence properties_02
ALTER TABLE leases
ADD COLUMN IF NOT EXISTS property_02_id UUID REFERENCES properties_02(id) ON DELETE CASCADE;

-- Rendre property_id nullable (si ce n'est pas déjà le cas)
ALTER TABLE leases
ALTER COLUMN property_id DROP NOT NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_leases_property_02_id ON leases(property_02_id);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN leases.property_02_id IS 'Référence vers properties_02. Utilisée pour les nouveaux baux. property_id peut être null pour les anciens baux.';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
