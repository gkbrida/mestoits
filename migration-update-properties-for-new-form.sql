-- ============================================
-- MIGRATION: Mise à jour table properties pour nouveau formulaire
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Ajouter les nouveaux champs pour les terrains
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS surface_per_lot DECIMAL(10, 2); -- Superficie (m²) / lot

-- Modifier kitchen_type en kitchen_closed (boolean)
ALTER TABLE properties
DROP COLUMN IF EXISTS kitchen_type;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS kitchen_closed BOOLEAN; -- Cuisine Fermée (Oui/Non)

-- Modifier les champs terrain pour correspondre à la nouvelle description
ALTER TABLE properties
DROP COLUMN IF EXISTS serviced;
ALTER TABLE properties
DROP COLUMN IF EXISTS terrain_relief;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS electricity_viabilized BOOLEAN; -- Viabilisé en électricité
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS water_viabilized BOOLEAN; -- Viabilisé en eau
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS flat_relief BOOLEAN; -- Relief plat

-- Vérifier que les autres champs existent déjà (créés dans migration précédente)
-- Si non, les ajouter
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS operation_type TEXT REFERENCES operation_types(code);
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS price_negotiable BOOLEAN DEFAULT FALSE;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS advance_months INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS deposit_months INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS water_supply BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS electricity BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS personal_meter BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS immediately_available BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS already_occupied BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS in_gated_community BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS neighborhood_type TEXT CHECK (neighborhood_type IN ('residential', 'popular', 'mixed'));
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS depositor_status TEXT CHECK (depositor_status IN ('owner', 'agent', 'developer'));
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS rooms INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS floor_number INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS front_yard BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS back_yard BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS garden BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS garage_capacity INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS dependency BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS pool BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS playground BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS gym BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS air_conditioning BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS water_heater BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS storage BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS elevator BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS parking BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS generator BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS water_tank BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS solar_panel BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS security_features TEXT[];
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_sofa BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_tv BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_internet BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS equipped_kitchen BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_washing_machine BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_wifi BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS has_netflix BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS approved_subdivision BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS fenced BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS available_lots INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS commerce_type TEXT;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS visible_facade BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS high_traffic_area BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS internal_wc BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS terrace BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS customer_parking BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS building_floors INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS total_units INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS monthly_rental_income DECIMAL(15, 2);
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS building_occupied BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS building_parking BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS building_generator BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS construction_year INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS office_rooms INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS meeting_room BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS office_air_conditioning BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS fiber_internet BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS reception BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS office_parking BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS parking_spaces INTEGER;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS covered_parking BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS secure_access BOOLEAN;
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS parking_usage TEXT CHECK (parking_usage IN ('residential', 'commercial'));

-- Mettre à jour standing pour inclure 'luxury'
ALTER TABLE properties
DROP CONSTRAINT IF EXISTS properties_standing_check;
ALTER TABLE properties
ADD CONSTRAINT properties_standing_check 
CHECK (standing IN ('low', 'medium', 'high', 'luxury'));

-- Mettre à jour accessibility
ALTER TABLE properties
DROP CONSTRAINT IF EXISTS properties_accessibility_check;
ALTER TABLE properties
ADD CONSTRAINT properties_accessibility_check 
CHECK (accessibility IN ('paved', 'unpaved'));

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
