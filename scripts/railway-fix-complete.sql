-- ============================================
-- SCRIPT COMPLET DE FIX MIGRATION RNB POUR RAILWAY
-- ============================================
-- Copier ce script dans l'éditeur SQL Railway et exécuter section par section
-- ============================================

-- ============================================
-- SECTION 1: DIAGNOSTIC
-- ============================================
-- Exécuter cette section pour voir l'état actuel

SELECT 
  '=== DIAGNOSTIC DES MIGRATIONS RNB ===' as info;

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

SELECT 
  '=== ÉTAT DES TABLES RNB ===' as info;

SELECT table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t.table_name
    ) THEN 'EXISTE'
    ELSE 'N''EXISTE PAS'
  END as status
FROM (
  SELECT 'rnb_buildings' as table_name
  UNION ALL
  SELECT 'rnb_import_jobs'
) t;

SELECT 
  '=== ÉTAT DE L''ENUM ===' as info;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status') 
    THEN 'EXISTE'
    ELSE 'N''EXISTE PAS'
  END as status;

-- ============================================
-- SECTION 2: NETTOYAGE
-- ============================================
-- Exécuter cette section pour nettoyer les migrations échouées

SELECT 
  '=== NETTOYAGE DES MIGRATIONS ÉCHOUÉES ===' as info;

DELETE FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration'
)
AND finished_at IS NULL;

-- Vérifier le résultat (doit retourner 0 lignes)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Nettoyage réussi'
    ELSE '⚠️ ' || COUNT(*) || ' migration(s) encore en échec'
  END as result
FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration'
)
AND finished_at IS NULL;

-- ============================================
-- SECTION 3: NETTOYAGE COMPLET (SI NÉCESSAIRE)
-- ============================================
-- ATTENTION : Cette section supprime aussi les tables/objets partiels
-- À utiliser uniquement si les sections précédentes ne suffisent pas

-- Décommenter et exécuter si nécessaire :
/*
SELECT 
  '=== NETTOYAGE COMPLET ===' as info;

-- Supprimer les migrations échouées
DELETE FROM "_prisma_migrations" 
WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
AND finished_at IS NULL;

-- Supprimer les tables si elles existent partiellement
DROP TABLE IF EXISTS "rnb_import_jobs" CASCADE;
DROP TABLE IF EXISTS "rnb_buildings" CASCADE;

-- Supprimer l'enum si il existe partiellement
DROP TYPE IF EXISTS "rnb_import_status" CASCADE;

SELECT '✅ Nettoyage complet terminé' as result;
*/

-- ============================================
-- SECTION 4: VÉRIFICATION FINALE
-- ============================================
-- Exécuter cette section après le nettoyage pour vérifier l'état

SELECT 
  '=== VÉRIFICATION FINALE ===' as info;

-- Vérifier qu'il n'y a plus de migrations échouées
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Aucune migration échouée'
    ELSE '⚠️ ' || COUNT(*) || ' migration(s) encore en échec'
  END as status_migrations
FROM "_prisma_migrations" 
WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
AND finished_at IS NULL;

-- Vérifier l'état des tables (devraient être absentes après nettoyage complet)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Tables absentes (prêtes pour nouvelle migration)'
    ELSE '⚠️ ' || COUNT(*) || ' table(s) existante(s)'
  END as status_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Vérifier l'enum (devrait être absent après nettoyage complet)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Enum absent (prêt pour nouvelle migration)'
    ELSE '⚠️ Enum existe déjà'
  END as status_enum
FROM pg_type 
WHERE typname = 'rnb_import_status';

SELECT 
  '=== FIN DU SCRIPT ===' as info;
SELECT 
  '💡 Vous pouvez maintenant relancer le déploiement sur Vercel' as next_step;

