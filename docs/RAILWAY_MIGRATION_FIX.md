# Fix Migration RNB via Railway - Guide Complet

## 🎯 Objectif

Nettoyer les migrations RNB échouées dans la base de données Railway pour permettre le déploiement de la nouvelle migration `20250129_add_rnb_models`.

## 🔍 Option 1 : Script SQL Direct dans Railway (RECOMMANDÉ)

### Étape 1 : Ouvrir Railway SQL Editor

1. Aller sur [Railway Dashboard](https://railway.app)
2. Sélectionner votre projet PostgreSQL
3. Cliquer sur l'onglet **"Query"** ou **"Connect"** 
4. Ouvrir l'éditeur SQL intégré

### Étape 2 : Exécuter le Script de Diagnostic

Copier et exécuter ce script pour voir l'état actuel :

```sql
-- DIAGNOSTIC : Vérifier l'état des migrations RNB
SELECT 
  migration_name, 
  started_at, 
  finished_at,
  CASE 
    WHEN finished_at IS NULL THEN '❌ ÉCHOUÉE'
    ELSE '✅ TERMINÉE'
  END as status
FROM "_prisma_migrations" 
WHERE migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%'
ORDER BY started_at DESC;
```

### Étape 3 : Nettoyer les Migrations Échouées

Copier et exécuter ce script pour nettoyer :

```sql
-- NETTOYAGE : Supprimer les migrations RNB échouées
DELETE FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration'
)
AND finished_at IS NULL;

-- Vérifier le résultat (doit retourner 0 lignes)
SELECT migration_name, started_at, finished_at
FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration'
)
AND finished_at IS NULL;
```

### Étape 4 : Vérifier l'État des Tables

```sql
-- Vérifier si les tables RNB existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Vérifier si l'enum existe
SELECT typname FROM pg_type WHERE typname = 'rnb_import_status';
```

**Résultat attendu après nettoyage :**
- ✅ Les migrations échouées sont supprimées de `_prisma_migrations`
- ✅ Les tables `rnb_buildings` et `rnb_import_jobs` n'existent PAS encore (seront créées par la nouvelle migration)
- ✅ L'enum `rnb_import_status` n'existe PAS encore (sera créé par la nouvelle migration)

## 🛠️ Option 2 : Utiliser les Scripts Locaux (avec DATABASE_URL)

Si vous avez `DATABASE_URL` configuré localement dans un fichier `.env.local` :

### Diagnostic

```bash
npm run db:diagnose
```

### Correction Automatique

```bash
npm run db:fix-failed
```

**Note :** Ces scripts nécessitent `DATABASE_URL` dans votre environnement local.

## 🚀 Après le Nettoyage

Une fois le nettoyage effectué :

1. ✅ **Vérifier** que les migrations échouées ont été supprimées
2. ✅ **Relancer le déploiement** sur Vercel
3. ✅ **Vérifier** que la migration `20250129_add_rnb_models` s'applique correctement

## 📋 Checklist Post-Déploiement

Après le déploiement réussi, vérifier dans Railway :

```sql
-- Vérifier que la nouvelle migration est appliquée
SELECT migration_name, started_at, finished_at
FROM "_prisma_migrations" 
WHERE migration_name = '20250129_add_rnb_models';

-- Vérifier que les tables sont créées
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Vérifier que l'enum existe
SELECT typname, typtype 
FROM pg_type 
WHERE typname = 'rnb_import_status';
```

## ⚠️ En Cas de Problème

Si la migration échoue encore :

1. Vérifier les logs Vercel pour l'erreur exacte
2. Vérifier que le nettoyage a bien été effectué (script de diagnostic)
3. Si nécessaire, nettoyer manuellement toutes les migrations RNB :

```sql
-- NETTOYAGE COMPLET (ATTENTION : à utiliser avec précaution)
DELETE FROM "_prisma_migrations" 
WHERE migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%'
AND finished_at IS NULL;

-- Supprimer les tables/objets partiels si nécessaire
DROP TABLE IF EXISTS "rnb_import_jobs" CASCADE;
DROP TABLE IF EXISTS "rnb_buildings" CASCADE;
DROP TYPE IF EXISTS "rnb_import_status" CASCADE;
```

Puis relancer le déploiement.

