# Guide d'exécution du script create-properties.js

## 📋 Objectif

Créer 100 annonces immobilières fictives mais réalistes dans la base de données Supabase.

## 📊 Répartition des annonces

- **35 villas** (Location / Vente)
- **20 terrains** (Vente uniquement)
- **30 appartements** (Location / Vente)
- **15 appartements meublés** (Location uniquement)

**Total : 100 annonces**

## 🏙️ Villes concernées

Les annonces seront réparties dans ces quartiers d'Abidjan :
- Cocody, Marcory, Port-bouet, Treichville, Yopougon
- Abobo, Adjame, Bingerville, Assinie, Koumassi
- Grand-bassam, Jacqueville, Le plateau, Songon, Vridi

## 🖼️ Images

Chaque annonce contiendra 3 images sélectionnées aléatoirement parmi ces IDs :
- 8ddc4a32-9cb4-47fc-89ae-ed15cb2b9a2d
- 4f7c3a80-a5d0-48ab-9f9b-05b104493df4
- dcc8785c-bfc4-47b1-8fe2-81997803a916
- cae3f090-26a8-4a74-8ba9-be1122cb6f10
- 0c3cc7b7-ec46-401b-a7d1-010f3bf019f0
- 84930a9a-a59f-411b-8a59-759824f31f84
- eb6b02f3-0d0c-4242-bad3-1c1d249b20d5

**⚠️ Important :** Assurez-vous que ces images existent dans votre bucket Supabase Storage `property-images` avant d'exécuter le script.

## 🚀 Prérequis

1. ✅ Node.js installé
2. ✅ Les comptes professionnels créés (agences et agents immobiliers)
3. ✅ Les images uploadées dans Supabase Storage
4. ✅ Clé `SUPABASE_SERVICE_ROLE_KEY` disponible

## 📝 Étapes d'exécution

### 1. Vérifier que les professionnels existent

Le script récupère automatiquement les IDs des professionnels avec ces emails :
- agence1@mestoits.com à agence5@mestoits.com
- agent1@mestoits.com, agent2@mestoits.com

Si ces comptes n'existent pas, créez-les d'abord avec le script `create-professional-accounts.js`.

### 2. Configurer les variables d'environnement

```bash
export SUPABASE_URL="https://lvbttyjfagghxyxrxqkk.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="votre_clé_service_role"
```

### 3. Vérifier les images dans Supabase Storage

1. Allez dans Supabase Dashboard → Storage
2. Créez un bucket `property-images` si nécessaire
3. Uploadez les images avec les noms correspondant aux IDs :
   - `8ddc4a32-9cb4-47fc-89ae-ed15cb2b9a2d.jpg`
   - `4f7c3a80-a5d0-48ab-9f9b-05b104493df4.jpg`
   - etc.

**OU** modifiez la fonction `getRandomImages()` dans le script pour utiliser vos propres URLs d'images.

### 4. Exécuter le script

```bash
node create-properties.js
```

## 📊 Résultat attendu

Le script affichera :

```
🚀 Création de 100 annonces immobilières...

✅ 7 professionnels trouvés

✅ Lot 1: 10 annonces créées
✅ Lot 2: 10 annonces créées
...

═══════════════════════════════════════════════════════
📊 RÉSUMÉ
═══════════════════════════════════════════════════════
✅ Annonces créées avec succès: 100
❌ Erreurs: 0
📧 Total: 100

📋 Répartition:
   - 35 villas (Location / Vente)
   - 20 terrains (Vente)
   - 30 appartements (Location / Vente)
   - 15 appartements meublés (Location)
═══════════════════════════════════════════════════════
```

## 🔍 Vérification

Après l'exécution, vérifiez les annonces créées :

1. **Via Supabase Dashboard**
   - Allez dans Table Editor → `properties`
   - Filtrez par `offered_by = 'professional'`
   - Vous devriez voir 100 annonces

2. **Via SQL**
   ```sql
   SELECT 
     property_type,
     offer_type,
     city,
     COUNT(*) as count
   FROM properties
   WHERE offered_by = 'professional'
   GROUP BY property_type, offer_type, city
   ORDER BY property_type, offer_type;
   ```

3. **Via l'application**
   - Allez sur la page de recherche de biens
   - Les annonces devraient apparaître dans les résultats

## ⚠️ Erreurs courantes

### "Aucun professionnel trouvé"
- Vérifiez que les comptes professionnels sont créés
- Exécutez d'abord `create-professional-accounts.js`

### Erreur sur les images
- Vérifiez que les images existent dans Supabase Storage
- Modifiez la fonction `getRandomImages()` pour utiliser vos URLs

### Erreur de contrainte CHECK
- Vérifiez que les valeurs correspondent aux contraintes de la table
- Exemple : `offer_type` doit être 'sale' ou 'rental'

### Erreur de clé étrangère (owner_id)
- Vérifiez que les IDs des professionnels sont corrects
- Le script récupère automatiquement les IDs depuis la base

## 🎯 Caractéristiques des annonces générées

### Villas
- 4 à 6 chambres
- 200 à 400 m²
- Prix : 250k à 800k FCFA/m² (vente) ou 1500 à 5000 FCFA/m²/mois (location)
- Avec jardin, piscine, garage

### Terrains
- 300 à 800 m²
- Prix : 50k à 300k FCFA/m²
- Titre foncier inclus

### Appartements
- 1 à 3 chambres
- 50 à 130 m²
- Prix : 200k à 600k FCFA/m² (vente) ou 1200 à 4000 FCFA/m²/mois (location)

### Appartements meublés
- 1 à 2 chambres
- 40 à 100 m²
- Entièrement équipés et meublés
- Location uniquement

## 📝 Notes

- Les prix sont calculés automatiquement selon la surface et la ville
- Les descriptions sont générées de manière réaliste
- Les features sont sélectionnées aléatoirement
- Les vues et favoris sont générés aléatoirement pour rendre les annonces plus réalistes

