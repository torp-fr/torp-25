import { NextRequest, NextResponse } from 'next/server'
import { BuildingRecommendationsService } from '@/services/building-recommendations-service'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * GET /api/building-profiles/[id]/recommendations
 * Récupère les recommandations et notifications pour un profil de logement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    // Récupérer le profil complet
    const profileResponse = await fetch(
      `${request.nextUrl.origin}/api/building-profiles/${profileId}?userId=${userId}`
    )

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      )
    }

    const profileData = await profileResponse.json()
    const profile = profileData.data

    // Récupérer les documents
    const documentsResponse = await fetch(
      `${request.nextUrl.origin}/api/building-profiles/${profileId}/documents?userId=${userId}`
    )
    const documentsData = documentsResponse.ok ? await documentsResponse.json() : { data: [] }
    const documents = documentsData.data || []

    // Générer les recommandations et notifications
    const recommendationsService = new BuildingRecommendationsService()
    
    const recommendations = recommendationsService.generateRecommendations(
      profile.enrichedData,
      profile.dpeData,
      profile.enrichedData?.georisques
    )

    const notifications = recommendationsService.generateNotifications(
      profile,
      documents
    )

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        notifications,
        counts: {
          recommendations: recommendations.length,
          notifications: notifications.length,
          unreadNotifications: notifications.filter(n => !n.read).length,
        },
      },
    })
  } catch (error) {
    log.error('[API Building Profiles Recommendations] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des recommandations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

