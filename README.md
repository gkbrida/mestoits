# Mestoits - Plateforme Immobilière

Application React/TypeScript complète pour la gestion immobilière avec Supabase.

## 🚀 Déploiement sur Vercel

### Prérequis

1. Compte Vercel
2. Compte Supabase avec projet configuré
3. Variables d'environnement Supabase

### Configuration Vercel

#### Variables d'environnement requises

Dans **Settings → Environment Variables** de votre projet Vercel :

```
VITE_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
```

#### Variables optionnelles

```
VITE_EMAIL_API_URL=https://votre-serveur-email.vercel.app (si serveur email déployé)
VITE_EMAIL_ENABLED=true (ou false pour désactiver)
```

### Déploiement

1. Connecter le dépôt GitHub à Vercel
2. Vercel détectera automatiquement Vite
3. Configurer les variables d'environnement
4. Déployer

Le fichier `vercel.json` est déjà configuré pour :
- Build avec Vite
- Output directory: `out`
- Routes SPA (toutes les routes redirigent vers index.html)
- Cache des assets statiques

## 📦 Structure du projet

- `src/` - Code source React/TypeScript
- `email-server/` - Serveur email Node.js (déployer séparément)
- `supabase/` - Fonctions Edge Supabase
- `migration-*.sql` - Migrations de base de données

## 🔧 Scripts disponibles

```bash
npm run dev      # Développement local
npm run build    # Build de production
npm run preview  # Prévisualisation du build
```

## 📝 Notes importantes

- Le serveur email doit être déployé séparément sur Vercel
- Toutes les variables d'environnement doivent commencer par `VITE_`
- Le dossier `out/` contient les fichiers buildés (ignoré par Git)

