/**
 * Script de correction automatique des migrations échouées
 * Nettoie les migrations RNB échouées et prépare pour la nouvelle migration
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixFailedMigrations() {
  try {
    console.log('🔧 Correction des migrations échouées...\n')

    // 1. Identifier les migrations échouées
    const failedMigrations = await prisma.$queryRaw<Array<{
      migration_name: string
      started_at: Date
    }>>`
      SELECT migration_name, started_at
      FROM "_prisma_migrations"
      WHERE migration_name IN (
        '20250127_add_rnb_models',
        '20250128_add_rnb_models',
        '20250128_fix_rnb_migration'
      )
      AND finished_at IS NULL
    `

    if (failedMigrations.length === 0) {
      console.log('✅ Aucune migration échouée à nettoyer\n')
      return
    }

    console.log(`⚠️  ${failedMigrations.length} migration(s) échouée(s) trouvée(s):\n`)
    failedMigrations.forEach((m) => {
      console.log(`  - ${m.migration_name} (démarrée: ${m.started_at})`)
    })
    console.log('')

    // 2. Nettoyer les migrations échouées
    console.log('🧹 Nettoyage en cours...\n')
    
    let totalCleaned = 0
    for (const migration of failedMigrations) {
      const result = await prisma.$executeRaw`
        DELETE FROM "_prisma_migrations"
        WHERE migration_name = ${migration.migration_name}
        AND finished_at IS NULL
      `
      
      if (result > 0) {
        console.log(`  ✅ ${migration.migration_name} - nettoyée`)
        totalCleaned++
      }
    }

    console.log(`\n✅ ${totalCleaned} migration(s) nettoyée(s)\n`)

    // 3. Vérifier l'état final
    const remainingFailed = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE migration_name IN (
        '20250127_add_rnb_models',
        '20250128_add_rnb_models',
        '20250128_fix_rnb_migration'
      )
      AND finished_at IS NULL
    `

    if (remainingFailed.length === 0) {
      console.log('✅ Nettoyage terminé avec succès !\n')
      console.log('💡 Vous pouvez maintenant:')
      console.log('   1. Relancer le déploiement sur Vercel')
      console.log('   2. Ou exécuter: npm run db:migrate:deploy\n')
    } else {
      console.log(`⚠️  ${remainingFailed.length} migration(s) encore en échec (peut nécessiter une intervention manuelle)\n`)
    }

  } catch (error: any) {
    console.error('❌ Erreur lors de la correction:', error.message)
    
    if (error.code === 'P1001' || error.code === 'P2021') {
      console.error('\n💡 Problème de connexion à la base de données.')
      console.error('   Vérifiez que DATABASE_URL est correctement configuré.\n')
    }
    
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter la correction
fixFailedMigrations()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

