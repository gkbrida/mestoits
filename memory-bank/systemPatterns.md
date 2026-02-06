# System Patterns - Mestoits

## Architecture générale
Application React SPA avec backend Supabase. Architecture modulaire avec lazy loading des pages.

## Structure des composants

### Pages principales
- **Home** : Page d'accueil avec sections (Hero, Prix, Estimation, Dernières annonces)
- **Recherche** : Liste de biens avec filtres avancés
- **Détail bien** : Affichage complet d'un bien avec galerie, contact, similaires
- **Déposer annonce** : Formulaire multi-étapes (5 étapes)
- **Estimation** : Formulaire d'estimation avec résultats
- **Carte prix** : Carte interactive Leaflet avec filtres
- **Professionnels** : Liste et détails des professionnels
- **Gestion locative** : Dashboard avec onglets (Propriétés, Baux, Locataires, Dashboard)
- **Messages** : Interface de messagerie avec conversations

### Composants réutilisables
- **Navbar** : Navigation principale avec menu mobile
- **SideMenu** : Menu latéral mobile
- **Footer** : Pied de page
- **PropertyCard** : Carte d'affichage de bien
- **ContactForm** : Formulaire de contact
- **ImageGallery** : Galerie d'images avec plan et visite virtuelle

## Patterns de données

### Tables principales
1. **users_2025_12_01_11_29** : Profils utilisateurs (particuliers/professionnels)
2. **properties** : Biens immobiliers (vente/location)
3. **properties_2025_12_01_11_29** : Version alternative de la table properties
4. **messages_2025_12_01_11_29** : Messages entre utilisateurs
5. **price_data_2025_12_01_11_29** : Données de prix agrégées par ville/type
6. **valuations_2025_12_01_11_29** : Estimations de biens
7. **rental_properties_2025_12_01_11_29** : Propriétés en location
8. **property_contacts** : Contacts sur les biens

### Storage Supabase
- **professional-assets** : Bucket pour logos, photos d'activité professionnelle

### Fonctions RPC
- **increment_property_views** : Incrémente le compteur de vues d'un bien

### API Routes Vercel
- **api/delete-user.ts** : Suppression de compte utilisateur (contourne les problèmes CORS des Edge Functions)
- **api/send-email.ts** : Envoi d'emails via Zoho SMTP

### Serveur Email Node.js
- **email-server/server.js** : Gestion des paiements Stripe et envoi d'emails

## Patterns de navigation
- Routing avec React Router v7
- Lazy loading des pages pour optimiser le chargement
- Navigation programmatique via `window.REACT_APP_NAVIGATE`

## Patterns d'authentification
- Supabase Auth pour l'authentification
- Vérification d'utilisateur sur les pages protégées
- Redirection vers connexion si non authentifié

## Patterns de formulaire
- Formulaires multi-étapes pour dépôt d'annonce
- Validation côté client
- Gestion d'état avec useState
- Soumission asynchrone avec gestion d'erreurs

## Patterns de communication
- Messages en temps réel via Supabase
- Groupement par conversation (utilisateur)
- Marquage des messages lus/non lus
- Compteur de messages non lus

## Patterns de gestion locative
- Création de baux avec articles personnalisables
- Suivi des paiements
- Génération de quittances
- Signature électronique

## Patterns d'internationalisation
- i18next pour la traduction
- Détection automatique de langue
- Support multilingue préparé

