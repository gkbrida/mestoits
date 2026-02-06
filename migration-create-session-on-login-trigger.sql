-- ============================================
-- MIGRATION: Trigger pour créer automatiquement une session lors de la connexion
-- Date: 2025-12-08
-- Note: Ce trigger nécessite une Edge Function ou une logique côté client
-- Pour l'instant, les sessions sont créées côté client dans SecurityTab.tsx
-- ============================================

-- Fonction pour nettoyer les sessions expirées (plus de 30 jours d'inactivité)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions
    WHERE last_active_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Note: Pour créer automatiquement une session lors de la connexion,
-- vous pouvez utiliser une Edge Function Supabase qui écoute l'événement auth.users
-- ou créer la session côté client lors du chargement de SecurityTab (déjà implémenté)


