# Dépannage : Erreur "Database error saving new user" lors de l'inscription

## Problème
L'erreur `AuthApiError: Database error saving new user` se produit lors de l'inscription d'un nouvel utilisateur.

## Causes possibles

### 1. Problème avec le trigger `set_affiliation_code()`
Le trigger qui génère automatiquement un code d'affiliation pourrait causer un timeout ou une boucle infinie.

**Solution :**
Exécutez la migration `migration-fix-affiliation-code-generation.sql` qui améliore la fonction de génération de code avec :
- Une limite de tentatives (100 max)
- Une gestion d'erreurs avec fallback
- Une meilleure génération de codes uniques

```sql
-- Exécuter dans Supabase SQL Editor
\i migration-fix-affiliation-code-generation.sql
```

### 2. Contrainte UNIQUE sur `affiliation_code`
Si deux utilisateurs s'inscrivent simultanément et génèrent le même code, cela peut causer une erreur.

**Solution :**
La migration ci-dessus résout ce problème en améliorant la génération de codes et en ajoutant une gestion d'erreurs.

### 3. Contrainte de clé étrangère sur `affiliated_by`
Si le code d'affiliation référencé pointe vers un utilisateur qui n'existe pas ou qui a été supprimé.

**Solution :**
Le code d'inscription vérifie maintenant que l'utilisateur référencé existe avant de définir `affiliated_by`.

### 4. Trigger Supabase automatique
Supabase pourrait avoir un trigger configuré dans le dashboard qui crée automatiquement un profil dans `users_2025_12_01_11_29`.

**Vérification :**
1. Allez dans Supabase Dashboard > Database > Functions
2. Vérifiez s'il y a des fonctions liées à `auth.users` ou `users_2025_12_01_11_29`
3. Allez dans Database > Triggers
4. Vérifiez s'il y a des triggers sur `auth.users`

**Solution :**
Si un trigger automatique existe et cause des problèmes, vous pouvez :
- Le désactiver temporairement
- Le modifier pour gérer les erreurs correctement
- Utiliser une Edge Function Supabase à la place

## Étapes de dépannage

1. **Exécuter la migration SQL :**
   ```bash
   # Dans Supabase SQL Editor
   # Copier-coller le contenu de migration-fix-affiliation-code-generation.sql
   ```

2. **Vérifier les logs Supabase :**
   - Allez dans Supabase Dashboard > Logs > Postgres Logs
   - Recherchez les erreurs récentes lors de l'inscription
   - Notez les messages d'erreur détaillés

3. **Tester l'inscription :**
   - Essayez de créer un compte sans code d'affiliation
   - Essayez avec un code d'affiliation valide
   - Essayez avec un code d'affiliation invalide

4. **Vérifier les contraintes de la table :**
   ```sql
   SELECT 
     conname AS constraint_name,
     contype AS constraint_type,
     pg_get_constraintdef(oid) AS constraint_definition
   FROM pg_constraint
   WHERE conrelid = 'users_2025_12_01_11_29'::regclass;
   ```

5. **Vérifier les triggers :**
   ```sql
   SELECT 
     trigger_name,
     event_manipulation,
     event_object_table,
     action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'users_2025_12_01_11_29';
   ```

## Solution temporaire

Si le problème persiste, vous pouvez temporairement désactiver le trigger :

```sql
-- Désactiver le trigger temporairement
ALTER TABLE users_2025_12_01_11_29 DISABLE TRIGGER trigger_set_affiliation_code;

-- Après résolution du problème, le réactiver
ALTER TABLE users_2025_12_01_11_29 ENABLE TRIGGER trigger_set_affiliation_code;
```

## Contact

Si le problème persiste après avoir suivi ces étapes, vérifiez :
- Les logs Supabase pour des erreurs détaillées
- La configuration des triggers dans le dashboard Supabase
- Les contraintes de la base de données
