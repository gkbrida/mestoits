# 📧 Configuration Email Intégrée sur Vercel

## ✅ Solution implémentée

Le serveur email est maintenant **intégré directement dans l'application principale** via une fonction serverless Vercel. Plus besoin de déployer un serveur email séparé !

## 📁 Structure

- **`api/send-email.ts`** : Fonction serverless Vercel pour l'envoi d'emails
- **`src/hooks/useEmail.ts`** : Utilise automatiquement `/api/send-email` en production

## ⚙️ Configuration dans Vercel

### Variables d'environnement à ajouter

Dans **Settings → Environment Variables** de votre projet Vercel (optionnel, les valeurs par défaut sont déjà configurées) :

```
ZOHO_USER=contact@mestoits.com
ZOHO_PASSWORD=32LxgGqs8VEt
```

**Note** : Les identifiants Zoho sont déjà intégrés par défaut dans le code. Vous pouvez les surcharger avec des variables d'environnement si nécessaire.

### Comment ça fonctionne

1. **En développement** : L'application utilise le serveur email local (`http://localhost:3001`) si disponible
2. **En production** : L'application utilise automatiquement `/api/send-email` (fonction serverless Vercel)

## 🚀 Déploiement

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Déployer sur Vercel** :
   - Les fonctions serverless dans `api/` sont automatiquement détectées par Vercel
   - Vercel déploie automatiquement la fonction `api/send-email.ts`

3. **Configurer les variables d'environnement** dans Vercel Dashboard (optionnel) :
   - `ZOHO_USER` (déjà configuré par défaut)
   - `ZOHO_PASSWORD` (déjà configuré par défaut)

4. **Redéployer** pour que les variables soient prises en compte

## 🔍 Vérification

Après déploiement, tester l'envoi d'email depuis l'application. Les emails devraient être envoyés via la fonction serverless intégrée.

## 📝 Notes

- ✅ Pas besoin de serveur email séparé
- ✅ Tout fonctionne sur le même domaine
- ✅ Pas de configuration CORS nécessaire
- ✅ Les variables d'environnement sont sécurisées dans Vercel
- ⚠️ En développement local, vous pouvez toujours utiliser le serveur email séparé (`email-server/`) si vous le souhaitez

## 🐛 Dépannage

### Erreur : "Configuration serveur email manquante"

Vérifiez que les variables d'environnement sont bien définies dans Vercel (optionnel, valeurs par défaut configurées) :
- `ZOHO_USER` (déjà configuré par défaut : contact@mestoits.com)
- `ZOHO_PASSWORD` (déjà configuré par défaut)

### Erreur 404 sur `/api/send-email`

Vérifiez que :
1. Le fichier `api/send-email.ts` existe bien
2. Les dépendances sont installées (`npm install`)
3. Le projet a été redéployé après l'ajout de la fonction

### Erreur lors de l'envoi d'email

Vérifiez les logs dans Vercel Dashboard → Deployments → Logs pour voir les erreurs détaillées.

