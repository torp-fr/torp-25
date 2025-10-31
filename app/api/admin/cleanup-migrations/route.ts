/**
 * API Route pour nettoyer automatiquement les migrations RNB échouées
 * Accessible depuis Vercel, utilise DATABASE_URL de l'environnement
 * 
 * Usage: GET /api/admin/cleanup-migrations
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('[API Cleanup] Démarrage du nettoyage automatique...')

    const results = {
      migrations: { deleted: 0, errors: [] as string[] },
      tables: { dropped: 0, errors: [] as string[] },
      enum: { dropped: false, errors: [] as string[] },
      success: false,
    }

    // 1. Supprimer les migrations échouées
    try {
      const deletedMigrations = await prisma.$executeRaw`
        DELETE FROM "_prisma_migrations" 
        WHERE (
          migration_name LIKE '%rnb%' 
          OR migration_name LIKE '%RNB%'
          OR migration_name IN (
            '20250127_add_rnb_models',
            '20250128_add_rnb_models', 
            '20250128_fix_rnb_migration',
            '20250129_resolve_rnb_migration'
          )
        )
        AND finished_at IS NULL
      `
      results.migrations.deleted = deletedMigrations as number
      console.log(`[API Cleanup] ${results.migrations.deleted} migration(s) supprimée(s)`)
    } catch (error: any) {
      results.migrations.errors.push(error.message)
      console.error('[API Cleanup] Erreur suppression migrations:', error)
    }

    // 2. Supprimer les tables
    try {
      const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
      `

      for (const table of tables) {
        try {
          await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE`)
          results.tables.dropped++
          console.log(`[API Cleanup] Table ${table.table_name} supprimée`)
        } catch (error: any) {
          results.tables.errors.push(`Table ${table.table_name}: ${error.message}`)
        }
      }
    } catch (error: any) {
      results.tables.errors.push(error.message)
      console.error('[API Cleanup] Erreur suppression tables:', error)
    }

    // 3. Supprimer l'enum
    try {
      const enumExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'rnb_import_status'
        ) as exists
      `

      if (enumExists[0]?.exists) {
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "rnb_import_status" CASCADE`)
        results.enum.dropped = true
        console.log('[API Cleanup] Enum rnb_import_status supprimé')
      }
    } catch (error: any) {
      results.enum.errors.push(error.message)
      console.error('[API Cleanup] Erreur suppression enum:', error)
    }

    // 4. Vérification finale
    const remainingFailed = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM "_prisma_migrations" 
      WHERE (migration_name LIKE '%rnb%' OR migration_name LIKE '%RNB%')
      AND finished_at IS NULL
    `
    
    const remainingTables = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rnb_buildings', 'rnb_import_jobs')
    `
    
    const remainingEnum = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM pg_type 
      WHERE typname = 'rnb_import_status'
    `
    
    const failedCount = Number(remainingFailed[0]?.count || 0)
    const tablesCount = Number(remainingTables[0]?.count || 0)
    const enumCount = Number(remainingEnum[0]?.count || 0)

    results.success = failedCount === 0 && tablesCount === 0 && enumCount === 0

    return NextResponse.json({
      success: results.success,
      message: results.success
        ? '✅ Nettoyage réussi ! La base est prête pour la nouvelle migration.'
        : '⚠️  Nettoyage partiel. Certains objets peuvent encore exister.',
      results: {
        migrations: {
          deleted: results.migrations.deleted,
          remaining: failedCount,
          errors: results.migrations.errors,
        },
        tables: {
          dropped: results.tables.dropped,
          remaining: tablesCount,
          errors: results.tables.errors,
        },
        enum: {
          dropped: results.enum.dropped,
          remaining: enumCount,
          errors: results.enum.errors,
        },
      },
      nextStep: results.success
        ? 'Vous pouvez maintenant relancer le déploiement Vercel. La migration 20250129_add_rnb_models devrait s\'appliquer.'
        : 'Vérifiez les erreurs et réessayez, ou utilisez le script SQL directement dans Railway.',
    })
  } catch (error: any) {
    console.error('[API Cleanup] Erreur fatale:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors du nettoyage',
        message: error.message,
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

