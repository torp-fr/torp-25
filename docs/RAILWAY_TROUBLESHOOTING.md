# Dépannage Migration RNB dans Railway

## 🚨 Problème : Les commandes ont échoué

Si les commandes ont échoué dans Railway, voici les solutions étape par étape.

## 📋 Diagnostic Initial

Exécutez d'abord ce script pour voir exactement ce qui ne va pas :

```sql
-- DIAGNOSTIC COMPLET
SELECT 
  'Migrations RNB:' as type,
  migration_name, 
  started_at, 
  finished_at,
  CASE 
    WHEN finished_at IS NULL THEN '❌ ÉCHOUÉE'
    ELSE '✅ OK'
  END as status
FROM "_prisma_migrations" 
WHERE migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%'
ORDER BY started_at DESC;

-- Tables existantes
SELECT 
  'Tables:' as type,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Enum existant
SELECT 
  'Enum:' as type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status') 
    THEN 'EXISTE'
    ELSE 'N''EXISTE PAS'
  END as status;
```

## 🔧 Solution 1 : Nettoyage Simple (RECOMMANDÉ EN PREMIER)

Utilisez le script simple qui nettoie uniquement les migrations échouées :

**Fichier : `scripts/railway-simple-cleanup.sql`**

Copiez et exécutez dans Railway SQL Editor :

```sql
DELETE FROM "_prisma_migrations" 
WHERE (
  migration_name LIKE '%rnb%' 
  OR migration_name LIKE '%RNB%'
  OR migration_name IN (
    '20250127_add_rnb_models',
    '20250128_add_rnb_models', 
    '20250128_fix_rnb_migration',
    '20250129_resolve_rnb_migration'
  )
)
AND finished_at IS NULL;
```

## 🔧 Solution 2 : Nettoyage Complet (SI SOLUTION 1 NE MARCHE PAS)

Si le nettoyage simple ne suffit pas, utilisez le nettoyage complet qui supprime aussi les tables/objets partiels :

**Fichier : `scripts/railway-complete-cleanup.sql`**

⚠️ **ATTENTION** : Ce script supprime aussi les tables si elles existent déjà (même partiellement).

## 🔧 Solution 3 : Nettoyage Manuel Pas à Pas

Si les scripts automatiques échouent, suivez ces étapes manuelles :

### Étape 1 : Supprimer les migrations échouées

```sql
DELETE FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration',
  '20250129_resolve_rnb_migration'
)
AND finished_at IS NULL;
```

### Étape 2 : Vérifier s'il reste des migrations échouées

```sql
SELECT migration_name 
FROM "_prisma_migrations" 
WHERE finished_at IS NULL
AND (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%');
```

**Si cette requête retourne des lignes**, notez les noms et supprimez-les :

```sql
DELETE FROM "_prisma_migrations" 
WHERE migration_name = 'NOM_DE_LA_MIGRATION'
AND finished_at IS NULL;
```

### Étape 3 : Vérifier et nettoyer les objets partiels

Vérifier si les tables existent :

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');
```

**Si des tables existent**, les supprimer :

```sql
DROP TABLE IF EXISTS "rnb_import_jobs" CASCADE;
DROP TABLE IF EXISTS "rnb_buildings" CASCADE;
```

Vérifier si l'enum existe :

```sql
SELECT typname FROM pg_type WHERE typname = 'rnb_import_status';
```

**Si l'enum existe**, le supprimer :

```sql
DROP TYPE IF EXISTS "rnb_import_status" CASCADE;
```

## ✅ Vérification Finale

Après le nettoyage, exécutez ce script pour vérifier que tout est prêt :

```sql
-- Doit retourner 0 lignes pour les migrations échouées
SELECT COUNT(*) as migrations_echouees
FROM "_prisma_migrations" 
WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
AND finished_at IS NULL;

-- Doit retourver 0 lignes pour les tables
SELECT COUNT(*) as tables_existantes
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Doit retourner 0 lignes pour l'enum
SELECT COUNT(*) as enum_existant
FROM pg_type 
WHERE typname = 'rnb_import_status';
```

**Résultat attendu :** Tous les compteurs doivent être `0`.

## 🚀 Après le Nettoyage

1. ✅ Vérifier que le nettoyage est complet (scripts ci-dessus)
2. ✅ Relancer le déploiement sur Vercel
3. ✅ Vérifier les logs Vercel pour confirmer que la migration `20250129_add_rnb_models` s'applique

## ⚠️ Erreurs Communes

### Erreur : "relation already exists"
**Cause :** Les tables existent déjà partiellement  
**Solution :** Utiliser le script de nettoyage complet qui supprime les tables

### Erreur : "type already exists"
**Cause :** L'enum existe déjà  
**Solution :** Supprimer l'enum avec `DROP TYPE IF EXISTS "rnb_import_status" CASCADE;`

### Erreur : "foreign key constraint"
**Cause :** Des dépendances existent  
**Solution :** Utiliser `CASCADE` lors de la suppression des tables/enums

## 📞 Support

Si rien ne fonctionne :

1. Vérifier les logs Railway pour les erreurs exactes
2. Vérifier que vous avez les permissions nécessaires sur la base
3. Essayer de supprimer manuellement chaque objet un par un

