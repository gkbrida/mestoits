-- ============================================
-- MIGRATION: Ajouter le statut 'pending_signature' à la table leases
-- Date: 2025-12-08
-- ============================================

-- Étape 1: Supprimer la contrainte CHECK existante sur la colonne status
-- Note: PostgreSQL ne permet pas de modifier directement une contrainte CHECK,
-- il faut donc la supprimer et en créer une nouvelle.

-- Trouver le nom de la contrainte (généralement PostgreSQL génère un nom automatique)
-- Si vous connaissez le nom exact, utilisez-le, sinon cette requête le trouvera
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Trouver le nom de la contrainte CHECK sur status
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'leases'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%IN%';
    
    -- Supprimer la contrainte si elle existe
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE leases DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Contrainte % supprimée', constraint_name;
    ELSE
        RAISE NOTICE 'Aucune contrainte CHECK trouvée sur status';
    END IF;
END $$;

-- Étape 2: Ajouter la nouvelle contrainte CHECK avec 'pending_signature' inclus
ALTER TABLE leases 
ADD CONSTRAINT leases_status_check 
CHECK (status IN ('pending_signature', 'active', 'expired', 'terminated'));

-- Étape 3: Mettre à jour la valeur par défaut pour les nouveaux baux
-- (Optionnel: seulement si vous voulez que 'pending_signature' soit la valeur par défaut)
ALTER TABLE leases 
ALTER COLUMN status SET DEFAULT 'pending_signature';

-- Étape 4: Vérification - Afficher la structure mise à jour
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'leases' 
  AND column_name = 'status';

-- Étape 5: Vérifier que la contrainte est bien appliquée
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'leases'::regclass
  AND conname = 'leases_status_check';

-- ============================================
-- NOTES:
-- ============================================
-- 1. Cette migration ajoute 'pending_signature' aux valeurs autorisées
-- 2. Les baux existants avec 'active' restent inchangés
-- 3. Les nouveaux baux auront 'pending_signature' par défaut
-- 4. Si vous voulez garder 'active' comme valeur par défaut, 
--    commentez l'étape 3 (ALTER COLUMN ... SET DEFAULT)

