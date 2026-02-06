-- ============================================
-- MIGRATION: Ajout d'une contrainte CHECK pour le statut de vérification
-- Date: 2025-12-08
-- ============================================

-- Ajouter une contrainte CHECK pour limiter les valeurs possibles du statut
-- Valeurs possibles :
--   - 'pending' : En attente de vérification (par défaut)
--   - 'under_review' : En cours de vérification
--   - 'verified' : Vérifié et approuvé
--   - 'rejected' : Rejeté (documents insuffisants ou invalides)

-- Supprimer la contrainte existante si elle existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_status_check' 
        AND conrelid = 'users_2025_12_01_11_29'::regclass
    ) THEN
        ALTER TABLE users_2025_12_01_11_29 DROP CONSTRAINT users_status_check;
    END IF;
END $$;

-- Ajouter la nouvelle contrainte CHECK
ALTER TABLE users_2025_12_01_11_29
ADD CONSTRAINT users_status_check
CHECK (status IS NULL OR status IN ('pending', 'under_review', 'verified', 'rejected'));

-- Mettre à jour les valeurs NULL en 'pending' pour les professionnels existants
UPDATE users_2025_12_01_11_29
SET status = 'pending'
WHERE user_type = 'professional' AND (status IS NULL OR status = '');

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN users_2025_12_01_11_29.status IS 'Statut de vérification du compte professionnel : pending (en attente), under_review (en cours), verified (vérifié), rejected (rejeté)';

