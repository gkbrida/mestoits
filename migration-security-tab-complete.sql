-- ============================================
-- MIGRATION COMPLÈTE: Sécurité et préférences utilisateur
-- Date: 2025-12-08
-- Description: Toutes les migrations nécessaires pour la page SecurityTab
-- ============================================

-- ============================================
-- 1. Ajout des colonnes de préférences de sécurité
-- ============================================
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT FALSE;

-- Commentaires pour documentation
COMMENT ON COLUMN users_2025_12_01_11_29.two_factor_enabled IS 'Indique si l''authentification à deux facteurs est activée pour l''utilisateur';
COMMENT ON COLUMN users_2025_12_01_11_29.email_notifications IS 'Indique si l''utilisateur souhaite recevoir des notifications par email';
COMMENT ON COLUMN users_2025_12_01_11_29.sms_notifications IS 'Indique si l''utilisateur souhaite recevoir des notifications par SMS';

-- ============================================
-- 2. Création de la table user_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL, -- Token de session Supabase
    device_name TEXT NOT NULL, -- Ex: "Chrome sur Windows"
    device_type TEXT, -- Ex: "desktop", "mobile", "tablet"
    browser TEXT, -- Ex: "Chrome", "Safari", "Firefox"
    os TEXT, -- Ex: "Windows", "macOS", "iOS", "Android"
    ip_address TEXT,
    location TEXT, -- Ex: "Paris, France"
    user_agent TEXT, -- User agent complet
    is_current BOOLEAN DEFAULT FALSE, -- True pour la session actuelle
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active_at DESC);

-- Contrainte unique pour éviter les doublons de session_token par utilisateur
-- Supprimer d'abord les doublons existants si nécessaire
DO $$
BEGIN
    -- Supprimer les doublons en gardant le plus récent
    DELETE FROM user_sessions
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY user_id, session_token ORDER BY last_active_at DESC) as rn
            FROM user_sessions
        ) t
        WHERE t.rn > 1
    );
END $$;

-- Créer la contrainte unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_unique_token 
ON user_sessions(user_id, session_token);

-- RLS (Row Level Security)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres sessions
CREATE POLICY "Users can view their own sessions"
    ON user_sessions FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Les utilisateurs peuvent créer leurs propres sessions
CREATE POLICY "Users can create their own sessions"
    ON user_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres sessions
CREATE POLICY "Users can update their own sessions"
    ON user_sessions FOR UPDATE
    USING (user_id = auth.uid());

-- Policy: Les utilisateurs peuvent supprimer leurs propres sessions
CREATE POLICY "Users can delete their own sessions"
    ON user_sessions FOR DELETE
    USING (user_id = auth.uid());

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_user_sessions_updated_at_trigger ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at_trigger
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_sessions_updated_at();

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
-- Vérifications à effectuer après l'exécution :
-- 1. Vérifier que les colonnes existent dans users_2025_12_01_11_29
-- 2. Vérifier que la table user_sessions existe
-- 3. Vérifier que les politiques RLS sont actives
-- 4. Tester les opérations CRUD sur user_sessions avec un utilisateur connecté

