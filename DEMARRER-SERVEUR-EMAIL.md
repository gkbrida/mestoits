# 🚀 Guide de démarrage du serveur email

## Problème identifié

Le serveur email n'est pas démarré, ce qui cause l'erreur 404 lors de l'envoi d'emails.

## Solution : Démarrer le serveur email

### 1. Ouvrir un nouveau terminal

### 2. Aller dans le dossier email-server

```bash
cd email-server
```

### 3. Vérifier que les dépendances sont installées

```bash
npm install
```

### 4. Démarrer le serveur

```bash
npm start
```

Vous devriez voir :
```
🚀 Serveur email et paiement démarré sur le port 3001
📧 Zoho User: contact@mestoits.com
🔐 Zoho Password: ✅ Défini
💳 Stripe Secret Key: ✅ Défini (ou ❌ NON DÉFINI)
```

### 5. Vérifier que le serveur fonctionne

Dans un autre terminal :

```bash
curl http://localhost:3000/health
```

Vous devriez recevoir :
```json
{
  "status": "ok",
  "service": "Email Service",
  "timestamp": "..."
}
```

## Configuration

- **Port du serveur email** : 3000 (configuré dans `email-server/.env`)
- **URL du frontend** : `http://localhost:3000` (configuré dans `.env`)

## Mode développement avec auto-reload

Pour le développement avec rechargement automatique :

```bash
cd email-server
npm run dev
```

## ⚠️ Important

Le serveur email doit être démarré **en permanence** pour que les emails soient envoyés. 

Si vous fermez le terminal, le serveur s'arrête et les emails ne seront plus envoyés (mais les contacts seront toujours enregistrés en base de données).

## Alternative : Désactiver l'envoi d'email

Si vous ne souhaitez pas démarrer le serveur email en développement, vous pouvez désactiver complètement l'envoi d'email en ajoutant dans `.env` :

```
VITE_EMAIL_ENABLED=false
```

Dans ce cas, les contacts seront toujours enregistrés en base de données, mais aucun email ne sera envoyé.

