import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script pour résoudre les migrations Prisma échouées
 * À exécuter avant `prisma migrate deploy` si une migration a échoué
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resolveFailedMigrations() {
  try {
    log.info('🔍 Recherche de migrations échouées...')

    // Vérifier si la table _prisma_migrations existe
    const failedMigrations = await prisma.$queryRaw<Array<{
      migration_name: string
      started_at: Date
      finished_at: Date | null
    }>>`
      SELECT migration_name, started_at, finished_at
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
    `

    if (failedMigrations.length === 0) {
      log.info('✅ Aucune migration échouée trouvée')
      return
    }

    log.info(`⚠️  ${failedMigrations.length} migration(s) échouée(s) trouvée(s):`)
    failedMigrations.forEach((m) => {
      log.info(`   - ${m.migration_name} (démarrée: ${m.started_at})`)
    })

    // Supprimer les enregistrements de migrations échouées pour RNB
    const rnbMigrations = failedMigrations.filter((m) =>
      m.migration_name.includes('rnb') || m.migration_name.includes('RNB')
    )

    if (rnbMigrations.length > 0) {
      log.info('\n🧹 Nettoyage des migrations RNB échouées...')

      for (const migration of rnbMigrations) {
        await prisma.$executeRaw`
          DELETE FROM "_prisma_migrations"
          WHERE migration_name = ${migration.migration_name}
          AND finished_at IS NULL
        `
        log.info(`   ✓ ${migration.migration_name} supprimée`)
      }

      log.info('\n✅ Nettoyage terminé. Vous pouvez maintenant exécuter `prisma migrate deploy`')
    }
  } catch (error) {
    log.error('❌ Erreur lors de la résolution:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resolveFailedMigrations()

