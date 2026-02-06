# 🚀 Démarrage Rapide - Serveur Email

## 1️⃣ Installation (déjà fait ✅)

```bash
cd email-server
npm install
```

## 2️⃣ Configuration

Les identifiants Zoho sont déjà configurés par défaut dans le code :
- Email: `contact@mestoits.com`
- Mot de passe: `32LxgGqs8VEt`

## 3️⃣ Démarrer le serveur

```bash
npm start
```

Le serveur sera accessible sur `http://localhost:3001`

## 4️⃣ Tester

Dans un autre terminal :

```bash
curl -X POST http://localhost:3001/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "votre-email@example.com",
    "subject": "Test Email",
    "html": "<h1>Bonjour!</h1><p>Ceci est un test.</p>",
    "text": "Bonjour! Ceci est un test."
  }'
```

## 5️⃣ Intégration avec le frontend

Le frontend est déjà configuré pour utiliser ce serveur !

1. Assurez-vous que le serveur email tourne sur `http://localhost:3001`
2. Lancez votre frontend : `npm run dev`
3. Testez la création d'un locataire → l'email devrait être envoyé !

## 6️⃣ Déploiement sur Vercel

### Via CLI :

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Configurer les variables d'environnement (optionnel, valeurs par défaut configurées)
vercel env add ZOHO_USER
# Entrez: contact@mestoits.com (ou laissez la valeur par défaut)

vercel env add ZOHO_PASSWORD
# Entrez: 32LxgGqs8VEt (ou laissez la valeur par défaut)
```

### Via Dashboard Vercel :

1. Allez sur [vercel.com](https://vercel.com)
2. Importez le projet (dossier `email-server`)
3. Configurez les variables d'environnement (optionnel, valeurs par défaut configurées) :
   - `ZOHO_USER` = `contact@mestoits.com` (déjà configuré par défaut)
   - `ZOHO_PASSWORD` = `32LxgGqs8VEt` (déjà configuré par défaut)
4. Déployez !

## 7️⃣ Mettre à jour le frontend

Après déploiement, mettez à jour `.env` du frontend :

```env
VITE_EMAIL_API_URL=https://votre-email-api.vercel.app
```

## ✅ C'est tout !

Votre système d'email est maintenant opérationnel avec Zoho SMTP ! 🎉

