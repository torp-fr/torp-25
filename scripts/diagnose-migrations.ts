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
    console.log('🔍 Diagnostic des migrations Prisma...\n')

    // 1. Vérifier les migrations RNB
    console.log('📋 Migrations RNB trouvées:')
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
      console.log('  ℹ️  Aucune migration RNB trouvée\n')
    } else {
      rnbMigrations.forEach((m) => {
        const status = m.finished_at 
          ? '✅ TERMINÉE' 
          : '❌ ÉCHOUÉE / EN COURS'
        console.log(`  ${status} - ${m.migration_name}`)
        console.log(`    Début: ${m.started_at}`)
        if (m.finished_at) {
          console.log(`    Fin: ${m.finished_at}`)
        }
        console.log('')
      })
    }

    // 2. Identifier les migrations échouées
    const failedMigrations = rnbMigrations.filter((m) => !m.finished_at)
    
    if (failedMigrations.length > 0) {
      console.log(`⚠️  ${failedMigrations.length} migration(s) échouée(s) détectée(s):\n`)
      failedMigrations.forEach((m) => {
        console.log(`  - ${m.migration_name}`)
      })
      console.log('')

      // 3. Proposer le nettoyage
      console.log('🧹 Nettoyage proposé...')
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
          console.log(`  ✅ ${migrationName} - nettoyée`)
          cleaned++
        }
      }

      console.log(`\n✅ ${cleaned} migration(s) nettoyée(s)\n`)
    } else {
      console.log('✅ Aucune migration échouée détectée\n')
    }

    // 4. Vérifier l'état des tables RNB
    console.log('📊 État des tables RNB:')
    
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
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`)
    })

    // 5. Vérifier l'enum
    console.log('\n📋 État de l\'enum:')
    const enumExists = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname 
      FROM pg_type 
      WHERE typname = 'rnb_import_status'
    `
    
    console.log(`  ${enumExists.length > 0 ? '✅' : '❌'} rnb_import_status`)

    // 6. Résumé et recommandations
    console.log('\n📝 Résumé:')
    
    const tablesMissing = expectedTables.filter(
      (t) => !tablesExist.some((e) => e.table_name === t)
    )
    
    if (failedMigrations.length === 0 && tablesMissing.length === 0 && enumExists.length > 0) {
      console.log('  ✅ Tout est en ordre ! Les migrations peuvent être appliquées.\n')
      console.log('  💡 Vous pouvez maintenant relancer le déploiement sur Vercel.\n')
    } else {
      if (tablesMissing.length > 0) {
        console.log(`  ⚠️  Tables manquantes: ${tablesMissing.join(', ')}`)
        console.log('     → La migration 20250129_add_rnb_models doit être appliquée\n')
      }
      if (enumExists.length === 0) {
        console.log('  ⚠️  L\'enum rnb_import_status n\'existe pas')
        console.log('     → La migration 20250129_add_rnb_models doit être appliquée\n')
      }
    }

  } catch (error: any) {
    console.error('❌ Erreur lors du diagnostic:', error.message)
    
    if (error.code === 'P1001' || error.code === 'P2021') {
      console.error('\n💡 Vérifiez que:')
      console.error('   - DATABASE_URL est correctement configuré')
      console.error('   - La base de données est accessible')
      console.error('   - Les permissions sont correctes\n')
    }
    
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le diagnostic
diagnoseMigrations()
  .then(() => {
    console.log('✅ Diagnostic terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

