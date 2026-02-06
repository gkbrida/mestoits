-- ============================================
-- MIGRATION: Ajout de la politique RLS UPDATE pour messages_2025_12_01_11_29
-- Permettre aux utilisateurs de marquer leurs messages reçus comme lus
-- Date: 2025-12-08
-- ============================================

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE messages_2025_12_01_11_29 ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent mettre à jour les messages qu'ils ont reçus
-- Cela permet de marquer les messages comme lus (read = true)
CREATE POLICY "Users can update their received messages"
    ON messages_2025_12_01_11_29 FOR UPDATE
    USING (receiver_id = auth.uid())
    WITH CHECK (receiver_id = auth.uid());

-- Note: Cette politique permet uniquement de mettre à jour les messages
-- où receiver_id correspond à l'utilisateur connecté (auth.uid())
-- Cela garantit qu'un utilisateur ne peut marquer comme lus que ses propres messages reçus

