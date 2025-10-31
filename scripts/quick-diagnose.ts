/**
 * Script de diagnostic rapide - version simplifiée
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function quickDiagnose() {
  try {
    console.log('🔍 Diagnostic Railway...\n')

    // Test de connexion
    await prisma.$connect()
    console.log('✅ Connexion à Railway réussie\n')

    // Migrations RNB
    const rnbMigrations = await prisma.$queryRaw<Array<{
      migration_name: string
      started_at: Date
      finished_at: Date | null
    }>>`
      SELECT migration_name, started_at, finished_at
      FROM "_prisma_migrations"
      WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
      ORDER BY started_at DESC
    `

    console.log(`📋 Migrations RNB trouvées: ${rnbMigrations.length}\n`)
    
    if (rnbMigrations.length > 0) {
      rnbMigrations.forEach((m) => {
        const status = m.finished_at ? '✅' : '❌'
        console.log(`  ${status} ${m.migration_name}`)
        if (!m.finished_at) {
          console.log(`     Démarrée: ${m.started_at}`)
        }
      })
      console.log('')
    }

    // Migrations échouées
    const failed = rnbMigrations.filter(m => !m.finished_at)
    console.log(`⚠️  Migrations échouées: ${failed.length}`)
    
    if (failed.length > 0) {
      failed.forEach(m => console.log(`  - ${m.migration_name}`))
      console.log('')
    }

    // Tables RNB
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
    `
    console.log(`📊 Tables RNB existantes: ${tables.length}`)
    tables.forEach(t => console.log(`  - ${t.table_name}`))

    // Enum
    const enumExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status'
      ) as exists
    `
    console.log(`📋 Enum rnb_import_status: ${enumExists[0]?.exists ? 'EXISTE' : "N'EXISTE PAS"}\n`)

    // Recommandation
    if (failed.length > 0) {
      console.log('🧹 ACTION REQUISE: Nettoyer les migrations échouées')
      console.log('   Exécutez: npm run db:fix-failed\n')
    } else if (tables.length > 0 || enumExists[0]?.exists) {
      console.log('⚠️  Des objets partiels existent')
      console.log('   Utilisez le script de nettoyage complet\n')
    } else {
      console.log('✅ Tout est prêt pour la nouvelle migration\n')
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
    if (error.code === 'P1001' || error.code === 'P2021') {
      console.error('\n💡 DATABASE_URL n\'est pas configuré ou la connexion échoue')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

quickDiagnose()

