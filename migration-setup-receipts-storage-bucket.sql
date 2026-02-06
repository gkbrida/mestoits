-- ============================================
-- MIGRATION: Configuration du bucket Storage pour les factures
-- Date: 2026-02-02
-- À exécuter dans Supabase SQL Editor
-- 
-- NOTE: Créez d'abord le bucket 'receipts' manuellement dans Supabase Dashboard > Storage
-- avec les paramètres suivants:
-- - Nom: receipts
-- - Public: Oui
-- - File size limit: 50 MB
-- - Allowed MIME types: image/jpeg, image/png, image/jpg, application/pdf
-- ============================================

-- Supprimer les politiques existantes si elles existent (pour éviter les conflits)
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;

-- Politique RLS pour permettre l'upload de fichiers par les propriétaires
-- Le premier niveau du chemin doit être l'ID utilisateur (ex: userId/filename.pdf)
CREATE POLICY "Users can upload their own receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique RLS pour permettre la lecture des fichiers publics
CREATE POLICY "Anyone can view receipts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Politique RLS pour permettre la mise à jour de ses propres fichiers
CREATE POLICY "Users can update their own receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Politique RLS pour permettre la suppression de ses propres fichiers
CREATE POLICY "Users can delete their own receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
