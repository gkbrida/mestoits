import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Gérer les requêtes OPTIONS pour CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Seulement POST autorisé
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée'
    });
  }

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
    console.log(`📧 Zoho User: ${zohoUser}`);
    console.log(`📧 Zoho Password: ${zohoPassword ? '✅ Défini' : '❌ NON DÉFINI'}`);

    // Créer le transporteur Zoho avec la configuration européenne
    // Serveur SMTP européen : smtppro.zoho.eu
    // Port : 465 avec SSL
    const transporter = nodemailer.createTransport({
      host: "smtppro.zoho.eu",
      port: 465,
      secure: true, // true pour port 465 (SSL)
      auth: {
        user: zohoUser,
        pass: zohoPassword
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 secondes
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    // Vérifier la connexion avant d'envoyer
    try {
      await transporter.verify();
      console.log('✅ Connexion SMTP Zoho vérifiée (smtppro.zoho.eu:465)');
    } catch (verifyError: any) {
      console.error('❌ Erreur de vérification SMTP:', verifyError);
      
      // Message d'erreur plus détaillé selon le type d'erreur
      let errorMessage = `Erreur de connexion SMTP: ${verifyError.message || verifyError}`;
      
      if (verifyError.code === 'EAUTH' || verifyError.responseCode === 535) {
        errorMessage = `Erreur d'authentification Zoho (535): Les identifiants sont incorrects ou le compte n'est pas configuré. 
        
Vérifications à faire :
1. Vérifier que le compte email ${zohoUser} existe dans Zoho Mail
2. Vérifier que le domaine mestoits.com est vérifié dans Zoho
3. Vérifier que le mot de passe d'application est correct
4. Vérifier que les identifiants sont corrects dans les variables d'environnement Vercel`;
      } else if (verifyError.code === 'ECONNREFUSED' || verifyError.code === 'ETIMEDOUT') {
        errorMessage = `Erreur de connexion au serveur SMTP Zoho. Vérifiez votre connexion réseau et que smtppro.zoho.eu est accessible.`;
      }
      
      throw new Error(errorMessage);
    }

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: `"Mestoits" <${zohoUser}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      text: text || html?.replace(/<[^>]*>/g, '') || '',
      html: html || undefined,
    });

    console.log(`✅ Email envoyé avec succès! MessageId: ${info.messageId}`);

    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.json({
      success: true,
      messageId: info.messageId,
      message: "Email envoyé avec succès"
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    console.error("❌ Type d'erreur:", error?.constructor?.name);
    console.error("❌ Message d'erreur:", error?.message);
    console.error("❌ Code d'erreur:", error?.code);
    console.error("❌ Stack:", error?.stack);
    
    // Headers CORS même en cas d'erreur
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Retourner plus d'informations pour le débogage
    const errorResponse: any = {
      success: false,
      error: error?.message || "Erreur lors de l'envoi de l'email",
      errorCode: error?.code || 'UNKNOWN',
      errorType: error?.constructor?.name || 'Error'
    };
    
    // Ajouter les détails en développement ou si c'est une erreur de connexion
    if (process.env.NODE_ENV === 'development' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      errorResponse.details = error?.stack;
      errorResponse.fullError = {
        message: error?.message,
        code: error?.code,
        response: error?.response,
        responseCode: error?.responseCode,
        command: error?.command
      };
    }
    
    res.status(500).json(errorResponse);
  }
}

