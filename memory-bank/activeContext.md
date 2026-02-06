# Active Context - Mestoits

## État actuel
Application fonctionnelle avec toutes les fonctionnalités principales implémentées. Base de données Supabase configurée avec toutes les tables nécessaires.

## Travail récent
- Analyse complète du projet
- Identification de toutes les tables de base de données
- Création de la documentation Memory Bank
- Extraction du schéma SQL complet

## Prochaines étapes
1. Créer le fichier SQL complet avec toutes les tables
2. Lancer l'application pour vérification
3. Documenter les fonctions RPC et Edge Functions si nécessaire

## Décisions actives
- Utilisation de noms de tables avec timestamp (`_2025_12_01_11_29`) pour certaines tables
- Tables `properties` et `properties_2025_12_01_11_29` coexistent (migration en cours ?)
- Gestion des favoris préparée mais table non identifiée dans le code

## Points d'attention
- Certaines tables utilisent un suffixe de date, d'autres non
- Fonction RPC `increment_property_views` référencée mais définition non trouvée
- Edge Functions présentes mais code non analysé en détail
- Bucket `professional-assets` pour le stockage des assets professionnels

## Contexte de développement
- Projet en développement actif
- Structure modulaire bien organisée
- Code TypeScript avec types définis
- Composants réutilisables bien structurés

