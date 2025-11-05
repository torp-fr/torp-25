import { NextRequest, NextResponse } from 'next/server'
import { BuildingRecommendationsService } from '@/services/building-recommendations-service'
import { BuildingInsightsGenerator } from '@/services/llm/building-insights-generator'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * GET /api/building-profiles/[id]/recommendations
 * Récupère les recommandations et notifications pour un profil de logement
 * Utilise un Agent IA (Claude) pour générer des recommandations intelligentes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const useAI = searchParams.get('useAI') !== 'false' // Par défaut, utiliser l'IA

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

    let recommendations, notifications, additionalInsights

    // Utiliser l'Agent IA si activé et si des données enrichies sont disponibles
    if (useAI && (profile.enrichedData || profile.dpeData)) {
      try {
        log.debug({ profileId }, 'Génération recommandations via Agent IA')

        const aiGenerator = new BuildingInsightsGenerator()
        const aiInsights = await aiGenerator.generateInsights({
          address: profile.address,
          enrichedData: profile.enrichedData,
          dpeData: profile.dpeData,
          cadastralData: profile.cadastralData,
          rnbData: profile.rnbData,
          documents,
          customFields: profile.customFields,
        })

        recommendations = aiInsights.recommendations
        notifications = aiInsights.notifications
        additionalInsights = {
          riskAssessment: aiInsights.riskAssessment,
          valuationInsights: aiInsights.valuationInsights,
          energyInsights: aiInsights.energyInsights,
          generatedBy: 'ai',
        }

        log.debug({
          recommendationsCount: recommendations.length,
          notificationsCount: notifications.length,
          riskScore: aiInsights.riskAssessment.riskScore,
        }, 'Recommandations IA générées')
      } catch (aiError) {
        log.warn({ err: aiError }, 'Erreur Agent IA, fallback vers logique règles')

        // Fallback vers l'ancien service basé sur des règles
        const recommendationsService = new BuildingRecommendationsService()
        recommendations = recommendationsService.generateRecommendations(
          profile.enrichedData,
          profile.dpeData,
          profile.enrichedData?.georisques
        )
        notifications = recommendationsService.generateNotifications(profile, documents)
        additionalInsights = { generatedBy: 'rules', fallbackReason: 'ai_error' }
      }
    } else {
      // Utiliser l'ancien service basé sur des règles
      log.debug({ profileId, useAI, hasData: !!(profile.enrichedData || profile.dpeData) }, 'Génération recommandations via règles')

      const recommendationsService = new BuildingRecommendationsService()
      recommendations = recommendationsService.generateRecommendations(
        profile.enrichedData,
        profile.dpeData,
        profile.enrichedData?.georisques
      )
      notifications = recommendationsService.generateNotifications(profile, documents)
      additionalInsights = { generatedBy: 'rules' }
    }

    return NextResponse.json({
      success: true,
      data: {
        recommendations,
        notifications,
        insights: additionalInsights,
        counts: {
          recommendations: recommendations.length,
          notifications: notifications.length,
          unreadNotifications: notifications.filter((n: any) => !n.read).length,
        },
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des recommandations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

