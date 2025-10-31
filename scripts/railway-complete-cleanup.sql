-- ============================================
-- NETTOYAGE COMPLET ET ROBUSTE POUR MIGRATION RNB
-- À EXÉCUTER DANS RAILWAY SQL EDITOR
-- ============================================
-- Ce script nettoie TOUT ce qui concerne les migrations RNB échouées
-- et prépare la base pour la nouvelle migration propre
-- ============================================

-- ============================================
-- ÉTAPE 1: DIAGNOSTIC COMPLET
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== DIAGNOSTIC AVANT NETTOYAGE ===';
END $$;

-- Afficher toutes les migrations RNB
SELECT 
  'Migrations RNB trouvées:' as info,
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

-- Vérifier les tables
SELECT 
  'Tables RNB existantes:' as info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Vérifier l'enum
SELECT 
  'Enum RNB:' as info,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status') 
    THEN 'EXISTE'
    ELSE 'N''EXISTE PAS'
  END as status;

-- Vérifier les index
SELECT 
  'Index RNB existants:' as info,
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('rnb_buildings', 'rnb_import_jobs');

-- ============================================
-- ÉTAPE 2: NETTOYAGE COMPLET
-- ============================================
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '=== DÉBUT DU NETTOYAGE ===';
  
  -- 1. Supprimer TOUTES les migrations RNB échouées (avec plusieurs patterns)
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
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✓ Migrations échouées supprimées: %', deleted_count;
  
  -- 2. Supprimer les tables si elles existent (en cascade pour les dépendances)
  DROP TABLE IF EXISTS "rnb_import_jobs" CASCADE;
  RAISE NOTICE '✓ Table rnb_import_jobs nettoyée';
  
  DROP TABLE IF EXISTS "rnb_buildings" CASCADE;
  RAISE NOTICE '✓ Table rnb_buildings nettoyée';
  
  -- 3. Supprimer l'enum si il existe (doit être fait après les tables)
  -- Note: On utilise DO $$ pour gérer l'erreur si l'enum n'existe pas
  BEGIN
    DROP TYPE "rnb_import_status" CASCADE;
    RAISE NOTICE '✓ Enum rnb_import_status nettoyé';
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'ℹ Enum rnb_import_status n''existait pas (OK)';
  END;
  
  -- 4. Supprimer les index orphelins si ils existent encore
  -- (normalement supprimés avec les tables, mais on vérifie)
  -- Les index sont automatiquement supprimés avec les tables en CASCADE
  
  RAISE NOTICE '=== NETTOYAGE TERMINÉ ===';
END $$;

-- ============================================
-- ÉTAPE 3: VÉRIFICATION POST-NETTOYAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== VÉRIFICATION POST-NETTOYAGE ===';
END $$;

-- Vérifier qu'il n'y a plus de migrations échouées
SELECT 
  'Résultat nettoyage migrations:' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Aucune migration échouée restante'
    ELSE '⚠️ ' || COUNT(*) || ' migration(s) encore en échec'
  END as status,
  string_agg(migration_name, ', ') as migrations_restantes
FROM "_prisma_migrations" 
WHERE (
  migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%'
  OR migration_name IN (
    '20250127_add_rnb_models',
    '20250128_add_rnb_models', 
    '20250128_fix_rnb_migration',
    '20250129_resolve_rnb_migration'
  )
)
AND finished_at IS NULL;

-- Vérifier que les tables sont bien supprimées
SELECT 
  'État des tables RNB:' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Aucune table RNB (prêt pour nouvelle migration)'
    ELSE '⚠️ ' || COUNT(*) || ' table(s) encore existante(s): ' || string_agg(table_name, ', ')
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs');

-- Vérifier que l'enum est bien supprimé
SELECT 
  'État de l''enum:' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Enum absent (prêt pour nouvelle migration)'
    ELSE '⚠️ Enum existe encore'
  END as status
FROM pg_type 
WHERE typname = 'rnb_import_status';

-- ============================================
-- ÉTAPE 4: VÉRIFIER L'ÉTAT GÉNÉRAL DES MIGRATIONS
-- ============================================
SELECT 
  '=== ÉTAT GLOBAL DES MIGRATIONS ===' as info;

SELECT 
  migration_name,
  started_at,
  finished_at,
  CASE 
    WHEN finished_at IS NULL THEN 'EN COURS'
    ELSE 'TERMINÉE'
  END as status
FROM "_prisma_migrations"
WHERE finished_at IS NULL
ORDER BY started_at DESC
LIMIT 10;

-- ============================================
-- MESSAGE FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=== ✅ NETTOYAGE TERMINÉ ===';
  RAISE NOTICE '💡 Vous pouvez maintenant relancer le déploiement sur Vercel';
  RAISE NOTICE '   La migration 20250129_add_rnb_models devrait s''appliquer correctement';
END $$;

