-- ============================================
-- CORRECTION AUTOMATIQUE COMPLÈTE POUR RAILWAY
-- Exécutez ce script pour nettoyer TOUT automatiquement
-- ============================================

DO $$
DECLARE
  migrations_deleted INTEGER := 0;
  tables_dropped INTEGER := 0;
  enum_dropped INTEGER := 0;
BEGIN
  RAISE NOTICE '=== DÉBUT DU NETTOYAGE AUTOMATIQUE ===';
  
  -- 1. Supprimer toutes les migrations RNB échouées
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
  
  GET DIAGNOSTICS migrations_deleted = ROW_COUNT;
  RAISE NOTICE '✓ Migrations supprimées: %', migrations_deleted;
  
  -- 2. Supprimer les tables si elles existent
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rnb_import_jobs'
  ) THEN
    DROP TABLE "rnb_import_jobs" CASCADE;
    tables_dropped := tables_dropped + 1;
    RAISE NOTICE '✓ Table rnb_import_jobs supprimée';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'rnb_buildings'
  ) THEN
    DROP TABLE "rnb_buildings" CASCADE;
    tables_dropped := tables_dropped + 1;
    RAISE NOTICE '✓ Table rnb_buildings supprimée';
  END IF;
  
  -- 3. Supprimer l'enum si il existe
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status') THEN
    DROP TYPE "rnb_import_status" CASCADE;
    enum_dropped := 1;
    RAISE NOTICE '✓ Enum rnb_import_status supprimé';
  END IF;
  
  -- 4. Résumé
  RAISE NOTICE '=== NETTOYAGE TERMINÉ ===';
  RAISE NOTICE 'Résumé:';
  RAISE NOTICE '  - Migrations supprimées: %', migrations_deleted;
  RAISE NOTICE '  - Tables supprimées: %', tables_dropped;
  RAISE NOTICE '  - Enum supprimé: %', enum_dropped;
  RAISE NOTICE '';
  RAISE NOTICE '✅ La base est maintenant prête pour la migration 20250129_add_rnb_models';
  RAISE NOTICE '💡 Vous pouvez relancer le déploiement sur Vercel';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erreur lors du nettoyage: %', SQLERRM;
    RAISE;
END $$;

-- Vérification finale
SELECT 
  '=== VÉRIFICATION FINALE ===' as info,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM "_prisma_migrations" 
      WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
      AND finished_at IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
    )
    AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status')
    THEN '✅ SUCCÈS: Base nettoyée et prête'
    ELSE '⚠️  Certains objets peuvent encore exister'
  END as status;

