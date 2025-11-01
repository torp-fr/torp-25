import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileService } from '@/services/building-profile-service'

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

    console.log('[API Enrich] 🚀 Démarrage enrichissement:', { profileId: id, userId })

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    
    // Appeler refreshEnrichment qui va appeler enrichProfile
    console.log('[API Enrich] 📞 Appel refreshEnrichment...')
    const result = await service.refreshEnrichment(id, userId)
    
    console.log('[API Enrich] ✅ Enrichissement terminé:', {
      success: result.success,
      sources: result.sources.length,
      errors: result.errors?.length || 0,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[API Enrich] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'enrichissement du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

