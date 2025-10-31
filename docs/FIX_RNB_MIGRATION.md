# Résolution de la Migration RNB Échouée

## Problème
La migration `20250128_add_rnb_models` a échoué et Prisma bloque toutes les nouvelles migrations tant que l'état n'est pas résolu.

## Solution : Nettoyage Manuel via Railway

### Étape 1 : Se connecter à PostgreSQL Railway

1. Aller sur [Railway Dashboard](https://railway.app)
2. Sélectionner votre projet PostgreSQL
3. Cliquer sur "Query" ou "Connect" pour ouvrir l'éditeur SQL

### Étape 2 : Exécuter le Script de Nettoyage

Exécuter ce script SQL dans l'éditeur Railway :

```sql
-- Nettoyer les migrations RNB échouées de la table _prisma_migrations
DELETE FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration'
)
AND finished_at IS NULL;
```

### Étape 3 : Vérifier le Nettoyage

Vérifier que les migrations échouées ont été supprimées :

```sql
-- Vérifier les migrations RNB restantes
SELECT migration_name, started_at, finished_at 
FROM "_prisma_migrations" 
WHERE migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%'
ORDER BY started_at DESC;
```

### Étape 4 : Vérifier l'État Actuel des Tables

Vérifier si les tables RNB existent déjà (peuvent avoir été créées partiellement) :

```sql
-- Vérifier si les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Vérifier si l'enum existe
SELECT typname FROM pg_type WHERE typname = 'rnb_import_status';
```

### Étape 5 : Relancer le Déploiement

Après le nettoyage, relancer le déploiement sur Vercel. La nouvelle migration `20250129_add_rnb_models` devrait s'appliquer correctement.

## Alternative : Utiliser Prisma Migrate Resolve (si disponible)

Si vous avez accès CLI avec DATABASE_URL :

```bash
# Résoudre manuellement chaque migration échouée
npx prisma migrate resolve --applied 20250128_add_rnb_models
npx prisma migrate resolve --applied 20250127_add_rnb_models
npx prisma migrate resolve --applied 20250128_fix_rnb_migration

# Puis déployer
npx prisma migrate deploy
```

## Vérification Post-Migration

Après le déploiement réussi, vérifier que tout est en place :

```sql
-- Vérifier que les tables sont créées
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Vérifier l'enum
SELECT typname, typtype 
FROM pg_type 
WHERE typname = 'rnb_import_status';

-- Vérifier les index
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('rnb_buildings', 'rnb_import_jobs');
```

## Résultat Attendu

Après le nettoyage et le déploiement, vous devriez avoir :

✅ Table `rnb_buildings` créée avec tous ses champs et index  
✅ Table `rnb_import_jobs` créée avec tous ses champs et index  
✅ Enum `rnb_import_status` créé  
✅ Migration `20250129_add_rnb_models` marquée comme appliquée dans `_prisma_migrations`

