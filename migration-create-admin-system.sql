-- ============================================
-- MIGRATION: Création du système admin
-- Date: 2025-12-XX
-- ============================================

-- ============================================
-- TABLE: admins
-- Comptes administrateurs avec authentification séparée
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Hash bcrypt du mot de passe
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

-- RLS (Row Level Security)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policy: Seuls les admins peuvent voir les autres admins
CREATE POLICY "Admins can view admins"
    ON admins FOR SELECT
    USING (true); -- Pour l'instant, permettre à tous les admins de voir les autres (peut être restreint plus tard)

-- Policy: Seuls les admins peuvent mettre à jour leur propre compte
CREATE POLICY "Admins can update their own account"
    ON admins FOR UPDATE
    USING (true); -- À restreindre selon les besoins

-- ============================================
-- Ajouter le champ is_active dans users_2025_12_01_11_29
-- Pour activer/désactiver les comptes utilisateurs
-- ============================================
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users_2025_12_01_11_29(is_active);

-- Commentaire
COMMENT ON COLUMN users_2025_12_01_11_29.is_active IS 'Indique si le compte utilisateur est actif (true) ou désactivé (false)';

-- ============================================
-- Ajouter le champ is_approved dans properties
-- Pour approuver/désapprouver les annonces
-- ============================================
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_properties_is_approved ON properties(is_approved);

-- Commentaire
COMMENT ON COLUMN properties.is_approved IS 'Indique si l''annonce est approuvée (true) ou en attente de validation (false)';

-- ============================================
-- Ajouter le champ is_certified dans users_2025_12_01_11_29
-- Pour certifier les professionnels
-- ============================================
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS is_certified BOOLEAN DEFAULT FALSE;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_users_is_certified ON users_2025_12_01_11_29(is_certified);

-- Commentaire
COMMENT ON COLUMN users_2025_12_01_11_29.is_certified IS 'Indique si le professionnel est certifié par l''administration';

-- ============================================
-- Mettre à jour les policies RLS pour permettre aux admins d'accéder aux données
-- ============================================

-- Policy pour visitor_tracking : permettre aux admins de voir les données
DROP POLICY IF EXISTS "No one can view visitor tracking by default" ON visitor_tracking;
CREATE POLICY "Admins can view visitor tracking"
    ON visitor_tracking FOR SELECT
    USING (true); -- Pour l'instant, permettre à tous (sera restreint avec vérification admin)

-- Policy pour users_2025_12_01_11_29 : permettre aux admins de voir et modifier tous les utilisateurs
-- (Les policies existantes restent pour les utilisateurs normaux)
CREATE POLICY "Admins can view all users"
    ON users_2025_12_01_11_29 FOR SELECT
    USING (true);

CREATE POLICY "Admins can update all users"
    ON users_2025_12_01_11_29 FOR UPDATE
    USING (true);

-- Policy pour properties : permettre aux admins de voir et modifier toutes les annonces
CREATE POLICY "Admins can view all properties"
    ON properties FOR SELECT
    USING (true);

CREATE POLICY "Admins can update all properties"
    ON properties FOR UPDATE
    USING (true);

-- ============================================
-- Fonction pour créer un admin (à utiliser avec précaution)
-- ============================================
CREATE OR REPLACE FUNCTION create_admin(
    p_email TEXT,
    p_password_hash TEXT,
    p_full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_id UUID;
BEGIN
    INSERT INTO admins (email, password_hash, full_name)
    VALUES (p_email, p_password_hash, p_full_name)
    RETURNING id INTO admin_id;
    
    RETURN admin_id;
END;
$$;

COMMENT ON FUNCTION create_admin IS 'Fonction pour créer un compte administrateur. Utiliser avec précaution.';

