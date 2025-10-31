/**
 * Script de pré-migration pour nettoyer les migrations échouées
 * S'exécute automatiquement avant `prisma migrate deploy`
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupFailedMigrations() {
  try {
    console.log('🧹 Nettoyage des migrations échouées...')

    // Supprimer les enregistrements de migrations RNB échouées
    const result = await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations"
      WHERE migration_name IN ('20250127_add_rnb_models', '20250128_add_rnb_models', '20250128_fix_rnb_migration')
      AND finished_at IS NULL
    `

    console.log(`✅ ${result} migration(s) échouée(s) nettoyée(s)`)
  } catch (error: any) {
    // Ignorer les erreurs (table peut ne pas exister ou migrations déjà nettoyées)
    if (error?.code === 'P2021' || error?.code === 'P1001') {
      console.log('ℹ️  Table _prisma_migrations non accessible ou migrations déjà nettoyées')
    } else {
      console.warn('⚠️  Erreur lors du nettoyage (non bloquant):', error?.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

cleanupFailedMigrations()

