-- ============================================
-- SCHÉMA COMPLET DE LA BASE DE DONNÉES
-- Mestoits - Supabase PostgreSQL
-- ============================================

-- ============================================
-- TABLE: users_2025_12_01_11_29
-- Profils utilisateurs (particuliers et professionnels)
-- ============================================
CREATE TABLE IF NOT EXISTS users_2025_12_01_11_29 (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    user_type TEXT CHECK (user_type IN ('individual', 'professional')) DEFAULT 'individual',
    company_name TEXT,
    siret TEXT,
    professional_card TEXT,
    company_address TEXT,
    city TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_users_email ON users_2025_12_01_11_29(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users_2025_12_01_11_29(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users_2025_12_01_11_29(is_verified);

-- ============================================
-- TABLE: properties
-- Biens immobiliers (vente et location)
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE,
    
    -- Informations de base
    title TEXT NOT NULL,
    description TEXT,
    offer_type TEXT CHECK (offer_type IN ('sale', 'rental')) NOT NULL,
    property_type TEXT CHECK (property_type IN ('apartment', 'house', 'villa', 'land', 'commercial', 'office', 'parking', 'furnished-residence', 'building')) NOT NULL,
    villa_type TEXT CHECK (villa_type IN ('low-rise', 'duplex', 'triplex')),
    
    -- Localisation
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Caractéristiques principales
    surface_area DECIMAL(10, 2) NOT NULL,
    bedrooms INTEGER,
    bathrooms INTEGER,
    floors INTEGER,
    
    -- Prix et frais
    price DECIMAL(15, 2) NOT NULL,
    price_per_sqm DECIMAL(15, 2),
    agency_fees DECIMAL(15, 2),
    security_deposit DECIMAL(15, 2),
    advance_rent DECIMAL(15, 2),
    service_charges DECIMAL(15, 2),
    
    -- Détails
    condition TEXT CHECK (condition IN ('new', 'excellent', 'good', 'to-renovate')),
    standing TEXT CHECK (standing IN ('low', 'medium', 'high')),
    security_type TEXT CHECK (security_type IN ('gated-community', 'security-equipment', 'none')),
    accessibility TEXT CHECK (accessibility IN ('paved', 'close-to-paved', 'unpaved')),
    land_titles TEXT[],
    features TEXT[],
    
    -- Médias
    images TEXT[],
    floor_plan_url TEXT,
    virtual_tour_url TEXT,
    
    -- Informations de contact (stockées mais non utilisées dans l'insert)
    offered_by TEXT CHECK (offered_by IN ('individual', 'professional')) DEFAULT 'individual',
    
    -- Métadonnées
    status TEXT CHECK (status IN ('active', 'inactive', 'sold', 'rented')) DEFAULT 'active',
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche et performance
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_offer_type ON properties(offer_type);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);

-- ============================================
-- TABLE: messages_2025_12_01_11_29
-- Messages entre utilisateurs
-- ============================================
CREATE TABLE IF NOT EXISTS messages_2025_12_01_11_29 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance des requêtes de conversation
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages_2025_12_01_11_29(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages_2025_12_01_11_29(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages_2025_12_01_11_29(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages_2025_12_01_11_29(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages_2025_12_01_11_29(read);

-- ============================================
-- TABLE: price_data_2025_12_01_11_29
-- Données de prix agrégées par ville/type/offre
-- ============================================
CREATE TABLE IF NOT EXISTS price_data_2025_12_01_11_29 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city TEXT NOT NULL,
    property_type TEXT NOT NULL,
    offer_type TEXT CHECK (offer_type IN ('sale', 'rental')) NOT NULL,
    avg_price DECIMAL(15, 2) NOT NULL,
    min_price DECIMAL(15, 2) NOT NULL,
    max_price DECIMAL(15, 2) NOT NULL,
    avg_price_per_sqm DECIMAL(15, 2) NOT NULL,
    count INTEGER DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(city, property_type, offer_type)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_price_data_city ON price_data_2025_12_01_11_29(city);
CREATE INDEX IF NOT EXISTS idx_price_data_property_type ON price_data_2025_12_01_11_29(property_type);
CREATE INDEX IF NOT EXISTS idx_price_data_offer_type ON price_data_2025_12_01_11_29(offer_type);

-- ============================================
-- TABLE: valuations_2025_12_01_11_29
-- Estimations de biens immobiliers
-- ============================================
CREATE TABLE IF NOT EXISTS valuations_2025_12_01_11_29 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_type TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT,
    surface DECIMAL(10, 2) NOT NULL,
    rooms INTEGER,
    bedrooms INTEGER,
    floor INTEGER,
    total_floors INTEGER,
    construction_year INTEGER,
    condition TEXT,
    heating TEXT,
    parking TEXT,
    has_balcony BOOLEAN DEFAULT FALSE,
    has_terrace BOOLEAN DEFAULT FALSE,
    has_garden BOOLEAN DEFAULT FALSE,
    has_elevator BOOLEAN DEFAULT FALSE,
    has_cellar BOOLEAN DEFAULT FALSE,
    energy_class TEXT CHECK (energy_class IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
    estimated_value DECIMAL(15, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_valuations_city ON valuations_2025_12_01_11_29(city);
CREATE INDEX IF NOT EXISTS idx_valuations_property_type ON valuations_2025_12_01_11_29(property_type);
CREATE INDEX IF NOT EXISTS idx_valuations_created_at ON valuations_2025_12_01_11_29(created_at DESC);

-- ============================================
-- TABLE: property_contacts
-- Contacts sur les biens (formulaires de contact)
-- ============================================
CREATE TABLE IF NOT EXISTS property_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_phone TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour suivi des contacts
CREATE INDEX IF NOT EXISTS idx_property_contacts_property_id ON property_contacts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_contacts_created_at ON property_contacts(created_at DESC);

-- ============================================
-- TABLE: favorites (supposée)
-- Favoris des utilisateurs
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property_id ON favorites(property_id);

-- ============================================
-- TABLE: leases (supposée pour gestion locative complète)
-- Baux de location
-- ============================================
CREATE TABLE IF NOT EXISTS leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent DECIMAL(15, 2) NOT NULL,
    security_deposit DECIMAL(15, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending_signature', 'active', 'expired', 'terminated')) DEFAULT 'pending_signature',
    article5 TEXT,
    article6 TEXT,
    article7 TEXT,
    article8 TEXT,
    article9 TEXT,
    article10 TEXT,
    additional_notes TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_owner_id ON leases(owner_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);

-- ============================================
-- TABLE: lease_inventories
-- États des lieux (entrée et sortie) pour les baux
-- ============================================
CREATE TABLE IF NOT EXISTS lease_inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('entry', 'exit')) NOT NULL,
    date DATE NOT NULL,
    photos TEXT[] DEFAULT '{}',
    comments TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_inventories_lease_id ON lease_inventories(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_inventories_type ON lease_inventories(type);
CREATE INDEX IF NOT EXISTS idx_lease_inventories_date ON lease_inventories(date DESC);

-- ============================================
-- TABLE: payments (supposée pour gestion locative complète)
-- Paiements de loyer
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE, -- NULL pour les paiements en attente
    due_date DATE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
    payment_method TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- ============================================
-- TABLE: tenants
-- Locataires (peuvent ne pas être des utilisateurs de la plateforme)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    birth_date DATE,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- ============================================
-- TABLE: professional_reviews
-- Avis et notes sur les professionnels
-- ============================================
CREATE TABLE IF NOT EXISTS professional_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    reviewer_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(professional_id, reviewer_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_reviews_professional_id ON professional_reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_reviewer_id ON professional_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_rating ON professional_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_professional_reviews_created_at ON professional_reviews(created_at DESC);

-- ============================================
-- TABLE: notifications
-- Notifications utilisateur
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('message', 'property_view', 'favorite', 'review', 'payment', 'lease', 'system')) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================
-- TABLE: saved_searches
-- Recherches sauvegardées par les utilisateurs
-- ============================================
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    search_criteria JSONB NOT NULL,
    -- Exemple de structure JSONB:
    -- {
    --   "city": "Paris",
    --   "property_type": "apartment",
    --   "offer_type": "rental",
    --   "min_price": 500,
    --   "max_price": 1500,
    --   "bedrooms": 2
    -- }
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(active);

-- ============================================
-- TABLE: activity_log
-- Journal d'activités pour le dashboard
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('payment', 'visit', 'expense', 'message', 'lease', 'property', 'tenant', 'system')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- ============================================
-- FONCTION RPC: increment_property_views
-- Incrémente le compteur de vues d'un bien
-- ============================================
CREATE OR REPLACE FUNCTION increment_property_views(property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE properties
    SET views_count = views_count + 1
    WHERE id = property_id;
END;
$$;

-- ============================================
-- TRIGGERS: Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application des triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users_2025_12_01_11_29
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_data_updated_at BEFORE UPDATE ON price_data_2025_12_01_11_29
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_inventories_updated_at BEFORE UPDATE ON lease_inventories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_reviews_updated_at BEFORE UPDATE ON professional_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FONCTION: Calculer la note moyenne d'un professionnel
-- ============================================
CREATE OR REPLACE FUNCTION calculate_professional_rating(professional_uuid UUID)
RETURNS TABLE (
    average_rating DECIMAL(3, 2),
    total_reviews BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(AVG(rating)::DECIMAL(3, 2), 0) as average_rating,
        COUNT(*)::BIGINT as total_reviews
    FROM professional_reviews
    WHERE professional_id = professional_uuid;
END;
$$;

-- ============================================
-- FONCTION: Mettre à jour le compteur de favoris d'un bien
-- ============================================
CREATE OR REPLACE FUNCTION update_property_favorites_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE properties
        SET favorites_count = (
            SELECT COUNT(*) FROM favorites WHERE property_id = NEW.property_id
        )
        WHERE id = NEW.property_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE properties
        SET favorites_count = (
            SELECT COUNT(*) FROM favorites WHERE property_id = OLD.property_id
        )
        WHERE id = OLD.property_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Trigger pour mettre à jour automatiquement le compteur de favoris
CREATE TRIGGER update_favorites_count_on_insert
    AFTER INSERT ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_property_favorites_count();

CREATE TRIGGER update_favorites_count_on_delete
    AFTER DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_property_favorites_count();

-- ============================================
-- POLITIQUES RLS (Row Level Security)
-- À configurer selon les besoins de sécurité
-- ============================================

-- Exemple pour la table properties (à adapter)
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique des biens actifs
-- CREATE POLICY "Public can view active properties"
--     ON properties FOR SELECT
--     USING (status = 'active');

-- Politique pour permettre aux propriétaires de modifier leurs biens
-- CREATE POLICY "Owners can update their properties"
--     ON properties FOR UPDATE
--     USING (auth.uid() = owner_id);

-- ============================================
-- STORAGE BUCKETS (Supabase Storage)
-- ============================================

-- Bucket pour les assets professionnels
-- À créer via l'interface Supabase ou l'API
-- Nom: professional-assets
-- Public: true (pour les logos et photos publiques)
-- Allowed MIME types: image/*

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Les tables avec suffixe _2025_12_01_11_29 semblent être des versions
--    de migration. Il faudra peut-être migrer les données et unifier les noms.
--
-- 2. Tables ajoutées pour compléter les fonctionnalités :
--    - tenants : Gestion des locataires indépendamment des utilisateurs
--    - professional_reviews : Avis et notes sur les professionnels
--    - notifications : Notifications utilisateur
--    - saved_searches : Recherches sauvegardées
--    - activity_log : Journal d'activités pour le dashboard
--
-- 3. Fonctions ajoutées :
--    - calculate_professional_rating : Calcule la note moyenne d'un professionnel
--    - update_property_favorites_count : Met à jour automatiquement le compteur de favoris
--
-- 4. Les politiques RLS doivent être configurées selon les besoins de sécurité
--    de l'application.
--
-- 4. Les API Routes Vercel (delete-user) et serveur email Node.js (paiements Stripe, emails)
--    doivent être déployées séparément dans Supabase.
--
-- 5. Le bucket 'professional-assets' doit être créé dans Supabase Storage
--    avec les permissions appropriées.

