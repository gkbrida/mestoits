/**
 * Script pour créer 100 annonces immobilières fictives mais réalistes
 * 
 * Répartition:
 * - 35 villas (Location / Vente)
 * - 20 terrains (Vente uniquement)
 * - 30 appartements (Location / Vente)
 * - 15 appartements-meublés (Location uniquement)
 * 
 * Utilisation:
 * 1. Configurer les variables d'environnement:
 *    - SUPABASE_URL=https://votre-projet.supabase.co
 *    - SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
 * 2. Exécuter: node create-properties.js
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

// IDs d'images à utiliser (3 par annonce)
// Ces IDs seront utilisés pour construire les URLs Supabase Storage
const imageIds = [
  '8ddc4a32-9cb4-47fc-89ae-ed15cb2b9a2d',
  '4f7c3a80-a5d0-48ab-9f9b-05b104493df4',
  'dcc8785c-bfc4-47b1-8fe2-81997803a916',
  'cae3f090-26a8-4a74-8ba9-be1122cb6f10',
  '0c3cc7b7-ec46-401b-a7d1-010f3bf019f0',
  '84930a9a-a59f-411b-8a59-759824f31f84',
  'eb6b02f3-0d0c-4242-bad3-1c1d249b20d5',
];

// Villes disponibles
const cities = [
  'Cocody', 'Marcory', 'Port-bouet', 'Treichville', 'Yopougon', 
  'Abobo', 'Adjame', 'Bingerville', 'Assinie', 'Koumassi', 
  'Grand-bassam', 'Jacqueville', 'Le plateau', 'Songon', 'Vridi'
];

// Fonction pour obtenir 3 images aléatoires
// Les images sont stockées comme URLs Supabase Storage
function getRandomImages() {
  const shuffled = [...imageIds].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);
  // Construire les URLs Supabase Storage
  // Format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
  // Pour l'instant, on utilise juste les IDs comme identifiants
  // Vous devrez adapter selon votre configuration Supabase Storage
  return selected.map(id => `https://lvbttyjfagghxyxrxqkk.supabase.co/storage/v1/object/public/property-images/${id}.jpg`);
}

// Fonction pour générer une adresse réaliste
function generateAddress(city) {
  const streets = [
    'Boulevard de la République', 'Avenue Franchet d\'Esperey', 'Rue du Commerce',
    'Boulevard Lagunaire', 'Avenue Général de Gaulle', 'Rue des Jardins',
    'Boulevard de la Paix', 'Avenue des Cocotiers', 'Rue de la Plage',
    'Boulevard de l\'Indépendance', 'Avenue Jean-Paul II', 'Rue des Écoles',
    'Boulevard de la Victoire', 'Avenue des Palmiers', 'Rue du Marché',
    'Boulevard de la Liberté', 'Avenue de la Résistance', 'Rue des Artisans',
    'Boulevard du Port', 'Avenue des Manguiers', 'Rue de la Poste',
  ];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const number = Math.floor(Math.random() * 200) + 1;
  return `${number} ${street}`;
}

// Fonction pour générer une description réaliste
function generateDescription(propertyType, offerType, city, bedrooms, surfaceArea) {
  const descriptions = {
    villa: {
      sale: [
        `Magnifique villa de ${bedrooms || 4} chambres située dans le quartier résidentiel de ${city}. Cette propriété de ${surfaceArea}m² offre un cadre de vie exceptionnel avec jardin paysagé, piscine et garage. Idéale pour une famille en quête de confort et de tranquillité.`,
        `Prestigieuse villa de ${bedrooms || 5} chambres à ${city}. Cette résidence de ${surfaceArea}m² allie élégance et modernité avec ses espaces généreux, sa terrasse aménagée et son jardin arboré. Un investissement de qualité dans un secteur recherché.`,
        `Superbe villa de ${bedrooms || 4} chambres dans le quartier huppé de ${city}. Cette propriété de ${surfaceArea}m² dispose d'un grand jardin, d'une piscine et d'espaces de vie spacieux. Parfaite pour les amateurs de standing et de confort.`,
      ],
      rental: [
        `Villa de ${bedrooms || 4} chambres à louer à ${city}. Cette propriété de ${surfaceArea}m² offre un cadre de vie exceptionnel avec jardin, piscine et espaces de vie généreux. Location longue durée idéale pour une famille.`,
        `Magnifique villa de ${bedrooms || 5} chambres disponible à la location à ${city}. Cette résidence de ${surfaceArea}m² dispose d'un jardin paysagé, d'une terrasse et de tous les équipements modernes. Location meublée ou non meublée.`,
        `Prestigieuse villa de ${bedrooms || 4} chambres à louer dans le quartier résidentiel de ${city}. Cette propriété de ${surfaceArea}m² allie confort et élégance avec ses espaces généreux et son jardin arboré.`,
      ],
    },
    apartment: {
      sale: [
        `Appartement de ${bedrooms || 3} chambres à vendre à ${city}. Cette propriété de ${surfaceArea}m² offre un excellent rapport qualité-prix avec ses espaces bien agencés et sa situation privilégiée. Idéal pour premier achat ou investissement.`,
        `Bel appartement de ${bedrooms || 2} chambres situé à ${city}. Cette propriété de ${surfaceArea}m² dispose d'un balcon, d'un parking et de tous les équipements modernes. Secteur calme et résidentiel.`,
        `Appartement moderne de ${bedrooms || 3} chambres à ${city}. Cette propriété de ${surfaceArea}m² bénéficie d'une exposition optimale, d'espaces de vie agréables et d'une situation centrale. Parfait pour investissement locatif.`,
      ],
      rental: [
        `Appartement de ${bedrooms || 2} chambres à louer à ${city}. Cette propriété de ${surfaceArea}m² offre un excellent confort avec ses espaces bien agencés et sa situation privilégiée. Location longue durée.`,
        `Bel appartement de ${bedrooms || 3} chambres disponible à la location à ${city}. Cette propriété de ${surfaceArea}m² dispose d'un balcon, d'un parking et de tous les équipements nécessaires. Secteur calme et résidentiel.`,
        `Appartement moderne de ${bedrooms || 2} chambres à louer dans le quartier de ${city}. Cette propriété de ${surfaceArea}m² bénéficie d'une exposition optimale et d'une situation centrale.`,
      ],
    },
    land: {
      sale: [
        `Terrain constructible de ${surfaceArea}m² à vendre à ${city}. Parfaitement situé dans un secteur en développement, ce terrain offre de nombreuses possibilités de construction. Titre foncier en règle.`,
        `Parcelle de ${surfaceArea}m² à vendre à ${city}. Ce terrain constructible bénéficie d'un accès facile et d'une situation privilégiée. Idéal pour construction de villa ou projet immobilier.`,
        `Terrain viabilisé de ${surfaceArea}m² situé à ${city}. Cette parcelle constructible offre un excellent potentiel avec ses dimensions généreuses et sa localisation stratégique. Titre foncier disponible.`,
      ],
    },
  };

  if (propertyType === 'apartment' && offerType === 'rental') {
    // Appartement meublé
    return `Appartement meublé de ${bedrooms || 2} chambres à louer à ${city}. Cette propriété de ${surfaceArea}m² est entièrement équipée et meublée, prête à emménager. Location courte ou longue durée possible.`;
  }

  const typeDescriptions = descriptions[propertyType]?.[offerType];
  if (typeDescriptions) {
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }
  return `Propriété de ${surfaceArea}m² à ${city}. ${propertyType === 'sale' ? 'À vendre' : 'À louer'}.`;
}

// Fonction pour générer un titre
function generateTitle(propertyType, offerType, city, bedrooms, surfaceArea) {
  const offerText = offerType === 'sale' ? 'à vendre' : 'à louer';
  const typeText = {
    villa: 'Villa',
    apartment: bedrooms ? `Appartement ${bedrooms} chambres` : 'Appartement',
    land: 'Terrain',
  }[propertyType] || 'Propriété';

  if (propertyType === 'apartment' && offerType === 'rental') {
    return `Appartement meublé ${bedrooms || 2} chambres ${offerText} - ${city}`;
  }

  return `${typeText} ${bedrooms ? bedrooms + ' chambres' : ''} ${offerText} - ${city}`;
}

// Fonction pour calculer le prix réaliste
function calculatePrice(propertyType, offerType, surfaceArea, city, bedrooms) {
  // Prix au m² approximatifs pour Abidjan (en FCFA)
  const pricePerSqm = {
    villa: {
      sale: { min: 250000, max: 800000 }, // 250k à 800k FCFA/m²
      rental: { min: 1500, max: 5000 }, // 1500 à 5000 FCFA/m²/mois
    },
    apartment: {
      sale: { min: 200000, max: 600000 },
      rental: { min: 1200, max: 4000 },
    },
    land: {
      sale: { min: 50000, max: 300000 },
    },
  };

  // Ajustement selon la ville (Cocody, Le plateau = plus cher)
  const cityMultiplier = ['Cocody', 'Le plateau', 'Marcory'].includes(city) ? 1.3 : 
                         ['Yopougon', 'Abobo', 'Adjame'].includes(city) ? 0.8 : 1;

  const basePrice = pricePerSqm[propertyType]?.[offerType];
  if (!basePrice) return 0;

  const pricePerSqmValue = (basePrice.min + Math.random() * (basePrice.max - basePrice.min)) * cityMultiplier;
  
  if (offerType === 'sale') {
    return Math.round(surfaceArea * pricePerSqmValue);
  } else {
    // Pour la location, prix mensuel
    return Math.round(surfaceArea * pricePerSqmValue);
  }
}

// Fonction pour générer les features
function generateFeatures(propertyType, bedrooms) {
  const allFeatures = [
    'Climatisation', 'Piscine', 'Garage', 'Jardin', 'Balcon', 'Terrasse',
    'Ascenseur', 'Parking', 'Sécurité', 'Interphone', 'Vidéosurveillance',
    'Alarme', 'Portail électrique', 'Clôture', 'Électricité', 'Eau courante',
    'Internet', 'Cuisine équipée', 'Meublé', 'Chauffage', 'Ventilateur',
  ];

  const features = [];
  const count = Math.floor(Math.random() * 5) + 3; // 3 à 7 features

  for (let i = 0; i < count; i++) {
    const feature = allFeatures[Math.floor(Math.random() * allFeatures.length)];
    if (!features.includes(feature)) {
      features.push(feature);
    }
  }

  return features;
}

// Récupérer les IDs des professionnels
async function getProfessionalIds() {
  const { data, error } = await supabase
    .from('users_2025_12_01_11_29')
    .select('id, email')
    .in('email', [
      'agence1@mestoits.com', 'agence2@mestoits.com', 'agence3@mestoits.com',
      'agence4@mestoits.com', 'agence5@mestoits.com',
      'agent1@mestoits.com', 'agent2@mestoits.com',
    ]);

  if (error) {
    throw error;
  }

  return data.map(u => u.id);
}

// Générer les propriétés
async function createProperties() {
  console.log('🚀 Création de 100 annonces immobilières...\n');

  // Récupérer les IDs des professionnels
  const professionalIds = await getProfessionalIds();
  if (professionalIds.length === 0) {
    throw new Error('Aucun professionnel trouvé. Assurez-vous que les comptes sont créés.');
  }

  console.log(`✅ ${professionalIds.length} professionnels trouvés\n`);

  const properties = [];

  // 35 Villas (Location / Vente)
  for (let i = 0; i < 35; i++) {
    const offerType = Math.random() > 0.5 ? 'sale' : 'rental';
    const city = cities[Math.floor(Math.random() * cities.length)];
    const bedrooms = Math.floor(Math.random() * 3) + 4; // 4 à 6 chambres
    const bathrooms = bedrooms - 1;
    const surfaceArea = Math.floor(Math.random() * 200) + 200; // 200 à 400 m²
    const price = calculatePrice('villa', offerType, surfaceArea, city, bedrooms);

    properties.push({
      owner_id: professionalIds[Math.floor(Math.random() * professionalIds.length)],
      title: generateTitle('villa', offerType, city, bedrooms, surfaceArea),
      description: generateDescription('villa', offerType, city, bedrooms, surfaceArea),
      offer_type: offerType,
      property_type: 'villa',
      villa_type: ['low-rise', 'duplex', 'triplex'][Math.floor(Math.random() * 3)],
      address: generateAddress(city),
      city: city,
      postal_code: null,
      surface_area: surfaceArea,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      floors: Math.floor(Math.random() * 2) + 1, // 1 à 2 étages
      price: price,
      agency_fees: offerType === 'rental' ? Math.round(price * 0.1) : Math.round(price * 0.05),
      security_deposit: offerType === 'rental' ? Math.round(price * 2) : null,
      advance_rent: offerType === 'rental' ? Math.round(price * 1) : null,
      service_charges: offerType === 'rental' ? Math.round(price * 0.2) : null,
      condition: ['new', 'excellent', 'good'][Math.floor(Math.random() * 3)],
      standing: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      security_type: ['gated-community', 'security-equipment', 'none'][Math.floor(Math.random() * 3)],
      accessibility: ['paved', 'close-to-paved'][Math.floor(Math.random() * 2)],
      land_titles: ['Titre foncier'],
      features: generateFeatures('villa', bedrooms),
      images: getRandomImages(),
      offered_by: 'professional',
      status: 'active',
      views_count: Math.floor(Math.random() * 500),
      favorites_count: Math.floor(Math.random() * 50),
    });
  }

  // 20 Terrains (Vente uniquement)
  for (let i = 0; i < 20; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const surfaceArea = Math.floor(Math.random() * 500) + 300; // 300 à 800 m²
    const price = calculatePrice('land', 'sale', surfaceArea, city, null);

    properties.push({
      owner_id: professionalIds[Math.floor(Math.random() * professionalIds.length)],
      title: generateTitle('land', 'sale', city, null, surfaceArea),
      description: generateDescription('land', 'sale', city, null, surfaceArea),
      offer_type: 'sale',
      property_type: 'land',
      villa_type: null,
      address: generateAddress(city),
      city: city,
      postal_code: null,
      surface_area: surfaceArea,
      bedrooms: null,
      bathrooms: null,
      floors: null,
      price: price,
      agency_fees: Math.round(price * 0.05),
      security_deposit: null,
      advance_rent: null,
      service_charges: null,
      condition: null,
      standing: null,
      security_type: null,
      accessibility: ['paved', 'close-to-paved', 'unpaved'][Math.floor(Math.random() * 3)],
      land_titles: ['Titre foncier'],
      features: ['Viabilisé', 'Clôturé', 'Accès facile'],
      images: getRandomImages(),
      offered_by: 'professional',
      status: 'active',
      views_count: Math.floor(Math.random() * 300),
      favorites_count: Math.floor(Math.random() * 30),
    });
  }

  // 30 Appartements (Location / Vente)
  for (let i = 0; i < 30; i++) {
    const offerType = Math.random() > 0.5 ? 'sale' : 'rental';
    const city = cities[Math.floor(Math.random() * cities.length)];
    const bedrooms = Math.floor(Math.random() * 3) + 1; // 1 à 3 chambres
    const bathrooms = bedrooms;
    const surfaceArea = Math.floor(Math.random() * 80) + 50; // 50 à 130 m²
    const price = calculatePrice('apartment', offerType, surfaceArea, city, bedrooms);

    properties.push({
      owner_id: professionalIds[Math.floor(Math.random() * professionalIds.length)],
      title: generateTitle('apartment', offerType, city, bedrooms, surfaceArea),
      description: generateDescription('apartment', offerType, city, bedrooms, surfaceArea),
      offer_type: offerType,
      property_type: 'apartment',
      villa_type: null,
      address: generateAddress(city),
      city: city,
      postal_code: null,
      surface_area: surfaceArea,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      floors: Math.floor(Math.random() * 5) + 1, // 1 à 5 étages
      price: price,
      agency_fees: offerType === 'rental' ? Math.round(price * 0.1) : Math.round(price * 0.05),
      security_deposit: offerType === 'rental' ? Math.round(price * 2) : null,
      advance_rent: offerType === 'rental' ? Math.round(price * 1) : null,
      service_charges: offerType === 'rental' ? Math.round(price * 0.15) : null,
      condition: ['new', 'excellent', 'good'][Math.floor(Math.random() * 3)],
      standing: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      security_type: ['gated-community', 'security-equipment', 'none'][Math.floor(Math.random() * 3)],
      accessibility: ['paved', 'close-to-paved'][Math.floor(Math.random() * 2)],
      land_titles: null,
      features: generateFeatures('apartment', bedrooms),
      images: getRandomImages(),
      offered_by: 'professional',
      status: 'active',
      views_count: Math.floor(Math.random() * 400),
      favorites_count: Math.floor(Math.random() * 40),
    });
  }

  // 15 Appartements meublés (Location uniquement)
  for (let i = 0; i < 15; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)];
    const bedrooms = Math.floor(Math.random() * 2) + 1; // 1 à 2 chambres
    const bathrooms = bedrooms;
    const surfaceArea = Math.floor(Math.random() * 60) + 40; // 40 à 100 m²
    const price = calculatePrice('apartment', 'rental', surfaceArea, city, bedrooms);

    properties.push({
      owner_id: professionalIds[Math.floor(Math.random() * professionalIds.length)],
      title: generateTitle('apartment', 'rental', city, bedrooms, surfaceArea),
      description: generateDescription('apartment', 'rental', city, bedrooms, surfaceArea),
      offer_type: 'rental',
      property_type: 'apartment',
      villa_type: null,
      address: generateAddress(city),
      city: city,
      postal_code: null,
      surface_area: surfaceArea,
      bedrooms: bedrooms,
      bathrooms: bathrooms,
      floors: Math.floor(Math.random() * 4) + 1, // 1 à 4 étages
      price: price,
      agency_fees: Math.round(price * 0.1),
      security_deposit: Math.round(price * 2),
      advance_rent: Math.round(price * 1),
      service_charges: Math.round(price * 0.15),
      condition: ['new', 'excellent', 'good'][Math.floor(Math.random() * 3)],
      standing: ['medium', 'high'][Math.floor(Math.random() * 2)],
      security_type: ['gated-community', 'security-equipment'][Math.floor(Math.random() * 2)],
      accessibility: 'paved',
      land_titles: null,
      features: [...generateFeatures('apartment', bedrooms), 'Meublé', 'Cuisine équipée'],
      images: getRandomImages(),
      offered_by: 'professional',
      status: 'active',
      views_count: Math.floor(Math.random() * 400),
      favorites_count: Math.floor(Math.random() * 40),
    });
  }

  // Insérer les propriétés par lots
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('properties')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Erreur lot ${Math.floor(i / batchSize) + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`✅ Lot ${Math.floor(i / batchSize) + 1}: ${batch.length} annonces créées`);
      }
    } catch (err) {
      console.error(`❌ Erreur lot ${Math.floor(i / batchSize) + 1}:`, err.message);
      errorCount += batch.length;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Annonces créées avec succès: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📧 Total: ${properties.length}`);
  console.log('\n📋 Répartition:');
  console.log(`   - 35 villas (Location / Vente)`);
  console.log(`   - 20 terrains (Vente)`);
  console.log(`   - 30 appartements (Location / Vente)`);
  console.log(`   - 15 appartements meublés (Location)`);
  console.log('═══════════════════════════════════════════════════════\n');
}

// Exécuter le script
createProperties()
  .then(() => {
    console.log('✨ Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });

