# Système de Tracking des Visiteurs

Ce système permet de tracker les visiteurs anonymes du site web sans nécessiter la création d'un compte.

## 📋 Fonctionnalités

Le système collecte automatiquement les informations suivantes pour chaque visite :

- **Identifiants anonymes** : ID visiteur (stocké dans localStorage) et ID de session
- **Navigation** : Page visitée, titre de la page, referrer
- **Navigateur** : Type de navigateur, version, User-Agent
- **Système d'exploitation** : OS, version
- **Appareil** : Type (desktop/mobile/tablet), dimensions de l'écran et viewport
- **Localisation** : Langue, fuseau horaire
- **Sécurité** : Hash SHA-256 de l'adresse IP (pour respecter la vie privée)
- **Métriques** : Temps passé sur la page, durée de session

## 🗄️ Structure de la Base de Données

### Table `visitor_tracking`

La table stocke toutes les données de tracking. Voir `migration-create-visitor-tracking-table.sql` pour la structure complète.

### Sécurité (RLS)

- **INSERT** : Tout le monde peut insérer des données (visiteurs anonymes)
- **SELECT** : Par défaut, personne ne peut voir les données (sécurité maximale)
- Vous pouvez créer des policies personnalisées pour permettre aux admins de voir les données

## 🚀 Installation

### 1. Créer la table dans Supabase

Exécutez la migration SQL dans votre projet Supabase :

```sql
-- Exécuter migration-create-visitor-tracking-table.sql
```

### 2. Configuration

Le système fonctionne automatiquement une fois intégré dans `App.tsx`. Aucune configuration supplémentaire n'est nécessaire.

## 📊 Utilisation

### Données collectées automatiquement

Le système track automatiquement :
- Chaque changement de page (via React Router)
- Le temps passé sur chaque page
- Les informations du navigateur et de l'appareil
- La session de l'utilisateur

### Requêtes SQL utiles

#### Nombre de visiteurs uniques par jour
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(DISTINCT visitor_id) as unique_visitors,
  COUNT(*) as total_visits
FROM visitor_tracking
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### Pages les plus visitées
```sql
SELECT 
  page_path,
  COUNT(*) as visits,
  AVG(time_on_page) as avg_time_seconds
FROM visitor_tracking
GROUP BY page_path
ORDER BY visits DESC
LIMIT 20;
```

#### Répartition par type d'appareil
```sql
SELECT 
  device_type,
  COUNT(*) as visits,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM visitor_tracking
GROUP BY device_type;
```

#### Répartition par navigateur
```sql
SELECT 
  browser,
  COUNT(*) as visits
FROM visitor_tracking
GROUP BY browser
ORDER BY visits DESC;
```

#### Répartition par pays (si disponible)
```sql
SELECT 
  country,
  COUNT(*) as visits,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM visitor_tracking
WHERE country IS NOT NULL
GROUP BY country
ORDER BY visits DESC;
```

#### Sessions par visiteur
```sql
SELECT 
  visitor_id,
  COUNT(DISTINCT session_id) as session_count,
  SUM(time_on_page) as total_time_seconds,
  MIN(created_at) as first_visit,
  MAX(created_at) as last_visit
FROM visitor_tracking
GROUP BY visitor_id
ORDER BY session_count DESC;
```

## 🔒 Respect de la Vie Privée

- **IP anonymisée** : Les adresses IP sont hashées avec SHA-256 avant stockage
- **Pas de cookies tiers** : Utilisation uniquement de localStorage et sessionStorage
- **Données anonymes** : Aucune information personnelle identifiante n'est collectée
- **Conformité RGPD** : Les données peuvent être facilement supprimées via l'ID visiteur

## 🔧 Personnalisation

### Ajouter des métadonnées personnalisées

Modifiez `src/hooks/useVisitorTracking.ts` pour ajouter des métadonnées :

```typescript
const trackingData: TrackingData = {
  // ... données existantes
  metadata: {
    custom_field: 'valeur',
    // Ajoutez vos champs personnalisés ici
  },
};
```

### Désactiver le tracking pour certains utilisateurs

Modifiez `src/hooks/useVisitorTracking.ts` pour vérifier les préférences :

```typescript
// Vérifier si l'utilisateur a désactivé le tracking
const trackingDisabled = localStorage.getItem('tracking_disabled') === 'true';
if (trackingDisabled) return;
```

### Ajouter la géolocalisation

Pour obtenir le pays/région/ville, vous pouvez utiliser une API de géolocalisation IP :

```typescript
// Exemple avec ipapi.co (gratuit jusqu'à 1000 requêtes/jour)
const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
const geoData = await geoResponse.json();
trackingData.country = geoData.country_name;
trackingData.region = geoData.region;
trackingData.city = geoData.city;
```

## 📈 Dashboard (Optionnel)

Vous pouvez créer un dashboard pour visualiser les données :

1. Créer une page admin dans votre application
2. Utiliser les requêtes SQL ci-dessus
3. Afficher les statistiques avec des graphiques (Chart.js, Recharts, etc.)

## 🐛 Dépannage

### Les données ne sont pas enregistrées

1. Vérifiez que la table `visitor_tracking` existe dans Supabase
2. Vérifiez les policies RLS (INSERT doit être autorisé pour tous)
3. Vérifiez la console du navigateur pour les erreurs

### Les IDs ne persistent pas

- Vérifiez que localStorage et sessionStorage sont activés dans le navigateur
- Vérifiez qu'il n'y a pas de bloqueurs de cookies tiers

## 📝 Notes

- Le système fonctionne uniquement côté client
- Les données sont envoyées à Supabase de manière asynchrone
- Les erreurs de tracking n'affectent pas le fonctionnement du site
- Le tracking est désactivé automatiquement si Supabase n'est pas disponible

