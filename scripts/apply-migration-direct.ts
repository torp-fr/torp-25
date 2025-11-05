import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script pour appliquer directement la migration Building Profile Role
 * Se connecte à la base via Prisma Client et exécute le SQL
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function applyMigration() {
  try {
    log.info('🗄️  Application de la Migration Building Profile Role')
    log.info('===================================================\n')

    // 1. Test de connexion
    log.info('📡 Connexion à la base de données...')
    await prisma.$connect()
    log.info('✅ Connexion établie\n')

    // 2. Lire le fichier SQL de migration
    const migrationPath = path.join(
      __dirname,
      '..',
      'prisma',
      'migrations',
      '20250131_add_building_profile_role',
      'migration.sql'
    )

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Fichier de migration non trouvé: ${migrationPath}`)
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')
    log.info('📄 Fichier de migration chargé\n')

    // 3. Exécuter le SQL
    log.info('🚀 Application de la migration...\n')
    
    // Diviser le SQL en blocs (séparés par des points-virgules)
    // Mais attention : certains blocs DO $$ ... END $$ doivent rester ensemble
    // On va exécuter le fichier entier en une fois
    
    await prisma.$executeRawUnsafe(sqlContent)
    
    log.info('\n✅ Migration appliquée avec succès !\n')

    // 4. Vérification
    log.info('🔍 Vérification post-migration...\n')

    // Vérifier l'enum
    const enumCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'building_profile_role'
      ) as exists
    `
    log.info(`   ${enumCheck[0]?.exists ? '✅' : '❌'} Enum building_profile_role: ${enumCheck[0]?.exists ? 'EXISTE' : 'MANQUANT'}`)

    // Vérifier les colonnes
    const columnsCheck = await prisma.$queryRaw<Array<{
      column_name: string
      data_type: string
    }>>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'building_profiles' 
        AND column_name IN ('role', 'parent_profile_id', 'lot_number', 'tenant_data')
      ORDER BY column_name
    `
    log.info(`   ${columnsCheck.length === 4 ? '✅' : '⚠️ '} Colonnes ajoutées: ${columnsCheck.length}/4`)
    columnsCheck.forEach(col => {
      log.info(`      - ${col.column_name} (${col.data_type})`)
    })

    // Vérifier l'index unique
    const indexCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'building_profiles' 
          AND indexname = 'building_profiles_unique_proprietaire_per_bien_idx'
      ) as exists
    `
    log.info(`   ${indexCheck[0]?.exists ? '✅' : '❌'} Index unique: ${indexCheck[0]?.exists ? 'CRÉÉ' : 'MANQUANT'}`)

    // Vérifier les données existantes
    const existingProfiles = await prisma.$queryRaw<Array<{
      role: string
      count: bigint
    }>>`
      SELECT role, COUNT(*)::bigint as count
      FROM building_profiles 
      GROUP BY role
    `
    log.info(`\n   📊 Profils existants:`)
    existingProfiles.forEach(prof => {
      log.info(`      - ${prof.role}: ${prof.count}`)
    })

    log.info('\n🎉 Migration terminée avec succès !')
    log.info('\n💡 Prochaines étapes:')
    log.info('   1. Régénérer le client Prisma: npx prisma generate')
    log.info('   2. Vérifier le statut: npx prisma migrate status')
    log.info('   3. Tester la création de cartes propriétaire/locataire\n')

  } catch (error: any) {
    log.error('\n❌ Erreur lors de l\'application de la migration:', error.message)
    
    if (error.code === 'P1001' || error.code === 'P2021') {
      log.error('\n💡 Problème de connexion à la base de données.')
      log.error('   Vérifiez que DATABASE_URL est correctement configuré.')
      log.error('   Options:')
      log.error('   1. Créer un fichier .env.local avec DATABASE_URL="postgresql://..."')
      log.error('   2. Utiliser Railway: railway link puis railway run npx prisma migrate deploy')
      log.error('   3. Exporter la variable: export DATABASE_URL="..." (Linux/Mac)')
      log.error('      ou $env:DATABASE_URL="..." (Windows PowerShell)\n')
    } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      log.error('\n⚠️  Certains objets existent déjà. C\'est peut-être normal si la migration a déjà été appliquée partiellement.')
      log.error('   Vérifiez le statut avec: npx prisma migrate status\n')
    } else {
      log.error('\n💡 Erreur technique. Consultez les détails ci-dessus.\n')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter
applyMigration()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    log.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

