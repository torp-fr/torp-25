# Migration Building Profile Role - Instructions

## Description
Cette migration ajoute le système propriétaire/locataire avec unicité par bien pour les cartes d'identité.

## Prérequis
- Variable d'environnement `DATABASE_URL` configurée
- Accès à la base de données PostgreSQL en production

## Méthode 1 : Via Prisma Migrate (Recommandé)

```bash
# Appliquer toutes les migrations en attente
npx prisma migrate deploy

# Vérifier le statut des migrations
npx prisma migrate status

# Régénérer le client Prisma
npx prisma generate
```

## Méthode 2 : Via SQL direct

Si Prisma migrate ne fonctionne pas, vous pouvez exécuter directement le fichier SQL :

```bash
# Avec psql
psql $DATABASE_URL -f prisma/migrations/20250131_add_building_profile_role/migration.sql

# Ou avec Railway CLI
railway run psql $DATABASE_URL -f prisma/migrations/20250131_add_building_profile_role/migration.sql
```

## Vérification Post-Migration

1. **Vérifier l'enum** :
```sql
SELECT unnest(enum_range(NULL::building_profile_role));
```

2. **Vérifier les colonnes** :
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'building_profiles' 
  AND column_name IN ('role', 'parent_profile_id', 'lot_number', 'tenant_data');
```

3. **Vérifier l'index unique** :
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'building_profiles' 
  AND indexname = 'building_profiles_unique_proprietaire_per_bien_idx';
```

4. **Vérifier les données existantes** :
```sql
SELECT role, COUNT(*) 
FROM building_profiles 
GROUP BY role;
```

## Rollback (si nécessaire)

Si vous devez annuler cette migration :

```sql
-- Supprimer les contraintes et index
DROP INDEX IF EXISTS building_profiles_unique_proprietaire_per_bien_idx;
DROP INDEX IF EXISTS building_profiles_parent_profile_id_idx;
ALTER TABLE building_profiles DROP CONSTRAINT IF EXISTS building_profiles_parent_profile_id_fkey;

-- Supprimer les colonnes
ALTER TABLE building_profiles 
  DROP COLUMN IF EXISTS tenant_data,
  DROP COLUMN IF EXISTS lot_number,
  DROP COLUMN IF EXISTS parent_profile_id,
  DROP COLUMN IF EXISTS role;

-- Supprimer l'enum
DROP TYPE IF EXISTS building_profile_role;
```

## Notes
- Les cartes existantes seront automatiquement converties en `PROPRIETAIRE`
- La migration est idempotente (peut être exécutée plusieurs fois sans erreur)
- Les valeurs NULL pour `lot_number` sont gérées avec COALESCE dans l'index unique

