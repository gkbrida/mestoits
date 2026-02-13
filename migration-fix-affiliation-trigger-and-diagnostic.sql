-- ============================================
-- 1. CORRIGER LE TRIGGER (éviter l'erreur "already exists")
-- ============================================
DROP TRIGGER IF EXISTS update_user_affiliation_settings_updated_at ON user_affiliation_settings;
CREATE TRIGGER update_user_affiliation_settings_updated_at
    BEFORE UPDATE ON user_affiliation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. SCRIPT DE DIAGNOSTIC - Revenus affiliation
-- Copier-coller et remplacer les UUID avant d'exécuter
-- ============================================

-- A) Lister vos affiliés et leurs abonnements (remplacer VOTRE_UUID par votre ID)
-- SELECT 
--     u.id as affiliate_id,
--     u.full_name as affiliate_name,
--     u.created_at as affiliate_inscription,
--     us.id as subscription_id,
--     us.start_date as subscription_start,
--     sp.name as plan_name,
--     sp.price as plan_price
-- FROM users_2025_12_01_11_29 u
-- LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.status = 'active'
-- LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
-- WHERE u.affiliated_by = 'VOTRE_UUID'
-- ORDER BY u.created_at DESC;

-- B) Tester get_affiliate_revenue_for_month (remplacer AFFILIÉ_UUID et 2025, 2 pour année/mois)
-- SELECT * FROM get_affiliate_revenue_for_month(
--     'AFFILIÉ_UUID'::uuid,
--     extract(year from current_date)::integer,
--     extract(month from current_date)::integer
-- );

-- C) Tester la RPC complète (remplacer VOTRE_UUID par votre ID)
-- SELECT * FROM get_affiliation_revenues_by_affiliate(
--     'VOTRE_UUID'::uuid,
--     extract(year from current_date)::integer,
--     extract(month from current_date)::integer
-- );

-- D) Paramètres plateforme
SELECT key, value FROM platform_settings 
WHERE key IN ('affiliation_default_duration_months', 'affiliation_default_percentage');
