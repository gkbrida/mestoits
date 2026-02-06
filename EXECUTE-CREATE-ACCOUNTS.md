# Guide d'exécution du script create-professional-accounts.js

## 📋 Prérequis

1. ✅ Node.js installé (vérifié avec `node --version`)
2. ✅ Le package `@supabase/supabase-js` est déjà installé dans le projet
3. ✅ Accès à votre projet Supabase

## 🔑 Étape 1 : Obtenir la clé SUPABASE_SERVICE_ROLE_KEY

**⚠️ IMPORTANT :** Cette clé donne des droits administrateur complets. Ne la partagez jamais publiquement !

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet (`lvbttyjfagghxyxrxqkk`)
3. Allez dans **Settings** → **API**
4. Dans la section **Project API keys**, copiez la clé **`service_role`** (pas la clé `anon` !)
   - Elle commence généralement par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Elle est marquée comme **secret** et ne doit jamais être exposée côté client

## 🚀 Étape 2 : Exécuter le script

### Option A : Avec des variables d'environnement (recommandé)

```bash
# 1. Définir les variables d'environnement
export SUPABASE_URL="https://lvbttyjfagghxyxrxqkk.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="votre_clé_service_role_ici"

# 2. Exécuter le script
node create-professional-accounts.js
```

### Option B : Directement dans la commande (une seule ligne)

```bash
SUPABASE_URL="https://lvbttyjfagghxyxrxqkk.supabase.co" SUPABASE_SERVICE_ROLE_KEY="votre_clé_service_role_ici" node create-professional-accounts.js
```

### Option C : Créer un fichier .env.local (pour éviter de répéter)

1. Créer un fichier `.env.local` à la racine du projet :
```bash
SUPABASE_URL=https://lvbttyjfagghxyxrxqkk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role_ici
```

2. Installer `dotenv` si nécessaire (optionnel) :
```bash
npm install dotenv
```

3. Modifier le script pour charger `.env.local` (ou utiliser une autre méthode)

**Note :** Le script actuel lit directement `process.env`, donc les variables doivent être définies avant l'exécution.

## 📊 Résultat attendu

Le script affichera quelque chose comme :

```
🚀 Création de 15 comptes professionnels...

📝 Création du compte: agence1@mestoits.com (Agence immobilière)
✅ Compte créé avec succès: agence1@mestoits.com (ID: xxx-xxx-xxx)

📝 Création du compte: agence2@mestoits.com (Agence immobilière)
✅ Compte créé avec succès: agence2@mestoits.com (ID: xxx-xxx-xxx)

...

═══════════════════════════════════════════════════════
📊 RÉSUMÉ
═══════════════════════════════════════════════════════
✅ Comptes créés avec succès: 15
❌ Erreurs: 0
📧 Total: 15

🔑 Mot de passe pour tous les comptes: azerty
═══════════════════════════════════════════════════════

✨ Script terminé
```

## 🔍 Vérification

Après l'exécution, vous pouvez vérifier :

1. **Dans Supabase Dashboard** :
   - Allez dans **Authentication** → **Users**
   - Vous devriez voir les 15 nouveaux comptes

2. **Dans la table `users_2025_12_01_11_29`** :
   - Exécutez cette requête SQL dans Supabase SQL Editor :
   ```sql
   SELECT email, full_name, profession_type, company_name, city 
   FROM users_2025_12_01_11_29 
   WHERE user_type = 'professional' 
   ORDER BY created_at DESC 
   LIMIT 15;
   ```

3. **Tester la connexion** :
   - Allez sur votre application
   - Essayez de vous connecter avec `agence1@mestoits.com` / `azerty`

## ⚠️ Erreurs courantes

### "SUPABASE_SERVICE_ROLE_KEY non définie"
- Vérifiez que vous avez bien défini la variable avant d'exécuter le script
- Utilisez `export` sous Linux/Mac ou `set` sous Windows PowerShell

### "Unauthorized" ou "Invalid API key"
- Vérifiez que vous utilisez bien la clé **service_role** et non la clé **anon**
- Vérifiez que la clé est complète (elle est très longue)

### "already registered"
- C'est normal si le compte existe déjà
- Le script récupérera le compte existant et mettra à jour son profil

### "Cannot find module '@supabase/supabase-js'"
- Installez les dépendances : `npm install`

## 📝 Exemple complet

```bash
# 1. Aller dans le dossier du projet
cd "/Users/macdekevins/Documents/developement/project-zoe immo r2"

# 2. Vérifier que Node.js est installé
node --version

# 3. Vérifier que les dépendances sont installées
npm list @supabase/supabase-js

# 4. Définir les variables d'environnement
export SUPABASE_URL="https://lvbttyjfagghxyxrxqkk.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2YnR0eWpmYWdnaHh5eHJ4cWtrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5ODk2NzIwMCwiZXhwIjoyMDE0NTQzMjAwfQ.votre_clé_complète_ici"

# 5. Exécuter le script
node create-professional-accounts.js
```

## 🎯 Comptes créés

- **5 Agences immobilières** : agence1@mestoits.com à agence5@mestoits.com
- **2 Agents immobiliers** : agent1@mestoits.com, agent2@mestoits.com
- **1 Notaire** : notaire1@mestoits.com
- **1 Maçon** : macon1@mestoits.com
- **1 Électricien** : electricien1@mestoits.com
- **1 Entreprise de travaux / Artisan** : artisan1@mestoits.com
- **1 Carreleur** : carreleur1@mestoits.com
- **1 Promoteur immobilier** : promoteur1@mestoits.com
- **1 Couvreur-zingueur** : couvreur1@mestoits.com
- **1 Peintre en bâtiment** : peintre1@mestoits.com

**Mot de passe pour tous : `azerty`**

