# ⚠️ Instructions pour créer les comptes professionnels

## Problème avec le fichier SQL

Le fichier `create-professional-accounts.sql` **ne peut pas créer directement les comptes dans `auth.users`** via SQL standard dans Supabase. C'est une limitation de sécurité de Supabase.

## ✅ Solution recommandée : Utiliser le script JavaScript

**Le script `create-professional-accounts.js` est la meilleure solution** car il utilise l'API Admin de Supabase qui peut créer les comptes dans `auth.users` ET les profils dans `users_2025_12_01_11_29` en une seule fois.

### Étapes :

1. **Obtenir la clé SUPABASE_SERVICE_ROLE_KEY**
   - Allez sur Supabase Dashboard → Settings → API
   - Copiez la clé **`service_role`** (pas `anon`)

2. **Exécuter le script JavaScript**
   ```bash
   export SUPABASE_URL="https://lvbttyjfagghxyxrxqkk.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="votre_clé_service_role_ici"
   node create-professional-accounts.js
   ```

## Alternative : Créer les comptes manuellement puis utiliser SQL

Si vous préférez utiliser SQL, vous devez d'abord créer les comptes dans `auth.users` :

### Option 1 : Via Supabase Dashboard

1. Allez dans **Authentication** → **Users** → **Add User**
2. Créez chaque compte avec :
   - Email : `agence1@mestoits.com`, `agence2@mestoits.com`, etc.
   - Password : `azerty`
   - Email confirmé : ✅ (cochez la case)

3. Répétez pour les 15 comptes

4. **Ensuite**, exécutez le fichier SQL corrigé `create-professional-accounts-fixed.sql` dans Supabase SQL Editor

### Option 2 : Via l'API Supabase (curl)

```bash
# Pour chaque compte, exécutez :
curl -X POST 'https://lvbttyjfagghxyxrxqkk.supabase.co/auth/v1/admin/users' \
  -H "apikey: VOTRE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agence1@mestoits.com",
    "password": "azerty",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "Jean Dupont"
    }
  }'
```

## 📝 Fichiers disponibles

1. **`create-professional-accounts.js`** ⭐ RECOMMANDÉ
   - Crée les comptes dans `auth.users` ET les profils dans `users_2025_12_01_11_29`
   - Utilise l'API Admin Supabase
   - Tout automatique

2. **`create-professional-accounts-fixed.sql`**
   - Crée uniquement les profils dans `users_2025_12_01_11_29`
   - Nécessite que les comptes `auth.users` existent déjà
   - Utilise `ON CONFLICT` pour éviter les erreurs si les profils existent déjà

3. **`create-professional-accounts.sql`** ❌ NE FONCTIONNE PAS
   - Contient des erreurs de syntaxe
   - Ne peut pas créer les comptes dans `auth.users`

## 🎯 Résumé

**Pour créer les 15 comptes professionnels :**

✅ **Utilisez `create-professional-accounts.js`** (le plus simple et le plus fiable)

OU

✅ Créez les comptes manuellement dans Supabase Dashboard, puis exécutez `create-professional-accounts-fixed.sql`

