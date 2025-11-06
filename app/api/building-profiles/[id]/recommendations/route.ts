import { NextRequest, NextResponse } from 'next/server'
import { BuildingRecommendationsService } from '@/services/building-recommendations-service'
import { BuildingProfileService } from '@/services/building-profile-service'
import { prisma } from '@/lib/db'

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

    console.log('[API Recommendations] 🔄 Chargement recommandations pour:', { profileId, userId })

    if (!userId) {
      console.log('[API Recommendations] ❌ userId manquant')
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    // Récupérer le profil complet directement via le service
    const profileService = new BuildingProfileService()
    let profile
    try {
      profile = await profileService.getProfileById(profileId, userId)
      console.log('[API Recommendations] ✅ Profil chargé:', {
        id: profile.id,
        hasEnrichedData: !!profile.enrichedData,
        hasDPEData: !!profile.dpeData,
        enrichmentStatus: profile.enrichmentStatus
      })
    } catch (error) {
      console.error('[API Recommendations] ❌ Erreur chargement profil:', error)
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer les documents directement via Prisma
    let documents: any[] = []
    try {
      documents = await prisma.buildingDocument.findMany({
        where: { buildingProfileId: profileId },
        orderBy: { createdAt: 'desc' },
      })
      console.log('[API Recommendations] ✅ Documents chargés:', documents.length)
    } catch (error) {
      console.log('[API Recommendations] ⚠️ Erreur chargement documents (non bloquant):', error instanceof Error ? error.message : 'Unknown error')
      documents = []
    }

    // Générer les recommandations et notifications
    const recommendationsService = new BuildingRecommendationsService()

    const recommendations = recommendationsService.generateRecommendations(
      profile.enrichedData as any,
      profile.dpeData as any,
      (profile.enrichedData as any)?.georisques
    )

    const notifications = recommendationsService.generateNotifications(
      profile,
      documents
    )

    console.log('[API Recommendations] ✅ Recommandations générées:', {
      recommendations: recommendations.length,
      notifications: notifications.length
    })

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
    console.error('[API Building Profiles Recommendations] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des recommandations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

