import "dotenv/config";
import express from "express";
import nodemailer from "nodemailer";
import cors from "cors";
import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const app = express();

// Middleware CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['*'];

console.log('🌐 Origines CORS autorisées:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Si '*' est dans les origines autorisées, autoriser toutes
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    
    // Vérifier si l'origine est autorisée
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Origine non autorisée: ${origin}`);
      console.warn(`   Origines autorisées: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));
app.use(express.json());

// Middleware pour logger les requêtes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Configuration Zoho SMTP (serveur européen)
const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtppro.zoho.eu",
    port: 465,
    secure: true, // true pour port 465 (SSL)
    auth: {
      user: process.env.ZOHO_USER || 'contact@mestoits.com',
      pass: process.env.ZOHO_PASSWORD || process.env.ZOHO_PASSWORD_APPLICATION
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Route de santé
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "Email Service",
    timestamp: new Date().toISOString()
  });
});

// Route principale pour envoyer des emails
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    // Validation
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        error: "Paramètres manquants: to, subject, et html/text sont requis",
        received: { to: !!to, subject: !!subject, html: !!html, text: !!text }
      });
    }

    // Vérifier que les variables d'environnement sont définies
    const zohoUser = process.env.ZOHO_USER || 'contact@mestoits.com';
    const zohoPassword = process.env.ZOHO_PASSWORD || '32LxgGqs8VEt';
    
    if (!zohoUser || !zohoPassword) {
      console.error("❌ Variables d'environnement Zoho non définies");
      return res.status(500).json({
        success: false,
        error: "Configuration serveur email manquante"
      });
    }

    console.log(`📧 Envoi d'email à: ${to}`);
    console.log(`📝 Sujet: ${subject}`);

    // Créer le transporteur
    const transporter = createTransporter();

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: `"Mestoits" <${zohoUser}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, '') || '',
      html: html || undefined,
    });

    console.log(`✅ Email envoyé avec succès! MessageId: ${info.messageId}`);

    res.json({
      success: true,
      messageId: info.messageId,
      message: "Email envoyé avec succès"
    });

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de l'envoi de l'email",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route pour créer une session de paiement Stripe
app.post("/create-payment-session", async (req, res) => {
  try {
    const { 
      amount, 
      month, 
      propertyTitle, 
      tenantEmail, 
      tenantName, 
      leaseId,
      paymentId,
      origin 
    } = req.body;

    // Validation
    if (!amount || !month || !propertyTitle || !tenantEmail || !leaseId || !origin) {
      return res.status(400).json({
        success: false,
        error: "Paramètres manquants: amount, month, propertyTitle, tenantEmail, leaseId et origin sont requis"
      });
    }

    // Vérifier que la clé Stripe est définie
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ Clé secrète Stripe non définie");
      return res.status(500).json({
        success: false,
        error: "Configuration Stripe manquante"
      });
    }

    // Valider et convertir le montant en nombre
    const amountNumber = typeof amount === 'string' ? parseFloat(amount.replace(/[^\d,.]/g, '').replace(',', '.')) : Number(amount);
    
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        success: false,
        error: `Montant invalide: ${amount}. Le montant doit être un nombre positif.`
      });
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('💳 CRÉATION D\'UNE SESSION DE PAIEMENT STRIPE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📧 Locataire: ${tenantEmail}`);
    console.log(`💰 Montant: ${amountNumber} € - Période: ${month}`);
    console.log(`📊 Montant original reçu: ${amount} (type: ${typeof amount})`);
    console.log(`🌐 Origin reçu: ${origin}`);
    console.log(`🏠 Propriété: ${propertyTitle}`);
    console.log(`📋 Lease ID: ${leaseId}`);
    console.log(`💳 Payment ID: ${paymentId || 'NON FOURNI'}`);
    
    if (!paymentId) {
      console.warn('⚠️ ATTENTION: paymentId non fourni! Le paiement ne pourra pas être mis à jour automatiquement.');
    }

    // Construire les URLs de retour (utiliser /mes-locations qui est la route React Router)
    const successUrl = `${origin}/mes-locations?payment=success&lease=${leaseId}&paymentId=${paymentId || ''}`;
    const cancelUrl = `${origin}/mes-locations?payment=cancelled&lease=${leaseId}`;
    
    // Vérifier que l'URL est correcte
    if (successUrl.includes('/tenant-rentals')) {
      console.error('❌ ERREUR: L\'URL contient /tenant-rentals au lieu de /mes-locations!');
      console.error('   • URL générée:', successUrl);
      console.error('   • Origin:', origin);
    }
    
    console.log(`✅ Success URL: ${successUrl}`);
    console.log(`❌ Cancel URL: ${cancelUrl}`);
    console.log('═══════════════════════════════════════════════════════');

    // Créer une session de paiement Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Loyer ${month}`,
              description: `Paiement du loyer pour ${propertyTitle}`,
            },
            unit_amount: Math.round(amountNumber * 100), // Montant en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: tenantEmail,
      metadata: {
        month: month,
        propertyTitle: propertyTitle,
        tenantName: tenantName,
        leaseId: leaseId,
        paymentId: paymentId || '',
        type: 'rent_payment',
      },
    });

    console.log(`✅ Session Stripe créée avec succès! SessionId: ${session.id}`);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: "Session de paiement créée avec succès"
    });

  } catch (error) {
    console.error("❌ Erreur lors de la création de la session Stripe:", error);
    
    res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de la création de la session de paiement",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route pour la connexion admin
app.post("/admin/login", async (req, res) => {
  try {
    console.log('🔐 Requête de connexion admin reçue');
    console.log('   Body:', { email: req.body?.email, hasPassword: !!req.body?.password });
    
    const { email, password } = req.body || {};

    if (!email || !password) {
      console.log('❌ Email ou mot de passe manquant');
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('🔍 Vérification des variables d\'environnement:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!supabaseServiceRoleKey
    });

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ Variables d\'environnement Supabase manquantes');
      console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
      console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓' : '✗');
      return res.status(500).json({
        success: false,
        error: 'Variables d\'environnement Supabase manquantes'
      });
    }

    console.log('📡 Création du client Supabase...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('🔍 Recherche de l\'admin dans la base de données...');
    // Récupérer l'admin par email
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .maybeSingle();

    if (adminError) {
      console.error('❌ Erreur lors de la recherche de l\'admin:', adminError);
      return res.status(500).json({
        success: false,
        error: `Erreur de base de données: ${adminError.message}`
      });
    }

    if (!admin) {
      console.log(`❌ Aucun admin trouvé pour: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    console.log('🔐 Vérification du mot de passe...');
    // Vérifier le mot de passe
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, admin.password_hash);
    } catch (bcryptError) {
      console.error('❌ Erreur lors de la comparaison du mot de passe:', bcryptError);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la vérification du mot de passe'
      });
    }

    if (!passwordMatch) {
      console.log(`❌ Mot de passe incorrect pour: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    console.log('✅ Mot de passe correct, mise à jour de la dernière connexion...');
    // Mettre à jour la dernière connexion
    try {
      await supabaseAdmin
        .from('admins')
        .update({ last_login: new Date().toISOString() })
        .eq('id', admin.id);
    } catch (updateError) {
      console.warn('⚠️ Erreur lors de la mise à jour de last_login:', updateError);
      // On continue quand même, ce n'est pas critique
    }

    // Retourner les informations de l'admin (sans le hash du mot de passe)
    const { password_hash, ...adminData } = admin;

    console.log(`✅ Connexion admin réussie pour: ${email}`);

    return res.status(200).json({
      success: true,
      admin: adminData,
    });
  } catch (error) {
    console.error('❌ Erreur lors de la connexion admin:', error);
    console.error('   Stack:', error.stack);
    
    // S'assurer qu'une réponse JSON est toujours envoyée
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Une erreur est survenue lors de la connexion',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// Gestion des erreurs 404
app.use((req, res) => {
  console.log(`⚠️ Route non trouvée: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: `Route non trouvée: ${req.method} ${req.path}`,
    availableRoutes: [
      'GET /health',
      'POST /send-email',
      'POST /create-payment-session',
      'POST /admin/login'
    ]
  });
});

// Middleware de gestion d'erreurs global (doit être après toutes les routes)
app.use((err, req, res, next) => {
  console.error('❌ Erreur middleware:', err);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: err.message || 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Gestion globale des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Démarrer le serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur email et paiement démarré sur le port ${PORT}`);
  console.log(`📧 Zoho User: ${process.env.ZOHO_USER || 'contact@mestoits.com'}`);
  console.log(`🔐 Zoho Password: ${process.env.ZOHO_PASSWORD ? '✅ Défini' : '❌ NON DÉFINI'}`);
  console.log(`💳 Stripe Secret Key: ${process.env.STRIPE_SECRET_KEY ? '✅ Défini' : '❌ NON DÉFINI'}`);
  console.log(`🗄️  Supabase URL: ${process.env.SUPABASE_URL ? '✅ Défini' : '❌ NON DÉFINI'}`);
  console.log(`🔑 Supabase Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Défini' : '❌ NON DÉFINI'}`);
  console.log(`\n📋 Routes disponibles:`);
  console.log(`   POST /admin/login - Connexion admin`);
  console.log(`   POST /send-email - Envoi d'email`);
  console.log(`   GET /health - Vérification de santé`);
});

