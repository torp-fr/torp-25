-- ============================================
-- SCRIPT DE NETTOYAGE DES MIGRATIONS RNB ÉCHOUÉES
-- À EXÉCUTER DANS RAILWAY SQL EDITOR
-- ============================================

-- Étape 1: Vérifier l'état actuel
SELECT 
  migration_name, 
  started_at, 
  finished_at,
  CASE 
    WHEN finished_at IS NULL THEN 'EN COURS / ÉCHOUÉE'
    ELSE 'TERMINÉE'
  END as status
FROM "_prisma_migrations" 
WHERE migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%'
ORDER BY started_at DESC;

-- Étape 2: Nettoyer les migrations échouées
DELETE FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration'
)
AND finished_at IS NULL;

-- Étape 3: Vérifier le résultat (doit retourner 0 lignes pour les migrations échouées)
SELECT 
  migration_name, 
  started_at, 
  finished_at
FROM "_prisma_migrations" 
WHERE migration_name IN (
  '20250127_add_rnb_models',
  '20250128_add_rnb_models', 
  '20250128_fix_rnb_migration'
);

-- Étape 4: Vérifier si les tables RNB existent déjà (peut-être créées partiellement)
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
    THEN 'EXISTE' 
    ELSE 'N''EXISTE PAS' 
  END as status
FROM (
  SELECT 'rnb_buildings' as table_name
  UNION ALL
  SELECT 'rnb_import_jobs'
) t;

-- Étape 5: Vérifier si l'enum existe
SELECT 
  typname as enum_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status') 
    THEN 'EXISTE' 
    ELSE 'N''EXISTE PAS' 
  END as status
FROM pg_type 
WHERE typname = 'rnb_import_status'
LIMIT 1;

