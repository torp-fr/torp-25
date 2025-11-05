import { NextRequest, NextResponse } from 'next/server'
import { SireneService } from '@/services/external-apis/sirene-service'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * GET /api/companies/search?q={query}&department={dept}&page={page}&perPage={perPage}
 * Recherche des entreprises par nom ou critères
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const department = searchParams.get('department') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('perPage') || '20', 10)

    if (!query) {
      return NextResponse.json(
        { error: 'Le paramètre "q" (requête) est requis' },
        { status: 400 }
      )
    }

    const sireneService = new SireneService()
    const results = await sireneService.searchCompanies(query, {
      department,
      page,
      perPage,
      status: 'ACTIVE',
    })

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    log.error('[API Companies Search] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la recherche d\'entreprises',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

