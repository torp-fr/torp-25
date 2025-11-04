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
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let siret: string | undefined
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
    siret = extractedData?.company?.siret

    if (!siret) {
      return NextResponse.json(
        {
          error: 'SIRET non disponible',
          message: "Le SIRET n'a pas pu être extrait du devis",
        },
        { status: 400 }
      )
    }

    log.info({ siret, devisId }, 'Début enrichissement entreprise')

    // Utiliser AdvancedEnrichmentService pour un enrichissement complet
    // Cela inclut réputation, certifications RGE, qualifications, etc.
    try {
      log.debug('Tentative AdvancedEnrichmentService')
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
        log.info({
          siret: enrichedCompany.siret,
          name: enrichedCompany.name || 'Non disponible',
          hasAddress: !!enrichedCompany.address,
          hasFinancialData: !!enrichedCompany.financialData,
          hasReputation: !!enrichedCompany.reputation,
          hasQualifications: !!enrichedCompany.qualifications?.length,
          hasCertifications: !!enrichedCompany.certifications?.length,
          hasLegalStatus: !!enrichedCompany.legalStatusDetails,
          hasPortfolio: !!enrichedCompany.portfolio,
          hasHumanResources: !!enrichedCompany.humanResources,
          hasFinancialScore: !!enrichedCompany.financialScore,
        }, 'Enrichissement AdvancedEnrichmentService réussi')

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

        log.debug({ devisId }, 'Données sauvegardées dans enrichedData.company')

        return NextResponse.json({
          success: true,
          data: enrichedCompany,
        })
      } else {
        log.warn({
          enrichedCompany: enrichedCompany ? JSON.stringify(enrichedCompany) : null,
        }, 'enrichedCompany invalide ou sans SIRET')
      }
    } catch (advancedError) {
      log.error({
        err: advancedError,
        message: advancedError instanceof Error ? advancedError.message : String(advancedError),
      }, 'AdvancedEnrichment échoué, fallback sur CompanyService')
    }

    // Fallback sur CompanyEnrichmentService si AdvancedEnrichment échoue
    log.debug('Fallback sur CompanyEnrichmentService')
    try {
      const companyService = new CompanyEnrichmentService()
      log.debug({ siret }, 'Appel enrichFromSiret')
      const enrichment = await companyService.enrichFromSiret(siret)
      log.debug({
        success: !!enrichment,
        hasSiret: !!enrichment?.siret,
        hasName: !!enrichment?.name,
        hasAddress: !!enrichment?.address,
        hasFinancialData: !!enrichment?.financialData,
      }, 'Résultat enrichFromSiret')

      if (!enrichment) {
        log.error({ siret }, 'enrichFromSiret a retourné null - aucune donnée récupérée')
        return NextResponse.json(
          {
            error: 'Enrichissement échoué',
            message:
              'Impossible de récupérer les données pour ce SIRET. Vérifiez que le SIRET est valide et que les services externes sont accessibles.',
            siret,
            suggestions: [
              'Vérifiez que le SIRET est valide (14 chiffres)',
              'Les services externes (Sirene, Infogreffe) peuvent être temporairement indisponibles',
              'Vérifiez les clés API si configurées (INSEE_API_KEY, INFOGREFFE_API_KEY)',
            ],
          },
          { status: 404 }
        )
      }

      log.info({ siret }, 'Données récupérées via CompanyEnrichmentService')

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

      log.debug({ devisId }, 'Données fallback sauvegardées dans enrichedData.company')

      return NextResponse.json({
        success: true,
        data: enrichedCompanyData,
      })
    } catch (fallbackError) {
      log.error({ err: fallbackError, siret }, 'Erreur lors du fallback')
      throw fallbackError
    }
  } catch (error) {
    log.error({ err: error, siret }, 'Erreur globale enrichissement entreprise')
    return NextResponse.json(
      {
        error: "Erreur lors de l'enrichissement",
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        siret,
      },
      { status: 500 }
    )
  }
}
