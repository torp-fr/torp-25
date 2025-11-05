/**
 * API Route pour générer les insights LLM améliorés d'une analyse
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { InsightsGenerator } from '@/services/llm/insights-generator'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: devisId } = await params

    // Récupérer le devis avec son score
    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        torpScores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!devis || !devis.torpScores[0]) {
      return NextResponse.json(
        { error: 'Devis ou score non trouvé' },
        { status: 404 }
      )
    }

    const score = devis.torpScores[0]
    const extractedData = devis.extractedData as any
    const enrichedData = (devis as any).enrichedData || {}

    log.debug({
      hasExtractedData: !!extractedData,
      hasEnrichedData: !!enrichedData,
      hasCompanyEnrichment: !!enrichedData?.company,
      companySiret:
        enrichedData?.company?.siret || extractedData?.company?.siret || 'N/A',
    }, 'Données disponibles pour insights')

    // Récupérer les données d'entreprise enrichies (TOUTES les données)
    let companyData: any = null
    const companyEnrichment = enrichedData?.company

    if (extractedData?.company?.siret || companyEnrichment) {
      // Récupérer toutes les données enrichies disponibles
      companyData = {
        siret: extractedData?.company?.siret || companyEnrichment?.siret,
        siren: companyEnrichment?.siren,
        name: extractedData?.company?.name || companyEnrichment?.name,
        legalStatus: companyEnrichment?.legalStatus,
        address: companyEnrichment?.address,
        activities: companyEnrichment?.activities,
        financialData: companyEnrichment?.financialData,
        financialScore: companyEnrichment?.financialScore,
        financialHealth: companyEnrichment?.financialHealth,
        legalStatusDetails: companyEnrichment?.legalStatusDetails,
        legalStatusInfo: companyEnrichment?.legalStatus,
        insurances: companyEnrichment?.insurances,
        certifications: companyEnrichment?.certifications,
        qualifications: companyEnrichment?.qualifications,
        reputation: companyEnrichment?.reputation,
        portfolio: companyEnrichment?.portfolio,
        humanResources: companyEnrichment?.humanResources,
      }

      log.debug({
        hasSiret: !!companyData.siret,
        hasFinancialData: !!companyData.financialData,
        hasReputation: !!companyData.reputation,
        hasQualifications: !!companyData.qualifications?.length,
        hasPortfolio: !!companyData.portfolio,
        hasHumanResources: !!companyData.humanResources,
      }, 'Données entreprise disponibles')
    }

    // TODO: Récupérer les données du bâtiment lié au devis
    // Nécessite une relation Devis <-> BuildingProfile dans le schéma Prisma
    // Pour l'instant, buildingData reste null
    let buildingData: any = null

    // Optionnel : Si un projectCCF existe et contient une adresse, on pourrait
    // chercher un BuildingProfile correspondant, mais c'est complexe
    // et potentiellement inexact. À implémenter plus tard.

    // Générer les insights avec LLM
    const insightsGenerator = new InsightsGenerator()
    const insights = await insightsGenerator.generateInsights({
      extractedData,
      score: {
        scoreValue: Number(score.scoreValue),
        scoreGrade: score.scoreGrade,
        confidenceLevel: Number(score.confidenceLevel),
        breakdown: score.breakdown as any,
        alerts: (score.alerts as any) || [],
        recommendations: (score.recommendations as any) || [],
      },
      companyData,
      buildingData,
    })

    return NextResponse.json({
      success: true,
      data: insights,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur génération insights')
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération des insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
