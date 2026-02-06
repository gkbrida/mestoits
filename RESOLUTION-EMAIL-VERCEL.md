# 🚨 Résolution rapide : Emails ne fonctionnent pas sur Vercel

## Problème

Les emails ne fonctionnent pas après le déploiement sur Vercel.

## Solution rapide (5 minutes)

### 1. Déployer le serveur email sur Vercel

**Via Dashboard Vercel** :

1. Aller sur https://vercel.com
2. Cliquer sur **"Add New Project"**
3. Importer le dépôt `gkbrida/mestoits`
4. **Configuration importante** :
   - **Root Directory** : `email-server` ⚠️
   - **Framework Preset** : `Other`
   - **Build Command** : (laisser vide)
   - **Output Directory** : (laisser vide)
   - **Install Command** : `npm install`

5. **Variables d'environnement** à ajouter (optionnel, valeurs par défaut configurées) :
   ```
   ZOHO_USER=contact@mestoits.com
   ZOHO_PASSWORD=32LxgGqs8VEt
   ALLOWED_ORIGINS=https://votre-app.vercel.app
   ```
   ⚠️ Remplacez `https://votre-app.vercel.app` par l'URL réelle de votre application principale

6. Cliquer sur **"Deploy"**

7. **Noter l'URL du serveur email** (ex: `https://email-server-abc123.vercel.app`)

### 2. Configurer l'application principale

1. Aller dans **Settings → Environment Variables** de votre application principale
2. Ajouter/modifier :
   ```
   VITE_EMAIL_API_URL=https://email-server-abc123.vercel.app
   VITE_EMAIL_ENABLED=true
   ```
   ⚠️ Remplacez par l'URL réelle de votre serveur email

3. **Redéployer** l'application principale (Settings → Deployments → ... → Redeploy)

### 3. Vérifier

1. Tester le serveur email : `https://email-server-abc123.vercel.app/health`
   - Devrait retourner : `{"status":"ok","service":"Email Service",...}`

2. Tester depuis l'application :
   - Essayer d'envoyer un message de contact
   - Vérifier les logs dans Vercel si ça ne fonctionne pas

## Checklist

- [ ] Serveur email déployé sur Vercel (projet séparé)
- [ ] Root Directory = `email-server` dans le projet serveur email
- [ ] Variables d'environnement configurées dans le serveur email (optionnel, valeurs par défaut configurées) :
  - [ ] `ZOHO_USER` (déjà configuré par défaut)
  - [ ] `ZOHO_PASSWORD` (déjà configuré par défaut)
  - [ ] `ALLOWED_ORIGINS` (URL de l'app principale)
- [ ] Variables d'environnement configurées dans l'app principale :
  - [ ] `VITE_EMAIL_API_URL` (URL du serveur email)
  - [ ] `VITE_EMAIL_ENABLED=true`
- [ ] Application principale redéployée après modification des variables

## Erreurs courantes

### "Serveur email non disponible"
→ Vérifier que `VITE_EMAIL_API_URL` pointe vers la bonne URL

### Erreur CORS
→ Vérifier que `ALLOWED_ORIGINS` contient l'URL de l'application principale

### "Configuration serveur email manquante"
→ Les identifiants Zoho sont déjà configurés par défaut dans le code. Vérifier les logs pour d'autres erreurs.

## Support

Si le problème persiste, vérifier les logs dans Vercel :
- Logs du serveur email : Vercel Dashboard → Projet serveur email → Deployments → Logs
- Logs de l'application : Vercel Dashboard → Projet application → Deployments → Logs

