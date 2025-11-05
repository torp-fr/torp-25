import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script de diagnostic et nettoyage des migrations Prisma
 * Analyse l'état des migrations et nettoie les migrations échouées
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MigrationStatus {
  migration_name: string
  started_at: Date
  finished_at: Date | null
  applied_steps_count: number | null
  rolled_back_steps_count: number | null
  checksum: string | null
}

async function diagnoseMigrations() {
  try {
    log.info('🔍 Diagnostic des migrations Prisma...\n')

    // 1. Vérifier les migrations RNB
    log.info('📋 Migrations RNB trouvées:')
    const rnbMigrations = await prisma.$queryRaw<MigrationStatus[]>`
      SELECT 
        migration_name,
        started_at,
        finished_at,
        applied_steps_count,
        rolled_back_steps_count,
        checksum
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%'
      ORDER BY started_at DESC
    `

    if (rnbMigrations.length === 0) {
      log.info('  ℹ️  Aucune migration RNB trouvée\n')
    } else {
      rnbMigrations.forEach((m) => {
        const status = m.finished_at 
          ? '✅ TERMINÉE' 
          : '❌ ÉCHOUÉE / EN COURS'
        log.info(`  ${status} - ${m.migration_name}`)
        log.info(`    Début: ${m.started_at}`)
        if (m.finished_at) {
          log.info(`    Fin: ${m.finished_at}`)
        }
        log.info('')
      })
    }

    // 2. Identifier les migrations échouées
    const failedMigrations = rnbMigrations.filter((m) => !m.finished_at)
    
    if (failedMigrations.length > 0) {
      log.info(`⚠️  ${failedMigrations.length} migration(s) échouée(s) détectée(s):\n`)
      failedMigrations.forEach((m) => {
        log.info(`  - ${m.migration_name}`)
      })
      log.info('')

      // 3. Proposer le nettoyage
      log.info('🧹 Nettoyage proposé...')
      const migrationsToClean = [
        '20250127_add_rnb_models',
        '20250128_add_rnb_models',
        '20250128_fix_rnb_migration',
      ]

      let cleaned = 0
      for (const migrationName of migrationsToClean) {
        const result = await prisma.$executeRaw`
          DELETE FROM "_prisma_migrations"
          WHERE migration_name = ${migrationName}
          AND finished_at IS NULL
        `
        if (result > 0) {
          log.info(`  ✅ ${migrationName} - nettoyée`)
          cleaned++
        }
      }

      log.info(`\n✅ ${cleaned} migration(s) nettoyée(s)\n`)
    } else {
      log.info('✅ Aucune migration échouée détectée\n')
    }

    // 4. Vérifier l'état des tables RNB
    log.info('📊 État des tables RNB:')
    
    const tablesExist = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
      ORDER BY table_name
    `

    const expectedTables = ['rnb_buildings', 'rnb_import_jobs']
    expectedTables.forEach((tableName) => {
      const exists = tablesExist.some((t) => t.table_name === tableName)
      log.info(`  ${exists ? '✅' : '❌'} ${tableName}`)
    })

    // 5. Vérifier l'enum
    log.info('\n📋 État de l\'enum:')
    const enumExists = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname 
      FROM pg_type 
      WHERE typname = 'rnb_import_status'
    `
    
    log.info(`  ${enumExists.length > 0 ? '✅' : '❌'} rnb_import_status`)

    // 6. Résumé et recommandations
    log.info('\n📝 Résumé:')
    
    const tablesMissing = expectedTables.filter(
      (t) => !tablesExist.some((e) => e.table_name === t)
    )
    
    if (failedMigrations.length === 0 && tablesMissing.length === 0 && enumExists.length > 0) {
      log.info('  ✅ Tout est en ordre ! Les migrations peuvent être appliquées.\n')
      log.info('  💡 Vous pouvez maintenant relancer le déploiement sur Vercel.\n')
    } else {
      if (tablesMissing.length > 0) {
        log.info(`  ⚠️  Tables manquantes: ${tablesMissing.join(', ')}`)
        log.info('     → La migration 20250129_add_rnb_models doit être appliquée\n')
      }
      if (enumExists.length === 0) {
        log.info('  ⚠️  L\'enum rnb_import_status n\'existe pas')
        log.info('     → La migration 20250129_add_rnb_models doit être appliquée\n')
      }
    }

  } catch (error: any) {
    log.error('❌ Erreur lors du diagnostic:', error.message)
    
    if (error.code === 'P1001' || error.code === 'P2021') {
      log.error('\n💡 Vérifiez que:')
      log.error('   - DATABASE_URL est correctement configuré')
      log.error('   - La base de données est accessible')
      log.error('   - Les permissions sont correctes\n')
    }
    
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le diagnostic
diagnoseMigrations()
  .then(() => {
    log.info('✅ Diagnostic terminé')
    process.exit(0)
  })
  .catch((error) => {
    log.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

