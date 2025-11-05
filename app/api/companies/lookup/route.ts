import { NextRequest, NextResponse } from 'next/server'
import { SireneService } from '@/services/external-apis/sirene-service'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * GET /api/companies/lookup?siren={siren} ou /api/companies/lookup?siret={siret}
 * Récupère les informations complètes d'une entreprise par SIREN ou SIRET
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const siren = searchParams.get('siren')
    const siret = searchParams.get('siret')

    if (!siren && !siret) {
      return NextResponse.json(
        { error: 'Un SIREN ou SIRET est requis' },
        { status: 400 }
      )
    }

    const sireneService = new SireneService()
    let company

    if (siret) {
      company = await sireneService.getCompanyBySiret(siret)
    } else if (siren) {
      company = await sireneService.getCompanyBySiren(siren)
    }

    if (!company) {
      return NextResponse.json(
        { error: 'Entreprise non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      company,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération de l\'entreprise',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

