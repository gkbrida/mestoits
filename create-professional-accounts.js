/**
 * Script pour créer 15 comptes professionnels fictifs
 * 
 * Utilisation:
 * 1. Installer les dépendances: npm install @supabase/supabase-js
 * 2. Configurer les variables d'environnement:
 *    - SUPABASE_URL=https://votre-projet.supabase.co
 *    - SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
 * 3. Exécuter: node create-professional-accounts.js
 * 
 * Mot de passe pour tous les comptes: azerty
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://lvbttyjfagghxyxrxqkk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ Erreur: SUPABASE_SERVICE_ROLE_KEY non définie');
  console.error('Définissez-la avec: export SUPABASE_SERVICE_ROLE_KEY="votre_clé"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Liste des 15 professionnels à créer
const professionals = [
  // 5 Agences immobilières
  {
    email: 'agence1@mestoits.com',
    password: 'azerty',
    full_name: 'Jean Dupont',
    phone: '+33612345678',
    company_name: 'Agence Immobilière Premium',
    siret: '12345678901234',
    professional_card: 'CP-2024-001',
    company_address: '15 Avenue des Champs-Élysées',
    city: 'Paris',
    postal_code: '75008',
    website: 'https://www.agence-premium-paris.fr',
    profession_type: 'Agence immobilière',
    description: 'Agence immobilière de prestige spécialisée dans les biens haut de gamme à Paris. Plus de 20 ans d\'expérience dans l\'immobilier de luxe.',
    facebook_url: 'https://facebook.com/agence-premium-paris',
    instagram_url: 'https://instagram.com/agence_premium_paris',
    linkedin_url: 'https://linkedin.com/company/agence-premium-paris',
  },
  {
    email: 'agence2@mestoits.com',
    password: 'azerty',
    full_name: 'Marie Martin',
    phone: '+33623456789',
    company_name: 'Agence Immobilière Confort',
    siret: '23456789012345',
    professional_card: 'CP-2024-002',
    company_address: '42 Rue de la République',
    city: 'Lyon',
    postal_code: '69001',
    website: 'https://www.agence-confort-lyon.fr',
    profession_type: 'Agence immobilière',
    description: 'Agence immobilière familiale à Lyon depuis 15 ans. Spécialisée dans l\'accompagnement personnalisé pour la vente et la location.',
    facebook_url: 'https://facebook.com/agence-confort-lyon',
    instagram_url: 'https://instagram.com/agence_confort_lyon',
  },
  {
    email: 'agence3@mestoits.com',
    password: 'azerty',
    full_name: 'Pierre Bernard',
    phone: '+33634567890',
    company_name: 'Agence Immobilière Moderne',
    siret: '34567890123456',
    professional_card: 'CP-2024-003',
    company_address: '8 Boulevard Victor Hugo',
    city: 'Marseille',
    postal_code: '13001',
    website: 'https://www.agence-moderne-marseille.fr',
    profession_type: 'Agence immobilière',
    description: 'Agence immobilière moderne utilisant les dernières technologies pour vous accompagner dans vos projets immobiliers à Marseille et sa région.',
    linkedin_url: 'https://linkedin.com/company/agence-moderne-marseille',
    youtube_url: 'https://youtube.com/@agence-moderne-marseille',
  },
  {
    email: 'agence4@mestoits.com',
    password: 'azerty',
    full_name: 'Sophie Dubois',
    phone: '+33645678901',
    company_name: 'Agence Immobilière Horizon',
    siret: '45678901234567',
    professional_card: 'CP-2024-004',
    company_address: '25 Place Bellecour',
    city: 'Lyon',
    postal_code: '69002',
    website: 'https://www.agence-horizon-lyon.fr',
    profession_type: 'Agence immobilière',
    description: 'Agence immobilière dynamique spécialisée dans l\'investissement locatif et la gestion de patrimoine immobilier.',
    facebook_url: 'https://facebook.com/agence-horizon-lyon',
    instagram_url: 'https://instagram.com/agence_horizon_lyon',
    tiktok_url: 'https://tiktok.com/@agence_horizon_lyon',
  },
  {
    email: 'agence5@mestoits.com',
    password: 'azerty',
    full_name: 'Thomas Leroy',
    phone: '+33656789012',
    company_name: 'Agence Immobilière Excellence',
    siret: '56789012345678',
    professional_card: 'CP-2024-005',
    company_address: '10 Rue du Commerce',
    city: 'Toulouse',
    postal_code: '31000',
    website: 'https://www.agence-excellence-toulouse.fr',
    profession_type: 'Agence immobilière',
    description: 'Agence immobilière d\'excellence à Toulouse. Expertise reconnue dans la vente de maisons, appartements et biens commerciaux.',
    linkedin_url: 'https://linkedin.com/company/agence-excellence-toulouse',
    youtube_url: 'https://youtube.com/@agence-excellence-toulouse',
  },
  // 2 Agents immobiliers
  {
    email: 'agent1@mestoits.com',
    password: 'azerty',
    full_name: 'Claire Moreau',
    phone: '+33667890123',
    company_name: 'Claire Moreau - Agent Immobilier Indépendant',
    siret: '67890123456789',
    professional_card: 'CP-2024-006',
    company_address: '33 Avenue de la Grande Armée',
    city: 'Paris',
    postal_code: '75016',
    website: 'https://www.claire-moreau-immobilier.fr',
    profession_type: 'Agent immobilier',
    description: 'Agent immobilier indépendant spécialisé dans le 16ème arrondissement de Paris. Accompagnement personnalisé pour vos projets immobiliers.',
    facebook_url: 'https://facebook.com/claire-moreau-immobilier',
    instagram_url: 'https://instagram.com/claire_moreau_immobilier',
    linkedin_url: 'https://linkedin.com/in/claire-moreau-immobilier',
  },
  {
    email: 'agent2@mestoits.com',
    password: 'azerty',
    full_name: 'Marc Petit',
    phone: '+33678901234',
    company_name: 'Marc Petit - Agent Immobilier',
    siret: '78901234567890',
    professional_card: 'CP-2024-007',
    company_address: '18 Rue de la Paix',
    city: 'Nice',
    postal_code: '06000',
    website: 'https://www.marc-petit-immobilier.fr',
    profession_type: 'Agent immobilier',
    description: 'Agent immobilier à Nice avec plus de 10 ans d\'expérience. Spécialisé dans les biens de standing sur la Côte d\'Azur.',
    linkedin_url: 'https://linkedin.com/in/marc-petit-immobilier',
    youtube_url: 'https://youtube.com/@marc-petit-immobilier',
  },
  // 1 Notaire
  {
    email: 'notaire1@mestoits.com',
    password: 'azerty',
    full_name: 'Maître Laurent Rousseau',
    phone: '+33689012345',
    company_name: 'Étude Notariale Rousseau',
    siret: '89012345678901',
    professional_card: 'NOT-2024-001',
    company_address: '12 Place de la Bourse',
    city: 'Paris',
    postal_code: '75002',
    website: 'https://www.notaire-rousseau-paris.fr',
    profession_type: 'Notaire',
    description: 'Notaire spécialisé en droit immobilier depuis 25 ans. Accompagnement juridique complet pour vos transactions immobilières.',
    linkedin_url: 'https://linkedin.com/company/etude-notariale-rousseau',
  },
  // 1 Maçon
  {
    email: 'macon1@mestoits.com',
    password: 'azerty',
    full_name: 'Robert Durand',
    phone: '+33690123456',
    company_name: 'Maçonnerie Durand',
    siret: '90123456789012',
    professional_card: 'ART-2024-001',
    company_address: '45 Rue des Artisans',
    city: 'Lyon',
    postal_code: '69003',
    website: 'https://www.maconnerie-durand.fr',
    profession_type: 'Maçon',
    description: 'Entreprise de maçonnerie générale depuis 30 ans. Réalisations de qualité pour tous vos travaux de construction et rénovation.',
    facebook_url: 'https://facebook.com/maconnerie-durand',
    instagram_url: 'https://instagram.com/maconnerie_durand',
  },
  // 1 Électricien
  {
    email: 'electricien1@mestoits.com',
    password: 'azerty',
    full_name: 'Jean-Luc Simon',
    phone: '+33601234567',
    company_name: 'Électricité Simon',
    siret: '01234567890123',
    professional_card: 'ART-2024-002',
    company_address: '28 Avenue de l\'Électricité',
    city: 'Marseille',
    postal_code: '13002',
    website: 'https://www.electricite-simon.fr',
    profession_type: 'Électricien',
    description: 'Électricien professionnel certifié. Installation, dépannage et mise aux normes pour tous vos besoins électriques.',
    facebook_url: 'https://facebook.com/electricite-simon',
    instagram_url: 'https://instagram.com/electricite_simon',
  },
  // 1 Entreprise de travaux / Artisan
  {
    email: 'artisan1@mestoits.com',
    password: 'azerty',
    full_name: 'François Lemoine',
    phone: '+33612345012',
    company_name: 'Artisanat Lemoine',
    siret: '12345012345678',
    professional_card: 'ART-2024-003',
    company_address: '7 Rue des Métiers',
    city: 'Toulouse',
    postal_code: '31001',
    website: 'https://www.artisanat-lemoine.fr',
    profession_type: 'Entreprise de travaux / Artisan',
    description: 'Entreprise générale de travaux et artisanat. Rénovation complète, plomberie, électricité, menuiserie. Devis gratuit.',
    facebook_url: 'https://facebook.com/artisanat-lemoine',
    instagram_url: 'https://instagram.com/artisanat_lemoine',
    linkedin_url: 'https://linkedin.com/company/artisanat-lemoine',
  },
  // 1 Carreleur
  {
    email: 'carreleur1@mestoits.com',
    password: 'azerty',
    full_name: 'Michel Blanc',
    phone: '+33623456023',
    company_name: 'Carrelage Blanc',
    siret: '23456012345678',
    professional_card: 'ART-2024-004',
    company_address: '15 Rue du Carrelage',
    city: 'Nice',
    postal_code: '06001',
    website: 'https://www.carrelage-blanc.fr',
    profession_type: 'Carreleur',
    description: 'Carreleur professionnel spécialisé dans la pose de carrelage, faïence et pierre naturelle. Travaux soignés et garantis.',
    facebook_url: 'https://facebook.com/carrelage-blanc',
    instagram_url: 'https://instagram.com/carrelage_blanc',
  },
  // 1 Promoteur immobilier
  {
    email: 'promoteur1@mestoits.com',
    password: 'azerty',
    full_name: 'Philippe Garnier',
    phone: '+33634567034',
    company_name: 'Promotion Immobilière Garnier',
    siret: '34567012345678',
    professional_card: 'PRO-2024-001',
    company_address: '50 Boulevard Haussmann',
    city: 'Paris',
    postal_code: '75009',
    website: 'https://www.promotion-garnier.fr',
    profession_type: 'Promoteur immobilier',
    description: 'Promoteur immobilier spécialisé dans la construction de résidences neuves. Plus de 2000 logements livrés en 20 ans d\'activité.',
    linkedin_url: 'https://linkedin.com/company/promotion-garnier',
    youtube_url: 'https://youtube.com/@promotion-garnier',
  },
  // 1 Couvreur-zingueur
  {
    email: 'couvreur1@mestoits.com',
    password: 'azerty',
    full_name: 'Daniel Roux',
    phone: '+33645678045',
    company_name: 'Couvreur-Zingueur Roux',
    siret: '45678012345678',
    professional_card: 'ART-2024-005',
    company_address: '22 Rue de la Toiture',
    city: 'Lyon',
    postal_code: '69004',
    website: 'https://www.couvreur-roux.fr',
    profession_type: 'Couvreur-zingueur',
    description: 'Couvreur-zingueur expérimenté. Réfection de toitures, zinguerie, étanchéité. Travaux garantis et assurés.',
    facebook_url: 'https://facebook.com/couvreur-roux',
    instagram_url: 'https://instagram.com/couvreur_roux',
  },
  // 1 Peintre en bâtiment
  {
    email: 'peintre1@mestoits.com',
    password: 'azerty',
    full_name: 'Alain Vincent',
    phone: '+33656789056',
    company_name: 'Peinture Vincent',
    siret: '56789012345678',
    professional_card: 'ART-2024-006',
    company_address: '30 Avenue des Peintres',
    city: 'Marseille',
    postal_code: '13003',
    website: 'https://www.peinture-vincent.fr',
    profession_type: 'Peintre en bâtiment',
    description: 'Peintre en bâtiment professionnel. Peinture intérieure et extérieure, tapisserie, finitions soignées. Devis gratuit sous 48h.',
    facebook_url: 'https://facebook.com/peinture-vincent',
    instagram_url: 'https://instagram.com/peinture_vincent',
  },
];

async function createProfessionalAccounts() {
  console.log('🚀 Création de 15 comptes professionnels...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const prof of professionals) {
    try {
      console.log(`📝 Création du compte: ${prof.email} (${prof.profession_type})`);

      // 1. Créer le compte dans auth.users
      let authData;
      let userId;

      const { data: newAuthData, error: authError } = await supabase.auth.admin.createUser({
        email: prof.email,
        password: prof.password,
        email_confirm: true, // Confirmer automatiquement l'email
        user_metadata: {
          full_name: prof.full_name,
        },
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          console.log(`⚠️  Compte ${prof.email} existe déjà, récupération...`);
          
          // Récupérer l'utilisateur existant
          const { data: existingUser } = await supabase.auth.admin.getUserByEmail(prof.email);
          if (existingUser?.user) {
            authData = { user: existingUser.user };
            userId = existingUser.user.id;
          } else {
            throw new Error(`Impossible de récupérer l'utilisateur existant: ${prof.email}`);
          }
        } else {
          throw authError;
        }
      } else {
        authData = newAuthData;
        if (!authData?.user) {
          throw new Error('Utilisateur non créé');
        }
        userId = authData.user.id;
      }

      // 2. Créer le profil dans users_2025_12_01_11_29
      const { error: profileError } = await supabase
        .from('users_2025_12_01_11_29')
        .upsert({
          id: userId,
          email: prof.email,
          full_name: prof.full_name,
          phone: prof.phone,
          user_type: 'professional',
          company_name: prof.company_name,
          siret: prof.siret,
          professional_card: prof.professional_card,
          company_address: prof.company_address,
          city: prof.city,
          postal_code: prof.postal_code,
          website: prof.website,
          profession_type: prof.profession_type,
          description: prof.description,
          facebook_url: prof.facebook_url || null,
          instagram_url: prof.instagram_url || null,
          linkedin_url: prof.linkedin_url || null,
          tiktok_url: prof.tiktok_url || null,
          youtube_url: prof.youtube_url || null,
          is_verified: false,
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        throw profileError;
      }

      console.log(`✅ Compte créé avec succès: ${prof.email} (ID: ${userId})\n`);
      successCount++;

    } catch (error) {
      console.error(`❌ Erreur pour ${prof.email}:`, error.message);
      errorCount++;
      console.log('');
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Comptes créés avec succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📧 Total: ${professionals.length}`);
  console.log('\n🔑 Mot de passe pour tous les comptes: azerty');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Exécuter le script
createProfessionalAccounts()
  .then(() => {
    console.log('✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

