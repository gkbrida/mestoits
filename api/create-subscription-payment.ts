import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

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
      planId,
      planName,
      amount,
      currency,
      userEmail,
      userId,
      origin,
      paymentMethod
    } = req.body;

    // Validation
    if (!planId || !planName || amount === undefined || !userEmail || !userId || !origin) {
      return res.status(400).json({
        success: false,
        error: 'Paramètres manquants: planId, planName, amount, userEmail, userId et origin sont requis'
      });
    }

    // Vérifier que la clé Stripe est définie
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey && paymentMethod === 'stripe') {
      console.error('❌ Clé secrète Stripe non définie');
      return res.status(500).json({
        success: false,
        error: 'Configuration Stripe manquante'
      });
    }

    // Valider et convertir le montant
    const amountNumber = typeof amount === 'string'
      ? parseFloat(amount.replace(/[^\d,.]/g, '').replace(',', '.'))
      : Number(amount);

    if (isNaN(amountNumber) || amountNumber < 0) {
      return res.status(400).json({
        success: false,
        error: `Montant invalide: ${amount}`
      });
    }

    // URLs de retour
    const successUrl = `${origin}/abonnements?payment=success&planId=${planId}`;
    const cancelUrl = `${origin}/abonnements?payment=cancelled`;

    // Si PayDunya est sélectionné
    if (paymentMethod === 'paydunya') {
      // TODO: Implémenter PayDunya pour les abonnements
      // Pour l'instant, retourner une erreur
      return res.status(400).json({
        success: false,
        error: 'Le paiement par mobile money pour les abonnements n\'est pas encore disponible'
      });
    }

    // Créer une session de paiement Stripe
    const stripe = new Stripe(stripeSecretKey!, {
      apiVersion: '2024-11-20.acacia',
    });

    // Convertir le montant en centimes (XOF vers EUR approximatif si nécessaire)
    // Note: Stripe utilise EUR, donc on convertit XOF en EUR (1 XOF ≈ 0.0015 EUR)
    const amountInCents = currency === 'XOF'
      ? Math.round(amountNumber * 0.0015 * 100) // Conversion XOF -> EUR puis en centimes
      : Math.round(amountNumber * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Abonnement ${planName}`,
              description: `Abonnement mensuel - ${planName}`,
            },
            unit_amount: amountInCents,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      metadata: {
        planId: planId,
        planName: planName,
        userId: userId,
        type: 'subscription',
      },
    });

    console.log(`✅ Session Stripe créée avec succès! SessionId: ${session.id}`);

    return res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
      message: 'Session de paiement créée avec succès'
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de la création de la session de paiement:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la création de la session de paiement',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
