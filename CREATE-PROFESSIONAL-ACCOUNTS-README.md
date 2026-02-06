# Création de 15 Comptes Professionnels Fictifs

Ce script permet de créer automatiquement 15 comptes professionnels avec toutes les informations nécessaires.

## 📋 Liste des comptes créés

- **5 Agences immobilières**
  - agence1@mestoits.com
  - agence2@mestoits.com
  - agence3@mestoits.com
  - agence4@mestoits.com
  - agence5@mestoits.com

- **2 Agents immobiliers**
  - agent1@mestoits.com
  - agent2@mestoits.com

- **1 Notaire**
  - notaire1@mestoits.com

- **1 Maçon**
  - macon1@mestoits.com

- **1 Électricien**
  - electricien1@mestoits.com

- **1 Entreprise de travaux / Artisan**
  - artisan1@mestoits.com

- **1 Carreleur**
  - carreleur1@mestoits.com

- **1 Promoteur immobilier**
  - promoteur1@mestoits.com

- **1 Couvreur-zingueur**
  - couvreur1@mestoits.com

- **1 Peintre en bâtiment**
  - peintre1@mestoits.com

## 🔑 Mot de passe

**Mot de passe pour tous les comptes : `azerty`**

## 🚀 Utilisation

### Prérequis

1. Avoir Node.js installé
2. Avoir accès à la clé `SUPABASE_SERVICE_ROLE_KEY` de votre projet Supabase

### Étapes

1. **Configurer les variables d'environnement**

   ```bash
   export SUPABASE_URL="https://lvbttyjfagghxyxrxqkk.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="votre_clé_service_role"
   ```

   Ou créer un fichier `.env` :
   ```
   SUPABASE_URL=https://lvbttyjfagghxyxrxqkk.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
   ```

2. **Exécuter le script**

   ```bash
   node create-professional-accounts.js
   ```

### Résultat attendu

Le script affichera :
- Le statut de création pour chaque compte
- Un résumé avec le nombre de comptes créés avec succès
- Les erreurs éventuelles

Exemple de sortie :
```
🚀 Création de 15 comptes professionnels...

📝 Création du compte: agence1@mestoits.com (Agence immobilière)
✅ Compte créé avec succès: agence1@mestoits.com (ID: xxx-xxx-xxx)

...

═══════════════════════════════════════════════════════
📊 RÉSUMÉ
═══════════════════════════════════════════════════════
✅ Comptes créés avec succès: 15
❌ Erreurs: 0
📧 Total: 15

🔑 Mot de passe pour tous les comptes: azerty
═══════════════════════════════════════════════════════
```

## 📝 Informations incluses pour chaque compte

Chaque compte professionnel contient :

- **Informations de base**
  - Email
  - Mot de passe
  - Nom complet
  - Téléphone

- **Informations professionnelles**
  - Nom de l'entreprise
  - SIRET
  - Numéro de carte professionnelle
  - Adresse de l'entreprise
  - Ville
  - Code postal
  - Site web
  - Type de profession
  - Description

- **Réseaux sociaux** (selon le professionnel)
  - Facebook
  - Instagram
  - LinkedIn
  - TikTok
  - YouTube

## ⚠️ Notes importantes

1. **Clé Service Role** : Ce script nécessite la clé `SUPABASE_SERVICE_ROLE_KEY` qui donne des droits administrateur. Ne la partagez jamais publiquement.

2. **Comptes existants** : Si un compte existe déjà avec le même email, le script tentera de le récupérer et de mettre à jour son profil.

3. **Vérification** : Les comptes sont créés avec `is_verified: false`. Vous devrez les vérifier manuellement depuis le dashboard Supabase si nécessaire.

4. **Email confirmé** : Les emails sont automatiquement confirmés lors de la création pour permettre la connexion immédiate.

## 🔍 Vérification

Après l'exécution du script, vous pouvez vérifier les comptes créés :

1. **Via le dashboard Supabase**
   - Aller dans Authentication > Users
   - Vérifier que les 15 comptes sont présents

2. **Via la table `users_2025_12_01_11_29`**
   - Exécuter : `SELECT * FROM users_2025_12_01_11_29 WHERE user_type = 'professional' ORDER BY created_at DESC LIMIT 15;`

3. **Tester la connexion**
   - Aller sur la page de connexion de l'application
   - Utiliser un des emails créés avec le mot de passe `azerty`

## 🐛 Dépannage

### Erreur : "SUPABASE_SERVICE_ROLE_KEY non définie"
- Vérifiez que vous avez bien défini la variable d'environnement
- Utilisez `export` sous Linux/Mac ou `set` sous Windows

### Erreur : "already registered"
- C'est normal si le compte existe déjà
- Le script récupérera le compte existant et mettra à jour son profil

### Erreur : "Unauthorized"
- Vérifiez que votre `SUPABASE_SERVICE_ROLE_KEY` est correcte
- Assurez-vous d'utiliser la clé "service_role" et non la clé "anon"

## 📄 Fichiers

- `create-professional-accounts.js` : Script principal
- `create-professional-accounts.sql` : Version SQL (non fonctionnelle directement, nécessite l'API Admin)
- `CREATE-PROFESSIONAL-ACCOUNTS-README.md` : Ce fichier

