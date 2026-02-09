-- ============================================
-- MIGRATION: Système d'abonnement et de commissions
-- ============================================

-- ============================================
-- TABLE: subscription_plans
-- Plans d'abonnement disponibles
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_type TEXT CHECK (user_type IN ('individual', 'professional')) NOT NULL,
    plan_type TEXT NOT NULL, -- 'free', 'directory_only', 'properties_only', 'full_access', 'publish_only'
    price DECIMAL(15, 2) DEFAULT 0, -- Prix en FCFA
    currency TEXT DEFAULT 'XOF',
    features JSONB, -- Fonctionnalités incluses
    restrictions JSONB, -- Restrictions (ex: max_properties_per_period, period_days)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: user_subscriptions
-- Abonnements actifs des utilisateurs
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE RESTRICT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL pour les abonnements sans fin
    status TEXT CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index unique partiel pour garantir qu'un utilisateur n'a qu'un seul plan actif à la fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_unique_active 
ON user_subscriptions(user_id, plan_id) 
WHERE status = 'active';

-- ============================================
-- TABLE: commissions
-- Commissions prélevées sur les transactions
-- ============================================
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT CHECK (transaction_type IN ('reservation', 'rent_payment', 'installment_payment')) NOT NULL,
    transaction_id UUID NOT NULL, -- ID de la réservation, paiement de loyer ou paiement échelonné
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE SET NULL, -- Utilisateur qui paie
    amount DECIMAL(15, 2) NOT NULL, -- Montant de la transaction
    commission_rate DECIMAL(5, 2) NOT NULL, -- Taux de commission en pourcentage
    commission_amount DECIMAL(15, 2) NOT NULL, -- Montant de la commission
    status TEXT CHECK (status IN ('pending', 'collected', 'refunded')) DEFAULT 'pending',
    collected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: platform_settings
-- Paramètres de la plateforme
-- ============================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: property_publications
-- Suivi des publications pour les restrictions
-- ============================================
CREATE TABLE IF NOT EXISTS property_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    property_id UUID NOT NULL, -- Peut référencer properties_02 ou properties
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_subscription_plans_user_type ON subscription_plans(user_type);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_type ON subscription_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_transaction_type ON commissions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_commissions_transaction_id ON commissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_property_publications_user_id ON property_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_property_publications_published_at ON property_publications(published_at);

-- Insérer les plans d'abonnement par défaut
INSERT INTO subscription_plans (name, description, user_type, plan_type, price, features, restrictions) VALUES
-- Particuliers
('Gratuit', '1 annonce tous les 3 mois, pas d''accès à la gestion locative', 'individual', 'free', 0, 
 '{"can_publish": true, "can_access_rental_management": false, "can_access_directory": false}'::jsonb,
 '{"max_properties_per_period": 1, "period_days": 90}'::jsonb),
('Publication uniquement', 'Publication illimitée d''annonces, pas d''accès à la gestion locative', 'individual', 'publish_only', 0,
 '{"can_publish": true, "can_access_rental_management": false, "can_access_directory": false}'::jsonb,
 '{"max_properties_per_period": null, "period_days": null}'::jsonb),
-- Professionnels
('Annuaire uniquement', 'Présence dans l''annuaire des professionnels uniquement', 'professional', 'directory_only', 0,
 '{"can_publish": false, "can_access_rental_management": false, "can_access_directory": true}'::jsonb,
 '{"max_properties_per_period": 0, "period_days": null}'::jsonb),
('Publication uniquement', 'Publication de biens uniquement, pas d''accès à la gestion locative', 'professional', 'properties_only', 0,
 '{"can_publish": true, "can_access_rental_management": false, "can_access_directory": false}'::jsonb,
 '{"max_properties_per_period": null, "period_days": null}'::jsonb),
('Accès complet', 'Accès à toutes les fonctionnalités : gestion locative, annuaire et publication', 'professional', 'full_access', 0,
 '{"can_publish": true, "can_access_rental_management": true, "can_access_directory": true}'::jsonb,
 '{"max_properties_per_period": null, "period_days": null}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insérer les paramètres par défaut de la plateforme
INSERT INTO platform_settings (key, value, description) VALUES
('subscription_restrictions_enabled', 'true'::jsonb, 'Activer/désactiver les restrictions d''abonnement'),
('commission_reservation_rate', '5.0'::jsonb, 'Taux de commission sur les réservations (%)'),
('commission_rent_rate', '3.0'::jsonb, 'Taux de commission sur les paiements de loyer (%)'),
('commission_installment_rate', '3.0'::jsonb, 'Taux de commission sur les paiements échelonnés (%)')
ON CONFLICT (key) DO NOTHING;

-- Fonction pour obtenir le plan actif d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_active_plan(user_uuid UUID)
RETURNS TABLE (
    plan_id UUID,
    plan_type TEXT,
    features JSONB,
    restrictions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.plan_type,
        sp.features,
        sp.restrictions
    FROM subscription_plans sp
    INNER JOIN user_subscriptions us ON us.plan_id = sp.id
    WHERE us.user_id = user_uuid
        AND us.status = 'active'
        AND (us.end_date IS NULL OR us.end_date >= CURRENT_DATE)
    ORDER BY us.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un utilisateur peut publier une annonce
CREATE OR REPLACE FUNCTION can_user_publish_property(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    restrictions_enabled BOOLEAN;
    user_plan RECORD;
    properties_count INTEGER;
    period_days INTEGER;
BEGIN
    -- Vérifier si les restrictions sont activées
    SELECT (value::text::boolean) INTO restrictions_enabled
    FROM platform_settings
    WHERE key = 'subscription_restrictions_enabled';
    
    -- Si les restrictions sont désactivées, autoriser
    IF NOT restrictions_enabled THEN
        RETURN TRUE;
    END IF;
    
    -- Obtenir le plan actif de l'utilisateur
    SELECT * INTO user_plan FROM get_user_active_plan(user_uuid);
    
    -- Si pas de plan actif, utiliser le plan gratuit par défaut
    IF user_plan.plan_id IS NULL THEN
        SELECT * INTO user_plan
        FROM subscription_plans
        WHERE user_type = (SELECT user_type FROM users_2025_12_01_11_29 WHERE id = user_uuid)
            AND plan_type = 'free'
        LIMIT 1;
    END IF;
    
    -- Vérifier les fonctionnalités
    IF NOT (user_plan.features->>'can_publish')::boolean THEN
        RETURN FALSE;
    END IF;
    
    -- Vérifier les restrictions de nombre
    IF user_plan.restrictions->>'max_properties_per_period' IS NOT NULL THEN
        period_days := COALESCE((user_plan.restrictions->>'period_days')::integer, 90);
        
        SELECT COUNT(*) INTO properties_count
        FROM property_publications
        WHERE user_id = user_uuid
            AND published_at >= CURRENT_DATE - (period_days || ' days')::interval;
        
        IF properties_count >= (user_plan.restrictions->>'max_properties_per_period')::integer THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier si un utilisateur peut accéder à la gestion locative
CREATE OR REPLACE FUNCTION can_user_access_rental_management(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    restrictions_enabled BOOLEAN;
    user_plan RECORD;
BEGIN
    -- Vérifier si les restrictions sont activées
    SELECT (value::text::boolean) INTO restrictions_enabled
    FROM platform_settings
    WHERE key = 'subscription_restrictions_enabled';
    
    -- Si les restrictions sont désactivées, autoriser
    IF NOT restrictions_enabled THEN
        RETURN TRUE;
    END IF;
    
    -- Obtenir le plan actif de l'utilisateur
    SELECT * INTO user_plan FROM get_user_active_plan(user_uuid);
    
    -- Si pas de plan actif, utiliser le plan gratuit par défaut
    IF user_plan.plan_id IS NULL THEN
        SELECT * INTO user_plan
        FROM subscription_plans
        WHERE user_type = (SELECT user_type FROM users_2025_12_01_11_29 WHERE id = user_uuid)
            AND plan_type = 'free'
        LIMIT 1;
    END IF;
    
    -- Vérifier les fonctionnalités
    RETURN (user_plan.features->>'can_access_rental_management')::boolean;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commissions_updated_at
    BEFORE UPDATE ON commissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
