-- ============================================
-- MIGRATION: Mise à jour de la fonction can_user_publish_property
-- Pour rendre gratuite la publication d'annonces de location courte durée
-- ============================================

-- Modifier la fonction pour accepter un paramètre optionnel operation_type
CREATE OR REPLACE FUNCTION can_user_publish_property(
    user_uuid UUID,
    operation_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    restrictions_enabled BOOLEAN;
    user_plan RECORD;
    properties_count INTEGER;
    period_days INTEGER;
BEGIN
    -- Si c'est une location courte durée, toujours autoriser (gratuit pour tous)
    IF operation_type = 'short-term-rental' THEN
        RETURN TRUE;
    END IF;
    
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
        
        -- Compter uniquement les publications qui ne sont pas des locations courte durée
        SELECT COUNT(*) INTO properties_count
        FROM property_publications pp
        INNER JOIN properties_02 p ON p.id = pp.property_id
        WHERE pp.user_id = user_uuid
            AND pp.published_at >= CURRENT_DATE - (period_days || ' days')::interval
            AND (p.operation_type IS NULL OR p.operation_type != 'short-term-rental');
        
        IF properties_count >= (user_plan.restrictions->>'max_properties_per_period')::integer THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Commentaire sur la fonction
COMMENT ON FUNCTION can_user_publish_property(UUID, TEXT) IS 'Vérifie si un utilisateur peut publier une annonce. Les locations courte durée sont toujours gratuites pour tous (pros et particuliers).';
