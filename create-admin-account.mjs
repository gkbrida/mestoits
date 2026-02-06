/**
 * Script pour créer un compte administrateur
 * Usage: node create-admin-account.mjs <email> <password> <full_name>
 * 
 * Note: Ce script nécessite bcryptjs et dotenv
 * Installation: npm install bcryptjs dotenv
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes');
  console.error('Assurez-vous d\'avoir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans votre fichier .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createAdmin(email, password, fullName) {
  try {
    // Vérifier si l'admin existe déjà
    const { data: existingAdmin } = await supabaseAdmin
      .from('admins')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingAdmin) {
      console.error(`❌ Un administrateur avec l'email ${email} existe déjà`);
      process.exit(1);
    }

    // Hasher le mot de passe
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Créer l'admin
    const { data, error } = await supabaseAdmin
      .from('admins')
      .insert([
        {
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          full_name: fullName,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Compte administrateur créé avec succès !');
    console.log(`   Email: ${data.email}`);
    console.log(`   Nom: ${data.full_name}`);
    console.log(`   ID: ${data.id}`);
    console.log('\n📝 Vous pouvez maintenant vous connecter sur /admin/login');
  } catch (error) {
    console.error('❌ Erreur lors de la création du compte admin:', error.message);
    process.exit(1);
  }
}

// Récupérer les arguments de la ligne de commande
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('❌ Usage: node create-admin-account.mjs <email> <password> <full_name>');
  console.error('\nExemple:');
  console.error('  node create-admin-account.mjs admin@mestoits.com "MonMotDePasse123" "Admin Principal"');
  process.exit(1);
}

const [email, password, fullName] = args;

if (!email || !password || !fullName) {
  console.error('❌ Tous les paramètres sont requis: email, password, full_name');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Le mot de passe doit contenir au moins 8 caractères');
  process.exit(1);
}

createAdmin(email, password, fullName);

