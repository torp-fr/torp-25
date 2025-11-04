/**
 * API Route pour l'import progressif des données RNB
 * POST /api/rnb/import
 * 
 * Body: {
 *   department: string (01-95, 971-978)
 *   maxRows?: number (optionnel, pour test)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { RNBImporter } from '@/services/external-apis/rnb-importer'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  department: z.string().regex(/^(0[1-9]|[1-9][0-9]|97[1-8])$/, 'Code département invalide'),
  maxRows: z.number().int().positive().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = importSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { department, maxRows } = parsed.data

    const importer = new RNBImporter()
    const result = await importer.importDepartment({
      department,
      maxRows,
      onProgress: (progress) => {
        // TODO: Utiliser Server-Sent Events ou WebSocket pour notifier la progression en temps réel
        log.debug({ department, percentage: progress.percentage }, 'Progression import RNB')
      },
    })

    return NextResponse.json({
      success: result.success,
      department,
      indexed: result.indexed,
      errors: result.errors,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur import RNB')
    return NextResponse.json(
      {
        error: 'Failed to import RNB data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rnb/import
 * Récupère les jobs d'import actifs et les statistiques
 */
export async function GET() {
  try {
    const { RNBIndexer } = await import('@/services/external-apis/rnb-indexer')
    const indexer = new RNBIndexer()

    const [activeJobs, stats] = await Promise.all([
      indexer.getActiveImportJobs(),
      indexer.getIndexingStats(),
    ])

    return NextResponse.json({
      success: true,
      activeJobs,
      stats,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur récupération jobs RNB')
    return NextResponse.json(
      {
        error: 'Failed to fetch import jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

