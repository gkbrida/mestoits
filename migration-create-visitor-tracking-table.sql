-- ============================================
-- TABLE: visitor_tracking
-- Tracking des visiteurs anonymes du site
-- ============================================
CREATE TABLE IF NOT EXISTS visitor_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identifiant anonyme du visiteur (stocké dans localStorage)
    visitor_id TEXT,
    
    -- Informations de session
    session_id TEXT NOT NULL,
    
    -- Informations de navigation
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    
    -- Informations du navigateur
    user_agent TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    
    -- Informations réseau (anonymisées)
    ip_hash TEXT, -- Hash SHA-256 de l'IP pour respecter la vie privée
    
    -- Informations géographiques (optionnelles, via API externe)
    country TEXT,
    region TEXT,
    city TEXT,
    
    -- Informations de l'écran
    screen_width INTEGER,
    screen_height INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    
    -- Métriques de session
    session_start TIMESTAMPTZ DEFAULT NOW(),
    session_end TIMESTAMPTZ,
    time_on_page INTEGER, -- en secondes
    
    -- Informations supplémentaires
    language TEXT,
    timezone TEXT,
    
    -- Lien avec utilisateur (si connecté plus tard)
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE SET NULL,
    
    -- Métadonnées
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_visitor_id ON visitor_tracking(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_session_id ON visitor_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_page_path ON visitor_tracking(page_path);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_created_at ON visitor_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_user_id ON visitor_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_device_type ON visitor_tracking(device_type);
CREATE INDEX IF NOT EXISTS idx_visitor_tracking_country ON visitor_tracking(country);

-- RLS (Row Level Security)
ALTER TABLE visitor_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut insérer des données de tracking (visiteurs anonymes)
CREATE POLICY "Anyone can insert visitor tracking"
    ON visitor_tracking FOR INSERT
    WITH CHECK (true);

-- Policy: Seuls les admins peuvent voir toutes les données de tracking
-- (Vous pouvez créer un rôle admin si nécessaire)
-- Pour l'instant, personne ne peut voir les données (sécurité par défaut)
CREATE POLICY "No one can view visitor tracking by default"
    ON visitor_tracking FOR SELECT
    USING (false);

-- Commentaire sur la table
COMMENT ON TABLE visitor_tracking IS 'Table pour tracker les visiteurs anonymes du site web';
COMMENT ON COLUMN visitor_tracking.visitor_id IS 'Identifiant anonyme unique du visiteur (stocké dans localStorage)';
COMMENT ON COLUMN visitor_tracking.session_id IS 'Identifiant de session unique';
COMMENT ON COLUMN visitor_tracking.ip_hash IS 'Hash SHA-256 de l''adresse IP pour respecter la vie privée';

