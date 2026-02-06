-- ============================================
-- MIGRATION: Ajout du champ professional_documents pour stocker les documents
-- Date: 2025-12-08
-- ============================================

-- Ajouter la colonne professional_documents (JSONB) pour stocker les documents professionnels
ALTER TABLE users_2025_12_01_11_29
ADD COLUMN IF NOT EXISTS professional_documents JSONB DEFAULT NULL;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN users_2025_12_01_11_29.professional_documents IS 'Documents professionnels de vérification stockés en JSONB avec les clés: professional_card, rcs_extract, id_card, insurance_certificate. Chaque document contient: type, name, url, size, uploadDate, status';

-- Structure attendue du JSONB:
-- {
--   "professional_card": {
--     "type": "professional_card",
--     "name": "carte-professionnelle.pdf",
--     "url": "https://...",
--     "size": "2.4 MB",
--     "uploadDate": "2024-01-15",
--     "status": "pending" | "verified" | "rejected"
--   },
--   "rcs_extract": { ... },
--   "id_card": { ... },
--   "insurance_certificate": { ... }
-- }

