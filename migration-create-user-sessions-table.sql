-- ============================================
-- MIGRATION: Création de la table user_sessions
-- Date: 2025-12-08
-- ============================================

-- Table pour stocker les sessions actives des utilisateurs
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
CREATE TRIGGER update_user_sessions_updated_at_trigger
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_sessions_updated_at();


