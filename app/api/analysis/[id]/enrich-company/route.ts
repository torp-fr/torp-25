/**
 * API Route pour enrichir les données d'entreprise d'une analyse
 * GET /api/analysis/[id]/enrich-company
 *
 * Récupère le SIRET du devis et enrichit les données d'entreprise
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyEnrichmentService } from '@/services/data-enrichment/company-service'
import { AdvancedEnrichmentService } from '@/services/data-enrichment/advanced-enrichment-service'
import type { ExtractedDevisData } from '@/services/llm/document-analyzer'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: devisId } = await params

    // Récupérer le devis avec les données extraites
    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
    })

    if (!devis) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 })
    }

    const extractedData = devis.extractedData as any
    const siret = extractedData?.company?.siret

    if (!siret) {
      return NextResponse.json(
        {
          error: 'SIRET non disponible',
          message: "Le SIRET n'a pas pu être extrait du devis",
        },
        { status: 400 }
      )
    }

    // Utiliser AdvancedEnrichmentService pour un enrichissement complet
    // Cela inclut réputation, certifications RGE, qualifications, etc.
    try {
      const advancedService = new AdvancedEnrichmentService()
      const scoringEnrichment = await advancedService.enrichForScoring(
        extractedData as ExtractedDevisData,
        devis.projectType || 'renovation',
        devis.tradeType || undefined,
        'ILE_DE_FRANCE' // TODO: Récupérer la région du projet si disponible
      )

      const enrichedCompany = scoringEnrichment.company

      // AdvancedEnrichmentService retourne toujours un company (même minimal)
      if (enrichedCompany && enrichedCompany.siret) {
        console.log(
          '[API Enrich Company] ✅ Enrichissement AdvancedEnrichmentService réussi'
        )
        console.log(`[API Enrich Company] 📊 Données disponibles:`, {
          hasFinancialData: !!enrichedCompany.financialData,
          hasReputation: !!enrichedCompany.reputation,
          hasQualifications: !!enrichedCompany.qualifications?.length,
          hasCertifications: !!enrichedCompany.certifications?.length,
          hasLegalStatus: !!enrichedCompany.legalStatusDetails,
          hasPortfolio: !!enrichedCompany.portfolio,
          hasHumanResources: !!enrichedCompany.humanResources,
          hasFinancialScore: !!enrichedCompany.financialScore,
        })

        // Sauvegarder les données enrichies complètes dans le devis
        const enrichedData = {
          ...((devis as any).enrichedData || {}),
          company: enrichedCompany,
        }

        await prisma.devis.update({
          where: { id: devisId },
          data: {
            enrichedData: enrichedData as any,
          },
        })

        console.log(
          '[API Enrich Company] 💾 Données sauvegardées dans enrichedData.company'
        )

        return NextResponse.json({
          success: true,
          data: enrichedCompany,
        })
      } else {
        console.warn(
          '[API Enrich Company] ⚠️ enrichedCompany invalide ou sans SIRET'
        )
      }
    } catch (advancedError) {
      console.warn(
        '[API Enrich Company] AdvancedEnrichment échoué, fallback sur CompanyService:',
        advancedError
      )
    }

    // Fallback sur CompanyEnrichmentService si AdvancedEnrichment échoue
    console.log('[API Enrich Company] 🔄 Fallback sur CompanyEnrichmentService')
    const companyService = new CompanyEnrichmentService()
    const enrichment = await companyService.enrichFromSiret(siret)

    if (!enrichment) {
      return NextResponse.json(
        {
          error: 'Enrichissement échoué',
          message: 'Impossible de récupérer les données pour ce SIRET',
        },
        { status: 404 }
      )
    }

    // Convertir CompanyEnrichment en EnrichedCompanyData pour cohérence
    const enrichedCompanyData: any = {
      siret: enrichment.siret,
      siren: enrichment.siren || enrichment.siret.substring(0, 9),
      name: enrichment.name,
      legalStatus: enrichment.legalStatus,
      address: enrichment.address,
      activities: enrichment.activities,
      financialData: enrichment.financialData,
      legalStatusDetails: enrichment.legalStatusDetails,
      insurances: enrichment.insurances,
      certifications: enrichment.certifications,
      financialHealth: enrichment.financialHealth,
    }

    // Sauvegarder les données enrichies dans le devis
    const enrichedData = {
      ...((devis as any).enrichedData || {}),
      company: enrichedCompanyData,
    }

    await prisma.devis.update({
      where: { id: devisId },
      data: {
        enrichedData: enrichedData as any,
      },
    })

    console.log(
      '[API Enrich Company] 💾 Données fallback sauvegardées dans enrichedData.company'
    )

    return NextResponse.json({
      success: true,
      data: enrichedCompanyData,
    })
  } catch (error) {
    console.error('[API Enrich Company] Erreur:', error)
    return NextResponse.json(
      {
        error: "Erreur lors de l'enrichissement",
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
