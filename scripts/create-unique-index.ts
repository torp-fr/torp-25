/**
 * Script pour créer l'index unique Building Profile Role
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createIndex() {
  try {
    console.log('🔧 Création de l\'index unique Building Profile Role...\n')
    
    await prisma.$connect()
    console.log('✅ Connexion établie\n')

    // Supprimer l'index s'il existe déjà
    console.log('🧹 Suppression de l\'index existant (si présent)...')
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS building_profiles_unique_proprietaire_per_bien_idx;
    `)
    console.log('   ✅ Index supprimé (si existant)\n')

    // Créer l'index unique
    console.log('🔨 Création de l\'index unique...')
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX building_profiles_unique_proprietaire_per_bien_idx
      ON building_profiles (
        parcelle_number, 
        section_cadastrale, 
        COALESCE(lot_number, ''),
        role
      )
      WHERE role = 'PROPRIETAIRE'
        AND parcelle_number IS NOT NULL
        AND section_cadastrale IS NOT NULL;
    `)
    console.log('   ✅ Index unique créé\n')

    // Vérifier
    console.log('🔍 Vérification...')
    const index = await prisma.$queryRaw<Array<{
      indexname: string
    }>>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'building_profiles' 
        AND indexname = 'building_profiles_unique_proprietaire_per_bien_idx'
    `

    if (index.length > 0) {
      console.log('   ✅ Index vérifié et présent\n')
      console.log('🎉 Index unique créé avec succès !\n')
    } else {
      console.log('   ❌ Index non trouvé après création\n')
      process.exit(1)
    }

  } catch (error: any) {
    console.error('\n❌ Erreur:', error.message)
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  L\'index existe déjà, c\'est normal.\n')
    } else {
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createIndex()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

