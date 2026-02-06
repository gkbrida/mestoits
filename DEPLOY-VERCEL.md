# Guide de déploiement sur Vercel

## ✅ Préparation effectuée

1. ✅ Fichier `vercel.json` créé avec la configuration nécessaire
2. ✅ Configuration pour SPA (Single Page Application) avec rewrites
3. ✅ Cache des assets statiques configuré

## 📋 Étapes de déploiement

### 1. Variables d'environnement à configurer dans Vercel

Dans les **Settings → Environment Variables** de votre projet Vercel, ajoutez :

#### Variables Supabase (OBLIGATOIRES)
```
VITE_PUBLIC_SUPABASE_URL=votre_url_supabase
VITE_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

#### Variables Email (OPTIONNEL - si vous déployez le serveur email)
```
VITE_EMAIL_API_URL=https://votre-serveur-email.vercel.app
VITE_EMAIL_ENABLED=true
```

### 2. Configuration du build

- **Framework Preset**: Vite
- **Build Command**: `npm run build` (déjà configuré)
- **Output Directory**: `out` (déjà configuré dans vercel.json)
- **Install Command**: `npm install` (déjà configuré)

### 3. Déploiement du serveur email (optionnel)

Le serveur email (`email-server/`) doit être déployé séparément sur Vercel :

1. Créer un nouveau projet Vercel pour le serveur email
2. Root Directory: `email-server`
3. Framework: Other
4. Build Command: (laisser vide ou `echo "No build needed"`)
5. Output Directory: (laisser vide)
6. Variables d'environnement (optionnel, valeurs par défaut configurées) :
   - `ZOHO_USER`: votre email Zoho (déjà configuré par défaut : contact@mestoits.com)
   - `ZOHO_PASSWORD`: votre mot de passe Zoho (déjà configuré par défaut)
   - `ALLOWED_ORIGINS`: URL de votre application principale (ex: `https://votre-app.vercel.app`)

### 4. Points d'attention

#### ⚠️ Serveur email
- Le serveur email doit être déployé séparément
- Mettre à jour `VITE_EMAIL_API_URL` avec l'URL du serveur email déployé
- Si vous ne déployez pas le serveur email, définir `VITE_EMAIL_ENABLED=false`

#### ⚠️ Routes SPA
- Toutes les routes sont configurées pour rediriger vers `index.html`
- Les routes React Router fonctionneront correctement

#### ⚠️ Variables d'environnement
- Toutes les variables doivent commencer par `VITE_` pour être accessibles côté client
- Les variables Supabase sont **OBLIGATOIRES** pour que l'application fonctionne

### 5. Commandes de déploiement

#### Via CLI Vercel (recommandé)
```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Déployer en production
vercel --prod
```

#### Via Dashboard Vercel
1. Aller sur https://vercel.com
2. Cliquer sur "Add New Project"
3. Importer le dépôt GitHub `gkbrida/mestoits`
4. Configurer les variables d'environnement
5. Cliquer sur "Deploy"

## 🔍 Vérifications post-déploiement

1. ✅ Vérifier que toutes les routes fonctionnent
2. ✅ Vérifier la connexion à Supabase
3. ✅ Tester l'authentification
4. ✅ Vérifier que les images se chargent correctement
5. ✅ Tester les fonctionnalités principales

## 📝 Notes importantes

- Le dossier `out` contient les fichiers buildés (ne pas commiter)
- Les variables d'environnement `.env` ne doivent PAS être commitées
- Le serveur email peut être désactivé en production si nécessaire (`VITE_EMAIL_ENABLED=false`)

