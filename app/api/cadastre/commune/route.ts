import { NextRequest, NextResponse } from 'next/server'
import { APICartoCadastreService, type APICartoCommuneParams } from '@/services/external-apis/apicarto-cadastre-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cadastre/commune?code_insee={code}&code_dep={dept}&geom={geoJSON}
 * Récupère les limites géométriques d'une commune
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codeInsee = searchParams.get('code_insee') || undefined
    const codeDep = searchParams.get('code_dep') || undefined
    const geomParam = searchParams.get('geom')
    const limit = parseInt(searchParams.get('_limit') || '500', 10)
    const start = parseInt(searchParams.get('_start') || '0', 10)
    const source = (searchParams.get('source_ign') || 'PCI') as 'PCI' | 'BDP'

    if (!codeInsee && !codeDep && !geomParam) {
      return NextResponse.json(
        { error: 'Au moins un paramètre est requis: code_insee, code_dep, ou geom' },
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
    const params: APICartoCommuneParams = {
      code_insee: codeInsee,
      code_dep: codeDep,
      geom,
      _limit: Math.min(limit, 500),
      _start: start,
      source_ign: source,
    }

    const result = await service.getCommune(params)

    return NextResponse.json({
      success: true,
      count: result.features.length,
      data: result,
    })
  } catch (error) {
    console.error('[API Cadastre Commune] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des données de commune',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

