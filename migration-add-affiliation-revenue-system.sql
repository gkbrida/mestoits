-- ============================================
-- MIGRATION: Système de revenus d'affiliation
-- Durée, pourcentage par client, valeurs par défaut
-- ============================================

-- Paramètres par défaut dans platform_settings
INSERT INTO platform_settings (key, value, description) VALUES
('affiliation_default_duration_months', '12'::jsonb, 'Durée par défaut de l''affiliation en mois (revenus éligibles)'),
('affiliation_default_percentage', '10'::jsonb, 'Pourcentage par défaut des revenus pour le parrain (%)')
ON CONFLICT (key) DO NOTHING;

-- Table: paramètres d'affiliation par client (override des valeurs par défaut)
CREATE TABLE IF NOT EXISTS user_affiliation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL UNIQUE,
    duration_months INTEGER,
    percentage DECIMAL(5, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_affiliation_settings_user_id ON user_affiliation_settings(user_id);

-- Fonction: obtenir durée et % effectifs pour un parrain
CREATE OR REPLACE FUNCTION get_affiliation_effective_settings(referrer_uuid UUID)
RETURNS TABLE(duration_months INTEGER, percentage DECIMAL(5, 2))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    def_duration INTEGER;
    def_pct DECIMAL(5, 2);
    cust_duration INTEGER;
    cust_pct DECIMAL(5, 2);
BEGIN
    SELECT COALESCE((value::text)::integer, 12) INTO def_duration
    FROM platform_settings WHERE key = 'affiliation_default_duration_months' LIMIT 1;
    IF def_duration IS NULL THEN def_duration := 12; END IF;

    SELECT COALESCE((value::text)::decimal, 10) INTO def_pct
    FROM platform_settings WHERE key = 'affiliation_default_percentage' LIMIT 1;
    IF def_pct IS NULL THEN def_pct := 10; END IF;

    SELECT uas.duration_months, uas.percentage INTO cust_duration, cust_pct
    FROM user_affiliation_settings uas
    WHERE uas.user_id = referrer_uuid;

    RETURN QUERY SELECT
        COALESCE(cust_duration, def_duration),
        COALESCE(cust_pct, def_pct);
END;
$$;

-- Fonction: revenus éligibles d'un affilié pour un mois
CREATE OR REPLACE FUNCTION get_affiliate_revenue_for_month(
    affiliate_uuid UUID,
    year_val INTEGER,
    month_val INTEGER
)
RETURNS TABLE(subscription_revenue DECIMAL(15, 2), commission_revenue DECIMAL(15, 2))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    sub_rev DECIMAL(15, 2) := 0;
    comm_rev DECIMAL(15, 2) := 0;
    month_start DATE;
    month_end DATE;
BEGIN
    month_start := make_date(year_val, month_val, 1);
    month_end := (month_start + interval '1 month' - interval '1 day')::date;

    SELECT COALESCE(SUM(sp.price), 0) INTO sub_rev
    FROM user_subscriptions us
    JOIN subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = affiliate_uuid
      AND us.start_date >= month_start
      AND us.start_date <= month_end
      AND sp.price > 0;

    SELECT COALESCE(SUM(c.commission_amount), 0) INTO comm_rev
    FROM commissions c
    WHERE (
        (c.transaction_type = 'reservation' AND EXISTS (
            SELECT 1 FROM reservations r
            WHERE r.id = c.transaction_id AND r.owner_id = affiliate_uuid
        ))
        OR (c.transaction_type = 'rent_payment' AND EXISTS (
            SELECT 1 FROM payments p
            JOIN leases l ON l.id = p.lease_id
            WHERE p.id = c.transaction_id AND l.owner_id = affiliate_uuid
        ))
        OR (c.transaction_type = 'installment_payment' AND EXISTS (
            SELECT 1 FROM installment_payments ip
            JOIN installment_plans ipl ON ipl.id = ip.installment_plan_id
            WHERE ip.id = c.transaction_id AND ipl.owner_id = affiliate_uuid
        ))
    )
    AND c.created_at >= month_start::timestamp
    AND c.created_at < (month_end + 1)::timestamp;

    RETURN QUERY SELECT sub_rev, comm_rev;
END;
$$;

-- Fonction RPC: revenus par affilié et par mois pour un parrain
CREATE OR REPLACE FUNCTION get_affiliation_revenues_by_affiliate(
    referrer_uuid UUID,
    year_val INTEGER DEFAULT NULL,
    month_val INTEGER DEFAULT NULL
)
RETURNS TABLE(
    affiliate_id UUID,
    affiliate_name TEXT,
    affiliate_created_at TIMESTAMPTZ,
    year_month TEXT,
    subscription_revenue DECIMAL(15, 2),
    commission_revenue DECIMAL(15, 2),
    total_revenue DECIMAL(15, 2),
    affiliate_percentage DECIMAL(5, 2),
    affiliate_earnings DECIMAL(15, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rec RECORD;
    dur INTEGER;
    pct DECIMAL(5, 2);
    sub_rev DECIMAL(15, 2);
    comm_rev DECIMAL(15, 2);
    ym_start DATE;
    ym_end DATE;
    series_rec RECORD;
BEGIN
    SELECT * INTO dur, pct FROM get_affiliation_effective_settings(referrer_uuid);

    IF year_val IS NOT NULL AND month_val IS NOT NULL THEN
        ym_start := make_date(year_val, month_val, 1);
        ym_end := (ym_start + interval '1 month' - interval '1 day')::date;

        FOR rec IN
            SELECT u.id, u.full_name, u.created_at
            FROM users_2025_12_01_11_29 u
            WHERE u.affiliated_by = referrer_uuid
              AND u.created_at::date <= ym_end
              AND (u.created_at::date + (dur || ' months')::interval)::date >= ym_start
        LOOP
            SELECT sr, cr INTO sub_rev, comm_rev
            FROM get_affiliate_revenue_for_month(rec.id, year_val, month_val);

            IF sub_rev + comm_rev > 0 THEN
                affiliate_id := rec.id;
                affiliate_name := COALESCE(rec.full_name, 'Utilisateur');
                affiliate_created_at := rec.created_at;
                year_month := to_char(ym_start, 'YYYY-MM');
                subscription_revenue := sub_rev;
                commission_revenue := comm_rev;
                total_revenue := sub_rev + comm_rev;
                affiliate_percentage := pct;
                affiliate_earnings := ((sub_rev + comm_rev) * pct / 100);
                RETURN NEXT;
            END IF;
        END LOOP;
    ELSE
        FOR series_rec IN
            SELECT extract(year from d)::integer as y, extract(month from d)::integer as m
            FROM generate_series(
                (CURRENT_DATE - (24 || ' months')::interval)::date,
                CURRENT_DATE,
                '1 month'::interval
            ) AS d
        LOOP
            ym_start := make_date(series_rec.y, series_rec.m, 1);
            ym_end := (ym_start + interval '1 month' - interval '1 day')::date;

            FOR rec IN
                SELECT u.id, u.full_name, u.created_at
                FROM users_2025_12_01_11_29 u
                WHERE u.affiliated_by = referrer_uuid
                  AND u.created_at::date <= ym_end
                  AND (u.created_at::date + (dur || ' months')::interval)::date >= ym_start
            LOOP
                SELECT sr, cr INTO sub_rev, comm_rev
                FROM get_affiliate_revenue_for_month(rec.id, series_rec.y, series_rec.m);

                IF sub_rev + comm_rev > 0 THEN
                    affiliate_id := rec.id;
                    affiliate_name := COALESCE(rec.full_name, 'Utilisateur');
                    affiliate_created_at := rec.created_at;
                    year_month := to_char(ym_start, 'YYYY-MM');
                    subscription_revenue := sub_rev;
                    commission_revenue := comm_rev;
                    total_revenue := sub_rev + comm_rev;
                    affiliate_percentage := pct;
                    affiliate_earnings := ((sub_rev + comm_rev) * pct / 100);
                    RETURN NEXT;
                END IF;
            END LOOP;
        END LOOP;
    END IF;
END;
$$;

CREATE TRIGGER update_user_affiliation_settings_updated_at
    BEFORE UPDATE ON user_affiliation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
