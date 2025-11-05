import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script automatisé de nettoyage complet pour Railway
 * Exécute toutes les corrections nécessaires automatiquement
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function autoCleanup() {
  try {
    log.info('🚀 Démarrage du nettoyage automatique Railway...\n')

    // 1. Test de connexion
    await prisma.$connect()
    log.info('✅ Connexion à Railway établie\n')

    // 2. Supprimer les migrations échouées
    log.info('🧹 Étape 1: Nettoyage des migrations échouées...')
    
    const deletedMigrations = await prisma.$executeRaw`
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
      AND finished_at IS NULL
    `
    
    log.info(`   ✓ ${deletedMigrations} migration(s) supprimée(s)\n`)

    // 3. Vérifier et supprimer les tables
    log.info('🧹 Étape 2: Nettoyage des tables...')
    
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
    `
    
    if (tables.length > 0) {
      for (const table of tables) {
        try {
          await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE`)
          log.info(`   ✓ Table ${table.table_name} supprimée`)
        } catch (error: any) {
          log.info(`   ⚠️  Erreur lors de la suppression de ${table.table_name}: ${error.message}`)
        }
      }
    } else {
      log.info('   ✓ Aucune table à supprimer')
    }
    log.info('')

    // 4. Vérifier et supprimer l'enum
    log.info('🧹 Étape 3: Nettoyage de l\'enum...')
    
    const enumExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status'
      ) as exists
    `
    
    if (enumExists[0]?.exists) {
      try {
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "rnb_import_status" CASCADE`)
        log.info('   ✓ Enum rnb_import_status supprimé')
      } catch (error: any) {
        log.info(`   ⚠️  Erreur lors de la suppression de l'enum: ${error.message}`)
      }
    } else {
      log.info('   ✓ Aucun enum à supprimer')
    }
    log.info('')

    // 5. Vérification finale
    log.info('🔍 Vérification finale...\n')
    
    const remainingFailed = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "_prisma_migrations" 
      WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
      AND finished_at IS NULL
    `
    
    const remainingTables = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
    `
    
    const remainingEnum = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM pg_type 
      WHERE typname = 'rnb_import_status'
    `
    
    const failedCount = Number(remainingFailed[0]?.count || 0)
    const tablesCount = Number(remainingTables[0]?.count || 0)
    const enumCount = Number(remainingEnum[0]?.count || 0)
    
    log.info('📊 Résultat:')
    log.info(`   - Migrations échouées restantes: ${failedCount}`)
    log.info(`   - Tables restantes: ${tablesCount}`)
    log.info(`   - Enum restant: ${enumCount}`)
    log.info('')
    
    if (failedCount === 0 && tablesCount === 0 && enumCount === 0) {
      log.info('✅ SUCCÈS ! La base Railway est maintenant propre et prête.')
      log.info('💡 Vous pouvez maintenant relancer le déploiement sur Vercel.\n')
      log.info('   La migration 20250129_add_rnb_models devrait s\'appliquer correctement.\n')
    } else {
      log.info('⚠️  Certains objets restent encore.')
      log.info('   Vous pouvez essayer d\'exécuter le script SQL directement dans Railway.\n')
    }

  } catch (error: any) {
    log.error('❌ Erreur lors du nettoyage:', error.message)
    
    if (error.code === 'P1001' || error.code === 'P2021') {
      log.error('\n💡 Problème de connexion à Railway.')
      log.error('   Vérifiez que DATABASE_URL est correctement configuré.')
      log.error('   Vous pouvez le récupérer depuis Railway Dashboard.\n')
      log.error('   Pour exécuter ce script localement:')
      log.error('   1. Copier DATABASE_URL depuis Railway')
      log.error('   2. Créer un fichier .env.local avec: DATABASE_URL="votre-url"')
      log.error('   3. Relancer: npm run db:cleanup\n')
    } else {
      log.error('\n💡 Erreur technique. Essayez d\'exécuter le script SQL directement dans Railway.\n')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le nettoyage
autoCleanup()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    log.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

