-- ============================================
-- MIGRATION: Création tables pour paiements échelonnés
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Créer la table installment_plans
CREATE TABLE IF NOT EXISTS installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties_02(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 0),
    installment_amount DECIMAL(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    frequency TEXT CHECK (frequency IN ('weekly', 'monthly', 'quarterly')) DEFAULT 'monthly',
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer la table installment_payments
CREATE TABLE IF NOT EXISTS installment_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_plan_id UUID REFERENCES installment_plans(id) ON DELETE CASCADE NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE,
    status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(installment_plan_id, installment_number)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_installment_plans_property_id ON installment_plans(property_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_owner_id ON installment_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON installment_plans(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_plan_id ON installment_payments(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_status ON installment_payments(status);
CREATE INDEX IF NOT EXISTS idx_installment_payments_due_date ON installment_payments(due_date);

-- Commentaires
COMMENT ON TABLE installment_plans IS 'Plans de paiement échelonnés pour les biens';
COMMENT ON TABLE installment_payments IS 'Échéances individuelles pour chaque plan de paiement';
COMMENT ON COLUMN installment_plans.installment_amount IS 'Montant de chaque échéance (total_amount / number_of_installments)';
COMMENT ON COLUMN installment_payments.installment_number IS 'Numéro de l\'échéance (1, 2, 3, ...)';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
