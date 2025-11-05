import { NextRequest, NextResponse } from 'next/server'
import { SireneService } from '@/services/external-apis/sirene-service'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * POST /api/companies/verify
 * Vérifie et certifie les données d'une entreprise
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siren, siret, name, address } = body

    if (!siren && !siret && !name) {
      return NextResponse.json(
        { error: 'Au moins un identifiant est requis (SIREN, SIRET, ou nom)' },
        { status: 400 }
      )
    }

    const sireneService = new SireneService()
    const verification = await sireneService.verifyCompany({
      siren,
      siret,
      name,
      address,
    })

    return NextResponse.json({
      success: true,
      verification,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    return NextResponse.json(
      {
        error: 'Erreur lors de la vérification de l\'entreprise',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

