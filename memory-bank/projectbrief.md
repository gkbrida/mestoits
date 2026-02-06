# Project Brief - Mestoits

## Vue d'ensemble
Mestoits est une plateforme immobilière complète développée avec React/TypeScript et Supabase. La plateforme permet aux utilisateurs de rechercher, publier et gérer des biens immobiliers, avec des fonctionnalités avancées pour les professionnels et la gestion locative.

## Objectifs principaux
1. **Publication et recherche de biens** : Permettre aux particuliers et professionnels de publier leurs biens immobiliers
2. **Gestion locative** : Outils complets pour gérer les locations, baux et locataires
3. **Estimation immobilière** : Service d'estimation gratuite des biens
4. **Carte des prix** : Visualisation géographique des prix immobiliers
5. **Messagerie** : Communication entre propriétaires et acheteurs/locataires
6. **Espace professionnel** : Fonctionnalités dédiées aux professionnels de l'immobilier

## Public cible
- **Particuliers** : Propriétaires souhaitant vendre ou louer leurs biens
- **Professionnels** : Agents immobiliers, agences, gestionnaires de biens
- **Acheteurs/Locataires** : Personnes recherchant un bien immobilier

## Fonctionnalités clés
- Authentification utilisateur (inscription/connexion)
- Publication d'annonces immobilières (vente/location)
- Recherche avancée avec filtres
- Estimation de biens immobiliers
- Carte interactive des prix
- Gestion locative (baux, paiements, quittances)
- Messagerie entre utilisateurs
- Profils professionnels certifiés
- Favoris et sauvegarde de recherches

## Contraintes techniques
- Stack : React 19, TypeScript, Vite
- Backend : Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- Styling : Tailwind CSS
- Cartographie : Leaflet/React-Leaflet
- Internationalisation : i18next
- Routing : React Router v7

## Environnement
- Port de développement : 3000
- Variables d'environnement requises :
  - `VITE_PUBLIC_SUPABASE_URL`
  - `VITE_PUBLIC_SUPABASE_ANON_KEY`

