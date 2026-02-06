-- ============================================
-- FONCTION RPC: increment_property_views
-- Incrémente le compteur de vues d'une propriété
-- ============================================

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS increment_property_views(UUID);

-- Créer la fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_property_views(property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Incrémenter le compteur de vues pour la propriété spécifiée
  UPDATE properties
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = property_id;
  
  -- Si aucune ligne n'a été mise à jour, cela signifie que la propriété n'existe pas
  -- On ne fait rien dans ce cas (pas d'erreur pour éviter de bloquer l'interface)
  IF NOT FOUND THEN
    RAISE NOTICE 'Property with id % not found', property_id;
  END IF;
END;
$$;

-- Commentaire sur la fonction
COMMENT ON FUNCTION increment_property_views(UUID) IS 'Incrémente le compteur de vues d''une propriété immobilière';

