-- ============================================
-- MIGRATION: Correction de la génération du code d'affiliation
-- Amélioration de la fonction pour éviter les boucles infinies et les timeouts
-- ============================================

-- Fonction améliorée pour générer un code d'affiliation unique avec limite de tentatives
CREATE OR REPLACE FUNCTION generate_affiliation_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    attempts := attempts + 1;
    
    -- Vérifier qu'on n'a pas dépassé le nombre maximum de tentatives
    IF attempts > max_attempts THEN
      RAISE EXCEPTION 'Impossible de générer un code d''affiliation unique après % tentatives', max_attempts;
    END IF;
    
    -- Générer un code de 8 caractères (majuscules et chiffres)
    -- Utiliser gen_random_uuid() pour plus de variété
    code := upper(
      substring(
        replace(gen_random_uuid()::text || clock_timestamp()::text, '-', ''),
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

-- Améliorer le trigger pour gérer les erreurs potentielles
CREATE OR REPLACE FUNCTION set_affiliation_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le code n'est pas déjà défini, en générer un
  IF NEW.affiliation_code IS NULL OR NEW.affiliation_code = '' THEN
    BEGIN
      NEW.affiliation_code := generate_affiliation_code();
    EXCEPTION
      WHEN OTHERS THEN
        -- En cas d'erreur, générer un code basé sur l'ID de l'utilisateur comme fallback
        NEW.affiliation_code := upper(substring(replace(NEW.id::text, '-', ''), 1, 8));
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger pour s'assurer qu'il utilise la nouvelle fonction
DROP TRIGGER IF EXISTS trigger_set_affiliation_code ON users_2025_12_01_11_29;
CREATE TRIGGER trigger_set_affiliation_code
  BEFORE INSERT ON users_2025_12_01_11_29
  FOR EACH ROW
  EXECUTE FUNCTION set_affiliation_code();
