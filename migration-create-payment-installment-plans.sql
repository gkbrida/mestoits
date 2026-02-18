-- ============================================
-- MIGRATION: Paiement d'un loyer en plusieurs échéances
-- Permet au propriétaire d'autoriser le locataire à payer un loyer impayé en plusieurs fois
-- Le loyer reste impayé tant que toutes les échéances ne sont pas payées
-- ============================================

CREATE TABLE IF NOT EXISTS payment_installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE NOT NULL UNIQUE,
    total_amount DECIMAL(15, 2) NOT NULL,
    number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_installment_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES payment_installment_plans(id) ON DELETE CASCADE NOT NULL,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE,
    status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_payment_installment_plans_payment_id ON payment_installment_plans(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_installment_payments_plan_id ON payment_installment_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_payment_installment_payments_status ON payment_installment_payments(status);

COMMENT ON TABLE payment_installment_plans IS 'Plans d''échelonnement pour un loyer impayé';
COMMENT ON TABLE payment_installment_payments IS 'Échéances individuelles pour payer un loyer en plusieurs fois';
