-- ============================================
-- MIGRATION: Création table wallet_withdrawals
-- Encaissements (virements auto ou manuels)
-- À exécuter dans Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    withdrawal_type TEXT CHECK (withdrawal_type IN ('automatic', 'manual')) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user_id ON wallet_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_created_at ON wallet_withdrawals(created_at DESC);

ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals"
    ON wallet_withdrawals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals"
    ON wallet_withdrawals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE wallet_withdrawals IS 'Encaissements (virement automatique du lundi ou encaissement manuel)';
