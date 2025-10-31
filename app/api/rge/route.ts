import { NextRequest, NextResponse } from 'next/server'
import { RGEService } from '@/services/external-apis/rge-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/rge
 * Récupère les informations de certification RGE d'une entreprise
 * Paramètres :
 * - siret: SIRET de l'entreprise (requis)
 * - activities: Domaines d'activité à vérifier (optionnel, séparés par des virgules)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const siret = searchParams.get('siret')
    const activitiesParam = searchParams.get('activities')

    if (!siret) {
      return NextResponse.json(
        { error: 'Le paramètre "siret" est requis' },
        { status: 400 }
      )
    }

    const rgeService = new RGEService()
    
    // Si des activités sont spécifiées, vérifier la certification complète
    if (activitiesParam) {
      const requiredActivities = activitiesParam.split(',').map(a => a.trim()).filter(Boolean)
      const verification = await rgeService.verifyRGECertification(siret, requiredActivities)
      
      return NextResponse.json({
        success: true,
        data: verification,
      })
    }

    // Sinon, récupérer simplement la certification
    const certification = await rgeService.getRGECertification(siret)

    if (!certification) {
      return NextResponse.json(
        {
          success: true,
          message: 'Aucune certification RGE trouvée pour ce SIRET',
          data: null,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: certification,
    })
  } catch (error) {
    console.error('[API RGE GET] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération de la certification RGE',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rge/verify
 * Vérifie si une entreprise est certifiée RGE pour des activités spécifiques
 * Body: { siret: string, activities: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siret, activities } = body

    if (!siret) {
      return NextResponse.json(
        { error: 'Le paramètre "siret" est requis' },
        { status: 400 }
      )
    }

    const rgeService = new RGEService()
    const verification = await rgeService.verifyRGECertification(siret, activities)

    return NextResponse.json({
      success: true,
      data: verification,
    })
  } catch (error) {
    console.error('[API RGE POST] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la vérification de la certification RGE',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

