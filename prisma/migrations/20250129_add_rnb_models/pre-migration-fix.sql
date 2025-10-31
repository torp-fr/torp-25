-- Script SQL à exécuter manuellement si Prisma bloque sur les migrations échouées
-- Exécuter ce script AVANT `prisma migrate deploy` si nécessaire

-- Nettoyer les migrations RNB échouées de la table _prisma_migrations
DELETE FROM "_prisma_migrations" 
WHERE migration_name IN ('20250127_add_rnb_models', '20250128_add_rnb_models', '20250128_fix_rnb_migration')
AND finished_at IS NULL;

