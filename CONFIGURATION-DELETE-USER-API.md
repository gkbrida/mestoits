# Configuration API Route delete-user

## ✅ Solution implémentée

L'application utilise maintenant une **API route Vercel** (`api/delete-user.ts`) au lieu d'une Edge Function Supabase pour supprimer les comptes utilisateurs. Cela contourne complètement les problèmes CORS avec Supabase Edge Functions.

## 📋 Variables d'environnement requises

### Dans Vercel Dashboard

Allez dans **Settings** > **Environment Variables** et ajoutez :

```
SUPABASE_URL=https://lvbttyjfagghxyxrxqkk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
```

**Note :** Ces variables sont déjà nécessaires pour d'autres fonctionnalités, mais assurez-vous qu'elles sont bien définies.

### Variables optionnelles (fallback)

Si les variables ci-dessus ne sont pas définies, l'API route utilisera ces variables comme fallback :

```
VITE_PUBLIC_SUPABASE_URL=https://lvbttyjfagghxyxrxqkk.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon
```

## 🔧 Fonctionnement

1. **Frontend** (`SecurityTab.tsx`) :
   - Appelle `/api/delete-user` via `fetch`
   - Envoie le token d'authentification dans le header `Authorization`
   - Utilise le proxy Vite en développement (`/api`) et l'URL Vercel en production

2. **API Route** (`api/delete-user.ts`) :
   - Vérifie l'authentification de l'utilisateur
   - Utilise `SUPABASE_SERVICE_ROLE_KEY` pour avoir les droits admin
   - Supprime l'utilisateur de `users_2025_12_01_11_29`
   - Supprime l'utilisateur de `auth.users`
   - Retourne une réponse avec gestion CORS complète

## 🚀 Avantages de cette solution

- ✅ **Pas de problème CORS** : Les API routes Vercel gèrent CORS automatiquement
- ✅ **Plus simple** : Pas besoin de déployer des Edge Functions Supabase
- ✅ **Même sécurité** : Utilise toujours `SUPABASE_SERVICE_ROLE_KEY` pour les droits admin
- ✅ **Déploiement automatique** : L'API route est déployée automatiquement avec Vercel

## 🔒 Sécurité

- L'API route vérifie que l'utilisateur est authentifié avant de supprimer
- Seul l'utilisateur peut supprimer son propre compte (vérifié via le token)
- Utilise la `SUPABASE_SERVICE_ROLE_KEY` pour avoir les droits admin nécessaires
- Les variables d'environnement sont sécurisées dans Vercel

## 📝 Utilisation

La suppression de compte fonctionne automatiquement depuis l'interface utilisateur :

1. Aller sur `/profil`
2. Section "Supprimer mon compte"
3. Cliquer sur "Supprimer mon compte"
4. Taper "SUPPRIMER" pour confirmer
5. Le compte est supprimé de `auth.users` ET `users_2025_12_01_11_29`

## 🐛 Dépannage

### Erreur : "Variables d'environnement Supabase manquantes"

**Solution :** Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont définies dans Vercel Dashboard.

### Erreur : "Unauthorized"

**Solution :** Vérifiez que l'utilisateur est bien connecté et que le token d'authentification est valide.

### Erreur : "Erreur suppression auth user"

**Solution :** Vérifiez que `SUPABASE_SERVICE_ROLE_KEY` est correcte et a les droits admin.

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. **En développement local** :
   - L'API route utilise le proxy Vite (`/api` → `http://localhost:3001`)
   - Assurez-vous que le serveur Vite est démarré

2. **En production** :
   - L'API route est automatiquement déployée sur Vercel
   - Accessible via `https://mestoits.com/api/delete-user`
   - Vérifiez les logs Vercel en cas d'erreur

## 📚 Documentation technique

- **Fichier API route** : `api/delete-user.ts`
- **Fichier frontend** : `src/pages/profil/components/SecurityTab.tsx`
- **Proxy Vite** : Configuré dans `vite.config.ts` pour rediriger `/api` vers le serveur local en développement

