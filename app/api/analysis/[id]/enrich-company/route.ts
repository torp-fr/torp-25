/**
 * API Route pour enrichir les données d'entreprise d'une analyse
 * GET /api/analysis/[id]/enrich-company
 *
 * Récupère le SIRET du devis et enrichit les données d'entreprise
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyEnrichmentService } from '@/services/data-enrichment/company-service'

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

    // Enrichir les données d'entreprise
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

    // Sauvegarder les données enrichies dans le devis
    const enrichedData = {
      ...((devis as any).enrichedData || {}),
      company: enrichment,
    }

    await prisma.devis.update({
      where: { id: devisId },
      data: {
        enrichedData: enrichedData as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: enrichment,
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
