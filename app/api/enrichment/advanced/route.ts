/**
 * API Route pour l'enrichissement avancé complet
 * POST /api/enrichment/advanced
 * 
 * Enrichit un devis avec toutes les sources disponibles :
 * - INSEE Sirene (gratuite)
 * - Infogreffe (optionnel)
 * - Pappers (optionnel)
 * - Réputation (multi-sources)
 * - Prix de référence
 * - Conformité
 * - Météo
 */

import { NextRequest, NextResponse } from 'next/server'
import { AdvancedEnrichmentService } from '@/services/data-enrichment/advanced-enrichment-service'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const enrichmentRequestSchema = z.object({
  extractedData: z.object({
    company: z.object({
      name: z.string(),
      siret: z.string().optional(),
      address: z.string().optional(),
    }),
    items: z.array(z.any()).optional(),
    project: z.object({
      title: z.string().optional(),
      location: z.string().optional(),
    }).optional(),
  }),
  projectType: z.enum(['construction', 'renovation', 'extension', 'maintenance']).default('renovation'),
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

    const enrichmentService = new AdvancedEnrichmentService()
    const enrichment = await enrichmentService.enrichForScoring(
      extractedData as any,
      projectType,
      tradeType,
      region
    )

    return NextResponse.json({
      success: true,
      data: enrichment,
      metadata: {
        sources: extractSources(enrichment),
        confidence: calculateConfidence(enrichment),
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    return NextResponse.json(
      {
        error: 'Failed to enrich devis data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Fonctions helper
function extractSources(enrichment: any): string[] {
  const sources: string[] = []
  if (enrichment.company?.siret) sources.push('Sirene')
  if (enrichment.company?.financialData) sources.push('Infogreffe')
  if (enrichment.company?.reputation) sources.push('Réputation')
  if (enrichment.priceReferences?.length > 0) sources.push('Prix Référence')
  if (enrichment.regionalData) sources.push('Données Régionales')
  if (enrichment.complianceData) sources.push('Conformité')
  if (enrichment.weatherData) sources.push('Météo')
  return sources
}

function calculateConfidence(enrichment: any): number {
  let confidence = 70
  if (enrichment.company?.financialData) confidence += 10
  if (enrichment.company?.reputation) confidence += 5
  if (enrichment.company?.legalStatusDetails) confidence += 5
  if (enrichment.priceReferences?.length > 0) confidence += 5
  if (enrichment.regionalData) confidence += 3
  if (enrichment.complianceData) confidence += 2
  return Math.min(100, confidence)
}

