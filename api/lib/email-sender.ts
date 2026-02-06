/**
 * Module partagé pour l'envoi d'emails
 * Peut être utilisé directement depuis d'autres API routes sans faire de fetch HTTP
 */

import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { to, subject, html, text } = options;

    // Validation
    if (!to || !subject || (!html && !text)) {
      return {
        success: false,
        error: "Paramètres manquants: to, subject, et html/text sont requis"
      };
    }

    // Vérifier que les variables d'environnement sont définies
    const zohoUser = process.env.ZOHO_USER || 'contact@mestoits.com';
    const zohoPassword = process.env.ZOHO_PASSWORD;
    
    if (!zohoUser || !zohoPassword) {
      console.error("❌ Variables d'environnement Zoho non définies");
      return {
        success: false,
        error: "Configuration serveur email manquante"
      };
    }

    console.log(`📧 Envoi d'email à: ${to}`);
    console.log(`📝 Sujet: ${subject}`);

    // Créer le transporteur Zoho avec la configuration européenne
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
      return {
        success: false,
        error: `Erreur de connexion SMTP: ${verifyError.message || verifyError}`
      };
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

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    return {
      success: false,
      error: error?.message || "Erreur lors de l'envoi de l'email"
    };
  }
}
