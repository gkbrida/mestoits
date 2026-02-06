# 📧 Guide de déploiement du serveur email sur Vercel

## Problème identifié

Les emails ne fonctionnent pas après le déploiement sur Vercel car le serveur email n'est pas déployé ou mal configuré.

## Solution : Déployer le serveur email séparément

### Étape 1 : Déployer le serveur email sur Vercel

1. **Aller sur Vercel Dashboard** : https://vercel.com
2. **Créer un nouveau projet** :
   - Cliquer sur "Add New Project"
   - Importer le même dépôt GitHub (`gkbrida/mestoits`)
   - **IMPORTANT** : Dans "Root Directory", sélectionner `email-server`
   - Framework Preset : **Other**
   - Build Command : (laisser vide)
   - Output Directory : (laisser vide)
   - Install Command : `npm install`

3. **Configurer les variables d'environnement** dans le projet email-server (optionnel, les valeurs par défaut sont déjà configurées) :

   ```
   ZOHO_USER=contact@mestoits.com
   ZOHO_PASSWORD=32LxgGqs8VEt
   ALLOWED_ORIGINS=https://votre-app-principale.vercel.app
   ```

   **Note** : Remplacez `https://votre-app-principale.vercel.app` par l'URL réelle de votre application principale déployée sur Vercel.

4. **Déployer** le projet

5. **Récupérer l'URL du serveur email** :
   - Une fois déployé, Vercel vous donnera une URL comme : `https://email-server-xxx.vercel.app`
   - Notez cette URL

### Étape 2 : Configurer l'application principale

1. **Aller dans les Settings de votre application principale** sur Vercel
2. **Ajouter/modifier les variables d'environnement** :

   ```
   VITE_EMAIL_API_URL=https://email-server-xxx.vercel.app
   VITE_EMAIL_ENABLED=true
   ```

   **Note** : Remplacez `https://email-server-xxx.vercel.app` par l'URL réelle de votre serveur email déployé.

3. **Redéployer l'application principale** pour que les nouvelles variables d'environnement soient prises en compte

### Étape 3 : Vérifier que tout fonctionne

1. **Tester le serveur email** :
   - Ouvrir dans le navigateur : `https://email-server-xxx.vercel.app/health`
   - Vous devriez voir : `{"status":"ok","service":"Email Service","timestamp":"..."}`

2. **Tester depuis l'application** :
   - Essayer d'envoyer un email depuis l'application (contact, message, etc.)
   - Vérifier les logs dans Vercel pour voir s'il y a des erreurs

## Alternative : Déployer via CLI

Si vous préférez utiliser la CLI Vercel :

```bash
# Aller dans le dossier email-server
cd email-server

# Installer Vercel CLI si pas déjà fait
npm i -g vercel

# Se connecter
vercel login

# Déployer le serveur email
vercel

# Configurer les variables d'environnement (optionnel, valeurs par défaut configurées)
vercel env add ZOHO_USER
vercel env add ZOHO_PASSWORD
vercel env add ALLOWED_ORIGINS

# Déployer en production
vercel --prod
```

## Vérification de la configuration

### Dans l'application principale (Vercel Dashboard)

Variables d'environnement à vérifier :
- ✅ `VITE_PUBLIC_SUPABASE_URL`
- ✅ `VITE_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `VITE_EMAIL_API_URL` (URL du serveur email déployé)
- ✅ `VITE_EMAIL_ENABLED=true`

### Dans le serveur email (Vercel Dashboard)

Variables d'environnement à vérifier (optionnel, valeurs par défaut configurées) :
- ✅ `ZOHO_USER` (déjà configuré par défaut : contact@mestoits.com)
- ✅ `ZOHO_PASSWORD` (déjà configuré par défaut)
- ✅ `ALLOWED_ORIGINS` (URL de l'application principale)

## Dépannage

### Erreur : "Serveur email non disponible"

**Cause** : L'URL du serveur email n'est pas correctement configurée ou le serveur n'est pas déployé.

**Solution** :
1. Vérifier que le serveur email est bien déployé sur Vercel
2. Vérifier que `VITE_EMAIL_API_URL` pointe vers la bonne URL
3. Tester l'endpoint `/health` du serveur email

### Erreur CORS

**Cause** : L'URL de l'application principale n'est pas dans `ALLOWED_ORIGINS`.

**Solution** :
1. Vérifier que `ALLOWED_ORIGINS` dans le serveur email contient l'URL de l'application principale
2. Redéployer le serveur email après modification

### Erreur : "Configuration serveur email manquante"

**Cause** : Les variables `ZOHO_USER` ou `ZOHO_PASSWORD` ne sont pas définies dans le serveur email (mais les valeurs par défaut sont déjà configurées).

**Solution** :
1. Vérifier que les variables sont bien définies dans Vercel
2. Redéployer le serveur email

## Notes importantes

- ⚠️ Le serveur email doit être déployé **séparément** de l'application principale
- ⚠️ Les variables d'environnement doivent être configurées dans **les deux projets** (application principale + serveur email)
- ⚠️ Après modification des variables d'environnement, **redéployer** les projets pour que les changements soient pris en compte
- ⚠️ L'URL du serveur email peut changer si vous supprimez et recréez le projet

