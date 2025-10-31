-- ============================================
-- VÉRIFICATION RAPIDE DE L'ÉTAT RAILWAY
-- Exécutez ce script dans Railway SQL Editor
-- ============================================

-- 1. VÉRIFIER LES MIGRATIONS RNB
SELECT 
  '=== MIGRATIONS RNB ===' as section,
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

-- 2. COMPTER LES MIGRATIONS ÉCHOUÉES
SELECT 
  '=== COMPTEUR MIGRATIONS ÉCHOUÉES ===' as section,
  COUNT(*) as migrations_echouees,
  string_agg(migration_name, ', ') as liste_migrations
FROM "_prisma_migrations" 
WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
AND finished_at IS NULL;

-- 3. VÉRIFIER LES TABLES
SELECT 
  '=== TABLES RNB ===' as section,
  table_name,
  'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
ORDER BY table_name;

-- Si aucune table, afficher message
SELECT 
  '=== TABLES RNB ===' as section,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
    ) THEN 'AUCUNE TABLE (OK - prêt pour migration)'
    ELSE 'Tables trouvées ci-dessus'
  END as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
);

-- 4. VÉRIFIER L'ENUM
SELECT 
  '=== ENUM RNB ===' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status') 
    THEN 'EXISTE'
    ELSE 'N''EXISTE PAS (OK - prêt pour migration)'
  END as status;

-- 5. RÉSUMÉ ET RECOMMANDATION
SELECT 
  '=== RÉSUMÉ ===' as section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM "_prisma_migrations" 
      WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
      AND finished_at IS NULL
    ) THEN '🧹 ACTION REQUISE: Nettoyer les migrations échouées (voir scripts/railway-simple-cleanup.sql)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
    ) OR EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status')
    THEN '⚠️  Objets partiels détectés: utiliser script de nettoyage complet'
    ELSE '✅ Tout est prêt pour la nouvelle migration !'
  END as recommandation;

