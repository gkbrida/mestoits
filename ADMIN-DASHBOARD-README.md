# Dashboard Administrateur - Documentation

Ce document explique comment configurer et utiliser le dashboard administrateur de Mestoits.

## 📋 Vue d'ensemble

Le dashboard admin est un système séparé de la plateforme principale qui permet de :
- **Statistiques** : Visualiser les statistiques des visites, utilisateurs, professionnels et annonces
- **Gestion des utilisateurs** : Activer/désactiver les comptes, valider les documents professionnels, certifier les professionnels
- **Gestion des annonces** : Approuver ou désapprouver les annonces publiées

## 🗄️ Structure de la Base de Données

### Table `admins`

Table pour stocker les comptes administrateurs avec authentification séparée :

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Hash bcrypt
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Champs ajoutés aux tables existantes

#### `users_2025_12_01_11_29`
- `is_active` (BOOLEAN) : Active/désactive le compte utilisateur
- `is_certified` (BOOLEAN) : Indique si le professionnel est certifié

#### `properties`
- `is_approved` (BOOLEAN) : Indique si l'annonce est approuvée par l'admin

## 🚀 Installation

### 1. Exécuter la migration SQL

Exécutez le fichier `migration-create-admin-system.sql` dans Supabase :

```sql
-- Exécuter migration-create-admin-system.sql
```

Cette migration :
- Crée la table `admins`
- Ajoute les champs `is_active`, `is_certified` à `users_2025_12_01_11_29`
- Ajoute le champ `is_approved` à `properties`
- Configure les policies RLS pour permettre aux admins d'accéder aux données

### 2. Créer le premier compte administrateur

Utilisez le script Node.js pour créer votre premier compte admin :

```bash
# Installer les dépendances si nécessaire
npm install bcryptjs dotenv

# Créer un compte admin
node create-admin-account.js admin@mestoits.com "VotreMotDePasse123" "Admin Principal"
```

**Important** : Remplacez les valeurs par vos propres identifiants.

### 3. Configuration de l'API

L'API route `/api/admin/login` nécessite :
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase (pour bypasser RLS)

Ces variables doivent être configurées dans Vercel (Settings → Environment Variables).

## 🔐 Authentification

### Connexion Admin

1. Accédez à `/admin/login`
2. Entrez votre email et mot de passe administrateur
3. Vous serez redirigé vers `/admin/dashboard`

### Sécurité

- Les mots de passe sont hashés avec bcrypt (10 rounds)
- La session admin est stockée dans `sessionStorage` (non persistante)
- Les routes admin sont protégées par le composant `AdminRoute`
- L'authentification est séparée de l'authentification Supabase normale

## 📊 Fonctionnalités du Dashboard

### Onglet Statistiques

Affiche :
- **Total visites** : Nombre total de visites et visiteurs uniques
- **Utilisateurs** : Nombre total d'utilisateurs (particuliers et professionnels)
- **Professionnels** : Nombre de comptes professionnels
- **Annonces** : Nombre total d'annonces (actives et en attente)
- **Graphique des visites** : Visites des 7 derniers jours
- **Répartition des annonces** : Annonces par type de bien

### Onglet Gestion des Utilisateurs

Fonctionnalités :
- **Filtres** : Tous / Particuliers / Professionnels
- **Recherche** : Par email, nom ou entreprise
- **Activer/Désactiver** : Activer ou désactiver un compte utilisateur
- **Valider les documents** : Pour les professionnels, valider ou rejeter chaque document individuellement
  - Carte professionnelle
  - Extrait RCS
  - Pièce d'identité
  - Assurance RC Pro
- **Certifier** : Certifier ou décertifier un professionnel

### Onglet Gestion des Annonces

Fonctionnalités :
- **Filtres** : Toutes / Approuvées / En attente
- **Recherche** : Par titre, ville ou propriétaire
- **Approuver/Désapprouver** : Approuver ou désapprouver une annonce
- **Voir l'annonce** : Lien vers la page de détail de l'annonce

## 🔧 Utilisation

### Activer/Désactiver un utilisateur

1. Aller dans l'onglet "Gestion des utilisateurs"
2. Trouver l'utilisateur dans la liste
3. Cliquer sur "Activer" ou "Désactiver"
4. Le statut sera mis à jour immédiatement

### Valider les documents d'un professionnel

1. Aller dans l'onglet "Gestion des utilisateurs"
2. Filtrer par "Professionnels"
3. Cliquer sur "Documents" pour un professionnel
4. Dans la modal, examiner chaque document
5. Cliquer sur "Valider" ou "Rejeter" pour chaque document
6. Le statut du document sera mis à jour

### Certifier un professionnel

1. Aller dans l'onglet "Gestion des utilisateurs"
2. Filtrer par "Professionnels"
3. Cliquer sur "Certifier" pour un professionnel
4. Le professionnel sera certifié et pourra afficher un badge de certification

### Approuver une annonce

1. Aller dans l'onglet "Gestion des annonces"
2. Filtrer par "En attente" pour voir les annonces non approuvées
3. Cliquer sur "Approuver" pour une annonce
4. L'annonce sera visible sur la plateforme principale

## 📝 Requêtes SQL Utiles

### Créer un admin manuellement (si nécessaire)

```sql
-- Hasher le mot de passe avec bcrypt (utiliser un outil en ligne ou le script Node.js)
-- Exemple avec password_hash déjà hashé
INSERT INTO admins (email, password_hash, full_name, is_active)
VALUES ('admin@mestoits.com', '$2a$10$...', 'Admin Principal', true);
```

### Statistiques rapides

```sql
-- Nombre total d'utilisateurs actifs
SELECT COUNT(*) FROM users_2025_12_01_11_29 WHERE is_active = true;

-- Nombre de professionnels certifiés
SELECT COUNT(*) FROM users_2025_12_01_11_29 
WHERE user_type = 'professional' AND is_certified = true;

-- Annonces en attente d'approbation
SELECT COUNT(*) FROM properties WHERE is_approved = false;

-- Visiteurs uniques (7 derniers jours)
SELECT COUNT(DISTINCT visitor_id) FROM visitor_tracking 
WHERE created_at >= NOW() - INTERVAL '7 days';
```

## 🐛 Dépannage

### Impossible de se connecter

1. Vérifiez que la table `admins` existe
2. Vérifiez que votre compte admin existe et est actif (`is_active = true`)
3. Vérifiez les variables d'environnement dans Vercel
4. Vérifiez les logs de l'API `/api/admin/login`

### Les données ne s'affichent pas

1. Vérifiez que les policies RLS permettent aux admins d'accéder aux données
2. Vérifiez que les champs `is_active`, `is_approved`, `is_certified` existent dans les tables
3. Vérifiez la console du navigateur pour les erreurs

### Les actions ne fonctionnent pas

1. Vérifiez que les policies RLS permettent la mise à jour
2. Vérifiez que vous êtes bien connecté en tant qu'admin
3. Vérifiez les logs de la console pour les erreurs

## 🔒 Sécurité Recommandée

1. **Mots de passe forts** : Utilisez des mots de passe complexes pour les comptes admin
2. **HTTPS uniquement** : Assurez-vous que le dashboard est accessible uniquement en HTTPS
3. **Limitation d'accès** : Restreignez l'accès au dashboard admin par IP si possible
4. **Audit** : Considérez l'ajout d'une table de logs pour tracer les actions admin
5. **Rotation des mots de passe** : Changez régulièrement les mots de passe admin

## 📈 Évolutions Futures Possibles

- Système de rôles (super-admin, admin, modérateur)
- Logs d'audit des actions admin
- Notifications pour les nouvelles annonces en attente
- Export des statistiques en CSV/PDF
- Filtres avancés et recherche avancée
- Gestion des catégories et types de professionnels
- Gestion des avis et commentaires

## 🔗 Routes Admin

- `/admin/login` : Page de connexion admin
- `/admin/dashboard` : Dashboard principal (protégé)

## 📦 Dépendances Requises

- `bcryptjs` : Pour le hashage des mots de passe
- `@supabase/supabase-js` : Client Supabase
- Variables d'environnement : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

