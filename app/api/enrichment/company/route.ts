/**
 * API Route pour enrichir les données d'une entreprise
 * GET /api/enrichment/company?siret=...
 * GET /api/enrichment/company?name=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCompanyEnrichmentService } from '@/lib/service-factory'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Company Enrichment API')

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

    // Use singleton service instance to prevent memory leaks
    const companyService = getCompanyEnrichmentService()

    if (siret) {
      const enrichment = await companyService.enrichFromSiret(siret)
      if (!enrichment) {
        return NextResponse.json(
          {
            error: 'Company not found',
            message: `No company data found for SIRET: ${siret}`,
          },
          { status: 404 }
        )
      }
      return NextResponse.json({
        success: true,
        data: enrichment,
      })
    }

    if (name) {
      const results = await companyService.searchByName(name, 10)
      if (!results || results.length === 0) {
        return NextResponse.json(
          {
            error: 'No results found',
            message: `No companies found matching: ${name}`,
          },
          { status: 404 }
        )
      }
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
    logger.error('Company enrichment failed', error)
    return NextResponse.json(
      {
        error: 'Failed to enrich company data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

