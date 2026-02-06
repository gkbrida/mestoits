-- ============================================
-- TABLE: visits
-- Visites programmées pour les biens immobiliers
-- ============================================
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    visitor_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    visitor_name TEXT NOT NULL,
    visitor_email TEXT NOT NULL,
    visitor_phone TEXT,
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_visits_property_id ON visits(property_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_owner_id ON visits(owner_id);
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

-- RLS (Row Level Security)
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Policy: Les propriétaires peuvent voir les visites de leurs biens
CREATE POLICY "Propriétaires peuvent voir leurs visites"
    ON visits FOR SELECT
    USING (owner_id = auth.uid());

-- Policy: Les visiteurs peuvent voir leurs propres visites
CREATE POLICY "Visiteurs peuvent voir leurs visites"
    ON visits FOR SELECT
    USING (visitor_id = auth.uid() OR visitor_id IS NULL);

-- Policy: Les visiteurs peuvent créer des visites
CREATE POLICY "Visiteurs peuvent créer des visites"
    ON visits FOR INSERT
    WITH CHECK (visitor_id = auth.uid() OR visitor_id IS NULL);

-- Policy: Les propriétaires peuvent mettre à jour les visites de leurs biens
CREATE POLICY "Propriétaires peuvent mettre à jour leurs visites"
    ON visits FOR UPDATE
    USING (owner_id = auth.uid());

-- Policy: Les visiteurs peuvent annuler leurs propres visites
CREATE POLICY "Visiteurs peuvent annuler leurs visites"
    ON visits FOR UPDATE
    USING (visitor_id = auth.uid());

