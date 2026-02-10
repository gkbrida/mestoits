-- ============================================
-- MIGRATION: Ajout de politique RLS pour permettre aux locataires d'accéder aux propriétés
-- Date: 2026-02-01
-- À exécuter dans Supabase SQL Editor
-- 
-- Cette migration ajoute une politique RLS sur properties_02 pour permettre
-- aux locataires de voir les propriétés liées à leurs baux actifs
-- ============================================

-- Supprimer la politique existante si elle existe (pour éviter les conflits)
DROP POLICY IF EXISTS "Tenants can view properties from their leases" ON properties_02;

-- Créer une politique RLS qui permet aux locataires de voir les propriétés liées à leurs baux
-- Un locataire peut voir une propriété si :
-- 1. Il existe un bail (lease) qui référence cette propriété (property_02_id)
-- 2. Le locataire (tenant) associé à ce bail a le même email que l'utilisateur authentifié
-- 3. Le bail est actif ou en attente de signature
CREATE POLICY "Tenants can view properties from their leases"
    ON properties_02 FOR SELECT
    USING (
        -- Vérifier si l'utilisateur authentifié correspond à un locataire avec un bail actif
        EXISTS (
            SELECT 1
            FROM leases l
            INNER JOIN tenants t ON t.id = l.tenant_id
            INNER JOIN users_2025_12_01_11_29 u ON u.email = t.email
            WHERE l.property_02_id = properties_02.id
            AND u.id = auth.uid()
            AND l.status IN ('active', 'pending_signature', 'expired')
        )
    );

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Pour vérifier que la politique a été créée correctement :
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE tablename = 'properties_02'
-- ORDER BY policyname;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
