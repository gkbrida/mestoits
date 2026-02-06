# 🚨 Résolution : Erreur 500 lors de l'envoi d'email sur Vercel

## Problème

Erreur 500 (Internal Server Error) lors de l'appel à `/api/send-email` sur Vercel.

## 🔍 Diagnostic

### 1. Vérifier les logs Vercel

1. Aller sur [Vercel Dashboard](https://vercel.com)
2. Sélectionner votre projet
3. Aller dans **Deployments** → Sélectionner le dernier déploiement
4. Cliquer sur **Functions** → `api/send-email`
5. Vérifier les **Logs** pour voir l'erreur exacte

### 2. Erreurs courantes et solutions

#### Erreur : "Configuration serveur email manquante"
**Cause** : Les identifiants Zoho ne sont pas accessibles.

**Solution** :
- Les identifiants sont déjà configurés par défaut dans le code (`contact@mestoits.com` / `32LxgGqs8VEt`)
- Si vous avez défini des variables d'environnement `ZOHO_USER` et `ZOHO_PASSWORD`, vérifiez qu'elles sont correctes
- Redéployer après modification des variables d'environnement

#### Erreur : "ECONNREFUSED" ou "ETIMEDOUT"
**Cause** : Problème de connexion au serveur SMTP Zoho.

**Solution** :
- Vérifier que le compte Zoho est actif
- Vérifier que les identifiants sont corrects
- Vérifier que le domaine `mestoits.com` est bien configuré dans Zoho
- Le code utilise le serveur européen `smtppro.zoho.eu` sur le port 465 (SSL)

#### Erreur : "Invalid login" ou "Authentication failed"
**Cause** : Identifiants Zoho incorrects.

**Solution** :
1. Vérifier les identifiants dans Zoho Mail
2. Vérifier que le mot de passe d'application est correct (`32LxgGqs8VEt`)
3. Si nécessaire, créer un nouveau mot de passe d'application dans Zoho

#### Erreur : "Module not found: nodemailer"
**Cause** : Le package `nodemailer` n'est pas installé.

**Solution** :
```bash
npm install nodemailer
git add package.json package-lock.json
git commit -m "Add nodemailer dependency"
git push
```

## ✅ Vérifications à faire

### 1. Variables d'environnement sur Vercel

Dans **Settings → Environment Variables**, vérifier :
- `ZOHO_USER` (optionnel, valeur par défaut : `contact@mestoits.com`)
- `ZOHO_PASSWORD` (optionnel, valeur par défaut : `32LxgGqs8VEt`)

**Note** : Les valeurs par défaut sont déjà dans le code, donc ces variables sont optionnelles.

### 2. Configuration du domaine Zoho

1. Vérifier que le domaine `mestoits.com` est bien configuré dans Zoho Mail
2. Vérifier que l'email `contact@mestoits.com` existe et est actif
3. Vérifier que le mot de passe d'application est correct

### 3. Redéploiement

Après toute modification :
1. Aller dans **Deployments**
2. Cliquer sur **"..."** du dernier déploiement
3. Sélectionner **"Redeploy"**

## 🔧 Test de la fonction

### Depuis le Dashboard Vercel

1. Aller dans **Functions** → `api/send-email`
2. Utiliser l'onglet **"Test"** pour tester la fonction avec :
```json
{
  "to": "votre-email@test.com",
  "subject": "Test Email",
  "html": "<h1>Test</h1><p>Ceci est un test.</p>",
  "text": "Test - Ceci est un test."
}
```

### Depuis la console du navigateur

Ouvrir la console (F12) et tester :
```javascript
fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'votre-email@test.com',
    subject: 'Test',
    html: '<h1>Test</h1>',
    text: 'Test'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## 📝 Logs améliorés

Le code a été amélioré pour retourner plus d'informations en cas d'erreur :
- Type d'erreur
- Code d'erreur
- Message détaillé
- Stack trace (en développement)

Vérifiez les logs Vercel pour voir ces informations détaillées.

## 🆘 Si le problème persiste

1. Vérifier les logs Vercel pour l'erreur exacte
2. Vérifier que le compte Zoho est actif
3. Tester avec un autre compte email Zoho si disponible
4. Vérifier que le domaine `mestoits.com` est bien configuré dans Zoho
5. Contacter le support Zoho si nécessaire

