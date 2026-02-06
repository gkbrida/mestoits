-- ============================================
-- MIGRATION: Ajout de nouveaux types de professionnels
-- Date: 2025-12-08
-- ============================================

-- Insérer les nouveaux types de professionnels
INSERT INTO professional_types (name, label, icon, display_order, is_active) VALUES
    ('Notaire', 'Notaire', 'ri-file-text-line', 7, true),
    ('Promoteur immobilier', 'Promoteur immobilier', 'ri-building-4-line', 8, true),
    ('Constructeur de maisons', 'Constructeur de maisons', 'ri-building-line', 9, true),
    ('Marchand de biens', 'Marchand de biens', 'ri-exchange-dollar-line', 10, true),
    ('Investisseur immobilier', 'Investisseur immobilier', 'ri-funds-line', 11, true),
    ('Géomètre-expert', 'Géomètre-expert', 'ri-ruler-line', 12, true),
    ('Architecte', 'Architecte', 'ri-pencil-ruler-2-line', 13, true),
    ('Maître d''œuvre', 'Maître d''œuvre', 'ri-draft-line', 14, true),
    ('Entreprise de travaux / Artisan', 'Entreprise de travaux / Artisan', 'ri-hammer-line', 15, true),
    ('Banque', 'Banque', 'ri-bank-line', 16, true),
    ('Courtier immobilier', 'Courtier immobilier', 'ri-scales-3-line', 17, true),
    ('Assurance habitation', 'Assurance habitation', 'ri-shield-check-line', 18, true),
    ('Avocat immobilier', 'Avocat immobilier', 'ri-briefcase-line', 19, true),
    ('Maçon', 'Maçon', 'ri-building-2-line', 20, true),
    ('Électricien', 'Électricien', 'ri-flashlight-line', 21, true),
    ('Plombier', 'Plombier', 'ri-drop-line', 22, true),
    ('Couvreur', 'Couvreur', 'ri-home-roof-line', 23, true),
    ('Charpentier', 'Charpentier', 'ri-hammer-line', 24, true),
    ('Menuisier', 'Menuisier', 'ri-tools-line', 25, true),
    ('Peintre en bâtiment', 'Peintre en bâtiment', 'ri-paint-brush-line', 26, true),
    ('Carreleur', 'Carreleur', 'ri-layout-grid-line', 27, true),
    ('Serrurier', 'Serrurier', 'ri-lock-line', 28, true),
    ('Vitrier', 'Vitrier', 'ri-window-line', 29, true),
    ('Terrassier', 'Terrassier', 'ri-road-map-line', 30, true),
    ('Couvreur-zingueur', 'Couvreur-zingueur', 'ri-home-gear-line', 31, true),
    ('Entreprise générale du bâtiment', 'Entreprise générale du bâtiment', 'ri-building-4-line', 32, true),
    ('Rénovation intérieure', 'Rénovation intérieure', 'ri-tools-line', 33, true),
    ('Démolition', 'Démolition', 'ri-delete-bin-6-line', 34, true),
    ('Études techniques / BET', 'Études techniques / BET', 'ri-file-chart-line', 35, true)
ON CONFLICT (name) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

