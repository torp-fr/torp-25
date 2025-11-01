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
    console.log('🗄️  Application de la Migration Building Profile Role')
    console.log('===================================================\n')

    // 1. Test de connexion
    console.log('📡 Connexion à la base de données...')
    await prisma.$connect()
    console.log('✅ Connexion établie\n')

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
    console.log('📄 Fichier de migration chargé\n')

    // 3. Diviser le SQL en blocs exécutables
    // Séparer par des lignes vides et points-virgules qui ne sont pas dans des blocs DO
    console.log('🚀 Application de la migration...\n')
    
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
    console.log(`   Exécution de ${blocks.length} bloc(s) SQL...\n`)
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      if (!block || block.trim().length === 0) continue
      
      try {
        await prisma.$executeRawUnsafe(block)
        console.log(`   ✅ Bloc ${i + 1}/${blocks.length} exécuté`)
      } catch (error: any) {
        // Ignorer les erreurs "already exists" qui sont normales
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('already defined')) {
          console.log(`   ⚠️  Bloc ${i + 1}/${blocks.length}: ${error.message.split('\n')[0]}`)
        } else {
          throw error
        }
      }
    }
    
    console.log('\n✅ Migration appliquée avec succès !\n')

    // 4. Vérification
    console.log('🔍 Vérification post-migration...\n')

    // Vérifier l'enum
    try {
      const enumCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'building_profile_role'
        ) as exists
      `
      console.log(`   ${enumCheck[0]?.exists ? '✅' : '❌'} Enum building_profile_role: ${enumCheck[0]?.exists ? 'EXISTE' : 'MANQUANT'}`)
    } catch (e) {
      console.log(`   ⚠️  Vérification enum échouée`)
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
      console.log(`   ${columnsCheck.length === 4 ? '✅' : '⚠️ '} Colonnes ajoutées: ${columnsCheck.length}/4`)
      columnsCheck.forEach(col => {
        console.log(`      - ${col.column_name} (${col.data_type})`)
      })
    } catch (e) {
      console.log(`   ⚠️  Vérification colonnes échouée`)
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
      console.log(`   ${indexCheck[0]?.exists ? '✅' : '❌'} Index unique: ${indexCheck[0]?.exists ? 'CRÉÉ' : 'MANQUANT'}`)
    } catch (e) {
      console.log(`   ⚠️  Vérification index échouée`)
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
      console.log(`\n   📊 Profils existants:`)
      existingProfiles.forEach(prof => {
        console.log(`      - ${prof.role}: ${prof.count}`)
      })
    } catch (e) {
      console.log(`\n   ⚠️  Vérification profils échouée`)
    }

    console.log('\n🎉 Migration terminée avec succès !')
    console.log('\n💡 Prochaines étapes:')
    console.log('   1. Régénérer le client Prisma: npx prisma generate')
    console.log('   2. Vérifier le statut: npx prisma migrate status')
    console.log('   3. Tester la création de cartes propriétaire/locataire\n')

  } catch (error: any) {
    console.error('\n❌ Erreur lors de l\'application de la migration:', error.message)
    
    if (error.code === 'P1001' || error.code === 'P2021') {
      console.error('\n💡 Problème de connexion à la base de données.')
      console.error('   Vérifiez que DATABASE_URL est correctement configuré.\n')
    } else if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.error('\n⚠️  Certains objets existent déjà. C\'est peut-être normal si la migration a déjà été appliquée partiellement.')
      console.error('   Vérifiez le statut avec: npx prisma migrate status\n')
    } else {
      console.error('\n💡 Erreur technique. Consultez les détails ci-dessus.\n')
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
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

