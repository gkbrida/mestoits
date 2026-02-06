# 📧 Serveur Email - Mestoits

Serveur Node.js Express pour l'envoi d'emails via Zoho SMTP.

## 🚀 Installation

```bash
cd email-server
npm install
```

## ⚙️ Configuration

1. Copiez `.env.example` vers `.env` :
```bash
cp .env.example .env
```

2. Modifiez `.env` avec vos informations Zoho :
```env
ZOHO_USER=contact@mestoits.com
ZOHO_PASSWORD=32LxgGqs8VEt
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
```

**Note** : Les identifiants Zoho sont déjà configurés par défaut dans le code. Vous pouvez les surcharger avec des variables d'environnement si nécessaire.

## 🏃 Lancer en local

```bash
npm start
# ou pour le mode développement avec auto-reload
npm run dev
```

Le serveur sera accessible sur `http://localhost:3001`

## 🧪 Tester

```bash
curl -X POST http://localhost:3001/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "destinataire@example.com",
    "subject": "Test Email",
    "html": "<h1>Bonjour!</h1><p>Ceci est un test.</p>",
    "text": "Bonjour! Ceci est un test."
  }'
```

## ☁️ Déploiement sur Vercel

### Option 1 : Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
cd email-server
vercel

# Configurer les variables d'environnement (optionnel, les valeurs par défaut sont déjà configurées)
vercel env add ZOHO_USER
vercel env add ZOHO_PASSWORD
```

### Option 2 : Via Dashboard Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Importez le projet (dossier `email-server`)
3. Configurez les variables d'environnement (optionnel) :
   - `ZOHO_USER` = `contact@mestoits.com` (déjà configuré par défaut)
   - `ZOHO_PASSWORD` = `32LxgGqs8VEt` (déjà configuré par défaut)
4. Déployez !

## 🔗 Intégration avec le frontend

Mettez à jour `src/hooks/useEmail.ts` pour pointer vers votre URL de déploiement :

```typescript
const EMAIL_API_URL = process.env.VITE_EMAIL_API_URL || 'http://localhost:3001';
```

## 📋 Routes disponibles

- `GET /health` - Vérifier que le serveur fonctionne
- `POST /send-email` - Envoyer un email

### Format de la requête POST /send-email

```json
{
  "to": "destinataire@example.com",
  "subject": "Sujet de l'email",
  "html": "<h1>Contenu HTML</h1>",
  "text": "Contenu texte brut (optionnel)"
}
```

### Réponse de succès

```json
{
  "success": true,
  "messageId": "message-id-from-zoho",
  "message": "Email envoyé avec succès"
}
```

### Réponse d'erreur

```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

## 🔒 Sécurité

Pour la production, ajoutez une authentification (API key, JWT) dans `server.js` :

```javascript
const API_KEY = process.env.API_KEY;

app.post("/send-email", async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ success: false, error: "Non autorisé" });
  }
  // ... reste du code
});
```

