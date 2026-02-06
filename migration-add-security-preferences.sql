-- ============================================
-- MIGRATION: Ajout des colonnes pour les préférences de sécurité
-- Date: 2025-12-08
-- ============================================

-- Ajouter les colonnes pour les préférences de sécurité dans users_2025_12_01_11_29
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT FALSE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN users_2025_12_01_11_29.two_factor_enabled IS 'Indique si l\'authentification à deux facteurs est activée pour l\'utilisateur';
COMMENT ON COLUMN users_2025_12_01_11_29.email_notifications IS 'Indique si l\'utilisateur souhaite recevoir des notifications par email';
COMMENT ON COLUMN users_2025_12_01_11_29.sms_notifications IS 'Indique si l\'utilisateur souhaite recevoir des notifications par SMS';


