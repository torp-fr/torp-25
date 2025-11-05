import { NextRequest, NextResponse } from 'next/server'
import { DataGouvCadastreService } from '@/services/external-apis/datagouv-cadastre-service'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * GET /api/cadastre/datagouv
 * 
 * Récupère les informations du dataset Cadastre depuis data.gouv.fr
 * ou récupère les parcelles d'une commune
 * 
 * Paramètres :
 * - dataset=true: Retourne les informations du dataset
 * - commune={codeInsee}: Retourne les parcelles d'une commune
 * - code_insee={codeInsee}&section={section}&numero={numero}: Retourne une parcelle spécifique
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const datasetParam = searchParams.get('dataset')
    const commune = searchParams.get('commune') || searchParams.get('code_insee')
    const section = searchParams.get('section')
    const numero = searchParams.get('numero')

    const service = new DataGouvCadastreService()

    // Mode 1: Informations du dataset
    if (datasetParam === 'true') {
      const dataset = await service.getDatasetInfo()
      
      if (!dataset) {
        return NextResponse.json(
          { error: 'Impossible de récupérer les informations du dataset' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        dataset: {
          id: dataset.id,
          title: dataset.title,
          description: dataset.description,
          resources: dataset.resources.map((r) => ({
            id: r.id,
            title: r.title,
            format: r.format,
            url: r.url,
            filesize: r.filesize,
            last_modified: r.last_modified,
          })),
        },
      })
    }

    // Mode 2: Parcelle spécifique
    if (commune && section && numero) {
      const parcelle = await service.getParcelle(commune, section, numero)
      
      if (!parcelle) {
        return NextResponse.json(
          { error: 'Parcelle non trouvée' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        parcelle,
      })
    }

    // Mode 3: Toutes les parcelles d'une commune
    if (commune) {
      const parcelles = await service.getParcellesByCommune(commune)

      return NextResponse.json({
        success: true,
        commune,
        parcelles,
        count: parcelles.length,
      })
    }

    return NextResponse.json(
      { 
        error: 'Paramètres insuffisants',
        usage: {
          dataset: '?dataset=true',
          commune: '?commune={codeInsee}',
          parcelle: '?code_insee={codeInsee}&section={section}&numero={numero}',
        }
      },
      { status: 400 }
    )
  } catch (error) {
    log.error({ err: error }, '❌ Erreur')
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des données cadastrales',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

