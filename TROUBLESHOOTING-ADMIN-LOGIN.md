# Guide de dépannage - Connexion Admin

## Problèmes courants et solutions

### 1. Erreur "Variables d'environnement Supabase manquantes"

**Solution :**
- Vérifiez que les variables d'environnement suivantes sont configurées dans Vercel :
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Pour vérifier : Vercel Dashboard → Settings → Environment Variables

### 2. Erreur "La table admins n'existe pas"

**Solution :**
- Exécutez la migration SQL dans Supabase :
  1. Ouvrez Supabase Dashboard → SQL Editor
  2. Exécutez le contenu du fichier `migration-create-admin-system.sql`
  3. Vérifiez que la table `admins` a été créée

### 3. Erreur "Email ou mot de passe incorrect"

**Solutions possibles :**
- Vérifiez que vous avez créé un compte admin :
  ```bash
  node create-admin-account.js admin@mestoits.com "VotreMotDePasse123" "Admin Principal"
  ```
- Vérifiez que le compte admin est actif (`is_active = true`) dans la table `admins`
- Vérifiez que l'email correspond exactement (sensible à la casse)

### 4. Erreur "Failed to fetch" ou "NetworkError"

**Solutions possibles :**
- Vérifiez que l'API est déployée sur Vercel
- Vérifiez que l'URL de l'API est correcte dans `.env` :
  ```
  VITE_EMAIL_API_URL=/api
  ```
- En développement local, vérifiez que le serveur de développement tourne
- Vérifiez la console du navigateur pour plus de détails

### 5. Vérification étape par étape

1. **Vérifier la table admins :**
   ```sql
   SELECT * FROM admins;
   ```

2. **Vérifier les variables d'environnement :**
   - Dans Vercel : Settings → Environment Variables
   - En local : fichier `.env`

3. **Tester l'API directement :**
   ```bash
   curl -X POST http://localhost:3000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@mestoits.com","password":"VotreMotDePasse"}'
   ```

4. **Vérifier les logs :**
   - Console du navigateur (F12)
   - Logs Vercel (si déployé)

### 6. Créer un compte admin

Si vous n'avez pas encore de compte admin :

```bash
# Installer les dépendances si nécessaire
npm install bcryptjs dotenv

# Créer un compte admin
node create-admin-account.js admin@mestoits.com "VotreMotDePasse123" "Admin Principal"
```

**Important :** Remplacez les valeurs par vos propres identifiants.

### 7. Vérifier la configuration de l'API

L'API route `/api/admin/login` doit être accessible à :
- En développement : `http://localhost:3000/api/admin/login`
- En production : `https://votre-domaine.com/api/admin/login`

Vérifiez que le fichier `api/admin/login.ts` existe et est correctement configuré.
