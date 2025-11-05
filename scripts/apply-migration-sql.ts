import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script pour appliquer la migration Building Profile Role
 * Exécute le SQL en plusieurs blocs séparés
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

    // 3. Diviser le SQL en blocs exécutables
    // Séparer par des lignes vides et points-virgules qui ne sont pas dans des blocs DO
    log.info('🚀 Application de la migration...\n')
    
    // Diviser en blocs - chaque bloc DO $$ ... END $$ doit rester ensemble
    const blocks: string[] = []
    let currentBlock = ''
    let inDoBlock = false
    
    const lines = sqlContent.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('DO $$')) {
        inDoBlock = true
        currentBlock += line + '\n'
      } else if (inDoBlock) {
        currentBlock += line + '\n'
        if (line.endsWith('$$;') || (line === 'END $$;' || line.includes('END $$'))) {
          blocks.push(currentBlock.trim())
          currentBlock = ''
          inDoBlock = false
        }
      } else if (line && !line.startsWith('--')) {
        currentBlock += line + '\n'
        if (line.endsWith(';') && !line.startsWith('DO')) {
          blocks.push(currentBlock.trim())
          currentBlock = ''
        }
      }
    }
    
    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim())
    }

    // Exécuter chaque bloc
    log.info(`   Exécution de ${blocks.length} bloc(s) SQL...\n`)
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (!block || block.trim().length === 0) continue
      
      try {
        await prisma.$executeRawUnsafe(block)
        log.info(`   ✅ Bloc ${i + 1}/${blocks.length} exécuté`)
      } catch (error: any) {
        // Ignorer les erreurs "already exists" qui sont normales
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('already defined')) {
          log.info(`   ⚠️  Bloc ${i + 1}/${blocks.length}: ${error.message.split('\n')[0]}`)
        } else {
          throw error
        }
      }
    }
    
    log.info('\n✅ Migration appliquée avec succès !\n')

    // 4. Vérification
    log.info('🔍 Vérification post-migration...\n')

    // Vérifier l'enum
    try {
      const enumCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'building_profile_role'
        ) as exists
      `
      log.info(`   ${enumCheck[0]?.exists ? '✅' : '❌'} Enum building_profile_role: ${enumCheck[0]?.exists ? 'EXISTE' : 'MANQUANT'}`)
    } catch (e) {
      log.info(`   ⚠️  Vérification enum échouée`)
    }

    // Vérifier les colonnes
    try {
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
    } catch (e) {
      log.info(`   ⚠️  Vérification colonnes échouée`)
    }

    // Vérifier l'index unique
    try {
      const indexCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = 'building_profiles' 
            AND indexname = 'building_profiles_unique_proprietaire_per_bien_idx'
        ) as exists
      `
      log.info(`   ${indexCheck[0]?.exists ? '✅' : '❌'} Index unique: ${indexCheck[0]?.exists ? 'CRÉÉ' : 'MANQUANT'}`)
    } catch (e) {
      log.info(`   ⚠️  Vérification index échouée`)
    }

    // Vérifier les données existantes
    try {
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
    } catch (e) {
      log.info(`\n   ⚠️  Vérification profils échouée`)
    }

    log.info('\n🎉 Migration terminée avec succès !')
    log.info('\n💡 Prochaines étapes:')
    log.info('   1. Régénérer le client Prisma: npx prisma generate')
    log.info('   2. Vérifier le statut: npx prisma migrate status')
    log.info('   3. Tester la création de cartes propriétaire/locataire\n')

  } catch (error: any) {
    log.error('\n❌ Erreur lors de l\'application de la migration:', error.message)
    
    if (error.code === 'P1001' || error.code === 'P2021') {
      log.error('\n💡 Problème de connexion à la base de données.')
      log.error('   Vérifiez que DATABASE_URL est correctement configuré.\n')
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

