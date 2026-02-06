/**
 * Service unifié pour l'envoi d'emails via le backend Node.js (Zoho SMTP)
 */

// URL du serveur email
// En développement: utilise le proxy Vite (/api) qui redirige vers le serveur email local (port 3001)
// En production: utilise l'API route Vercel intégrée (/api/send-email)
const EMAIL_API_URL = import.meta.env.VITE_EMAIL_API_URL || '/api';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envoie un email via le backend Node.js
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Tentative d\'envoi d\'email à:', options.to);
    console.log('🔗 URL:', `${EMAIL_API_URL}/send-email`);
    
    const response = await fetch(`${EMAIL_API_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    console.log('📡 Statut HTTP:', response.status, response.statusText);

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.text();
      console.error('❌ Erreur de parsing JSON:', text);
      return { success: false, error: `Erreur de réponse: ${text.substring(0, 200)}` };
    }

    console.log('📨 Réponse complète:', data);

    if (response.ok && data.success) {
      console.log('✅ Email envoyé avec succès à:', options.to);
      return { success: true };
    } else {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', data);
      const errorMsg = data.error || data.message || 'Erreur inconnue';
      
      if (response.status === 404) {
        return { 
          success: false, 
          error: `Serveur email non trouvé. Vérifiez que le serveur email est démarré sur ${EMAIL_API_URL}` 
        };
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (error: any) {
    console.error('❌ Exception lors de l\'envoi de l\'email:', error);
    
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return { 
        success: false, 
        error: `Erreur de connexion réseau. Vérifiez que le serveur email est démarré sur ${EMAIL_API_URL}` 
      };
    }
    
    return { success: false, error: error.message || 'Erreur de connexion' };
  }
}

/**
 * Envoie un email de notification à un nouveau locataire
 */
export async function notifyNewTenant(data: {
  tenantEmail: string;
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerCompany?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const ownerInfo = data.ownerCompany 
    ? `${data.ownerName} (${data.ownerCompany})`
    : data.ownerName;
  
  const contactInfo = data.ownerPhone 
    ? `Email: ${data.ownerEmail || 'Non renseigné'}<br>Téléphone: ${data.ownerPhone}`
    : `Email: ${data.ownerEmail || 'Non renseigné'}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue sur Mestoits</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.tenantName}</strong>,</p>
      <p>Nous vous informons que vous avez été ajouté(e) comme locataire dans notre système de gestion locative.</p>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations de votre propriétaire</h3>
        <p><strong>Nom:</strong> ${ownerInfo}</p>
        <p><strong>Contact:</strong><br>${contactInfo}</p>
      </div>
      <p>Votre propriétaire pourra désormais gérer votre bail, vos paiements et communiquer avec vous via cette plateforme.</p>
      <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire aux coordonnées indiquées ci-dessus.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${data.tenantName},

Nous vous informons que vous avez été ajouté(e) comme locataire dans notre système de gestion locative.

Informations de votre propriétaire:
- Nom: ${ownerInfo}
- Email: ${data.ownerEmail || 'Non renseigné'}
${data.ownerPhone ? `- Téléphone: ${data.ownerPhone}` : ''}

Votre propriétaire pourra désormais gérer votre bail, vos paiements et communiquer avec vous via cette plateforme.

Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire aux coordonnées indiquées ci-dessus.

Cordialement,
L'équipe Mestoits`;

  return sendEmail({
    to: data.tenantEmail,
    subject: 'Vous avez été ajouté(e) comme locataire - Mestoits',
    html,
    text,
  });
}

/**
 * Envoie un email d'invitation à signer un contrat de bail
 */
export async function notifyLeaseInvitation(data: {
  tenantEmail: string;
  tenantName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerCompany?: string | null;
  propertyTitle: string;
  propertyAddress: string;
  propertyCity: string;
  propertyType?: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const ownerInfo = data.ownerCompany 
    ? `${data.ownerName} (${data.ownerCompany})`
    : data.ownerName;
  
  const contactInfo = data.ownerPhone 
    ? `Email: ${data.ownerEmail || 'Non renseigné'}<br>Téléphone: ${data.ownerPhone}`
    : `Email: ${data.ownerEmail || 'Non renseigné'}`;

  const propertyInfo = data.propertyCity
    ? `${data.propertyAddress || ''}, ${data.propertyCity}`.trim()
    : data.propertyAddress || 'Adresse non renseignée';

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Non renseignée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
    .highlight { color: #14b8a6; font-weight: bold; }
    .steps-box { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invitation à signer un contrat de bail</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${data.tenantName}</strong>,</p>
      <p>Nous vous informons que <strong>${ownerInfo}</strong> vous invite à signer un contrat de bail pour un bien immobilier.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${data.propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
        ${data.propertyType ? `<p><strong>Type:</strong> ${data.propertyType}</p>` : ''}
        <p><strong>Loyer mensuel:</strong> <span class="highlight">${formatPrice(data.monthlyRent)}</span></p>
        <p><strong>Période:</strong> Du ${formatDate(data.startDate)} au ${formatDate(data.endDate)}</p>
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations du propriétaire</h3>
        <p><strong>Nom:</strong> ${ownerInfo}</p>
        <p><strong>Contact:</strong><br>${contactInfo}</p>
      </div>

      <div class="steps-box">
        <h3 style="margin-top: 0; color: #856404;">📋 Prochaines étapes</h3>
        <ol style="margin: 0; padding-left: 20px;">
          <li>Connectez-vous à votre compte Mestoits ou créez un compte si vous n'en avez pas encore</li>
          <li>Accédez au <strong>Menu rétractable</strong> → <strong>Mes locations</strong></li>
          <li>Consultez les détails du contrat de bail</li>
          <li>Signez le contrat en ligne</li>
        </ol>
      </div>

      <p style="text-align: center;">
        <a href="${window.location.origin}/mes-locations" class="cta-button">
          Accéder à Mes locations
        </a>
      </p>

      <p>Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire aux coordonnées indiquées ci-dessus.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${data.tenantName},

Nous vous informons que ${ownerInfo} vous invite à signer un contrat de bail pour un bien immobilier.

INFORMATIONS DU BIEN:
- Titre: ${data.propertyTitle}
- Adresse: ${propertyInfo}
${data.propertyType ? `- Type: ${data.propertyType}` : ''}
- Loyer mensuel: ${formatPrice(data.monthlyRent)}
- Période: Du ${formatDate(data.startDate)} au ${formatDate(data.endDate)}

INFORMATIONS DU PROPRIÉTAIRE:
- Nom: ${ownerInfo}
- Email: ${data.ownerEmail || 'Non renseigné'}
${data.ownerPhone ? `- Téléphone: ${data.ownerPhone}` : ''}

PROCHAINES ÉTAPES:
1. Connectez-vous à votre compte Mestoits ou créez un compte si vous n'en avez pas encore
2. Accédez au Menu rétractable → Mes locations
3. Consultez les détails du contrat de bail
4. Signez le contrat en ligne

Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire aux coordonnées indiquées ci-dessus.

Cordialement,
L'équipe Mestoits`;

  return sendEmail({
    to: data.tenantEmail,
    subject: `Invitation à signer un contrat de bail - ${data.propertyTitle}`,
    html,
    text,
  });
}

