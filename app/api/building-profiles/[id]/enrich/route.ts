import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileService } from '@/services/building-profile-service'

export const dynamic = 'force-dynamic'

/**
 * POST /api/building-profiles/[id]/enrich
 * Relance l'enrichissement automatique d'un profil
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const result = await service.refreshEnrichment(params.id, userId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[API Building Profile Enrich] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'enrichissement du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

