-- ============================================
-- MIGRATION: Création table wallet_payout_accounts
-- Comptes bancaires / Mobile Money pour encaissement
-- À exécuter dans Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS wallet_payout_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    payout_type TEXT CHECK (payout_type IN ('bank', 'mobile_money')) NOT NULL,
    account_holder_name TEXT NOT NULL,
    -- Banque
    bank_name TEXT,
    iban TEXT,
    -- Mobile Money
    mobile_phone TEXT,
    mobile_operator TEXT,
    is_default BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_payout_accounts_user_id ON wallet_payout_accounts(user_id);

ALTER TABLE wallet_payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout account"
    ON wallet_payout_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payout account"
    ON wallet_payout_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payout account"
    ON wallet_payout_accounts FOR UPDATE
    USING (auth.uid() = user_id);

COMMENT ON TABLE wallet_payout_accounts IS 'Comptes pour encaissement du portefeuille (bancaire ou Mobile Money)';
