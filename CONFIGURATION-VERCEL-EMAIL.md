# 🔧 Configuration Email sur Vercel - Solution immédiate

## ❌ Erreur actuelle

```
Access to fetch at 'http://localhost:3001/send-email' from origin 'https://mestoits.vercel.app' 
has been blocked by CORS policy
```

**Cause** : La variable d'environnement `VITE_EMAIL_API_URL` n'est pas définie dans Vercel, donc l'application utilise `http://localhost:3001` par défaut.

## ✅ Solution en 2 étapes

### Étape 1 : Déployer le serveur email (si pas déjà fait)

1. **Aller sur Vercel Dashboard** : https://vercel.com
2. **Créer un nouveau projet** :
   - Cliquer sur "Add New Project"
   - Importer le dépôt `gkbrida/mestoits`
   - **Root Directory** : `email-server` ⚠️ IMPORTANT
   - **Framework Preset** : `Other`
   - **Build Command** : (laisser vide)
   - **Output Directory** : (laisser vide)
   - **Install Command** : `npm install`

3. **Variables d'environnement** dans le projet serveur email (optionnel, les valeurs par défaut sont déjà configurées) :
   ```
   ZOHO_USER=contact@mestoits.com
   ZOHO_PASSWORD=32LxgGqs8VEt
   ALLOWED_ORIGINS=https://mestoits.vercel.app
   ```

4. **Déployer** et noter l'URL (ex: `https://email-server-abc123.vercel.app`)

### Étape 2 : Configurer l'application principale

1. **Aller dans votre projet principal** sur Vercel : https://vercel.com
2. **Settings → Environment Variables**
3. **Ajouter/modifier** :
   ```
   VITE_EMAIL_API_URL=https://email-server-abc123.vercel.app
   VITE_EMAIL_ENABLED=true
   ```
   ⚠️ Remplacez `https://email-server-abc123.vercel.app` par l'URL réelle de votre serveur email

4. **Redéployer** l'application :
   - Aller dans "Deployments"
   - Cliquer sur "..." du dernier déploiement
   - Sélectionner "Redeploy"

## 🔍 Vérification

### 1. Vérifier le serveur email

Ouvrir dans le navigateur : `https://email-server-abc123.vercel.app/health`

Devrait retourner :
```json
{
  "status": "ok",
  "service": "Email Service",
  "timestamp": "..."
}
```

### 2. Vérifier les variables d'environnement

Dans Vercel Dashboard → Settings → Environment Variables de votre application principale, vérifier :

- ✅ `VITE_EMAIL_API_URL` = URL du serveur email (pas localhost !)
- ✅ `VITE_EMAIL_ENABLED` = `true`
- ✅ `VITE_PUBLIC_SUPABASE_URL` = votre URL Supabase
- ✅ `VITE_PUBLIC_SUPABASE_ANON_KEY` = votre clé Supabase

### 3. Tester depuis l'application

Après redéploiement, tester l'envoi d'un email depuis l'application.

## ⚠️ Points importants

1. **Le serveur email doit être un projet Vercel séparé** avec Root Directory = `email-server`
2. **Les variables d'environnement doivent être définies dans les deux projets** :
   - Application principale : `VITE_EMAIL_API_URL`
   - Serveur email : `ZOHO_USER`, `ZOHO_PASSWORD`, `ALLOWED_ORIGINS` (optionnel, valeurs par défaut configurées)
3. **Après modification des variables, redéployer** pour que les changements soient pris en compte
4. **L'URL ne doit JAMAIS être `localhost` en production**

## 🚨 Si le problème persiste

1. Vérifier les logs dans Vercel :
   - Application principale : Deployments → Logs
   - Serveur email : Deployments → Logs

2. Vérifier que `ALLOWED_ORIGINS` dans le serveur email contient bien `https://mestoits.vercel.app`

3. Vérifier que le serveur email répond bien à `/health`

4. Vérifier la console du navigateur pour d'autres erreurs

