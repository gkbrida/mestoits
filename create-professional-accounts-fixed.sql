-- ============================================
-- CRÉATION DE 15 COMPTES PROFESSIONNELS FICTIFS
-- Date: 2025-12-08
-- Mot de passe pour tous: azerty
-- ============================================
--
-- ⚠️ IMPORTANT: Ce script SQL NE PEUT PAS créer directement les comptes dans auth.users
-- Vous devez d'abord créer les comptes via:
-- 1. Le script JavaScript: node create-professional-accounts.js (RECOMMANDÉ)
-- 2. Ou via Supabase Dashboard > Authentication > Add User
-- 3. Ou via l'API Admin Supabase
--
-- Ce script SQL sert uniquement à créer les profils dans users_2025_12_01_11_29
-- après que les comptes auth.users aient été créés
-- ============================================

-- ============================================
-- 5 AGENCES IMMOBILIÈRES
-- ============================================

-- Agence 1
INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url, linkedin_url
)
SELECT 
  id,
  'agence1@mestoits.com',
  'Jean Dupont',
  '+33612345678',
  'professional',
  'Agence Immobilière Premium',
  '12345678901234',
  'CP-2024-001',
  '15 Avenue des Champs-Élysées',
  'Paris',
  '75008',
  'https://www.agence-premium-paris.fr',
  'Agence immobilière',
  false,
  'Agence immobilière de prestige spécialisée dans les biens haut de gamme à Paris. Plus de 20 ans d''expérience dans l''immobilier de luxe.',
  'https://facebook.com/agence-premium-paris',
  'https://instagram.com/agence_premium_paris',
  'https://linkedin.com/company/agence-premium-paris'
FROM auth.users WHERE email = 'agence1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  linkedin_url = EXCLUDED.linkedin_url,
  updated_at = NOW();

-- Agence 2
INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url
)
SELECT 
  id,
  'agence2@mestoits.com',
  'Marie Martin',
  '+33623456789',
  'professional',
  'Agence Immobilière Confort',
  '23456789012345',
  'CP-2024-002',
  '42 Rue de la République',
  'Lyon',
  '69001',
  'https://www.agence-confort-lyon.fr',
  'Agence immobilière',
  false,
  'Agence immobilière familiale à Lyon depuis 15 ans. Spécialisée dans l''accompagnement personnalisé pour la vente et la location.',
  'https://facebook.com/agence-confort-lyon',
  'https://instagram.com/agence_confort_lyon'
FROM auth.users WHERE email = 'agence2@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  updated_at = NOW();

-- Agence 3
INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, linkedin_url, youtube_url
)
SELECT 
  id,
  'agence3@mestoits.com',
  'Pierre Bernard',
  '+33634567890',
  'professional',
  'Agence Immobilière Moderne',
  '34567890123456',
  'CP-2024-003',
  '8 Boulevard Victor Hugo',
  'Marseille',
  '13001',
  'https://www.agence-moderne-marseille.fr',
  'Agence immobilière',
  false,
  'Agence immobilière moderne utilisant les dernières technologies pour vous accompagner dans vos projets immobiliers à Marseille et sa région.',
  'https://linkedin.com/company/agence-moderne-marseille',
  'https://youtube.com/@agence-moderne-marseille'
FROM auth.users WHERE email = 'agence3@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  linkedin_url = EXCLUDED.linkedin_url,
  youtube_url = EXCLUDED.youtube_url,
  updated_at = NOW();

-- Agence 4
INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url, tiktok_url
)
SELECT 
  id,
  'agence4@mestoits.com',
  'Sophie Dubois',
  '+33645678901',
  'professional',
  'Agence Immobilière Horizon',
  '45678901234567',
  'CP-2024-004',
  '25 Place Bellecour',
  'Lyon',
  '69002',
  'https://www.agence-horizon-lyon.fr',
  'Agence immobilière',
  false,
  'Agence immobilière dynamique spécialisée dans l''investissement locatif et la gestion de patrimoine immobilier.',
  'https://facebook.com/agence-horizon-lyon',
  'https://instagram.com/agence_horizon_lyon',
  'https://tiktok.com/@agence_horizon_lyon'
FROM auth.users WHERE email = 'agence4@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  tiktok_url = EXCLUDED.tiktok_url,
  updated_at = NOW();

-- Agence 5
INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, linkedin_url, youtube_url
)
SELECT 
  id,
  'agence5@mestoits.com',
  'Thomas Leroy',
  '+33656789012',
  'professional',
  'Agence Immobilière Excellence',
  '56789012345678',
  'CP-2024-005',
  '10 Rue du Commerce',
  'Toulouse',
  '31000',
  'https://www.agence-excellence-toulouse.fr',
  'Agence immobilière',
  false,
  'Agence immobilière d''excellence à Toulouse. Expertise reconnue dans la vente de maisons, appartements et biens commerciaux.',
  'https://linkedin.com/company/agence-excellence-toulouse',
  'https://youtube.com/@agence-excellence-toulouse'
FROM auth.users WHERE email = 'agence5@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  linkedin_url = EXCLUDED.linkedin_url,
  youtube_url = EXCLUDED.youtube_url,
  updated_at = NOW();

-- ============================================
-- 2 AGENTS IMMOBILIERS
-- ============================================

-- Agent 1
INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url, linkedin_url
)
SELECT 
  id,
  'agent1@mestoits.com',
  'Claire Moreau',
  '+33667890123',
  'professional',
  'Claire Moreau - Agent Immobilier Indépendant',
  '67890123456789',
  'CP-2024-006',
  '33 Avenue de la Grande Armée',
  'Paris',
  '75016',
  'https://www.claire-moreau-immobilier.fr',
  'Agent immobilier',
  false,
  'Agent immobilier indépendant spécialisé dans le 16ème arrondissement de Paris. Accompagnement personnalisé pour vos projets immobiliers.',
  'https://facebook.com/claire-moreau-immobilier',
  'https://instagram.com/claire_moreau_immobilier',
  'https://linkedin.com/in/claire-moreau-immobilier'
FROM auth.users WHERE email = 'agent1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  linkedin_url = EXCLUDED.linkedin_url,
  updated_at = NOW();

-- Agent 2
INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, linkedin_url, youtube_url
)
SELECT 
  id,
  'agent2@mestoits.com',
  'Marc Petit',
  '+33678901234',
  'professional',
  'Marc Petit - Agent Immobilier',
  '78901234567890',
  'CP-2024-007',
  '18 Rue de la Paix',
  'Nice',
  '06000',
  'https://www.marc-petit-immobilier.fr',
  'Agent immobilier',
  false,
  'Agent immobilier à Nice avec plus de 10 ans d''expérience. Spécialisé dans les biens de standing sur la Côte d''Azur.',
  'https://linkedin.com/in/marc-petit-immobilier',
  'https://youtube.com/@marc-petit-immobilier'
FROM auth.users WHERE email = 'agent2@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  linkedin_url = EXCLUDED.linkedin_url,
  youtube_url = EXCLUDED.youtube_url,
  updated_at = NOW();

-- ============================================
-- 1 NOTAIRE
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, linkedin_url
)
SELECT 
  id,
  'notaire1@mestoits.com',
  'Maître Laurent Rousseau',
  '+33689012345',
  'professional',
  'Étude Notariale Rousseau',
  '89012345678901',
  'NOT-2024-001',
  '12 Place de la Bourse',
  'Paris',
  '75002',
  'https://www.notaire-rousseau-paris.fr',
  'Notaire',
  false,
  'Notaire spécialisé en droit immobilier depuis 25 ans. Accompagnement juridique complet pour vos transactions immobilières.',
  'https://linkedin.com/company/etude-notariale-rousseau'
FROM auth.users WHERE email = 'notaire1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  linkedin_url = EXCLUDED.linkedin_url,
  updated_at = NOW();

-- ============================================
-- 1 MAÇON
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url
)
SELECT 
  id,
  'macon1@mestoits.com',
  'Robert Durand',
  '+33690123456',
  'professional',
  'Maçonnerie Durand',
  '90123456789012',
  'ART-2024-001',
  '45 Rue des Artisans',
  'Lyon',
  '69003',
  'https://www.maconnerie-durand.fr',
  'Maçon',
  false,
  'Entreprise de maçonnerie générale depuis 30 ans. Réalisations de qualité pour tous vos travaux de construction et rénovation.',
  'https://facebook.com/maconnerie-durand',
  'https://instagram.com/maconnerie_durand'
FROM auth.users WHERE email = 'macon1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  updated_at = NOW();

-- ============================================
-- 1 ÉLECTRICIEN
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url
)
SELECT 
  id,
  'electricien1@mestoits.com',
  'Jean-Luc Simon',
  '+33601234567',
  'professional',
  'Électricité Simon',
  '01234567890123',
  'ART-2024-002',
  '28 Avenue de l''Électricité',
  'Marseille',
  '13002',
  'https://www.electricite-simon.fr',
  'Électricien',
  false,
  'Électricien professionnel certifié. Installation, dépannage et mise aux normes pour tous vos besoins électriques.',
  'https://facebook.com/electricite-simon',
  'https://instagram.com/electricite_simon'
FROM auth.users WHERE email = 'electricien1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  updated_at = NOW();

-- ============================================
-- 1 ENTREPRISE DE TRAVAUX / ARTISAN
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url, linkedin_url
)
SELECT 
  id,
  'artisan1@mestoits.com',
  'François Lemoine',
  '+33612345012',
  'professional',
  'Artisanat Lemoine',
  '12345012345678',
  'ART-2024-003',
  '7 Rue des Métiers',
  'Toulouse',
  '31001',
  'https://www.artisanat-lemoine.fr',
  'Entreprise de travaux / Artisan',
  false,
  'Entreprise générale de travaux et artisanat. Rénovation complète, plomberie, électricité, menuiserie. Devis gratuit.',
  'https://facebook.com/artisanat-lemoine',
  'https://instagram.com/artisanat_lemoine',
  'https://linkedin.com/company/artisanat-lemoine'
FROM auth.users WHERE email = 'artisan1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  linkedin_url = EXCLUDED.linkedin_url,
  updated_at = NOW();

-- ============================================
-- 1 CARRELEUR
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url
)
SELECT 
  id,
  'carreleur1@mestoits.com',
  'Michel Blanc',
  '+33623456023',
  'professional',
  'Carrelage Blanc',
  '23456012345678',
  'ART-2024-004',
  '15 Rue du Carrelage',
  'Nice',
  '06001',
  'https://www.carrelage-blanc.fr',
  'Carreleur',
  false,
  'Carreleur professionnel spécialisé dans la pose de carrelage, faïence et pierre naturelle. Travaux soignés et garantis.',
  'https://facebook.com/carrelage-blanc',
  'https://instagram.com/carrelage_blanc'
FROM auth.users WHERE email = 'carreleur1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  updated_at = NOW();

-- ============================================
-- 1 PROMOTEUR IMMOBILIER
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, linkedin_url, youtube_url
)
SELECT 
  id,
  'promoteur1@mestoits.com',
  'Philippe Garnier',
  '+33634567034',
  'professional',
  'Promotion Immobilière Garnier',
  '34567012345678',
  'PRO-2024-001',
  '50 Boulevard Haussmann',
  'Paris',
  '75009',
  'https://www.promotion-garnier.fr',
  'Promoteur immobilier',
  false,
  'Promoteur immobilier spécialisé dans la construction de résidences neuves. Plus de 2000 logements livrés en 20 ans d''activité.',
  'https://linkedin.com/company/promotion-garnier',
  'https://youtube.com/@promotion-garnier'
FROM auth.users WHERE email = 'promoteur1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  linkedin_url = EXCLUDED.linkedin_url,
  youtube_url = EXCLUDED.youtube_url,
  updated_at = NOW();

-- ============================================
-- 1 COUVREUR-ZINGUEUR
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url
)
SELECT 
  id,
  'couvreur1@mestoits.com',
  'Daniel Roux',
  '+33645678045',
  'professional',
  'Couvreur-Zingueur Roux',
  '45678012345678',
  'ART-2024-005',
  '22 Rue de la Toiture',
  'Lyon',
  '69004',
  'https://www.couvreur-roux.fr',
  'Couvreur-zingueur',
  false,
  'Couvreur-zingueur expérimenté. Réfection de toitures, zinguerie, étanchéité. Travaux garantis et assurés.',
  'https://facebook.com/couvreur-roux',
  'https://instagram.com/couvreur_roux'
FROM auth.users WHERE email = 'couvreur1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  updated_at = NOW();

-- ============================================
-- 1 PEINTRE EN BÂTIMENT
-- ============================================

INSERT INTO users_2025_12_01_11_29 (
  id, email, full_name, phone, user_type, company_name, siret, professional_card,
  company_address, city, postal_code, website, profession_type, is_verified,
  description, facebook_url, instagram_url
)
SELECT 
  id,
  'peintre1@mestoits.com',
  'Alain Vincent',
  '+33656789056',
  'professional',
  'Peinture Vincent',
  '56789012345678',
  'ART-2024-006',
  '30 Avenue des Peintres',
  'Marseille',
  '13003',
  'https://www.peinture-vincent.fr',
  'Peintre en bâtiment',
  false,
  'Peintre en bâtiment professionnel. Peinture intérieure et extérieure, tapisserie, finitions soignées. Devis gratuit sous 48h.',
  'https://facebook.com/peinture-vincent',
  'https://instagram.com/peinture_vincent'
FROM auth.users WHERE email = 'peintre1@mestoits.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  siret = EXCLUDED.siret,
  professional_card = EXCLUDED.professional_card,
  company_address = EXCLUDED.company_address,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code,
  website = EXCLUDED.website,
  profession_type = EXCLUDED.profession_type,
  description = EXCLUDED.description,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  updated_at = NOW();

