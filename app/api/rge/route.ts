import { NextRequest, NextResponse } from 'next/server'
import { RGEService } from '@/services/external-apis/rge-service'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

/**
 * GET /api/rge
 * 
 * Mode 1: Récupère les ressources disponibles du dataset (si ?resources=true)
 * Mode 2: Récupère les informations de certification RGE d'une entreprise
 * 
 * Paramètres :
 * - resources=true: Retourne la liste des ressources disponibles
 * - siret: SIRET de l'entreprise (requis si resources != true)
 * - activities: Domaines d'activité à vérifier (optionnel, séparés par des virgules)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const resourcesParam = searchParams.get('resources')
    
    // Mode 1: Retourner les ressources disponibles
    if (resourcesParam === 'true') {
      const rgeService = new RGEService()
      const dataset = await rgeService.getDatasetInfo()
      
      if (!dataset || !dataset.resources) {
        return NextResponse.json({
          success: true,
          resources: [],
        })
      }

      const resources = dataset.resources
        .filter((r) => r.format === 'csv' || r.format === 'json')
        .map((r) => ({
          id: r.id,
          title: r.title,
          format: r.format,
          url: r.url,
          filesize: r.filesize,
          last_modified: r.last_modified,
        }))
        .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())

      return NextResponse.json({
        success: true,
        resources,
      })
    }

    // Mode 2: Recherche par SIRET
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
    log.error({ err: error }, 'Erreur récupération certification RGE')
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
    log.error({ err: error }, 'Erreur vérification certification RGE')
    return NextResponse.json(
      {
        error: 'Erreur lors de la vérification de la certification RGE',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

