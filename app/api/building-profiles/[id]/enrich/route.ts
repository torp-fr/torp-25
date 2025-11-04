import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileService } from '@/services/building-profile-service'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

/**
 * POST /api/building-profiles/[id]/enrich
 * Relance l'enrichissement automatique d'un profil
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    log.info({ profileId: id, userId }, 'Démarrage enrichissement')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()

    // Appeler refreshEnrichment qui va appeler enrichProfile
    log.debug({ profileId: id }, 'Appel refreshEnrichment')
    const startTime = Date.now()

    const result = await service.refreshEnrichment(id, userId)

    const duration = Date.now() - startTime
    log.info({
      profileId: id,
      duration,
      success: result.success,
      sourcesCount: result.sources.length,
      sources: result.sources,
      errorsCount: result.errors?.length || 0,
      errors: result.errors,
      enrichedAt: result.enrichedAt,
    }, 'Enrichissement terminé')

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur enrichissement profil')
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'enrichissement du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

