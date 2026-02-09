import type { VercelRequest, VercelResponse } from '@vercel/node';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({}).end();
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Méthode non autorisée'
    });
  }

  try {
    const { 
      number, 
      message,
      sender,
      campaignName
    } = req.body;

    // Validation
    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: "Paramètres manquants: number et message sont requis"
      });
    }

    // Vérifier que la clé API SendKit est définie
    const sendkitApiKey = process.env.SENDKIT_API_KEY || '2obhn21c9akly1nvsvl5vjvl0lulbtqhtnfj0chz45fp';
    if (!sendkitApiKey) {
      console.error("❌ Clé API SendKit non définie");
      return res.status(500).json({
        success: false,
        error: "Configuration SendKit manquante"
      });
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('📱 ENVOI D\'UN SMS VIA SENDKIT');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📞 Destinataire: ${number}`);
    console.log(`💬 Message: ${message.substring(0, 50)}...`);
    console.log(`📝 Expéditeur: ${sender || 'Par défaut'}`);
    console.log(`📊 Campagne: ${campaignName || 'Non spécifiée'}`);
    console.log('═══════════════════════════════════════════════════════');

    // Préparer le payload pour SendKit
    const payload: any = {
      number: number,
      message: message
    };

    if (sender) {
      payload.sender = sender;
    }

    if (campaignName) {
      payload.campaignName = campaignName;
    }

    // Envoyer le SMS via SendKit API
    const sendkitResponse = await fetch('https://api.sarbacane.com/sendkit/sms/send/notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-apiKey': sendkitApiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await sendkitResponse.text();
    console.log('📡 Réponse SendKit:', responseText);
    console.log('   • Status:', sendkitResponse.status);
    console.log('   • StatusText:', sendkitResponse.statusText);

    if (!sendkitResponse.ok) {
      let errorMessage = `Erreur ${sendkitResponse.status}: ${sendkitResponse.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Utiliser le message d'erreur par défaut
      }
      
      console.error('❌ Erreur SendKit:', errorMessage);
      return res.status(sendkitResponse.status).json({
        success: false,
        error: errorMessage
      });
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      // Si la réponse n'est pas du JSON, considérer comme succès si le status est 200
      if (sendkitResponse.status === 200) {
        result = { creditsUsed: 1.00 };
      } else {
        throw new Error(`Réponse invalide de SendKit: ${responseText}`);
      }
    }

    console.log(`✅ SMS envoyé avec succès! Crédits utilisés: ${result.creditsUsed || 1}`);
    console.log('═══════════════════════════════════════════════════════');

    return res.status(200).json({
      success: true,
      creditsUsed: result.creditsUsed || 1,
      message: "SMS envoyé avec succès"
    });

  } catch (error: any) {
    console.error("❌ Erreur lors de l'envoi du SMS:", error);
    
    return res.status(500).json({
      success: false,
      error: error.message || "Erreur lors de l'envoi du SMS",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
