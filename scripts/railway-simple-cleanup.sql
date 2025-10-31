-- ============================================
-- NETTOYAGE SIMPLE ET RAPIDE POUR RAILWAY
-- Version simplifiée qui nettoie uniquement les migrations échouées
-- ============================================

-- Supprimer toutes les migrations RNB échouées
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

-- Vérifier le résultat
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCCÈS: Toutes les migrations échouées ont été nettoyées'
    ELSE '⚠️ ATTENTION: ' || COUNT(*) || ' migration(s) encore en échec: ' || string_agg(migration_name, ', ')
  END as resultat
FROM "_prisma_migrations" 
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

