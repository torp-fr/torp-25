import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script de vérification que la migration Building Profile Role a été appliquée
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyMigration() {
  try {
    log.info('🔍 Vérification de la Migration Building Profile Role')
    log.info('=====================================================\n')

    await prisma.$connect()
    log.info('✅ Connexion établie\n')

    // 1. Vérifier l'enum
    log.info('1. Vérification de l\'enum building_profile_role...')
    try {
      const enumValues = await prisma.$queryRaw<Array<{ unnest: string }>>`
        SELECT unnest(enum_range(NULL::building_profile_role)) as unnest
      `
      log.info(`   ✅ Enum existe avec valeurs: ${enumValues.map(v => v.unnest).join(', ')}`)
    } catch (e: any) {
      log.info(`   ❌ Enum manquant: ${e.message}`)
      return false
    }

    // 2. Vérifier les colonnes
    log.info('\n2. Vérification des colonnes...')
    try {
      const columns = await prisma.$queryRaw<Array<{
        column_name: string
        data_type: string
      }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'building_profiles' 
          AND column_name IN ('role', 'parent_profile_id', 'lot_number', 'tenant_data')
        ORDER BY column_name
      `
      const expectedColumns = ['role', 'parent_profile_id', 'lot_number', 'tenant_data']
      const foundColumns = columns.map(c => c.column_name)
      const missingColumns = expectedColumns.filter(c => !foundColumns.includes(c))
      
      if (missingColumns.length === 0) {
        log.info(`   ✅ Toutes les colonnes existent (${columns.length}/4)`)
        columns.forEach(col => {
          log.info(`      - ${col.column_name} (${col.data_type})`)
        })
      } else {
        log.info(`   ❌ Colonnes manquantes: ${missingColumns.join(', ')}`)
        return false
      }
    } catch (e: any) {
      log.info(`   ❌ Erreur vérification colonnes: ${e.message}`)
      return false
    }

    // 3. Vérifier l'index unique
    log.info('\n3. Vérification de l\'index unique...')
    try {
      const index = await prisma.$queryRaw<Array<{
        indexname: string
        indexdef: string
      }>>`
        SELECT indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename = 'building_profiles' 
          AND indexname = 'building_profiles_unique_proprietaire_per_bien_idx'
      `
      if (index.length > 0) {
        log.info(`   ✅ Index unique créé`)
        log.info(`      ${index[0].indexname}`)
      } else {
        log.info(`   ❌ Index unique manquant`)
        return false
      }
    } catch (e: any) {
      log.info(`   ❌ Erreur vérification index: ${e.message}`)
      return false
    }

    // 4. Vérifier l'index parent_profile_id
    log.info('\n4. Vérification de l\'index parent_profile_id...')
    try {
      const index = await prisma.$queryRaw<Array<{
        indexname: string
      }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'building_profiles' 
          AND indexname = 'building_profiles_parent_profile_id_idx'
      `
      if (index.length > 0) {
        log.info(`   ✅ Index parent_profile_id créé`)
      } else {
        log.info(`   ⚠️  Index parent_profile_id manquant (non bloquant)`)
      }
    } catch (e: any) {
      log.info(`   ⚠️  Erreur vérification index parent: ${e.message}`)
    }

    // 5. Vérifier la contrainte foreign key
    log.info('\n5. Vérification de la contrainte foreign key...')
    try {
      const constraint = await prisma.$queryRaw<Array<{
        constraint_name: string
      }>>`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'building_profiles' 
          AND constraint_name = 'building_profiles_parent_profile_id_fkey'
      `
      if (constraint.length > 0) {
        log.info(`   ✅ Contrainte foreign key créée`)
      } else {
        log.info(`   ⚠️  Contrainte foreign key manquante (non bloquante)`)
      }
    } catch (e: any) {
      log.info(`   ⚠️  Erreur vérification contrainte: ${e.message}`)
    }

    // 6. Vérifier les données existantes
    log.info('\n6. Vérification des données existantes...')
    try {
      const profiles = await prisma.$queryRaw<Array<{
        role: string
        count: bigint
      }>>`
        SELECT role, COUNT(*)::bigint as count
        FROM building_profiles 
        GROUP BY role
      `
      if (profiles.length > 0) {
        log.info(`   📊 Profils existants:`)
        profiles.forEach(prof => {
          log.info(`      - ${prof.role}: ${prof.count}`)
        })
      } else {
        log.info(`   ℹ️  Aucun profil existant (normal si base vide)`)
      }
    } catch (e: any) {
      log.info(`   ⚠️  Erreur vérification données: ${e.message}`)
    }

    log.info('\n🎉 Vérification terminée avec succès !')
    log.info('\n✅ La migration Building Profile Role est appliquée et opérationnelle.\n')
    
    return true
  } catch (error: any) {
    log.error('\n❌ Erreur lors de la vérification:', error.message)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

verifyMigration()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    log.error('❌ Erreur fatale:', error)
    process.exit(1)
  })

