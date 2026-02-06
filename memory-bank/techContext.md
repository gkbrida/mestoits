# Tech Context - Mestoits

## Stack technique

### Frontend
- **React** : 19.1.0
- **TypeScript** : ~5.8.3
- **Vite** : ^7.0.3 (build tool)
- **React Router** : ^7.6.3
- **Tailwind CSS** : ^3.4.17
- **i18next** : 25.4.1 (internationalisation)

### Backend & Services
- **Supabase** : Backend-as-a-Service
  - PostgreSQL (base de données)
  - Auth (authentification)
  - Storage (stockage de fichiers)
  - Edge Functions (fonctions serverless)

### Bibliothèques tierces
- **Leaflet** : ^1.9.4 (cartographie)
- **React-Leaflet** : 5.0.0
- **Recharts** : 3.2.0 (graphiques)
- **Stripe** : @stripe/react-stripe-js 4.0.2 (paiements)
- **Firebase** : 12.0.0 (peut-être pour analytics)

## Configuration

### Vite
- Port : 3000
- Host : 0.0.0.0
- Base path : Configurable via `BASE_PATH`
- Auto-import : React hooks et React Router via unplugin-auto-import

### TypeScript
- Strict mode activé
- Path alias : `@` pointe vers `./src`
- Types pour React, React DOM, Leaflet

### Tailwind CSS
- Configuration standard
- PostCSS pour le traitement

## Variables d'environnement
```env
VITE_PUBLIC_SUPABASE_URL=<url_supabase>
VITE_PUBLIC_SUPABASE_ANON_KEY=<clé_anon_supabase>
BASE_PATH=/ (optionnel)
```

## Structure du projet
```
project-zoe immo r2/
├── src/
│   ├── components/      # Composants réutilisables
│   ├── pages/          # Pages de l'application
│   ├── router/          # Configuration du routing
│   ├── i18n/            # Fichiers de traduction
│   ├── App.tsx          # Composant racine
│   └── main.tsx         # Point d'entrée
├── supabase/
│   └── functions/       # Edge Functions
├── public/              # Assets statiques
└── index.html           # HTML d'entrée
```

## Dépendances de développement
- ESLint : Linting
- TypeScript ESLint : Linting TypeScript
- Autoprefixer : Support navigateurs CSS
- PostCSS : Traitement CSS

## Scripts disponibles
- `npm run dev` : Démarrage du serveur de développement
- `npm run build` : Build de production
- `npm run preview` : Prévisualisation du build

## Contraintes techniques
- Support navigateurs modernes (ES6+)
- Responsive design (mobile-first)
- Performance : Lazy loading des pages
- SEO : SPA, peut nécessiter SSR pour amélioration

## Intégrations
- **Supabase** : Backend principal
- **Leaflet/OpenStreetMap** : Cartographie
- **Stripe** : Paiements (si activé)
- **Firebase** : Analytics (si activé)

## Déploiement
- Build sortie : `out/` directory
- Source maps activés
- Base path configurable pour déploiement sous-répertoire

