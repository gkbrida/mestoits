# Templates d'emails Supabase pour Mestoits

Ce dossier contient les templates d'emails personnalisés pour Supabase Auth.

## 📧 Templates disponibles

1. **confirmation-email.html** - Email de confirmation d'inscription
2. **reset-password-email.html** - Email de réinitialisation de mot de passe

## 🚀 Configuration dans Supabase

### Étape 1 : Accéder aux paramètres d'email

1. Connectez-vous à votre projet Supabase
2. Allez dans **Authentication** → **Email Templates**
3. Vous verrez les différents types d'emails configurables

### Étape 2 : Configurer l'email de confirmation

1. Cliquez sur **Confirm signup**
2. Copiez le contenu du fichier `confirmation-email.html`
3. Collez-le dans l'éditeur de template Supabase
4. Les variables suivantes sont disponibles :
   - `{{ .ConfirmationURL }}` - URL de confirmation avec token
   - `{{ .Email }}` - Adresse email de l'utilisateur
   - `{{ .Token }}` - Token de confirmation (si nécessaire)

### Étape 3 : Configurer l'email de réinitialisation

1. Cliquez sur **Reset password**
2. Copiez le contenu du fichier `reset-password-email.html`
3. Collez-le dans l'éditeur de template Supabase
4. Les variables suivantes sont disponibles :
   - `{{ .ConfirmationURL }}` - URL de réinitialisation avec token
   - `{{ .Email }}` - Adresse email de l'utilisateur
   - `{{ .Token }}` - Token de réinitialisation (si nécessaire)

## 📝 Variables Supabase disponibles

### Variables communes
- `{{ .SiteURL }}` - URL de votre site
- `{{ .Email }}` - Adresse email de l'utilisateur
- `{{ .Token }}` - Token d'authentification
- `{{ .TokenHash }}` - Hash du token
- `{{ .ConfirmationURL }}` - URL complète de confirmation/réinitialisation
- `{{ .RedirectTo }}` - URL de redirection après confirmation

### Variables spécifiques par type d'email

#### Email de confirmation
- `{{ .ConfirmationURL }}` - URL pour confirmer l'inscription
- `{{ .Token }}` - Token de confirmation

#### Email de réinitialisation
- `{{ .ConfirmationURL }}` - URL pour réinitialiser le mot de passe
- `{{ .Token }}` - Token de réinitialisation

## 🎨 Personnalisation

Les templates utilisent :
- **Couleurs principales** : Teal (#14b8a6, #0d9488)
- **Logo** : https://mestoits.com/logo.png
- **Police** : System fonts (Inter, Segoe UI, Roboto, etc.)
- **Design** : Responsive et moderne

### Modifier les couleurs

Pour changer les couleurs, recherchez et remplacez :
- `#14b8a6` - Couleur principale (teal)
- `#0d9488` - Couleur secondaire (teal foncé)
- `#0f172a` - Couleur du texte principal

### Modifier le logo

Remplacez l'URL du logo dans les templates :
```html
<img src="https://mestoits.com/logo.png" alt="Mestoits" class="logo" />
```

## ✅ Test des templates

1. Configurez les templates dans Supabase
2. Testez l'inscription d'un nouvel utilisateur
3. Vérifiez que l'email de confirmation arrive correctement
4. Testez la réinitialisation de mot de passe
5. Vérifiez que les liens fonctionnent correctement

## 🔒 Sécurité

- Les liens contiennent des tokens sécurisés générés par Supabase
- Les tokens expirent automatiquement (24h pour confirmation, 1h pour reset)
- Ne modifiez jamais les variables `{{ .ConfirmationURL }}` ou `{{ .Token }}`

## 📱 Compatibilité

Les templates sont :
- ✅ Responsive (mobile-friendly)
- ✅ Compatibles avec tous les clients email majeurs
- ✅ Testés sur Gmail, Outlook, Apple Mail, etc.

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez que les variables Supabase sont correctement utilisées
2. Testez avec un email réel (pas seulement en développement)
3. Vérifiez les logs Supabase pour les erreurs d'envoi
4. Assurez-vous que votre domaine est vérifié dans Supabase

