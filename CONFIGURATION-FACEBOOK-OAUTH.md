# Configuration de l'authentification Facebook avec Supabase

Ce guide explique comment configurer l'authentification Facebook pour votre application Mestoits.

## 📋 Prérequis

1. Un compte Facebook Developer
2. Un projet Supabase avec l'authentification activée
3. Les identifiants de votre application Facebook

## 🔧 Configuration Facebook

### 1. Créer une application Facebook

1. Allez sur [Facebook Developers](https://developers.facebook.com/)
2. Cliquez sur **"Mes applications"** → **"Créer une application"**
3. Sélectionnez **"Consommateur"** comme type d'application
4. Remplissez les informations de base de votre application

### 2. Configurer Facebook Login

1. Dans votre application Facebook, allez dans **"Ajouter un produit"**
2. Sélectionnez **"Facebook Login"**
3. Configurez les paramètres suivants :

#### Paramètres de base

- **URL de redirection OAuth valides** :
  ```
  https://votre-projet.supabase.co/auth/v1/callback
  ```
  Remplacez `votre-projet` par l'identifiant de votre projet Supabase.

#### Paramètres avancés (optionnel)

- **Domaines de l'application** : `mestoits.com`
- **URL de politique de confidentialité** : `https://mestoits.com/confidentialite`
- **URL des conditions d'utilisation** : `https://mestoits.com/cgu`

### 3. Récupérer les identifiants

1. Allez dans **"Paramètres"** → **"Paramètres de base"**
2. Notez votre **ID d'application** (App ID)
3. Allez dans **"Paramètres"** → **"Paramètres avancés"**
4. Notez votre **Clé secrète d'application** (App Secret)

## 🔐 Configuration Supabase

### 1. Activer le provider Facebook

1. Connectez-vous à votre projet Supabase
2. Allez dans **Authentication** → **Providers**
3. Trouvez **Facebook** dans la liste
4. Activez le provider Facebook

### 2. Configurer les identifiants

Dans la configuration Facebook de Supabase, entrez :

- **Client ID (App ID)** : Votre ID d'application Facebook
- **Client Secret (App Secret)** : Votre clé secrète d'application Facebook

### 3. Configurer l'URL de redirection

L'URL de redirection dans Supabase doit être :
```
https://votre-projet.supabase.co/auth/v1/callback
```

Cette URL est automatiquement configurée par Supabase, mais vérifiez qu'elle correspond à celle configurée dans Facebook.

## 🌐 Configuration de l'application

### Variables d'environnement

Ajoutez les variables suivantes dans votre fichier `.env` (optionnel, pour le SDK Facebook) :

```env
VITE_FACEBOOK_APP_ID=votre_app_id_facebook
VITE_FACEBOOK_API_VERSION=v18.0
```

**Note** : Ces variables sont optionnelles car Supabase gère l'authentification OAuth. Elles peuvent être utiles si vous souhaitez utiliser d'autres fonctionnalités du SDK Facebook.

### Configuration dans Vercel (si déployé)

Dans les **Settings → Environment Variables** de votre projet Vercel, ajoutez :

```env
VITE_FACEBOOK_APP_ID=votre_app_id_facebook
VITE_FACEBOOK_API_VERSION=v18.0
```

## ✅ Test de la connexion

1. Allez sur la page de connexion de votre application
2. Cliquez sur **"Continuer avec Facebook"**
3. Vous devriez être redirigé vers Facebook pour autoriser l'application
4. Après autorisation, vous serez redirigé vers `/confirm` puis vers la page d'accueil

## 🔍 Dépannage

### Erreur : "Invalid OAuth credentials"

- Vérifiez que l'App ID et l'App Secret sont corrects dans Supabase
- Vérifiez que l'URL de redirection dans Facebook correspond à celle de Supabase

### Erreur : "Redirect URI mismatch"

- Vérifiez que l'URL de redirection dans Facebook inclut bien l'URL de callback Supabase
- Format attendu : `https://votre-projet.supabase.co/auth/v1/callback`

### L'utilisateur n'est pas créé dans la table users_2025_12_01_11_29

- Vérifiez que vous avez configuré un trigger ou une fonction pour créer automatiquement le profil utilisateur lors de la connexion OAuth
- Voir la documentation Supabase sur les triggers d'authentification

### Le bouton Facebook ne fonctionne pas

- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que le provider Facebook est bien activé dans Supabase
- Vérifiez que les variables d'environnement sont correctement configurées

## 📝 Notes importantes

1. **Mode développement** : En mode développement, Facebook peut restreindre l'accès à votre application. Vous devrez peut-être ajouter des utilisateurs de test dans les paramètres de votre application Facebook.

2. **Production** : Pour la production, assurez-vous que :
   - Votre application Facebook est en mode "Live"
   - Les URLs de redirection sont correctement configurées
   - Les domaines sont validés dans Facebook

3. **Permissions** : Par défaut, Supabase demande les permissions de base (email, profil public). Vous pouvez personnaliser les permissions demandées dans la configuration Supabase.

4. **Création automatique du profil** : Assurez-vous qu'un trigger ou une fonction crée automatiquement le profil dans `users_2025_12_01_11_29` lors de la première connexion OAuth.

## 🔗 Ressources

- [Documentation Supabase OAuth](https://supabase.com/docs/guides/auth/social-login/auth-facebook)
- [Documentation Facebook Login](https://developers.facebook.com/docs/facebook-login/)
- [Facebook App Dashboard](https://developers.facebook.com/apps/)

