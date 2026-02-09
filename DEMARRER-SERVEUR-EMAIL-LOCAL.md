# 🚀 Démarrer le serveur email en local

## Problème courant

Si vous voyez l'erreur **"Impossible de se connecter au serveur"** lors de la connexion admin, c'est probablement parce que le serveur email n'est pas démarré.

## Solution rapide

### 1. Ouvrir un nouveau terminal

Dans un **nouveau terminal** (gardez celui du serveur Vite ouvert), exécutez :

```bash
cd email-server
npm install  # Si ce n'est pas déjà fait
npm start
```

Le serveur email devrait démarrer sur `http://localhost:3001`

### 2. Vérifier que le serveur fonctionne

Ouvrez votre navigateur et allez sur : `http://localhost:3001/health`

Vous devriez voir :
```json
{
  "status": "ok",
  "service": "Email Service",
  "timestamp": "..."
}
```

### 3. Retenter la connexion admin

Maintenant, retournez sur `/admin/login` et essayez de vous connecter.

## Configuration

### Variables d'environnement

Le serveur email utilise les variables d'environnement suivantes (déjà configurées par défaut) :

- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase
- `PORT` : Port du serveur (3001 par défaut)
- `ALLOWED_ORIGINS` : Origines CORS autorisées

Ces variables peuvent être définies dans un fichier `.env` dans le dossier `email-server/` ou directement dans les variables d'environnement système.

### Port utilisé

- **Serveur Vite (frontend)** : Port `5173` (configuré dans `vite.config.ts`)
- **Serveur Email (backend)** : Port `3001` (configuré dans `email-server/server.js`)

Le proxy Vite redirige automatiquement les requêtes `/api/*` vers `http://localhost:3001/*`

## Scripts disponibles

Dans le dossier `email-server/` :

```bash
npm start      # Démarrer le serveur
npm run dev    # Mode développement avec auto-reload
```

## Vérification

Pour vérifier que tout fonctionne :

1. ✅ Serveur Vite démarré sur `http://localhost:5173`
2. ✅ Serveur Email démarré sur `http://localhost:3001`
3. ✅ Route `/admin/login` accessible via `/api/admin/login` (proxy Vite)

## Dépannage

### Le serveur ne démarre pas

- Vérifiez que le port 3001 n'est pas déjà utilisé
- Vérifiez que les dépendances sont installées : `npm install` dans `email-server/`

### Erreur "Variables d'environnement Supabase manquantes"

- Vérifiez que `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont définies
- Créez un fichier `.env` dans `email-server/` si nécessaire

### Erreur CORS

- Vérifiez que `ALLOWED_ORIGINS` inclut `http://localhost:5173`
- Par défaut, toutes les origines sont autorisées (`*`)
