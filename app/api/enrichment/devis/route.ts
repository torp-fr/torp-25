/**
 * API Route pour enrichir les données d'un devis
 * POST /api/enrichment/devis
 */

import { NextRequest, NextResponse } from 'next/server'
import { DataEnrichmentService } from '@/services/data-enrichment/enrichment-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const enrichmentRequestSchema = z.object({
  extractedData: z.object({
    company: z.object({
      name: z.string(),
      siret: z.string().optional(),
    }),
    items: z.array(z.any()).optional(),
  }),
  projectType: z.string().default('renovation'),
  tradeType: z.string().optional(),
  region: z.string().default('ILE_DE_FRANCE'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = enrichmentRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { extractedData, projectType, tradeType, region } = parsed.data

    const enrichmentService = new DataEnrichmentService()
    const enrichment = await enrichmentService.enrichDevis(
      extractedData as any,
      projectType,
      tradeType,
      region
    )

    return NextResponse.json({
      success: true,
      data: enrichment,
    })
  } catch (error) {
    console.error('[API Enrichment] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to enrich devis data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

