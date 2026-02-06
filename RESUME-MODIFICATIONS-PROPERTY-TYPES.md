# Résumé des Modifications - Table property_types

## Date : 2026-02-02

## ✅ Modifications Effectuées

### 1. **Création de la table `property_types`**
- Table créée avec tous les champs nécessaires
- 9 types de biens insérés avec leurs configurations
- Migration SQL créée : `migration-create-property-types-table.sql`

### 2. **Hook `usePropertyTypes` créé**
- Fichier : `src/hooks/usePropertyTypes.ts`
- Charge les types depuis la base de données
- Fournit des fonctions utilitaires :
  - `getPropertyTypeLabel(code)` : Obtenir le libellé
  - `getPropertyTypeIcon(code)` : Obtenir l'icône
  - `isOfferTypeAllowed(propertyTypeCode, offerType)` : Vérifier si un type d'offre est autorisé

### 3. **Fichiers modifiés pour utiliser le hook**

#### ✅ Fichiers mis à jour :
- `src/pages/deposer-annonce/components/BasicInfoStep.tsx`
- `src/pages/deposer-annonce/components/PropertyDetailsStep.tsx`
- `src/pages/recherche-biens/components/FiltersModal.tsx`
- `src/pages/recherche-biens/components/PropertyCard.tsx`
- `src/pages/recherche-biens/page.tsx`
- `src/pages/bien-detail/page.tsx`
- `src/pages/bien-detail/components/PriceComparison.tsx`
- `src/pages/bien-detail/components/SimilarProperties.tsx` (déjà avec status='active')
- `src/pages/favoris/page.tsx`
- `src/pages/rental-management/components/PropertiesTab.tsx`
- `src/pages/professionnel-detail/page.tsx` (déjà avec status='active')
- `src/pages/carte-prix/page.tsx`

### 4. **Filtre `status='active'` ajouté**

Les requêtes suivantes filtrent maintenant uniquement les biens actifs :

- ✅ `recherche-biens/page.tsx` - ligne 140
- ✅ `home/components/LatestListingsSection.tsx` - ligne 50
- ✅ `bien-detail/components/SimilarProperties.tsx` - ligne 40
- ✅ `professionnel-detail/page.tsx` - ligne 156

**Note** : Les pages de gestion locative (`rental-management`) affichent TOUS les biens (y compris les brouillons) car c'est la gestion du propriétaire.

### 5. **Code inutile supprimé**

Tous les mappings codés en dur (`propertyTypeLabels`, `propertyTypes`) ont été remplacés par l'utilisation du hook `usePropertyTypes`.

## 📋 Structure de la table `property_types`

```sql
CREATE TABLE property_types (
    id UUID PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,              -- 'apartment', 'villa', etc.
    label TEXT NOT NULL,                     -- 'Appartement', 'Villa', etc.
    icon TEXT NOT NULL,                      -- 'ri-building-line', etc.
    offer_types TEXT[] NOT NULL,             -- ['sale', 'rental'] ou ['sale'] uniquement
    requires_surface BOOLEAN DEFAULT TRUE,
    requires_bedrooms BOOLEAN DEFAULT TRUE,
    requires_bathrooms BOOLEAN DEFAULT TRUE,
    allows_villa_type BOOLEAN DEFAULT FALSE, -- Pour les villas uniquement
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

## 📊 Types de biens insérés

1. **Villa** (`villa`) - Vente et Location - Permet villa_type
2. **Appartement** (`apartment`) - Vente et Location
3. **Résidence-meublé** (`furnished-residence`) - Location uniquement
4. **Maison** (`house`) - Vente et Location
5. **Immeuble** (`building`) - Vente et Location
6. **Commerce** (`commercial`) - Vente et Location
7. **Terrain** (`land`) - Vente uniquement
8. **Bureau** (`office`) - Vente et Location
9. **Parking** (`parking`) - Vente et Location

## 🔄 Migration de la base de données

### Étape 1 : Créer la table et insérer les données
Exécuter : `migration-create-property-types-table.sql`

### Étape 2 : Mettre à jour la contrainte de properties
La contrainte CHECK est remplacée par une FOREIGN KEY vers `property_types`

## ⚠️ Points d'attention

1. **Migration des données existantes** : Les biens existants avec `property_type = 'furnished-apartment'` doivent être mis à jour vers `'furnished-residence'` (déjà fait dans migration-add-new-property-types.sql)

2. **Filtre status='active'** : 
   - ✅ Appliqué pour les affichages publics
   - ❌ NON appliqué pour les pages de gestion (propriétaire doit voir tous ses biens)

3. **Carte des prix** : Utilise une table différente (`table_globale`) avec des noms différents, le mapping est géré dans le code

## 🎯 Avantages

1. **Centralisation** : Un seul endroit pour gérer les types de biens
2. **Flexibilité** : Facile d'ajouter/modifier/supprimer des types
3. **Cohérence** : Tous les labels sont identiques partout
4. **Maintenabilité** : Plus besoin de mettre à jour plusieurs fichiers
5. **Validation** : La FOREIGN KEY garantit l'intégrité des données

## 📝 Prochaines étapes recommandées

1. Exécuter la migration SQL dans Supabase
2. Tester l'application pour vérifier que tous les types s'affichent correctement
3. Vérifier que le filtre status='active' fonctionne partout
4. Ajouter des types supplémentaires si nécessaire directement dans la table
