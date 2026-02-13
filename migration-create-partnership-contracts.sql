-- ============================================
-- MIGRATION: Contrats de partenariat d'affiliation
-- Table + fonction stats admin
-- ============================================

CREATE TABLE IF NOT EXISTS partnership_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL UNIQUE,
    percentage DECIMAL(5, 2) NOT NULL,
    duration_months INTEGER NOT NULL,
    obligations TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partnership_contracts_user_id ON partnership_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_partnership_contracts_signed_at ON partnership_contracts(signed_at);

DROP TRIGGER IF EXISTS update_partnership_contracts_updated_at ON partnership_contracts;
CREATE TRIGGER update_partnership_contracts_updated_at
    BEFORE UPDATE ON partnership_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: les utilisateurs peuvent lire leur propre contrat
ALTER TABLE partnership_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own partnership contract" ON partnership_contracts;
CREATE POLICY "Users can read own partnership contract" ON partnership_contracts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own partnership contract" ON partnership_contracts;
CREATE POLICY "Users can insert own partnership contract" ON partnership_contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own partnership contract" ON partnership_contracts;
CREATE POLICY "Users can update own partnership contract" ON partnership_contracts
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role pour admin (lecture via API)
DROP POLICY IF EXISTS "Service role full access" ON partnership_contracts;
CREATE POLICY "Service role full access" ON partnership_contracts
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Fonction: statistiques des partenaires pour l'admin
CREATE OR REPLACE FUNCTION get_admin_affiliation_partners_stats()
RETURNS TABLE(
    partner_id UUID,
    partner_name TEXT,
    partner_email TEXT,
    nb_affiliates BIGINT,
    total_commissions DECIMAL(15, 2),
    total_platform_revenue DECIMAL(15, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH partner_stats AS (
        SELECT
            pc.user_id AS pid,
            u.full_name AS pname,
            u.email AS pemail,
            (SELECT COUNT(*) FROM users_2025_12_01_11_29 u2 WHERE u2.affiliated_by = pc.user_id) AS naf,
            (SELECT COALESCE(SUM(r.affiliate_earnings), 0) FROM get_affiliation_revenues_by_affiliate(pc.user_id, NULL, NULL) r) AS tcomm,
            (SELECT COALESCE(SUM(r.total_revenue), 0) FROM get_affiliation_revenues_by_affiliate(pc.user_id, NULL, NULL) r) AS trev
        FROM partnership_contracts pc
        JOIN users_2025_12_01_11_29 u ON u.id = pc.user_id
        WHERE pc.signed_at IS NOT NULL
    )
    SELECT
        ps.pid,
        COALESCE(ps.pname, '—'),
        COALESCE(ps.pemail, '—'),
        ps.naf,
        ps.tcomm,
        ps.trev
    FROM partner_stats ps;
END;
$$;

-- Fonction: totaux agrégés pour l'admin
CREATE OR REPLACE FUNCTION get_admin_affiliation_totals()
RETURNS TABLE(
    total_partners BIGINT,
    total_affiliates BIGINT,
    total_commissions DECIMAL(15, 2),
    total_platform_revenue DECIMAL(15, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT * FROM get_admin_affiliation_partners_stats()
    )
    SELECT
        (SELECT COUNT(*)::BIGINT FROM partnership_contracts WHERE signed_at IS NOT NULL),
        (SELECT COUNT(*)::BIGINT FROM users_2025_12_01_11_29
         WHERE affiliated_by IN (SELECT user_id FROM partnership_contracts WHERE signed_at IS NOT NULL)),
        (SELECT COALESCE(SUM(total_commissions), 0) FROM stats),
        (SELECT COALESCE(SUM(total_platform_revenue), 0) FROM stats);
END;
$$;

-- Grant pour service_role uniquement (appelé via API admin)
GRANT EXECUTE ON FUNCTION get_admin_affiliation_partners_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_affiliation_totals() TO service_role;
