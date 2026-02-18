# Migrations requises pour les baux (leases)

En cas d'erreur **400** lors de la création ou du chargement des baux, exécuter les migrations suivantes dans l'ordre (Supabase SQL Editor) :

1. **migration-add-property-02-id-to-leases.sql**
   - Ajoute `property_02_id`
   - Rend `property_id` nullable

2. **migration-add-contract-articles-to-leases.sql**
   - Ajoute la colonne `contract_articles` (JSONB)
