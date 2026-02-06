import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    return res.status(200).end();
  }

  // Vérifier que la méthode est POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Récupérer le token d'authentification
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Créer un client Supabase avec la clé anon pour vérifier l'utilisateur
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables d\'environnement Supabase manquantes');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userId = user.id;

    // Créer un client Supabase avec la clé de service (droits admin)
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseServiceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Supprimer d'abord le profil utilisateur de la table users_2025_12_01_11_29
    const { error: profileError } = await supabaseAdmin
      .from('users_2025_12_01_11_29')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Erreur suppression profil:', profileError);
      // On continue quand même pour supprimer le compte auth
    }

    // Supprimer l'utilisateur de auth.users (nécessite les droits admin)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Erreur suppression auth user:', deleteError);
      throw deleteError;
    }

    // Retourner le succès avec les headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    
    return res.status(200).json({
      success: true,
      message: 'Compte supprimé avec succès',
    });

  } catch (error: any) {
    console.error('Erreur suppression compte:', error);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Une erreur est survenue lors de la suppression du compte',
    });
  }
}

