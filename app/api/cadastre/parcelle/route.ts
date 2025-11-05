import { NextRequest, NextResponse } from 'next/server'
import { APICartoCadastreService, type APICartoParcelleParams } from '@/services/external-apis/apicarto-cadastre-service'
import { loggers } from '@/lib/logger'

nconst log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * GET /api/cadastre/parcelle?code_insee={code}&section={section}&numero={numero}&geom={geoJSON}
 * Récupère les parcelles cadastrales d'une commune
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codeInsee = searchParams.get('code_insee') || undefined
    const section = searchParams.get('section') || undefined
    const numero = searchParams.get('numero') || undefined
    const codeArr = searchParams.get('code_arr') || undefined
    const comAbs = searchParams.get('com_abs') || undefined
    const geomParam = searchParams.get('geom')
    const limit = parseInt(searchParams.get('_limit') || '1000', 10)
    const start = parseInt(searchParams.get('_start') || '0', 10)
    const source = (searchParams.get('source_ign') || 'PCI') as 'PCI' | 'BDP'

    if (!codeInsee && !geomParam) {
      return NextResponse.json(
        { error: 'Au moins un paramètre est requis: code_insee ou geom' },
        { status: 400 }
      )
    }

    let geom
    if (geomParam) {
      try {
        geom = typeof geomParam === 'string' ? JSON.parse(geomParam) : geomParam
      } catch (error) {
        return NextResponse.json(
          { error: 'Paramètre geom invalide (doit être un GeoJSON valide)' },
          { status: 400 }
        )
      }
    }

    const service = new APICartoCadastreService()
    const params: APICartoParcelleParams = {
      code_insee: codeInsee,
      section,
      numero,
      code_arr: codeArr,
      com_abs: comAbs,
      geom,
      _limit: Math.min(limit, 1000),
      _start: start,
      source_ign: source,
    }

    const result = await service.getParcelles(params)

    return NextResponse.json({
      success: true,
      count: result.features.length,
      data: result,
    })
  } catch (error) {
    log.error('[API Cadastre Parcelle] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des parcelles cadastrales',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

