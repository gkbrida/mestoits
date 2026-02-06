# Guide de déploiement et dépannage de l'Edge Function notify-lease-invitation

## ⚠️ IMPORTANT : Déploiement requis

**L'Edge Function doit être déployée sur Supabase pour fonctionner !**

## 🚀 Déploiement rapide

### Option 1 : Script automatique
```bash
cd "/Users/macdekevins/Documents/developement/project-zoe immo r2"
./deploy-lease-invitation-function.sh
```

### Option 2 : Commande manuelle
```bash
cd "/Users/macdekevins/Documents/developement/project-zoe immo r2"
supabase functions deploy notify-lease-invitation
```

## ✅ Vérification du déploiement

1. Allez dans votre dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Naviguez vers **Edge Functions** dans le menu de gauche
4. Vérifiez que `notify-lease-invitation` est listée et affiche "Active"

## 🧪 Test de la fonction

### Depuis le dashboard Supabase
1. Allez dans **Edge Functions** > **notify-lease-invitation**
2. Cliquez sur **Invoke**
3. Utilisez ce JSON de test :
```json
{
  "tenantEmail": "votre-email@test.com",
  "tenantName": "Test User",
  "ownerName": "Propriétaire Test",
  "ownerEmail": "contact@mestoits.com",
  "ownerPhone": "+33612345678",
  "ownerCompany": null,
  "propertyTitle": "Appartement T3 - Centre-ville",
  "propertyAddress": "123 Rue de la République",
  "propertyCity": "Paris",
  "propertyType": "Appartement",
  "monthlyRent": 1200,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

### Depuis le terminal
```bash
supabase functions invoke notify-lease-invitation \
  --body '{
    "tenantEmail": "test@example.com",
    "tenantName": "Test User",
    "ownerName": "Propriétaire Test",
    "ownerEmail": "contact@mestoits.com",
    "ownerPhone": "+33612345678",
    "ownerCompany": null,
    "propertyTitle": "Appartement T3",
    "propertyAddress": "123 Rue Test",
    "propertyCity": "Paris",
    "propertyType": "Appartement",
    "monthlyRent": 1200,
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }'
```

## 📋 Vérification des logs

### En temps réel (recommandé)
```bash
supabase functions logs notify-lease-invitation --tail
```

### Derniers logs
```bash
supabase functions logs notify-lease-invitation
```

### Depuis le dashboard
**Edge Functions** > **notify-lease-invitation** > **Logs**

## 🔧 Configuration Zoho SMTP

Les identifiants Zoho sont déjà configurés par défaut dans le code :
- Email : `contact@mestoits.com`
- Mot de passe : `32LxgGqs8VEt`
- Serveur SMTP : `smtppro.zoho.eu` (serveur européen)
- Port : `465` (SSL)

## 🐛 Dépannage

### L'email n'est pas envoyé lors de la création d'un bail

1. **Vérifiez que la fonction est déployée**
   ```bash
   supabase functions list
   ```
   La fonction `notify-lease-invitation` doit apparaître dans la liste.

2. **Vérifiez les logs pour voir l'erreur exacte**
   ```bash
   supabase functions logs notify-lease-invitation --tail
   ```
   Puis créez un bail et observez les logs.

3. **Vérifiez la console du navigateur**
   - Ouvrez les outils de développement (F12)
   - Allez dans l'onglet "Console"
   - Créez un bail et observez les messages de log
   - Recherchez les messages commençant par 📧, 📨, ✅ ou ❌

4. **Erreurs courantes :**

   - **"Function not found" ou 404** → La fonction n'est pas déployée
     ```bash
     supabase functions deploy notify-lease-invitation
     ```

   - **"Authentication failed"** → Le mot de passe Zoho est incorrect
     - Vérifiez les identifiants Zoho dans la configuration
     - Les valeurs par défaut sont : `contact@mestoits.com` / `32LxgGqs8VEt`

   - **"Connection timeout"** → Problème de réseau ou de permissions
     - Vérifiez que Supabase peut se connecter à `smtppro.zoho.eu:465`
     - Contactez le support Supabase si le problème persiste

   - **"535-5.7.8 Username and Password not accepted"** → Problème d'authentification Zoho
     - Vérifiez que les identifiants Zoho sont corrects
     - Vérifiez que le compte Zoho est actif

### Les logs ne montrent rien

1. Vérifiez que vous êtes connecté à Supabase :
   ```bash
   supabase projects list
   ```

2. Si vous n'êtes pas connecté :
   ```bash
   supabase login
   ```

3. Vérifiez que vous êtes dans le bon projet :
   ```bash
   supabase link --project-ref VOTRE_PROJECT_ID
   ```

## 📝 Informations de configuration

- **Email Zoho** : `contact@mestoits.com`
- **Mot de passe** : `32LxgGqs8VEt`
- **Serveur SMTP** : `smtppro.zoho.eu` (serveur européen)
- **Port** : `465` (SSL)
- **Fonction Edge** : `notify-lease-invitation`

## 🔄 Redéploiement après modification

Si vous modifiez le code de l'Edge Function, redéployez-la :
```bash
supabase functions deploy notify-lease-invitation
```

## 💡 Astuce

Pour tester rapidement si l'email fonctionne, créez un bail avec votre propre adresse email comme locataire et vérifiez votre boîte de réception (et les spams).

## 🔍 Vérification étape par étape

1. ✅ La fonction est-elle déployée ? → Dashboard Supabase > Edge Functions
2. ✅ Les logs montrent-ils une erreur ? → `supabase functions logs notify-lease-invitation --tail`
3. ✅ L'email du locataire est-il valide ? → Vérifiez dans la table `tenants`
4. ✅ Les identifiants Zoho sont-ils corrects ? → Vérifiez dans le code de l'Edge Function
5. ✅ La console du navigateur montre-t-elle des erreurs ? → F12 > Console

