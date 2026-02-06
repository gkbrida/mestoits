-- ============================================
-- MIGRATION: Mise à jour des RLS policies pour la table visits
-- Permettre aux visiteurs de voir leurs visites par email
-- Date: 2025-12-08
-- ============================================

-- Supprimer l'ancienne policy pour les visiteurs (si elle existe)
DROP POLICY IF EXISTS "Visiteurs peuvent voir leurs visites" ON visits;

-- Créer une nouvelle policy qui permet aux visiteurs de voir leurs visites
-- soit par visitor_id, soit par visitor_email correspondant à leur email
CREATE POLICY "Visiteurs peuvent voir leurs visites"
    ON visits FOR SELECT
    USING (
        -- Le visiteur peut voir la visite si :
        -- 1. Il est le visiteur avec un compte (visitor_id correspond)
        visitor_id = auth.uid()
        -- 2. OU son email correspond à visitor_email (même sans visitor_id renseigné)
        -- Note: On utilise une sous-requête pour récupérer l'email de l'utilisateur connecté
        OR (
            visitor_id IS NULL 
            AND visitor_email IN (
                SELECT email 
                FROM users_2025_12_01_11_29 
                WHERE id = auth.uid()
            )
        )
    );

-- Note: La policy pour les propriétaires reste inchangée
-- Les propriétaires peuvent toujours voir toutes les visites de leurs biens
-- via la policy "Propriétaires peuvent voir leurs visites"

