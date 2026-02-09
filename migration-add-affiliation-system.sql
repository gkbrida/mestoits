-- ============================================
-- MIGRATION: Système d'affiliation
-- Ajout des champs affiliation_code et affiliated_by
-- ============================================

-- Ajouter le champ affiliation_code (unique, généré automatiquement)
ALTER TABLE users_2025_12_01_11_29 
ADD COLUMN IF NOT EXISTS affiliation_code TEXT UNIQUE;

-- Ajouter le champ affiliated_by (référence vers l'utilisateur qui a affilié)
ALTER TABLE users_2025_12_01_11_29 
ADD COLUMN IF NOT EXISTS affiliated_by UUID REFERENCES users_2025_12_01_11_29(id) ON DELETE SET NULL;

-- Créer un index sur affiliation_code pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_users_affiliation_code ON users_2025_12_01_11_29(affiliation_code);

-- Créer un index sur affiliated_by pour les requêtes de liste des affiliés
CREATE INDEX IF NOT EXISTS idx_users_affiliated_by ON users_2025_12_01_11_29(affiliated_by);

-- Fonction pour générer un code d'affiliation unique (8 caractères alphanumériques)
CREATE OR REPLACE FUNCTION generate_affiliation_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Générer un code de 8 caractères (majuscules et chiffres)
    code := upper(
      substring(
        md5(random()::text || clock_timestamp()::text),
        1,
        8
      )
    );
    
    -- Vérifier si le code existe déjà
    SELECT EXISTS(SELECT 1 FROM users_2025_12_01_11_29 WHERE affiliation_code = code) INTO exists_check;
    
    -- Si le code n'existe pas, on peut l'utiliser
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement un code d'affiliation lors de la création d'un utilisateur
CREATE OR REPLACE FUNCTION set_affiliation_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le code n'est pas déjà défini, en générer un
  IF NEW.affiliation_code IS NULL THEN
    NEW.affiliation_code := generate_affiliation_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_set_affiliation_code ON users_2025_12_01_11_29;
CREATE TRIGGER trigger_set_affiliation_code
  BEFORE INSERT ON users_2025_12_01_11_29
  FOR EACH ROW
  EXECUTE FUNCTION set_affiliation_code();

-- Mettre à jour les utilisateurs existants qui n'ont pas de code d'affiliation
UPDATE users_2025_12_01_11_29
SET affiliation_code = generate_affiliation_code()
WHERE affiliation_code IS NULL;
