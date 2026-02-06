-- ============================================
-- MIGRATION SIMPLE: Ajouter 'pending_signature' au statut des baux
-- Version simplifiée si vous connaissez le nom exact de la contrainte
-- ============================================

-- Méthode 1: Si vous connaissez le nom exact de la contrainte
-- (Remplacez 'leases_status_check' par le nom réel de votre contrainte)
-- ALTER TABLE leases DROP CONSTRAINT IF EXISTS leases_status_check;
-- ALTER TABLE leases ADD CONSTRAINT leases_status_check 
--   CHECK (status IN ('pending_signature', 'active', 'expired', 'terminated'));

-- Méthode 2: Méthode automatique (recommandée)
-- Supprime toutes les contraintes CHECK sur status et en crée une nouvelle
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Supprimer toutes les contraintes CHECK sur la colonne status
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'leases'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE leases DROP CONSTRAINT %I', constraint_record.conname);
        RAISE NOTICE 'Contrainte % supprimée', constraint_record.conname;
    END LOOP;
END $$;

-- Ajouter la nouvelle contrainte avec 'pending_signature'
ALTER TABLE leases 
ADD CONSTRAINT leases_status_check 
CHECK (status IN ('pending_signature', 'active', 'expired', 'terminated'));

-- Mettre à jour la valeur par défaut (optionnel)
ALTER TABLE leases 
ALTER COLUMN status SET DEFAULT 'pending_signature';

-- Vérification
SELECT 
    'Migration terminée avec succès!' AS message,
    'pending_signature' AS nouvelle_valeur_ajoutee,
    'pending_signature' AS nouvelle_valeur_par_defaut;

