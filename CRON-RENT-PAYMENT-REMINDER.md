# Configuration du Cron Job pour les Rappels de Paiement de Loyer

Ce document explique comment configurer le système automatique d'envoi d'emails de rappel de paiement de loyer aux locataires.

## 📋 Fonctionnalité

Le système envoie automatiquement un email aux locataires **10 jours avant l'échéance** de leur paiement de loyer. Le cron job s'exécute quotidiennement à **13h55 UTC** (14h55 heure de Paris en hiver, 15h55 en été).

## 🔧 Configuration

### 1. Variables d'environnement Vercel

Assurez-vous d'avoir les variables d'environnement suivantes configurées dans votre projet Vercel :

1. **Variables existantes** (déjà configurées) :
   - `VITE_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase (pour accéder aux données)
   - `ZOHO_USER` : Email Zoho pour l'envoi d'emails
   - `ZOHO_PASSWORD` : Mot de passe Zoho pour l'envoi d'emails

2. **Nouvelle variable à ajouter** :
   - `CRON_SECRET` : Secret pour sécuriser l'accès au cron job (générez une chaîne aléatoire)

### 2. Configuration du CRON_SECRET

1. Connectez-vous à votre [Dashboard Vercel](https://vercel.com/dashboard)
2. Sélectionnez votre projet `mestoits-v2`
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez une nouvelle variable :
   - **Name** : `CRON_SECRET`
   - **Value** : Générez une chaîne aléatoire sécurisée (ex: `openssl rand -hex 32`)
   - **Environment** : Production (et Preview si vous voulez tester)

### 3. Vérification de la configuration

Le cron job est déjà configuré dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron-rent-payment-reminder",
      "schedule": "0 9 * * *"
    }
  ]
}
```

- **Path** : `/api/cron-rent-payment-reminder`
- **Schedule** : `55 13 * * *` (tous les jours à 13h55 UTC = 14h55 heure de Paris en hiver)

## 📧 Fonctionnement

### Logique de calcul

1. **Récupération des baux actifs** : Le cron job récupère tous les baux avec :
   - `status = 'active'`
   - `payment_due_day` défini (non null)

2. **Calcul de la prochaine échéance** : Pour chaque bail, le système calcule la prochaine date d'échéance basée sur :
   - Le `payment_due_day` (jour du mois, ex: 5 = le 5 de chaque mois)
   - La date actuelle

3. **Vérification des 10 jours** : Le système vérifie si la prochaine échéance est exactement dans **10 jours** à partir d'aujourd'hui.

4. **Envoi de l'email** : Si la condition est remplie, un email est envoyé au locataire avec :
   - Les informations du bien
   - Le montant du loyer
   - La date d'échéance
   - Un lien vers "Mes locations"

### Exemple

- **Date actuelle** : 25 janvier 2026
- **Bail** : `payment_due_day = 5`, `monthly_rent = 50000 FCFA`
- **Prochaine échéance** : 5 février 2026
- **Jours restants** : 11 jours → **Pas d'email**

- **Date actuelle** : 26 janvier 2026
- **Bail** : `payment_due_day = 5`, `monthly_rent = 50000 FCFA`
- **Prochaine échéance** : 5 février 2026
- **Jours restants** : 10 jours → **Email envoyé** ✅

## 🧪 Test du cron job

### Test manuel (local)

Pour tester le cron job localement avant le déploiement :

```bash
# Définir les variables d'environnement
export VITE_PUBLIC_SUPABASE_URL="votre_url_supabase"
export SUPABASE_SERVICE_ROLE_KEY="votre_clé_service_role"
export CRON_SECRET="votre_secret_cron"
export ZOHO_USER="contact@mestoits.com"
export ZOHO_PASSWORD="votre_mot_de_passe"

# Tester avec curl
curl -X GET http://localhost:3000/api/cron-rent-payment-reminder \
  -H "Authorization: Bearer votre_secret_cron"
```

### Test en production

1. **Via Vercel Dashboard** :
   - Allez dans **Deployments** → Sélectionnez votre dernier déploiement
   - Cliquez sur **Functions** → Trouvez `cron-rent-payment-reminder`
   - Cliquez sur **Invoke** pour déclencher manuellement le cron job

2. **Via l'API** :
   ```bash
   curl -X GET https://mestoits-v2.vercel.app/api/cron-rent-payment-reminder \
     -H "Authorization: Bearer votre_CRON_SECRET"
   ```

## 📊 Logs et monitoring

Les logs du cron job sont disponibles dans :
- **Vercel Dashboard** → **Deployments** → **Functions** → `cron-rent-payment-reminder` → **Logs`

Le cron job log :
- ✅ Le nombre de baux traités
- ✅ Le nombre d'emails envoyés avec succès
- ❌ Les erreurs éventuelles
- ⚠️ Les avertissements (locataire sans email, propriété introuvable, etc.)

## 🔒 Sécurité

Le cron job est sécurisé via :
- **Authentification Bearer Token** : Seules les requêtes avec le bon `CRON_SECRET` sont acceptées
- **Vercel Cron** : Les requêtes automatiques de Vercel incluent automatiquement le header d'autorisation

## ⚙️ Personnalisation

### Modifier le nombre de jours avant l'échéance

Pour changer de 10 jours à un autre nombre (ex: 7 jours), modifiez dans `api/cron-rent-payment-reminder.ts` :

```typescript
// Ligne ~40
const targetDate = new Date(today);
targetDate.setDate(today.getDate() + 7); // Au lieu de 10
```

Et dans les fonctions `buildPaymentReminderEmail` et `buildPaymentReminderEmailText`, changez `daysUntilDue: 10` en `daysUntilDue: 7`.

### Modifier l'heure d'exécution

Pour changer l'heure d'exécution, modifiez dans `vercel.json` :

```json
{
  "crons": [
    {
      "path": "/api/cron-rent-payment-reminder",
      "schedule": "0 8 * * *"  // 8h00 UTC au lieu de 9h00
    }
  ]
}
```

Format cron : `minute heure jour mois jour-semaine`
- `0 9 * * *` = Tous les jours à 9h00 UTC
- `0 8 * * *` = Tous les jours à 8h00 UTC
- `0 10 * * 1` = Tous les lundis à 10h00 UTC

## 🐛 Dépannage

### Le cron job ne s'exécute pas

1. Vérifiez que `CRON_SECRET` est défini dans Vercel
2. Vérifiez que le cron job est bien configuré dans `vercel.json`
3. Vérifiez les logs dans Vercel Dashboard

### Les emails ne sont pas envoyés

1. Vérifiez que `ZOHO_USER` et `ZOHO_PASSWORD` sont corrects
2. Vérifiez que les locataires ont bien un email dans la table `tenants`
3. Vérifiez que les baux ont bien `payment_due_day` défini
4. Vérifiez les logs pour voir les erreurs spécifiques

### Erreur "Unauthorized"

- Vérifiez que `CRON_SECRET` est correctement défini dans Vercel
- Vérifiez que le header `Authorization: Bearer <CRON_SECRET>` est présent dans la requête

## 📝 Notes importantes

- Le cron job vérifie uniquement les baux avec `status = 'active'`
- Le cron job ignore les baux sans `payment_due_day` défini
- Le cron job vérifie que le bail n'est pas expiré avant d'envoyer l'email
- Les emails sont envoyés via le même système que les autres emails du site (Zoho SMTP)

## 🔄 Déploiement

Après avoir ajouté `CRON_SECRET` dans Vercel :

1. **Redéployez** votre application sur Vercel
2. Le cron job sera automatiquement activé
3. Il s'exécutera tous les jours à 13h55 UTC (14h55 heure de Paris en hiver)

---

**Date de création** : 1er février 2026  
**Dernière mise à jour** : 1er février 2026
