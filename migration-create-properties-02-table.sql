-- ============================================
-- MIGRATION: Création table properties_02 pour le nouveau formulaire
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- Structure inspirée de la table properties existante
-- ============================================

-- ============================================
-- CRÉER LA TABLE properties_02
-- ============================================
CREATE TABLE IF NOT EXISTS properties_02 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE CASCADE,
    
    -- Informations de base
    title TEXT,
    description TEXT,
    operation_type TEXT REFERENCES operation_types(code), -- Type d'opération (sale, rental, short-term-rental)
    offer_type TEXT CHECK (offer_type IN ('sale', 'rental')) NOT NULL, -- Gardé pour compatibilité
    property_type TEXT NOT NULL REFERENCES property_types(code),
    villa_type TEXT CHECK (villa_type IN ('low-rise', 'duplex', 'triplex')),
    
    -- Prix
    price DECIMAL(15, 2) NOT NULL,
    price_negotiable BOOLEAN DEFAULT FALSE,
    price_per_sqm DECIMAL(15, 2), -- Prix au m² (calculé ou saisi)
    
    -- Conditions financières (location)
    advance_months INTEGER, -- Nombre de mois d'avance
    deposit_months INTEGER, -- Nombre de mois de caution
    agency_fees DECIMAL(15, 2),
    security_deposit DECIMAL(15, 2),
    advance_rent DECIMAL(15, 2),
    service_charges DECIMAL(15, 2),
    
    -- Standing
    standing TEXT CHECK (standing IN ('low', 'medium', 'high', 'luxury')),
    
    -- Localisation (ÉTAPE 2)
    address TEXT,
    city TEXT NOT NULL,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accessibility TEXT CHECK (accessibility IN ('paved', 'unpaved')), -- Route bitumée, Voie non bitumée
    
    -- Réseaux (ÉTAPE 2)
    water_supply BOOLEAN, -- Eau courante
    electricity BOOLEAN, -- Électricité
    personal_meter BOOLEAN, -- Compteur personnel
    
    -- Situation du bien (ÉTAPE 2)
    immediately_available BOOLEAN, -- Disponible immédiatement
    already_occupied BOOLEAN, -- Bien déjà habité
    in_gated_community BOOLEAN, -- Situé dans une cité
    neighborhood_type TEXT CHECK (neighborhood_type IN ('residential', 'popular', 'mixed')), -- Quartier
    
    -- Statut du déposant (ÉTAPE 2)
    depositor_status TEXT CHECK (depositor_status IN ('owner', 'agent', 'developer')), -- Propriétaire direct, Mandataire, Promoteur
    
    -- Document foncier (ÉTAPE 2 - seulement si en vente)
    land_titles TEXT[],
    
    -- Caractéristiques principales (ÉTAPE 3)
    surface_area DECIMAL(10, 2), -- Superficie générale
    surface_per_lot DECIMAL(10, 2), -- Superficie (m²) / lot (pour terrains)
    available_lots INTEGER DEFAULT 1, -- Nombre de lots disponibles (pour terrains, obligatoire, défaut 1)
    
    -- Pour Villa/Appartement/Maison (ÉTAPE 3)
    rooms INTEGER, -- Nombre de pièces
    bedrooms INTEGER, -- Nombre de chambres
    bathrooms INTEGER, -- Nombre de douches/WC
    floors INTEGER, -- Nombre d'étages (pour villa/maison)
    capacity INTEGER, -- Capacité (location courte durée)
    floor_number INTEGER, -- Numéro d'étage (si appartement)
    kitchen_closed BOOLEAN, -- Cuisine Fermée (Oui/Non)
    has_balcony BOOLEAN, -- Balcon (si appartement)
    
    -- Pour Terrain (ÉTAPE 3)
    -- (Les équipements spécifiques aux terrains sont dans features)
    
    -- Pour Commerce (ÉTAPE 3)
    commerce_type TEXT, -- Type (boutique, restaurant, magasin...)
    
    -- Pour Immeuble (ÉTAPE 3)
    building_floors INTEGER, -- Nombre d'étages
    total_units INTEGER, -- Nombre total d'unités
    monthly_rental_income DECIMAL(15, 2), -- Revenu locatif mensuel
    building_occupied BOOLEAN, -- Occupé
    construction_year INTEGER, -- Année de construction
    
    -- Pour Bureau (ÉTAPE 3)
    office_rooms INTEGER, -- Nombre de pièces
    
    -- Pour Parking (ÉTAPE 3)
    parking_spaces INTEGER, -- Nombre de places
    parking_usage TEXT CHECK (parking_usage IN ('residential', 'commercial')), -- Usage
    
    -- Équipements (ÉTAPE 3) - Stockés comme tableau TEXT[] comme dans properties
    -- Tous les équipements sont stockés ici : résidentiels, commerciaux, bureaux, terrains, location courte durée, etc.
    -- Exemples de valeurs : 'front_yard', 'back_yard', 'garden', 'pool', 'elevator', 'air_conditioning', etc.
    features TEXT[],
    
    -- Médias (ÉTAPE 4)
    images TEXT[], -- Tableau d'URLs d'images comme dans properties
    video_url TEXT, -- URL de la vidéo (nouveau champ, max 30 MB)
    virtual_tour_url TEXT, -- Lien de la visite 3D
    
    -- Informations de contact
    offered_by TEXT CHECK (offered_by IN ('individual', 'professional')) DEFAULT 'individual',
    
    -- Métadonnées
    status TEXT CHECK (status IN ('active', 'inactive', 'sold', 'rented', 'draft')) DEFAULT 'draft',
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_properties_02_owner_id ON properties_02(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_02_city ON properties_02(city);
CREATE INDEX IF NOT EXISTS idx_properties_02_operation_type ON properties_02(operation_type);
CREATE INDEX IF NOT EXISTS idx_properties_02_offer_type ON properties_02(offer_type);
CREATE INDEX IF NOT EXISTS idx_properties_02_property_type ON properties_02(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_02_status ON properties_02(status);
CREATE INDEX IF NOT EXISTS idx_properties_02_price ON properties_02(price);
CREATE INDEX IF NOT EXISTS idx_properties_02_created_at ON properties_02(created_at DESC);

-- Index GIN pour recherche dans les tableaux
CREATE INDEX IF NOT EXISTS idx_properties_02_features ON properties_02 USING GIN(features);
CREATE INDEX IF NOT EXISTS idx_properties_02_images ON properties_02 USING GIN(images);
CREATE INDEX IF NOT EXISTS idx_properties_02_land_titles ON properties_02 USING GIN(land_titles);

-- ============================================
-- TRIGGER POUR updated_at
-- ============================================
CREATE TRIGGER update_properties_02_updated_at 
    BEFORE UPDATE ON properties_02
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLITIQUE RLS (Row Level Security)
-- ============================================
ALTER TABLE properties_02 ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leurs propres propriétés et les propriétés actives
CREATE POLICY "Users can view their own properties"
    ON properties_02 FOR SELECT
    USING (
        auth.uid() = owner_id OR 
        status = 'active'
    );

-- Politique : Les utilisateurs peuvent insérer leurs propres propriétés
CREATE POLICY "Users can insert their own properties"
    ON properties_02 FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Politique : Les utilisateurs peuvent mettre à jour leurs propres propriétés
CREATE POLICY "Users can update their own properties"
    ON properties_02 FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Politique : Les utilisateurs peuvent supprimer leurs propres propriétés
CREATE POLICY "Users can delete their own properties"
    ON properties_02 FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================
-- COMMENTAIRES SUR LES COLONNES
-- ============================================
COMMENT ON TABLE properties_02 IS 'Table pour le nouveau formulaire de dépôt d''annonce immobilière - Structure alignée avec properties';
COMMENT ON COLUMN properties_02.operation_type IS 'Type d''opération : sale, rental, short-term-rental';
COMMENT ON COLUMN properties_02.features IS 'Tableau des équipements sélectionnés (comme dans properties)';
COMMENT ON COLUMN properties_02.images IS 'Tableau des URLs d''images (comme dans properties)';
COMMENT ON COLUMN properties_02.video_url IS 'URL de la vidéo du bien (max 30 MB)';
COMMENT ON COLUMN properties_02.surface_per_lot IS 'Superficie par lot (pour terrains)';
COMMENT ON COLUMN properties_02.available_lots IS 'Nombre de lots disponibles (pour terrains, obligatoire, défaut 1)';

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier la structure de properties_02
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'properties_02'
ORDER BY ordinal_position;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Structure alignée avec la table properties existante :
--    - features TEXT[] : tous les équipements stockés dans un tableau
--    - images TEXT[] : toutes les images stockées dans un tableau
--    - Pas de colonnes booléennes individuelles pour les équipements
--
-- 2. Nouveaux champs spécifiques au nouveau formulaire :
--    - operation_type : pour gérer sale, rental, short-term-rental
--    - video_url : pour la vidéo du bien
--    - Champs spécifiques selon le type de bien (commerce_type, building_floors, etc.)
--
-- 3. Les équipements sont stockés comme valeurs dans features[] :
--    - Exemples : 'front_yard', 'back_yard', 'garden', 'pool', 'elevator', 
--      'air_conditioning', 'has_sofa', 'has_tv', 'internal_wc', 'office_wc', etc.
--
-- 4. Compatibilité : offer_type est conservé pour compatibilité avec le reste du site
--
-- 5. Index GIN créés pour optimiser les recherches dans les tableaux features et images

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
