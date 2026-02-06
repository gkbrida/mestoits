/**
 * Hook pour l'envoi d'emails côté client via le backend Node.js
 * Mestoits
 */

import { useState, useCallback } from 'react';

// URL du serveur email
// En développement: utilise le proxy Vite (/api) qui redirige vers le serveur email local (port 3001)
// En production: utilise l'API route Vercel intégrée (/api/send-email)
const EMAIL_API_URL = (() => {
  const envUrl = import.meta.env.VITE_EMAIL_API_URL;
  if (envUrl) {
    return envUrl;
  }
  // Par défaut, utiliser /api pour le proxy Vite en dev et l'API route Vercel en prod
  return '/api';
})();

// Activer/désactiver l'envoi d'email
// Par défaut activé, définir VITE_EMAIL_ENABLED=false pour désactiver complètement
const EMAIL_ENABLED = import.meta.env.VITE_EMAIL_ENABLED !== 'false';

// Types pour les requêtes d'email
type EmailType =
  | 'confirmation_inscription'
  | 'bienvenue'
  | 'mot_de_passe_oublie'
  | 'suppression_compte'
  | 'nouveau_message'
  | 'contact_annonce'
  | 'demande_visite'
  | 'invitation_locataire'
  | 'invitation_bail'
  | 'refus_contrat'
  | 'code_signature'
  | 'contrat_signe'
  | 'nouveau_loyer'
  | 'loyer_paye'
  | 'loyer_marque_paye'
  | 'visite_programmee'
  | 'visite_annulee'
  | 'visite_terminee'
  | 'modification_bail'
  | 'bail_cloture'
  | 'bail_annule'
  | 'document_professionnel_ajoute'
  | 'document_professionnel_valide'
  | 'document_professionnel_rejete'
  | 'professionnel_certifie';

interface EmailResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

interface UseEmailReturn {
  sendEmail: (type: EmailType, data: Record<string, unknown>) => Promise<EmailResponse>;
  isLoading: boolean;
  error: string | null;
  lastResponse: EmailResponse | null;
}

/**
 * Hook pour envoyer des emails via le backend Node.js (Zoho SMTP)
 *
 * @example
 * ```tsx
 * const { sendEmail, isLoading, error } = useEmail()
 *
 * const handleSubmit = async () => {
 *   const result = await sendEmail('invitation_locataire', {
 *     tenantEmail: 'locataire@example.com',
 *     tenantName: 'Jean Dupont',
 *     ownerName: 'Marie Martin',
 *     // ... autres données
 *   })
 *
 *   if (result.success) {
 *     alert('Email envoyé !')
 *   }
 * }
 * ```
 */
export function useEmail(): UseEmailReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<EmailResponse | null>(null);

  const sendEmail = useCallback(async (
    type: EmailType,
    data: Record<string, unknown>
  ): Promise<EmailResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Si l'email est désactivé (via variable d'environnement), retourner immédiatement
      if (!EMAIL_ENABLED) {
        setIsLoading(false);
        setLastResponse({ 
          success: false, 
          error: 'Envoi d\'email désactivé' 
        });
        return { 
          success: false, 
          error: 'Envoi d\'email désactivé' 
        };
      }

      // Construire le payload selon le type d'email
      const emailPayload = buildEmailPayload(type, data);

      if (!emailPayload) {
        const errorMsg = `Type d'email non supporté: ${type}`;
        setError(errorMsg);
        setLastResponse({ success: false, error: errorMsg });
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      // L'envoi d'email est maintenant toujours tenté si EMAIL_ENABLED est true
      // Les erreurs de connexion seront gérées silencieusement dans le catch ci-dessous

      // Logs uniquement en mode développement
      if (import.meta.env.DEV) {
        console.debug(`📧 Envoi d'email de type "${type}" à:`, emailPayload.to);
      }

      let response: Response;
      try {
        // Utiliser AbortController pour gérer les timeouts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout de 5 secondes

        // Construire l'URL correctement (chemin relatif pour utiliser le proxy)
        const emailUrl = `${EMAIL_API_URL}/send-email`;

        response = await fetch(emailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: emailPayload.to,
            subject: emailPayload.subject,
            html: emailPayload.html,
            text: emailPayload.text,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        // Erreur réseau (serveur non disponible, timeout, etc.)
        // Ne pas logger pour éviter le spam dans la console
        // Le navigateur affichera toujours l'erreur réseau, mais notre code la gère silencieusement
        setError(null); // Ne pas définir d'erreur pour les erreurs réseau
        setLastResponse({ 
          success: false, 
          error: 'Serveur email non disponible' 
        });
        setIsLoading(false);
        // Retourner une réponse d'échec silencieuse
        return { 
          success: false, 
          error: 'Serveur email non disponible' 
        };
      }

      // Logs uniquement en mode développement
      if (import.meta.env.DEV) {
        console.debug('📡 Statut HTTP:', response.status, response.statusText);
      }

      // Vérifier le statut HTTP avant de lire le body
      if (!response.ok) {
        // Pour les erreurs HTTP (404 = serveur non démarré, 500 = erreur serveur, etc.)
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
        
        // Si c'est une erreur 404, le serveur n'est probablement pas démarré
        if (response.status === 404) {
          errorMessage = 'Serveur email non disponible (404 - serveur non démarré)';
        } else {
          // Pour les autres erreurs, essayer de lire le body
          try {
            const errorText = await response.text();
            if (errorText) {
              try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
              } catch {
                errorMessage = errorText.substring(0, 200) || errorMessage;
              }
            }
          } catch {
            // Si on ne peut pas lire le body, utiliser le message d'erreur par défaut
          }
        }

        const result: EmailResponse = {
          success: false,
          error: errorMessage,
        };

        // Ne pas logger les erreurs 404 (serveur non démarré) pour éviter le spam
        // Les autres erreurs HTTP peuvent être loggées en mode développement
        if (import.meta.env.DEV && response.status !== 404) {
          console.debug('❌ Erreur HTTP:', result.error);
        }

        setError(null); // Ne pas définir d'erreur pour éviter de bloquer l'interface
        setLastResponse(result);
        setIsLoading(false);
        return result;
      }

      // Lire le body une seule fois pour les réponses réussies
      let result: EmailResponse;
      try {
        const responseData = await response.json();
        if (import.meta.env.DEV) {
          console.debug('📨 Données brutes de la réponse:', responseData);
        }
        result = {
          success: responseData.success === true,
          message: responseData.message,
          messageId: responseData.messageId,
          error: responseData.error || responseData.details,
        };
      } catch (parseError) {
        // Si le parsing JSON échoue, c'est que la réponse n'est pas au bon format
        const errorMsg = `Réponse invalide du serveur (${response.status})`;
        if (import.meta.env.DEV) {
          console.error('❌ Erreur de parsing JSON:', parseError);
        }
        setError(null);
        setLastResponse({ success: false, error: errorMsg });
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }

      if (import.meta.env.DEV) {
        console.debug('📨 Réponse complète:', result);
      }

      if (!result.success) {
        const errorMsg = result.error || 'Erreur lors de l\'envoi de l\'email';
        setError(errorMsg);
        setLastResponse(result);
        return result;
      }

      setLastResponse(result);
      return result;
    } catch (err) {
      // Les erreurs de fetch sont déjà gérées ci-dessus
      // Ce catch ne devrait normalement pas être atteint pour les erreurs réseau
      const errorMessage = err instanceof Error ? err.message : 'Erreur réseau';
      
      // Ne logger que si ce n'est pas une erreur de connexion déjà gérée
      if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        console.error('❌ Exception lors de l\'envoi de l\'email:', err);
      } else {
        console.debug('❌ Serveur email non disponible (erreur déjà gérée)');
      }
      
      setError(null); // Ne pas définir d'erreur pour les erreurs réseau
      setLastResponse({ success: false, error: 'Serveur email non disponible' });
      setIsLoading(false);
      return { success: false, error: 'Serveur email non disponible' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendEmail,
    isLoading,
    error,
    lastResponse,
  };
}

/**
 * Construit le payload d'email selon le type
 */
function buildEmailPayload(
  type: EmailType,
  data: Record<string, unknown>
): { to: string; subject: string; html: string; text: string } | null {
  switch (type) {
    case 'invitation_locataire':
      return buildInvitationLocataireEmail(data);
    case 'invitation_bail':
      return buildInvitationBailEmail(data);
    case 'nouveau_message':
      return buildNouveauMessageEmail(data);
    case 'code_signature':
      return buildCodeSignatureEmail(data);
    case 'nouveau_loyer':
      return buildNouveauLoyerEmail(data);
    case 'loyer_paye':
      return buildLoyerPayeEmail(data);
    case 'loyer_marque_paye':
      return buildLoyerMarquePayeEmail(data);
    case 'contrat_signe':
      return buildContratSigneEmail(data);
    case 'bail_cloture':
      return buildBailClotureEmail(data);
    case 'bail_annule':
      return buildBailAnnuleEmail(data);
    case 'visite_programmee':
      return buildVisiteProgrammeeEmail(data);
    case 'visite_annulee':
      return buildVisiteAnnuleeEmail(data);
    case 'contact_annonce':
      return buildContactAnnonceEmail(data);
    case 'document_professionnel_ajoute':
      return buildDocumentProfessionnelAjouteEmail(data);
    case 'document_professionnel_valide':
      return buildDocumentProfessionnelValideEmail(data);
    case 'document_professionnel_rejete':
      return buildDocumentProfessionnelRejeteEmail(data);
    case 'professionnel_certifie':
      return buildProfessionnelCertifieEmail(data);
    default:
      console.warn(`Type d'email non implémenté: ${type}`);
      return null;
  }
}

/**
 * Construit l'email d'invitation pour un nouveau locataire
 */
function buildInvitationLocataireEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const tenantEmail = data.tenantEmail as string;
  const tenantName = data.tenantName as string;
  const ownerName = data.ownerName as string;
  const ownerEmail = data.ownerEmail as string;
  const ownerPhone = data.ownerPhone as string | undefined;
  const ownerCompany = data.ownerCompany as string | null | undefined;

  if (!tenantEmail || !tenantName || !ownerName || !ownerEmail) {
    console.error('Données manquantes pour l\'email d\'invitation locataire');
    return null;
  }

  const ownerInfo = ownerCompany 
    ? `${ownerName} (${ownerCompany})`
    : ownerName;
  
  const contactInfo = ownerPhone 
    ? `Email: ${ownerEmail || 'Non renseigné'}<br>Téléphone: ${ownerPhone}`
    : `Email: ${ownerEmail || 'Non renseigné'}`;

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
      <p>Bonjour <strong>${tenantName}</strong>,</p>
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

  const text = `Bonjour ${tenantName},

Nous vous informons que vous avez été ajouté(e) comme locataire dans notre système de gestion locative.

Informations de votre propriétaire:
- Nom: ${ownerInfo}
- Email: ${ownerEmail || 'Non renseigné'}
${ownerPhone ? `- Téléphone: ${ownerPhone}` : ''}

Votre propriétaire pourra désormais gérer votre bail, vos paiements et communiquer avec vous via cette plateforme.

Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire aux coordonnées indiquées ci-dessus.

Cordialement,
L'équipe Mestoits`;

  return {
    to: tenantEmail,
    subject: 'Vous avez été ajouté(e) comme locataire - Mestoits',
    html,
    text,
  };
}

/**
 * Construit l'email d'invitation à signer un contrat de bail
 */
function buildInvitationBailEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const tenantEmail = data.tenantEmail as string;
  const tenantName = data.tenantName as string;
  const ownerName = data.ownerName as string;
  const ownerEmail = data.ownerEmail as string;
  const ownerPhone = data.ownerPhone as string | undefined;
  const ownerCompany = data.ownerCompany as string | null | undefined;
  const propertyTitle = data.propertyTitle as string;
  const propertyAddress = data.propertyAddress as string | undefined;
  const propertyCity = data.propertyCity as string | undefined;
  const propertyType = data.propertyType as string | undefined;
  const monthlyRent = data.monthlyRent as number;
  const startDate = data.startDate as string;
  const endDate = data.endDate as string;

  if (!tenantEmail || !tenantName || !ownerName || !propertyTitle || !monthlyRent || !startDate || !endDate) {
    console.error('Données manquantes pour l\'email d\'invitation de bail');
    return null;
  }

  const ownerInfo = ownerCompany 
    ? `${ownerName} (${ownerCompany})`
    : ownerName;
  
  const contactInfo = ownerPhone 
    ? `Email: ${ownerEmail || 'Non renseigné'}<br>Téléphone: ${ownerPhone}`
    : `Email: ${ownerEmail || 'Non renseigné'}`;

  const propertyInfo = propertyCity
    ? `${propertyAddress || ''}, ${propertyCity}`.trim()
    : propertyAddress || 'Adresse non renseignée';

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
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Nous vous informons que <strong>${ownerInfo}</strong> vous invite à signer un contrat de bail pour un bien immobilier.</p>
      
      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyInfo}</p>
        ${propertyType ? `<p><strong>Type:</strong> ${propertyType}</p>` : ''}
        <p><strong>Loyer mensuel:</strong> <span class="highlight">${formatPrice(monthlyRent)}</span></p>
        <p><strong>Période:</strong> Du ${formatDate(startDate)} au ${formatDate(endDate)}</p>
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

  const text = `Bonjour ${tenantName},

Nous vous informons que ${ownerInfo} vous invite à signer un contrat de bail pour un bien immobilier.

INFORMATIONS DU BIEN:
- Titre: ${propertyTitle}
- Adresse: ${propertyInfo}
${propertyType ? `- Type: ${propertyType}` : ''}
- Loyer mensuel: ${formatPrice(monthlyRent)}
- Période: Du ${formatDate(startDate)} au ${formatDate(endDate)}

INFORMATIONS DU PROPRIÉTAIRE:
- Nom: ${ownerInfo}
- Email: ${ownerEmail || 'Non renseigné'}
${ownerPhone ? `- Téléphone: ${ownerPhone}` : ''}

PROCHAINES ÉTAPES:
1. Connectez-vous à votre compte Mestoits ou créez un compte si vous n'en avez pas encore
2. Accédez au Menu rétractable → Mes locations
3. Consultez les détails du contrat de bail
4. Signez le contrat en ligne

Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire aux coordonnées indiquées ci-dessus.

Cordialement,
L'équipe Mestoits`;

  return {
    to: tenantEmail,
    subject: `Invitation à signer un contrat de bail - ${propertyTitle}`,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour un nouveau message
 */
function buildNouveauMessageEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const receiverEmail = data.receiverEmail as string;
  const receiverName = data.receiverName as string;
  const senderName = data.senderName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const messagePreview = data.messagePreview as string | undefined;
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!receiverEmail || !receiverName || !senderName) {
    console.error('Données manquantes pour l\'email de nouveau message');
    return null;
  }

  const propertyInfo = propertyTitle 
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        <p><strong>${propertyTitle}</strong></p>
      </div>`
    : '';

  const messageText = messagePreview 
    ? `<div class="message-preview">
        <p style="background: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #14b8a6; font-style: italic;">
          "${messagePreview.substring(0, 150)}${messagePreview.length > 150 ? '...' : ''}"
        </p>
      </div>`
    : '';

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
    .message-preview { margin: 20px 0; }
    .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #0d9488; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📨 Nouveau message</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${receiverName}</strong>,</p>
      <p>Vous avez reçu un nouveau message de <strong>${senderName}</strong>${propertyTitle ? ` concernant le bien "${propertyTitle}"` : ''}.</p>
      ${propertyInfo}
      ${messageText}
      <p style="text-align: center;">
        <a href="${appUrl}/messages" class="button">Consulter le message</a>
      </p>
      <p>Connectez-vous à votre espace pour lire le message complet et y répondre.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${receiverName},

Vous avez reçu un nouveau message de ${senderName}${propertyTitle ? ` concernant le bien "${propertyTitle}"` : ''}.

${propertyTitle ? `Bien concerné: ${propertyTitle}\n\n` : ''}${messagePreview ? `Message:\n"${messagePreview.substring(0, 150)}${messagePreview.length > 150 ? '...' : ''}"\n\n` : ''}Connectez-vous à votre espace pour lire le message complet et y répondre:
${appUrl}/messages

Cordialement,
L'équipe Mestoits`;

  return {
    to: receiverEmail,
    subject: `Nouveau message de ${senderName}${propertyTitle ? ` - ${propertyTitle}` : ''}`,
    html,
    text,
  };
}

/**
 * Construit l'email contenant le code de vérification pour la signature
 */
function buildCodeSignatureEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const tenantEmail = data.tenantEmail as string;
  const tenantName = data.tenantName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const verificationCode = data.verificationCode as string;

  if (!tenantEmail || !tenantName || !verificationCode) {
    console.error('Données manquantes pour l\'email de code de signature');
    return null;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .code-box { background: white; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #14b8a6; }
    .code { font-size: 36px; font-weight: bold; color: #14b8a6; letter-spacing: 8px; font-family: 'Courier New', monospace; }
    .info-box { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Code de vérification</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Vous avez demandé à signer un contrat de location${propertyTitle ? ` pour le bien "${propertyTitle}"` : ''}.</p>
      
      <div class="code-box">
        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Votre code de vérification est :</p>
        <div class="code">${verificationCode}</div>
      </div>

      <div class="info-box">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Important :</strong> Ce code est valide pendant 15 minutes. Ne le partagez avec personne.
        </p>
      </div>

      <p>Entrez ce code dans le formulaire de signature pour confirmer votre identité et signer le contrat.</p>
      
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${tenantName},

Vous avez demandé à signer un contrat de location${propertyTitle ? ` pour le bien "${propertyTitle}"` : ''}.

Votre code de vérification est : ${verificationCode}

⚠️ Important : Ce code est valide pendant 15 minutes. Ne le partagez avec personne.

Entrez ce code dans le formulaire de signature pour confirmer votre identité et signer le contrat.

Cordialement,
L'équipe Mestoits`;

  return {
    to: tenantEmail,
    subject: `Code de vérification pour la signature - ${propertyTitle || 'Contrat de location'}`,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour un nouveau loyer à payer
 */
function buildNouveauLoyerEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const tenantEmail = data.tenantEmail as string;
  const tenantName = data.tenantName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const propertyAddress = data.propertyAddress as string | undefined;
  const month = data.month as string;
  const year = data.year as string | number;
  const amount = data.amount as number;
  const dueDate = data.dueDate as string;
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!tenantEmail || !tenantName || !month || !year || !amount || !dueDate) {
    console.error('Données manquantes pour l\'email de nouveau loyer');
    return null;
  }

  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = propertyTitle || propertyAddress
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        ${propertyTitle ? `<p><strong>${propertyTitle}</strong></p>` : ''}
        ${propertyAddress ? `<p>${propertyAddress}</p>` : ''}
      </div>`
    : '';

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
    .amount-box { background: #f0fdfa; border: 2px solid #14b8a6; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .amount-box .amount { font-size: 32px; font-weight: bold; color: #14b8a6; margin: 10px 0; }
    .button { display: inline-block; background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #0d9488; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
    .warning-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Nouveau loyer à payer</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Un nouveau loyer a été généré pour votre location.</p>
      ${propertyInfo}
      <div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Détails du loyer</h3>
        <p><strong>Période :</strong> ${month} ${year}</p>
        <p><strong>Date d'échéance :</strong> ${formatDate(dueDate)}</p>
      </div>
      <div class="amount-box">
        <p style="margin: 0; color: #374151; font-size: 14px;">Montant à payer</p>
        <div class="amount">${formatPrice(amount)}</div>
      </div>
      <div class="warning-box">
        <p style="margin: 0; color: #856404;">
          <strong>⚠️ Important :</strong> Veuillez effectuer le paiement avant la date d'échéance pour éviter tout retard.
        </p>
      </div>
      <p style="text-align: center;">
        <a href="${appUrl}/tenant-rentals" class="button">Consulter mes locations</a>
      </p>
      <p>Connectez-vous à votre espace pour consulter les détails et effectuer le paiement.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${tenantName},

Un nouveau loyer a été généré pour votre location.

${propertyTitle ? `Bien concerné: ${propertyTitle}\n` : ''}${propertyAddress ? `Adresse: ${propertyAddress}\n` : ''}
Détails du loyer:
- Période: ${month} ${year}
- Date d'échéance: ${formatDate(dueDate)}
- Montant à payer: ${formatPrice(amount)}

⚠️ Important : Veuillez effectuer le paiement avant la date d'échéance pour éviter tout retard.

Connectez-vous à votre espace pour consulter les détails et effectuer le paiement:
${appUrl}/tenant-rentals

Cordialement,
L'équipe Mestoits`;

  return {
    to: tenantEmail,
    subject: `Nouveau loyer à payer - ${month} ${year}${propertyTitle ? ` - ${propertyTitle}` : ''}`,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour le propriétaire lorsqu'un loyer est payé
 */
function buildLoyerPayeEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const ownerEmail = data.ownerEmail as string;
  const ownerName = data.ownerName as string;
  const tenantName = data.tenantName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const propertyAddress = data.propertyAddress as string | undefined;
  const month = data.month as string;
  const year = data.year as string | number;
  const amount = data.amount as number;
  const paymentDate = data.paymentDate as string;
  const paymentMethod = data.paymentMethod as string | undefined || 'carte bancaire';
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!ownerEmail || !ownerName || !tenantName || !month || !year || !amount || !paymentDate) {
    console.error('Données manquantes pour l\'email de loyer payé');
    return null;
  }

  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = propertyTitle || propertyAddress
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        ${propertyTitle ? `<p><strong>${propertyTitle}</strong></p>` : ''}
        ${propertyAddress ? `<p>${propertyAddress}</p>` : ''}
      </div>`
    : '';

  const paymentMethodLabel = paymentMethod === 'stripe' || paymentMethod === 'card' 
    ? 'Carte bancaire (Stripe)' 
    : paymentMethod === 'cash' 
    ? 'Espèces' 
    : paymentMethod === 'bank_transfer'
    ? 'Virement bancaire'
    : paymentMethod;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .success-box { background: #d1fae5; border: 2px solid #10b981; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .success-box .amount { font-size: 32px; font-weight: bold; color: #059669; margin: 10px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #059669; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Loyer payé</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${ownerName}</strong>,</p>
      <p>Nous vous informons qu'un paiement de loyer a été effectué par votre locataire.</p>
      ${propertyInfo}
      <div class="info-box">
        <h3 style="margin-top: 0; color: #10b981;">Détails du paiement</h3>
        <p><strong>Locataire :</strong> ${tenantName}</p>
        <p><strong>Période :</strong> ${month} ${year}</p>
        <p><strong>Date de paiement :</strong> ${formatDate(paymentDate)}</p>
        <p><strong>Moyen de paiement :</strong> ${paymentMethodLabel}</p>
      </div>
      <div class="success-box">
        <p style="margin: 0; color: #059669; font-size: 14px;">Montant reçu</p>
        <div class="amount">${formatPrice(amount)}</div>
      </div>
      <p style="text-align: center;">
        <a href="${appUrl}/gestion-locative" class="button">Consulter la gestion locative</a>
      </p>
      <p>Connectez-vous à votre espace de gestion locative pour consulter les détails et générer la quittance.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${ownerName},

Nous vous informons qu'un paiement de loyer a été effectué par votre locataire.

${propertyTitle ? `Bien concerné: ${propertyTitle}\n` : ''}${propertyAddress ? `Adresse: ${propertyAddress}\n` : ''}
Détails du paiement:
- Locataire: ${tenantName}
- Période: ${month} ${year}
- Date de paiement: ${formatDate(paymentDate)}
- Moyen de paiement: ${paymentMethodLabel}
- Montant reçu: ${formatPrice(amount)}

Connectez-vous à votre espace de gestion locative pour consulter les détails et générer la quittance:
${appUrl}/gestion-locative

Cordialement,
L'équipe Mestoits`;

  return {
    to: ownerEmail,
    subject: `Loyer payé - ${month} ${year}${propertyTitle ? ` - ${propertyTitle}` : ''}`,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour le locataire lorsqu'un loyer est marqué comme payé par le propriétaire
 */
function buildLoyerMarquePayeEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const tenantEmail = data.tenantEmail as string;
  const tenantName = data.tenantName as string;
  const ownerName = data.ownerName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const propertyAddress = data.propertyAddress as string | undefined;
  const month = data.month as string;
  const year = data.year as string | number;
  const amount = data.amount as number;
  const paymentDate = data.paymentDate as string;
  const paymentMethod = data.paymentMethod as string | undefined || 'non spécifié';
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!tenantEmail || !tenantName || !ownerName || !month || !year || !amount || !paymentDate) {
    console.error('Données manquantes pour l\'email de loyer marqué comme payé');
    return null;
  }

  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = propertyTitle || propertyAddress
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        ${propertyTitle ? `<p><strong>${propertyTitle}</strong></p>` : ''}
        ${propertyAddress ? `<p>${propertyAddress}</p>` : ''}
      </div>`
    : '';

  const paymentMethodLabel = paymentMethod === 'cash' 
    ? 'Espèces' 
    : paymentMethod === 'bank_transfer'
    ? 'Virement bancaire'
    : paymentMethod === 'check'
    ? 'Chèque'
    : paymentMethod === 'mobile_money'
    ? 'Mobile Money'
    : paymentMethod;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .success-box { background: #d1fae5; border: 2px solid #10b981; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .success-box .amount { font-size: 32px; font-weight: bold; color: #059669; margin: 10px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #059669; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Paiement pris en compte</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Nous vous informons que votre propriétaire <strong>${ownerName}</strong> a pris en compte votre paiement de loyer.</p>
      ${propertyInfo}
      <div class="info-box">
        <h3 style="margin-top: 0; color: #10b981;">Détails du paiement</h3>
        <p><strong>Période :</strong> ${month} ${year}</p>
        <p><strong>Date de paiement :</strong> ${formatDate(paymentDate)}</p>
        <p><strong>Moyen de paiement :</strong> ${paymentMethodLabel}</p>
      </div>
      <div class="success-box">
        <p style="margin: 0; color: #059669; font-size: 14px;">Montant payé</p>
        <div class="amount">${formatPrice(amount)}</div>
      </div>
      <p style="text-align: center;">
        <a href="${appUrl}/mes-locations" class="button">Consulter mes locations</a>
      </p>
      <p>Votre paiement a été enregistré avec succès. Vous pouvez consulter vos locations pour télécharger la quittance de loyer.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${tenantName},

Nous vous informons que votre propriétaire ${ownerName} a pris en compte votre paiement de loyer.

${propertyTitle ? `Bien concerné: ${propertyTitle}\n` : ''}${propertyAddress ? `Adresse: ${propertyAddress}\n` : ''}
Détails du paiement:
- Période: ${month} ${year}
- Date de paiement: ${formatDate(paymentDate)}
- Moyen de paiement: ${paymentMethodLabel}
- Montant payé: ${formatPrice(amount)}

Votre paiement a été enregistré avec succès. Vous pouvez consulter vos locations pour télécharger la quittance de loyer.

Connectez-vous à votre espace:
${appUrl}/mes-locations

Cordialement,
L'équipe Mestoits`;

  return {
    to: tenantEmail,
    subject: `Paiement pris en compte - ${month} ${year}${propertyTitle ? ` - ${propertyTitle}` : ''}`,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour le propriétaire lorsqu'un contrat est signé
 */
function buildContratSigneEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const ownerEmail = data.ownerEmail as string;
  const ownerName = data.ownerName as string;
  const tenantName = data.tenantName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const propertyAddress = data.propertyAddress as string | undefined;
  const propertyCity = data.propertyCity as string | undefined;
  const monthlyRent = data.monthlyRent as number;
  const startDate = data.startDate as string;
  const endDate = data.endDate as string;
  const signedDate = data.signedDate as string;
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!ownerEmail || !ownerName || !tenantName || !monthlyRent || !startDate || !endDate || !signedDate) {
    console.error('Données manquantes pour l\'email de contrat signé');
    return null;
  }

  const formatPrice = (price: number): string => {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = propertyTitle || propertyAddress || propertyCity
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        ${propertyTitle ? `<p><strong>${propertyTitle}</strong></p>` : ''}
        ${propertyAddress || propertyCity ? `<p>${[propertyAddress, propertyCity].filter(Boolean).join(', ')}</p>` : ''}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .success-box { background: #d1fae5; border: 2px solid #10b981; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .success-box .icon { font-size: 48px; margin-bottom: 10px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #059669; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Contrat signé</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${ownerName}</strong>,</p>
      <p>Nous vous informons que votre locataire <strong>${tenantName}</strong> a signé le contrat de bail.</p>
      ${propertyInfo}
      <div class="success-box">
        <div class="icon">✍️</div>
        <p style="margin: 0; color: #059669; font-size: 18px; font-weight: bold;">Contrat signé avec succès</p>
        <p style="margin: 5px 0 0 0; color: #374151; font-size: 14px;">Le ${formatDate(signedDate)}</p>
      </div>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #10b981;">Détails du bail</h3>
        <p><strong>Locataire :</strong> ${tenantName}</p>
        <p><strong>Loyer mensuel :</strong> <span style="color: #10b981; font-weight: bold;">${formatPrice(monthlyRent)}</span></p>
        <p><strong>Période :</strong> Du ${formatDate(startDate)} au ${formatDate(endDate)}</p>
        <p><strong>Date de signature :</strong> ${formatDate(signedDate)}</p>
      </div>
      <p style="text-align: center;">
        <a href="${appUrl}/gestion-locative" class="button">Consulter la gestion locative</a>
      </p>
      <p>Le bail est maintenant actif. Vous pouvez désormais gérer les paiements, les états des lieux et communiquer avec votre locataire via votre espace de gestion locative.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${ownerName},

Nous vous informons que votre locataire ${tenantName} a signé le contrat de bail.

${propertyTitle ? `Bien concerné: ${propertyTitle}\n` : ''}${propertyAddress || propertyCity ? `Adresse: ${[propertyAddress, propertyCity].filter(Boolean).join(', ')}\n` : ''}
Détails du bail:
- Locataire: ${tenantName}
- Loyer mensuel: ${formatPrice(monthlyRent)}
- Période: Du ${formatDate(startDate)} au ${formatDate(endDate)}
- Date de signature: ${formatDate(signedDate)}

Le bail est maintenant actif. Vous pouvez désormais gérer les paiements, les états des lieux et communiquer avec votre locataire via votre espace de gestion locative.

Connectez-vous à votre espace:
${appUrl}/gestion-locative

Cordialement,
L'équipe Mestoits`;

  return {
    to: ownerEmail,
    subject: `Contrat signé - ${propertyTitle || 'Bail'}`,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour le locataire lorsqu'un bail est clôturé
 */
function buildBailClotureEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const tenantEmail = data.tenantEmail as string;
  const tenantName = data.tenantName as string;
  const ownerName = data.ownerName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const propertyAddress = data.propertyAddress as string | undefined;
  const propertyCity = data.propertyCity as string | undefined;
  const endDate = data.endDate as string | undefined;
  const closureDate = data.closureDate as string;
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!tenantEmail || !tenantName || !ownerName || !closureDate) {
    console.error('Données manquantes pour l\'email de clôture de bail');
    return null;
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const propertyInfo = propertyTitle || propertyAddress || propertyCity
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        ${propertyTitle ? `<p><strong>${propertyTitle}</strong></p>` : ''}
        ${propertyAddress || propertyCity ? `<p>${[propertyAddress, propertyCity].filter(Boolean).join(', ')}</p>` : ''}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
    .notice-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
    .notice-box .icon { font-size: 48px; margin-bottom: 10px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #d97706; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Bail clôturé</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Nous vous informons que votre propriétaire <strong>${ownerName}</strong> a clôturé votre contrat de bail.</p>
      ${propertyInfo}
      <div class="notice-box">
        <div class="icon">🔒</div>
        <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: bold;">Bail clôturé</p>
        <p style="margin: 5px 0 0 0; color: #78350f; font-size: 14px;">Le ${formatDate(closureDate)}</p>
      </div>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #f59e0b;">Détails de la clôture</h3>
        <p><strong>Propriétaire :</strong> ${ownerName}</p>
        ${endDate ? `<p><strong>Date de fin prévue du bail :</strong> ${formatDate(endDate)}</p>` : ''}
        <p><strong>Date de clôture :</strong> ${formatDate(closureDate)}</p>
      </div>
      <p style="text-align: center;">
        <a href="${appUrl}/mes-locations" class="button">Consulter mes locations</a>
      </p>
      <p>Le bail est maintenant clôturé. Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${tenantName},

Nous vous informons que votre propriétaire ${ownerName} a clôturé votre contrat de bail.

${propertyTitle ? `Bien concerné: ${propertyTitle}\n` : ''}${propertyAddress || propertyCity ? `Adresse: ${[propertyAddress, propertyCity].filter(Boolean).join(', ')}\n` : ''}
Détails de la clôture:
- Propriétaire: ${ownerName}
${endDate ? `- Date de fin prévue du bail: ${formatDate(endDate)}\n` : ''}- Date de clôture: ${formatDate(closureDate)}

Le bail est maintenant clôturé. Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire.

Connectez-vous à votre espace:
${appUrl}/mes-locations

Cordialement,
L'équipe Mestoits`;

  return {
    to: tenantEmail,
    subject: `Bail clôturé - ${propertyTitle || 'Contrat de location'}`,
    html,
    text,
  };
}

/**
 * Construit l'email d'annulation d'un bail en attente de signature
 */
function buildBailAnnuleEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const tenantEmail = data.tenantEmail as string;
  const tenantName = data.tenantName as string;
  const ownerName = data.ownerName as string;
  const propertyTitle = data.propertyTitle as string | undefined;
  const propertyAddress = data.propertyAddress as string | undefined;
  const propertyCity = data.propertyCity as string | undefined;
  const appUrl = (data.appUrl as string) || 'http://localhost:3000';

  if (!tenantEmail || !tenantName || !ownerName) {
    console.error('Données manquantes pour l\'email d\'annulation de bail');
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const propertyInfo = propertyTitle || propertyAddress || propertyCity
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        ${propertyTitle ? `<p><strong>Titre :</strong> ${propertyTitle}</p>` : ''}
        ${propertyAddress || propertyCity
          ? `<p><strong>Adresse :</strong> ${[propertyAddress, propertyCity].filter(Boolean).join(', ')}</p>`
          : ''}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .notice-box { background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .notice-box .icon { font-size: 48px; margin-bottom: 10px; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Demande de signature annulée</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${tenantName}</strong>,</p>
      <p>Nous vous informons que votre propriétaire <strong>${ownerName}</strong> a annulé la demande de signature du contrat de bail.</p>
      ${propertyInfo}
      <div class="notice-box">
        <div class="icon">🚫</div>
        <p style="margin: 0; color: #991b1b; font-size: 18px; font-weight: bold;">Demande annulée</p>
        <p style="margin: 5px 0 0 0; color: #7f1d1d; font-size: 14px;">Le ${formatDate(new Date().toISOString())}</p>
      </div>
      <div class="info-box">
        <h3 style="margin-top: 0; color: #ef4444;">Informations</h3>
        <p><strong>Propriétaire :</strong> ${ownerName}</p>
        ${propertyTitle ? `<p><strong>Bien concerné :</strong> ${propertyTitle}</p>` : ''}
        <p><strong>Date d'annulation :</strong> ${formatDate(new Date().toISOString())}</p>
      </div>
      <p>La demande de signature du contrat de bail a été annulée par le propriétaire. Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire.</p>
      <p style="text-align: center;">
        <a href="${appUrl}/mes-locations" class="button">Consulter mes locations</a>
      </p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${tenantName},

Nous vous informons que votre propriétaire ${ownerName} a annulé la demande de signature du contrat de bail.

${propertyTitle ? `Bien concerné: ${propertyTitle}\n` : ''}${propertyAddress || propertyCity ? `Adresse: ${[propertyAddress, propertyCity].filter(Boolean).join(', ')}\n` : ''}
Informations:
- Propriétaire: ${ownerName}
${propertyTitle ? `- Bien concerné: ${propertyTitle}\n` : ''}- Date d'annulation: ${formatDate(new Date().toISOString())}

La demande de signature du contrat de bail a été annulée par le propriétaire. Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter votre propriétaire.

Connectez-vous à votre espace:
${appUrl}/mes-locations

Cordialement,
L'équipe Mestoits`;

  return {
    to: tenantEmail,
    subject: `Demande de signature annulée - ${propertyTitle || 'Contrat de location'}`,
    html,
    text,
  };
}

/**
 * Construit l'email de confirmation pour une visite programmée
 */
function buildVisiteProgrammeeEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const visitorEmail = data.visitorEmail as string;
  const visitorName = data.visitorName as string;
  const propertyTitle = data.propertyTitle as string;
  const propertyAddress = data.propertyAddress as string;
  const visitDate = data.visitDate as string;
  const visitTime = data.visitTime as string;
  const ownerName = data.ownerName as string | undefined;
  const ownerEmail = data.ownerEmail as string | undefined;
  const ownerPhone = data.ownerPhone as string | undefined;
  const message = data.message as string | undefined;

  if (!visitorEmail || !visitorName || !propertyTitle || !propertyAddress || !visitDate || !visitTime) {
    console.error('Données manquantes pour l\'email de visite programmée');
    return null;
  }

  // Formater la date
  const dateObj = new Date(visitDate);
  const formattedDate = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const ownerInfo = ownerName 
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations du propriétaire</h3>
        <p><strong>Nom:</strong> ${ownerName}</p>
        ${ownerEmail ? `<p><strong>Email:</strong> ${ownerEmail}</p>` : ''}
        ${ownerPhone ? `<p><strong>Téléphone:</strong> ${ownerPhone}</p>` : ''}
      </div>`
    : '';

  const messageInfo = message 
    ? `<div class="message-box">
        <h3 style="margin-top: 0; color: #0d9488;">Message du propriétaire</h3>
        <p style="background: #f3f4f6; padding: 15px; border-radius: 8px; border-left: 4px solid #14b8a6; font-style: italic;">
          "${message}"
        </p>
      </div>`
    : '';

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
    .visit-box { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; text-align: center; }
    .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .highlight { color: #14b8a6; font-weight: bold; font-size: 18px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Visite programmée</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${visitorName}</strong>,</p>
      <p><strong>${ownerName || 'Le propriétaire'}</strong> vous invite à visiter un bien immobilier. Voici les détails de votre rendez-vous :</p>
      
      <div class="visit-box">
        <h3 style="margin-top: 0; color: #856404;">Détails de la visite</h3>
        <p><strong>Date:</strong> <span class="highlight">${formattedDate}</span></p>
        <p><strong>Heure:</strong> <span class="highlight">${visitTime}</span></p>
      </div>

      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Informations du bien</h3>
        <p><strong>Titre:</strong> ${propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyAddress}</p>
      </div>

      ${ownerInfo}
      ${messageInfo}

      <div class="info-box" style="background: #e7f3ff; border-left-color: #2196f3;">
        <p style="margin: 0;"><strong>✅ Visite confirmée:</strong> Votre visite est confirmée. Nous vous attendons à la date et l'heure indiquées.</p>
      </div>

      <p>Si vous avez des questions ou souhaitez modifier votre rendez-vous, n'hésitez pas à contacter le propriétaire aux coordonnées indiquées ci-dessus.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${visitorName},

${ownerName || 'Le propriétaire'} vous invite à visiter un bien immobilier. Voici les détails de votre rendez-vous :

Détails de la visite:
- Date: ${formattedDate}
- Heure: ${visitTime}

Informations du bien:
- Titre: ${propertyTitle}
- Adresse: ${propertyAddress}

${ownerName ? `Informations du propriétaire:
- Nom: ${ownerName}
${ownerEmail ? `- Email: ${ownerEmail}` : ''}
${ownerPhone ? `- Téléphone: ${ownerPhone}` : ''}

` : ''}${message ? `Message du propriétaire:
"${message}"

` : ''}Visite confirmée: Votre visite est confirmée. Nous vous attendons à la date et l'heure indiquées.

Si vous avez des questions ou souhaitez modifier votre rendez-vous, n'hésitez pas à contacter le propriétaire aux coordonnées indiquées ci-dessus.

Cordialement,
L'équipe Mestoits`;

  return {
    to: visitorEmail,
    subject: `Invitation à une visite - ${propertyTitle} - Mestoits`,
    html,
    text,
  };
}

/**
 * Construit l'email d'annulation d'une visite
 */
function buildVisiteAnnuleeEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const visitorEmail = data.visitorEmail as string;
  const visitorName = data.visitorName as string;
  const propertyTitle = data.propertyTitle as string;
  const propertyAddress = data.propertyAddress as string;
  const visitDate = data.visitDate as string;
  const visitTime = data.visitTime as string;
  const ownerName = data.ownerName as string | undefined;
  const ownerEmail = data.ownerEmail as string | undefined;
  const ownerPhone = data.ownerPhone as string | undefined;

  if (!visitorEmail || !visitorName || !propertyTitle || !propertyAddress || !visitDate || !visitTime) {
    console.error('Données manquantes pour l\'email d\'annulation de visite');
    return null;
  }

  // Formater la date
  const dateObj = new Date(visitDate);
  const formattedDate = dateObj.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const ownerInfo = ownerName 
    ? `<div class="info-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Informations du propriétaire</h3>
        <p><strong>Nom:</strong> ${ownerName}</p>
        ${ownerEmail ? `<p><strong>Email:</strong> ${ownerEmail}</p>` : ''}
        ${ownerPhone ? `<p><strong>Téléphone:</strong> ${ownerPhone}</p>` : ''}
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488; }
    .cancel-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; text-align: center; }
    .highlight { color: #ef4444; font-weight: bold; font-size: 18px; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Visite annulée</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${visitorName}</strong>,</p>
      <p>Nous vous informons que la visite prévue a été annulée par le propriétaire.</p>
      
      <div class="cancel-box">
        <h3 style="margin-top: 0; color: #991b1b;">Visite annulée</h3>
        <p><strong>Date prévue:</strong> <span class="highlight">${formattedDate}</span></p>
        <p><strong>Heure prévue:</strong> <span class="highlight">${visitTime}</span></p>
      </div>

      <div class="property-box">
        <h3 style="margin-top: 0; color: #0d9488;">Bien concerné</h3>
        <p><strong>Titre:</strong> ${propertyTitle}</p>
        <p><strong>Adresse:</strong> ${propertyAddress}</p>
      </div>

      ${ownerInfo}

      <div class="info-box" style="background: #e7f3ff; border-left-color: #2196f3;">
        <p style="margin: 0;"><strong>💡 Note:</strong> Si vous souhaitez reprogrammer une visite ou obtenir plus d'informations, n'hésitez pas à contacter le propriétaire aux coordonnées indiquées ci-dessus.</p>
      </div>

      <p>Nous nous excusons pour la gêne occasionnée.</p>
      <p>Cordialement,<br><strong>L'équipe Mestoits</strong></p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par Mestoits</p>
      <p>© ${new Date().getFullYear()} Mestoits - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Bonjour ${visitorName},

Nous vous informons que la visite prévue a été annulée par le propriétaire.

Visite annulée:
- Date prévue: ${formattedDate}
- Heure prévue: ${visitTime}

Bien concerné:
- Titre: ${propertyTitle}
- Adresse: ${propertyAddress}

${ownerName ? `Informations du propriétaire:
- Nom: ${ownerName}
${ownerEmail ? `- Email: ${ownerEmail}` : ''}
${ownerPhone ? `- Téléphone: ${ownerPhone}` : ''}

` : ''}Note: Si vous souhaitez reprogrammer une visite ou obtenir plus d'informations, n'hésitez pas à contacter le propriétaire aux coordonnées indiquées ci-dessus.

Nous nous excusons pour la gêne occasionnée.

Cordialement,
L'équipe Mestoits`;

  return {
    to: visitorEmail,
    subject: `Visite annulée - ${propertyTitle} - Mestoits`,
    html,
    text,
  };
}

/**
 * Construit l'email de contact pour une annonce
 */
function buildContactAnnonceEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const receiverEmail = data.receiverEmail as string;
  const receiverName = data.receiverName as string;
  const senderName = data.senderName as string;
  const senderEmail = data.senderEmail as string;
  const senderPhone = data.senderPhone as string | undefined;
  const propertyTitle = data.propertyTitle as string;
  const propertyId = data.propertyId as string | undefined;
  const message = data.message as string;
  const appUrl = data.appUrl as string | undefined;

  if (!receiverEmail || !senderName || !senderEmail || !propertyTitle || !message) {
    console.error('Données manquantes pour l\'email de contact annonce');
    return null;
  }

  const propertyLink = propertyId && appUrl 
    ? `${appUrl}/bien/${propertyId}`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
    .property-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #14b8a6; }
    .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📧 Nouveau message de contact</h1>
    </div>
    <div class="content">
      <p>Bonjour ${receiverName},</p>
      <p>Vous avez reçu un nouveau message concernant votre bien immobilier.</p>

      <div class="property-box">
        <h3 style="margin-top: 0; color: #14b8a6;">Bien concerné</h3>
        <p><strong>${propertyTitle}</strong></p>
        ${propertyLink ? `<p><a href="${propertyLink}" class="button">Voir le bien</a></p>` : ''}
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #2563eb;">Informations du contact</h3>
        <p><strong>Nom:</strong> ${senderName}</p>
        <p><strong>Email:</strong> <a href="mailto:${senderEmail}">${senderEmail}</a></p>
        ${senderPhone ? `<p><strong>Téléphone:</strong> <a href="tel:${senderPhone}">${senderPhone}</a></p>` : ''}
      </div>

      <div class="message-box">
        <h3 style="margin-top: 0; color: #10b981;">Message</h3>
        <p style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
      </div>

      <p>Vous pouvez répondre directement à cet email pour contacter ${senderName}.</p>

      <div class="footer">
        <p>Cet email a été envoyé depuis la plateforme Mestoits</p>
        <p>Pour répondre, cliquez simplement sur "Répondre" dans votre client email</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Nouveau message de contact

Bonjour ${receiverName},

Vous avez reçu un nouveau message concernant votre bien immobilier.

Bien concerné:
${propertyTitle}
${propertyLink ? `Lien: ${propertyLink}` : ''}

Informations du contact:
- Nom: ${senderName}
- Email: ${senderEmail}
${senderPhone ? `- Téléphone: ${senderPhone}` : ''}

Message:
${message}

Vous pouvez répondre directement à cet email pour contacter ${senderName}.

---
Cet email a été envoyé depuis la plateforme Mestoits`;

  return {
    to: receiverEmail,
    subject: `Nouveau contact pour votre bien: ${propertyTitle} - Mestoits`,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour les nouveaux documents professionnels ajoutés
 */
function buildDocumentProfessionnelAjouteEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const professionalName = data.professionalName as string;
  const professionalEmail = data.professionalEmail as string;
  const siret = data.siret as string | undefined;
  const documentsList = data.documentsList as string;
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!professionalName || !professionalEmail || !documentsList) {
    console.error('Données manquantes pour l\'email de document professionnel ajouté');
    return null;
  }

  const html = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<style>' +
    'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }' +
    '.container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
    '.header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }' +
    '.content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }' +
    '.info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }' +
    '.button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<div class="header">' +
    '<h1 style="margin: 0;">Nouveaux documents professionnels à valider</h1>' +
    '</div>' +
    '<div class="content">' +
    '<p>Un professionnel a ajouté de nouveaux documents nécessitant une validation :</p>' +
    '<div class="info-box">' +
    '<p><strong>Professionnel :</strong> ' + professionalName + '</p>' +
    '<p><strong>Email :</strong> ' + professionalEmail + '</p>' +
    (siret ? '<p><strong>SIRET :</strong> ' + siret + '</p>' : '') +
    '<p><strong>Documents ajoutés :</strong> ' + documentsList + '</p>' +
    '</div>' +
    '<p>Veuillez vous connecter au <a href="' + appUrl + '/admin/dashboard" class="button">dashboard admin</a> pour valider ces documents.</p>' +
    '</div>' +
    '</div>' +
    '</body>' +
    '</html>';

  const text = 'Nouveaux documents professionnels à valider\n\n' +
    'Un professionnel a ajouté de nouveaux documents nécessitant une validation :\n\n' +
    'Professionnel : ' + professionalName + '\n' +
    'Email : ' + professionalEmail + '\n' +
    (siret ? 'SIRET : ' + siret + '\n' : '') +
    'Documents ajoutés : ' + documentsList + '\n\n' +
    'Veuillez vous connecter au dashboard admin pour valider ces documents.\n' +
    'URL : ' + appUrl + '/admin/dashboard';

  return {
    to: 'contact@mestoits.com',
    subject: 'Nouveaux documents professionnels à valider - ' + professionalName,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour un document professionnel validé
 */
function buildDocumentProfessionnelValideEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const professionalEmail = data.professionalEmail as string;
  const professionalName = data.professionalName as string;
  const documentName = data.documentName as string;

  if (!professionalEmail || !professionalName || !documentName) {
    console.error('Données manquantes pour l\'email de document professionnel validé');
    return null;
  }

  const html = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<style>' +
    'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }' +
    '.container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
    '.header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }' +
    '.content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }' +
    '.success-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<div class="header">' +
    '<h1 style="margin: 0;">Document validé avec succès</h1>' +
    '</div>' +
    '<div class="content">' +
    '<p>Bonjour ' + professionalName + ',</p>' +
    '<div class="success-box">' +
    '<p>Nous avons le plaisir de vous informer que votre document <strong>' + documentName + '</strong> a été validé avec succès.</p>' +
    '<p>Votre compte professionnel sur Mestoits est maintenant à jour.</p>' +
    '</div>' +
    '<p>Vous pouvez continuer à utiliser notre plateforme pour gérer vos annonces immobilières.</p>' +
    '<p>Cordialement,<br>L\'équipe Mestoits</p>' +
    '</div>' +
    '</div>' +
    '</body>' +
    '</html>';

  const text = 'Document validé avec succès\n\n' +
    'Bonjour ' + professionalName + ',\n\n' +
    'Nous avons le plaisir de vous informer que votre document ' + documentName + ' a été validé avec succès.\n\n' +
    'Votre compte professionnel sur Mestoits est maintenant à jour.\n\n' +
    'Vous pouvez continuer à utiliser notre plateforme pour gérer vos annonces immobilières.\n\n' +
    'Cordialement,\nL\'équipe Mestoits';

  return {
    to: professionalEmail,
    subject: 'Document validé - ' + documentName,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour un document professionnel rejeté
 */
function buildDocumentProfessionnelRejeteEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const professionalEmail = data.professionalEmail as string;
  const professionalName = data.professionalName as string;
  const documentName = data.documentName as string;
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!professionalEmail || !professionalName || !documentName) {
    console.error('Données manquantes pour l\'email de document professionnel rejeté');
    return null;
  }

  const html = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<style>' +
    'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }' +
    '.container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
    '.header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }' +
    '.content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }' +
    '.warning-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }' +
    '.button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<div class="header">' +
    '<h1 style="margin: 0;">Document rejeté</h1>' +
    '</div>' +
    '<div class="content">' +
    '<p>Bonjour ' + professionalName + ',</p>' +
    '<div class="warning-box">' +
    '<p>Nous vous informons que votre document <strong>' + documentName + '</strong> a été rejeté lors de la vérification.</p>' +
    '<p>Veuillez vérifier que votre document :</p>' +
    '<ul>' +
    '<li>Est lisible et de bonne qualité</li>' +
    '<li>Est à jour et valide</li>' +
    '<li>Correspond bien au type de document demandé</li>' +
    '</ul>' +
    '</div>' +
    '<p>Vous pouvez télécharger un nouveau document depuis votre <a href="' + appUrl + '/profil" class="button">profil professionnel</a>.</p>' +
    '<p>Si vous avez des questions, n\'hésitez pas à nous contacter à contact@mestoits.com</p>' +
    '<p>Cordialement,<br>L\'équipe Mestoits</p>' +
    '</div>' +
    '</div>' +
    '</body>' +
    '</html>';

  const text = 'Document rejeté\n\n' +
    'Bonjour ' + professionalName + ',\n\n' +
    'Nous vous informons que votre document ' + documentName + ' a été rejeté lors de la vérification.\n\n' +
    'Veuillez vérifier que votre document :\n' +
    '- Est lisible et de bonne qualité\n' +
    '- Est à jour et valide\n' +
    '- Correspond bien au type de document demandé\n\n' +
    'Vous pouvez télécharger un nouveau document depuis votre profil professionnel.\n' +
    'URL : ' + appUrl + '/profil\n\n' +
    'Si vous avez des questions, n\'hésitez pas à nous contacter à contact@mestoits.com\n\n' +
    'Cordialement,\nL\'équipe Mestoits';

  return {
    to: professionalEmail,
    subject: 'Document rejeté - ' + documentName,
    html,
    text,
  };
}

/**
 * Construit l'email de notification pour un professionnel certifié
 */
function buildProfessionnelCertifieEmail(data: Record<string, unknown>): {
  to: string;
  subject: string;
  html: string;
  text: string;
} | null {
  const professionalEmail = data.professionalEmail as string;
  const professionalName = data.professionalName as string;
  const companyName = data.companyName as string | undefined;
  const appUrl = data.appUrl as string | undefined || 'https://mestoits.com';

  if (!professionalEmail || !professionalName) {
    console.error('Données manquantes pour l\'email de professionnel certifié');
    return null;
  }

  const displayName = companyName || professionalName;

  const html = '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<style>' +
    'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }' +
    '.container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
    '.header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }' +
    '.content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }' +
    '.success-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }' +
    '.benefits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }' +
    '.button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="container">' +
    '<div class="header">' +
    '<h1 style="margin: 0;">Certification professionnelle approuvée</h1>' +
    '</div>' +
    '<div class="content">' +
    '<p>Bonjour ' + professionalName + ',</p>' +
    '<div class="success-box">' +
    '<p>Nous avons le plaisir de vous informer que votre compte professionnel <strong>' + displayName + '</strong> a été certifié par notre équipe.</p>' +
    '</div>' +
    '<div class="benefits">' +
    '<p>Cette certification vous permet de :</p>' +
    '<ul>' +
    '<li>Afficher le badge de certification sur votre profil</li>' +
    '<li>Bénéficier d\'une meilleure visibilité sur la plateforme</li>' +
    '<li>Gagner la confiance des utilisateurs</li>' +
    '</ul>' +
    '</div>' +
    '<p>Votre profil certifié apparaîtra maintenant avec un badge spécial qui témoigne de votre professionnalisme et de votre fiabilité.</p>' +
    '<p>Merci de faire confiance à Mestoits pour développer votre activité immobilière.</p>' +
    '<p><a href="' + appUrl + '/profil" class="button">Voir mon profil</a></p>' +
    '<p>Cordialement,<br>L\'équipe Mestoits</p>' +
    '</div>' +
    '</div>' +
    '</body>' +
    '</html>';

  const text = 'Certification professionnelle approuvée\n\n' +
    'Bonjour ' + professionalName + ',\n\n' +
    'Nous avons le plaisir de vous informer que votre compte professionnel ' + displayName + ' a été certifié par notre équipe.\n\n' +
    'Cette certification vous permet de :\n' +
    '- Afficher le badge de certification sur votre profil\n' +
    '- Bénéficier d\'une meilleure visibilité sur la plateforme\n' +
    '- Gagner la confiance des utilisateurs\n\n' +
    'Votre profil certifié apparaîtra maintenant avec un badge spécial qui témoigne de votre professionnalisme et de votre fiabilité.\n\n' +
    'Merci de faire confiance à Mestoits pour développer votre activité immobilière.\n\n' +
    'Voir mon profil : ' + appUrl + '/profil\n\n' +
    'Cordialement,\nL\'équipe Mestoits';

  return {
    to: professionalEmail,
    subject: 'Félicitations ! Votre compte professionnel est certifié',
    html,
    text,
  };
}

export default useEmail;

