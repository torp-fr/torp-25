/**
 * API Route pour récupérer les prix de référence
 * GET /api/enrichment/prices?category=...&region=...&item=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { PriceEnrichmentService } from '@/services/data-enrichment/price-service'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'renovation'
    const region = searchParams.get('region') || 'ILE_DE_FRANCE'
    const item = searchParams.get('item') || undefined

    const priceService = new PriceEnrichmentService()

    // Récupérer les prix de référence
    const priceReferences = await priceService.getPriceReferences(
      category,
      region,
      item
    )

    // Récupérer les données régionales
    const regionalData = await priceService.getRegionalData(region)

    return NextResponse.json({
      success: true,
      data: {
        priceReferences,
        regionalData,
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    return NextResponse.json(
      {
        error: 'Failed to fetch price references',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

