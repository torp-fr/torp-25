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

    console.log(
      `[API Enrich Company] 🔍 Début enrichissement pour SIRET: ${siret}`
    )

    // Utiliser l'enrichissement complet avec recherche intelligente et avis clients
    console.log(
      '[API Enrich Company] 🔍 Enrichissement complet avec IntelligentCompanySearch + Reviews'
    )

    try {
      const companyService = new CompanyEnrichmentService()

      // Utiliser enrichFromSiretComplete pour avoir :
      // - Recherche intelligente multi-stratégies (SIRET → SIREN → fuzzy)
      // - Date de création et âge de l'entreprise
      // - Mots-clés d'activité
      // - Avis clients agrégés (Google + Trustpilot + Eldo)
      // - Score de complétude des données
      // - Recoupement multi-sources
      const enrichedProfile = await companyService.enrichFromSiretComplete(
        siret,
        {
          name: extractedData?.company?.name,
          address: extractedData?.company?.address?.fullAddress,
          postalCode: extractedData?.company?.address?.postalCode,
          city: extractedData?.company?.address?.city,
        }
      )

      if (!enrichedProfile) {
        console.error(
          '[API Enrich Company] ❌ enrichFromSiretComplete a retourné null'
        )
        return NextResponse.json(
          {
            error: 'Enrichissement échoué',
            message:
              'Impossible de récupérer les données pour ce SIRET. Vérifiez que le SIRET est valide et que les services externes sont accessibles.',
            siret,
            suggestions: [
              'Vérifiez que le SIRET est valide (14 chiffres)',
              'Les services externes (Sirene, Annuaire Entreprises) peuvent être temporairement indisponibles',
              'Si le SIRET est mal extrait, le système tentera une recherche par nom et adresse',
            ],
          },
          { status: 404 }
        )
      }

      console.log(
        '[API Enrich Company] ✅ Enrichissement complet réussi'
      )
      console.log(`[API Enrich Company] 📊 Données disponibles:`, {
        siret: enrichedProfile.siret,
        name: enrichedProfile.name,
        hasAddress: !!enrichedProfile.address,
        hasFinancialData: !!enrichedProfile.financialData,
        hasCertifications: !!enrichedProfile.certifications?.length,
        hasLegalStatus: !!enrichedProfile.legalStatusDetails,
        hasInsurances: !!enrichedProfile.insurances,
        hasCreationDate: !!enrichedProfile.creationDate,
        companyAge: enrichedProfile.companyAge,
        isRecent: enrichedProfile.isRecent,
        hasReviews: !!(enrichedProfile as any).reviews,
        hasActivityKeywords: !!enrichedProfile.activityKeywords?.length,
        dataCompleteness: enrichedProfile.dataCompleteness,
        confidenceScore: enrichedProfile.confidenceScore,
        dataSources: enrichedProfile.dataSources,
      })

      // Sauvegarder les données enrichies complètes dans le devis
      const enrichedData = {
        ...((devis as any).enrichedData || {}),
        company: enrichedProfile,
      }

      await prisma.devis.update({
        where: { id: devisId },
        data: {
          enrichedData: enrichedData as any,
        },
      })

      console.log(
        '[API Enrich Company] 💾 Profil enrichi sauvegardé dans enrichedData.company'
      )

      return NextResponse.json({
        success: true,
        data: enrichedProfile,
      })
    } catch (error) {
      console.error(
        '[API Enrich Company] ❌ Erreur enrichissement complet:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )

      // Fallback sur AdvancedEnrichmentService (pour le scoring)
      console.log('[API Enrich Company] 🔄 Fallback sur AdvancedEnrichmentService')
      try {
        const advancedService = new AdvancedEnrichmentService()
        const scoringEnrichment = await advancedService.enrichForScoring(
          extractedData as ExtractedDevisData,
          devis.projectType || 'renovation',
          devis.tradeType || undefined,
          'ILE_DE_FRANCE'
        )

        const enrichedCompany = scoringEnrichment.company

        if (enrichedCompany && enrichedCompany.siret) {
          console.log('[API Enrich Company] ✅ Fallback réussi')

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

          return NextResponse.json({
            success: true,
            data: enrichedCompany,
          })
        }
      } catch (fallbackError) {
        console.error(
          '[API Enrich Company] ❌ Fallback échoué:',
          fallbackError
        )
      }

      throw error
    }
  } catch (error) {
    console.error('[API Enrich Company] ❌ Erreur globale:', error)
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
