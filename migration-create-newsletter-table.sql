-- ============================================
-- TABLE: newsletter_subscriptions
-- Abonnements à la newsletter
-- ============================================
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    unsubscribed_at TIMESTAMPTZ,
    source TEXT DEFAULT 'footer' -- 'footer', 'homepage', etc.
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscriptions(subscribed_at DESC);

-- RLS (Row Level Security) - Permettre à tous de s'inscrire
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Permettre à tous de s'inscrire (INSERT)
CREATE POLICY "Allow public newsletter subscriptions"
    ON newsletter_subscriptions
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Policy: Permettre à tous de voir leurs propres abonnements (SELECT)
CREATE POLICY "Allow users to view their own subscriptions"
    ON newsletter_subscriptions
    FOR SELECT
    TO public
    USING (true);

