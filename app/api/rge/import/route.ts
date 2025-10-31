import { NextRequest, NextResponse } from 'next/server'
import { RGEImporter } from '@/services/external-apis/rge-importer'
import { RGEService } from '@/services/external-apis/rge-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const importRequestSchema = z.object({
  resourceUrl: z.string().url().optional(),
  resourceId: z.string().optional(),
  autoDetect: z.boolean().default(true).optional(), // Si true, détecte automatiquement la ressource
  maxRows: z.number().positive().optional(), // Limite pour import partiel
  batchSize: z.number().positive().default(1000).optional(),
})

/**
 * POST /api/rge/import
 * Lance l'import d'un fichier RGE depuis data.gouv.fr
 * 
 * Body:
 * - resourceUrl: URL directe du fichier (optionnel si autoDetect=true)
 * - resourceId: ID de la ressource data.gouv.fr (optionnel)
 * - autoDetect: Si true, détecte automatiquement la dernière ressource du dataset
 * - maxRows: Limite de lignes à importer (optionnel, pour tests)
 * - batchSize: Taille des batches d'indexation (défaut: 1000)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = importRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { resourceUrl, resourceId, autoDetect = true, maxRows, batchSize = 1000 } = parsed.data

    const rgeService = new RGEService()
    const importer = new RGEImporter()

    let finalResourceUrl = resourceUrl
    let finalResourceId = resourceId
    let finalResourceTitle: string | undefined
    let finalResourceFormat: string | undefined

    // Auto-détection de la ressource si demandé
    if (autoDetect && !resourceUrl) {
      console.log('[RGE Import API] 🔍 Auto-détection de la ressource...')
      
      const dataset = await rgeService.getDatasetInfo()
      if (!dataset || !dataset.resources || dataset.resources.length === 0) {
        return NextResponse.json(
          { error: 'Aucune ressource disponible dans le dataset RGE' },
          { status: 404 }
        )
      }

      // Chercher la ressource la plus récente
      const latestResource = dataset.resources
        .filter((r) => r.format === 'csv' || r.format === 'json')
        .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0]

      if (!latestResource) {
        return NextResponse.json(
          { error: 'Aucune ressource CSV/JSON trouvée' },
          { status: 404 }
        )
      }

      finalResourceUrl = latestResource.url
      finalResourceId = latestResource.id
      finalResourceTitle = latestResource.title
      finalResourceFormat = latestResource.format

      console.log(`[RGE Import API] ✅ Ressource sélectionnée: ${latestResource.title} (${latestResource.format})`)
    }

    if (!finalResourceUrl) {
      return NextResponse.json(
        { error: 'URL de ressource requise' },
        { status: 400 }
      )
    }

    console.log(`[RGE Import API] 🚀 Démarrage import depuis: ${finalResourceUrl}`)
    if (maxRows) {
      console.log(`[RGE Import API] 📊 Import limité à ${maxRows} lignes`)
    }

      // Lancer l'import en arrière-plan (ne pas bloquer la réponse)
      // L'import se poursuivra même après la réponse HTTP
      importer.importResource({
        resourceUrl: finalResourceUrl,
        resourceId: finalResourceId,
        resourceTitle: finalResourceTitle,
        resourceFormat: finalResourceFormat,
        maxRows,
        batchSize,
        onProgress: (progress) => {
          console.log(
            `[RGE Import API] 📈 Progression: ${progress.percentage.toFixed(1)}% (${progress.processed}/${progress.total || '?'})`
          )
        },
      }).catch((error) => {
        console.error('[RGE Import API] ❌ Erreur lors de l\'import:', error)
      })

    return NextResponse.json({
      success: true,
      message: 'Import démarré',
      resource: {
        url: finalResourceUrl,
        id: finalResourceId,
        title: finalResourceTitle,
        format: finalResourceFormat,
      },
      options: {
        maxRows,
        batchSize,
      },
      note: 'L\'import se poursuit en arrière-plan. Consultez les logs pour suivre la progression.',
    })
  } catch (error) {
    console.error('[RGE Import API] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors du démarrage de l\'import',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rge/import
 * Récupère les statistiques d'indexation et les jobs actifs
 */
export async function GET(_request: NextRequest) {
  try {
    const { RGEIndexer } = await import('@/services/external-apis/rge-indexer')
    const indexer = new RGEIndexer()

    const [stats, activeJobs] = await Promise.all([
      indexer.getIndexingStats(),
      indexer.getActiveImportJobs(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats,
        activeJobs,
      },
    })
  } catch (error) {
    console.error('[RGE Import API] ❌ Erreur récupération stats:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des statistiques',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

