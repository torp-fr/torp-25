/**
 * API Route pour enrichir les données d'une entreprise
 * GET /api/enrichment/company?siret=...
 * GET /api/enrichment/company?name=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { CompanyEnrichmentService } from '@/services/data-enrichment/company-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siret = searchParams.get('siret')
    const name = searchParams.get('name')

    if (!siret && !name) {
      return NextResponse.json(
        {
          error: 'Missing parameter',
          message: 'Either "siret" or "name" parameter is required',
        },
        { status: 400 }
      )
    }

    const companyService = new CompanyEnrichmentService()

    if (siret) {
      const enrichment = await companyService.enrichFromSiret(siret)
      return NextResponse.json({
        success: true,
        data: enrichment,
      })
    }

    if (name) {
      const results = await companyService.searchByName(name, 10)
      return NextResponse.json({
        success: true,
        data: results,
      })
    }

    return NextResponse.json(
      {
        error: 'Invalid parameters',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API Company Enrichment] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to enrich company data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

