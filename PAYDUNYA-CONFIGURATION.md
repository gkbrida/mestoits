# Configuration PayDunya pour Mobile Money

Ce document explique comment configurer le paiement Mobile Money avec PayDunya sur mestoits.com.

## Variables d'environnement requises

Dans Vercel, configurez les variables d'environnement suivantes :

### Variables pour l'API (Routes Vercel)

1. **PAYDUNYA_MASTER_KEY**
   - Valeur : `E8nYCYs1-3kMX-VFAX-wSIj-EAuWGfzrIR9N` (sandbox)
   - Description : Clé principale PayDunya pour authentifier les requêtes API
   - ⚠️ En production, utilisez votre clé de production

2. **PAYDUNYA_PRIVATE_KEY**
   - Valeur : `test_private_4LF3SKmQXjyeA8d0XLIyELQSs6Y` (sandbox)
   - Description : Clé privée PayDunya

3. **PAYDUNYA_TOKEN**
   - Valeur : `de7imGQwvMJsu4hfyZKb` (sandbox)
   - Description : Token d'authentification PayDunya

4. **PAYDUNYA_API_URL** (optionnel)
   - Valeur : `https://app.paydunya.com` (par défaut)
   - Description : URL de l'API PayDunya
   - ⚠️ En production, utilisez l'URL de production si différente

### Variables Supabase (déjà configurées)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Routes API créées

### 1. `/api/create-paydunya-payment`
- **Méthode** : POST
- **Description** : Crée une demande de paiement PayDunya (DMP API)
- **Paramètres** :
  - `amount` : Montant en XOF
  - `month` : Période de loyer
  - `propertyTitle` : Titre de la propriété
  - `tenantEmail` : Email du locataire
  - `tenantName` : Nom du locataire
  - `tenantPhone` : Numéro de téléphone (requis pour Mobile Money)
  - `leaseId` : ID du bail
  - `paymentId` : ID du paiement dans Supabase
  - `origin` : Origine de la requête (pour les URLs de retour)

### 2. `/api/paydunya-callback`
- **Méthode** : POST
- **Description** : Callback IPN (Instant Payment Notification) appelé par PayDunya après le paiement
- **Fonctionnalité** : Met à jour automatiquement le statut du paiement dans Supabase

## Fonctionnement

1. **Création de la demande de paiement** :
   - L'utilisateur sélectionne "Mobile Money" dans le modal de paiement
   - Le système crée une demande de paiement PayDunya avec les informations du locataire
   - PayDunya envoie un SMS au client avec un code de paiement
   - La référence de paiement est stockée dans Supabase

2. **Confirmation du paiement** :
   - Le client reçoit un SMS avec un code de paiement
   - Il suit les instructions dans le SMS pour confirmer le paiement via son téléphone
   - Le paiement est effectué via Mobile Money (Orange Money, MTN, Wave, etc.)

3. **Callback automatique (IPN)** :
   - PayDunya appelle `/api/paydunya-callback` après le paiement
   - Le callback met à jour le statut du paiement dans Supabase
   - Le paiement est marqué comme "paid" avec la méthode "mobile_money"

4. **Retour utilisateur** :
   - L'utilisateur peut voir le statut mis à jour dans son interface
   - La quittance est envoyée par email après confirmation du paiement

## Différences avec Stripe/FedaPay

- **Pas de redirection** : PayDunya n'envoie pas vers une page de paiement web
- **Paiement par SMS** : Le client reçoit un SMS avec un code à utiliser
- **Confirmation téléphone** : Le paiement se fait directement depuis le téléphone du client
- **Callback IPN** : PayDunya utilise un système de callback IPN pour notifier les paiements

## Format du numéro de téléphone

Le système accepte plusieurs formats :
- `+225XXXXXXXX` (Côte d'Ivoire avec indicatif)
- `225XXXXXXXX` (Côte d'Ivoire sans +)
- `XXXXXXXX` (numéro local)
- `+221XXXXXXXX` (Sénégal)
- `221XXXXXXXX` (Sénégal sans +)

Le format exact dépend du pays et de l'opérateur Mobile Money utilisé.

## Configuration du callback IPN dans PayDunya

1. **Connectez-vous à votre compte PayDunya**
2. **Accédez aux paramètres de votre application**
3. **Configurez l'URL de callback IPN** :
   - URL : `https://mestoits.com/api/paydunya-callback`
   - Format : `application/x-www-form-urlencoded` ou `application/json`
4. **Activez les notifications IPN**

## Passage en production

Pour passer en production :

1. **Obtenir les clés de production** :
   - Connectez-vous à votre compte PayDunya
   - Récupérez vos clés de production (MASTER_KEY, PRIVATE_KEY, TOKEN)
   - Remplacez les variables d'environnement dans Vercel

2. **Mettre à jour l'URL de l'API** (si nécessaire) :
   - Vérifiez l'URL de l'API PayDunya en production
   - Mettez à jour `PAYDUNYA_API_URL` si différente

3. **Tester** :
   - Effectuez un paiement test en production
   - Vérifiez que le callback IPN fonctionne
   - Vérifiez que le paiement est bien mis à jour dans Supabase

## Support

Pour toute question sur l'intégration PayDunya :
- Documentation : https://developers.paydunya.com
- Support : contact@mestoits.com

