# 🔧 Configuration Zoho SMTP pour Mestoits

## ❌ Erreur actuelle

```
535 Authentication Failed
Invalid login: 535 Authentication Failed
```

**Cause** : Les identifiants Zoho fournis ne sont pas corrects ou le compte n'est pas configuré pour SMTP.

## ✅ Solution : Configurer Zoho Mail correctement

### Étape 1 : Vérifier le compte Zoho Mail

1. **Vérifier que le compte existe** :
   - Aller sur https://mail.zoho.com
   - Se connecter avec `contact@mestoits.com`
   - Vérifier que le compte est actif

2. **Vérifier que le domaine est vérifié** :
   - Aller dans **Settings** → **Mail Administration** → **Domains**
   - Vérifier que `mestoits.com` est bien vérifié et actif

### Étape 2 : Créer un mot de passe d'application Zoho

Zoho nécessite un **mot de passe d'application** spécifique pour SMTP, pas le mot de passe du compte principal.

1. **Aller dans les paramètres de sécurité** :
   - Se connecter à https://accounts.zoho.com
   - Aller dans **Security** → **App Passwords** (ou **Mots de passe d'application**)

2. **Créer un nouveau mot de passe d'application** :
   - Cliquer sur **Generate New Password**
   - Donner un nom (ex: "Mestoits SMTP")
   - **Copier le mot de passe généré** (il ne sera affiché qu'une seule fois !)

3. **Utiliser ce mot de passe dans la configuration** :
   - Ce mot de passe d'application doit être utilisé dans `ZOHO_PASSWORD`
   - **NE PAS utiliser** le mot de passe du compte principal

### Étape 3 : Configurer les variables d'environnement sur Vercel

1. **Aller sur Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**

2. **Ajouter/modifier les variables** :
   ```
   ZOHO_USER=contact@mestoits.com
   ZOHO_PASSWORD=votre_mot_de_passe_application_zoho
   ```

3. **Redéployer** l'application pour que les nouvelles variables soient prises en compte

### Étape 4 : Vérifier la configuration SMTP

Les paramètres SMTP Zoho sont :
- **Host** : `smtppro.zoho.eu` (serveur européen)
- **Port** : `465` (SSL)
- **Email** : `contact@mestoits.com`
- **Mot de passe** : `32LxgGqs8VEt`

## 🔍 Vérifications

### 1. Vérifier que le compte Zoho existe

Tester la connexion sur https://mail.zoho.com avec `contact@mestoits.com`

### 2. Vérifier que le domaine est vérifié

Dans Zoho Mail Administration, vérifier que `mestoits.com` est :
- ✅ Vérifié
- ✅ Actif
- ✅ Configuré pour les emails

### 3. Vérifier le mot de passe d'application

- Le mot de passe d'application doit être créé dans **Zoho Accounts** (pas dans Zoho Mail)
- Il doit être utilisé tel quel, sans espaces
- Il ne doit pas être le mot de passe du compte principal

### 4. Tester la connexion SMTP

Après configuration, les logs Vercel devraient afficher :
```
✅ Connexion SMTP Zoho vérifiée (smtppro.zoho.eu:465)
```

## 🚨 Erreurs courantes

### "535 Authentication Failed"

**Causes possibles** :
1. Le mot de passe utilisé est le mot de passe du compte principal (au lieu d'un mot de passe d'application)
2. Le mot de passe d'application est incorrect ou expiré
3. Le compte email n'existe pas dans Zoho
4. Le domaine n'est pas vérifié dans Zoho

**Solution** :
1. Créer un nouveau mot de passe d'application dans Zoho Accounts
2. Utiliser ce mot de passe dans `ZOHO_PASSWORD`
3. Redéployer sur Vercel

### "Invalid login"

**Cause** : Les identifiants sont incorrects.

**Solution** :
1. Vérifier que `ZOHO_USER` est bien `contact@mestoits.com`
2. Vérifier que `ZOHO_PASSWORD` est bien le mot de passe d'application (pas le mot de passe du compte)
3. Vérifier qu'il n'y a pas d'espaces avant/après les valeurs dans Vercel

### "Connection timeout"

**Cause** : Problème de réseau ou de configuration.

**Solution** :
1. Vérifier que `smtppro.zoho.eu` est accessible
2. Vérifier que le port 465 n'est pas bloqué
3. Le serveur SMTP européen utilise le port 465 avec SSL

## 📝 Notes importantes

1. **Mot de passe d'application obligatoire** : Zoho nécessite un mot de passe d'application pour SMTP, pas le mot de passe du compte principal
2. **Domaine vérifié** : Le domaine `mestoits.com` doit être vérifié dans Zoho Mail Administration
3. **Redéploiement nécessaire** : Après modification des variables d'environnement sur Vercel, redéployer l'application
4. **Valeurs par défaut** : Les identifiants sont configurés par défaut dans le code, mais ils doivent être corrects pour fonctionner

## 🔗 Liens utiles

- Zoho Mail : https://mail.zoho.com
- Zoho Accounts (App Passwords) : https://accounts.zoho.com → Security → App Passwords
- Documentation Zoho SMTP : https://www.zoho.com/mail/help/zoho-mail-smtp-configuration.html

