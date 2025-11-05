/**
 * POST /api/test/scoring
 * Endpoint de test pour valider le système de scoring sans upload de fichier
 * Permet de tester avec des données mock ou un devis existant
 */

import { NextRequest, NextResponse } from 'next/server'
import { AdvancedEnrichmentService } from '@/services/data-enrichment/advanced-enrichment-service'
import { AdvancedScoringEngine } from '@/services/scoring/advanced/advanced-scoring-engine'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const testScoringSchema = z.object({
  devisId: z.string().optional(),
  mockData: z.object({
    company: z.object({
      name: z.string(),
      siret: z.string().optional(),
      address: z.string().optional(),
    }),
    totals: z.object({
      total: z.string(),
      subtotal: z.string().optional(),
      tva: z.string().optional(),
    }),
    project: z.object({
      title: z.string().optional(),
      location: z.string().optional(),
    }).optional(),
    items: z.array(z.any()).optional(),
  }).optional(),
  context: z.object({
    profile: z.enum(['B2C', 'B2B']).default('B2C'),
    projectType: z.enum(['construction', 'renovation', 'extension', 'maintenance']).default('renovation'),
    projectAmount: z.enum(['low', 'medium', 'high']).optional(),
    region: z.string().default('ILE_DE_FRANCE'),
    tradeType: z.string().optional(),
  }).optional(),
})

/**
 * Test du système de scoring avec données mock ou devis existant
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const logs: string[] = []

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString()
    logs.push(`[${timestamp}] ${message}`)
    log.info(`[Test Scoring] ${message}`)
  }

  try {
    const body = await request.json()
    const parsed = testScoringSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { devisId, mockData, context: contextOverride } = parsed.data

    let extractedData: any
    let devisMock: any

    // Option 1: Utiliser un devis existant
    if (devisId) {
      addLog(`Récupération du devis ${devisId}...`)
      const devis = await prisma.devis.findUnique({
        where: { id: devisId },
      })

      if (!devis) {
        return NextResponse.json(
          { error: 'Devis not found' },
          { status: 404 }
        )
      }

      extractedData = devis.extractedData as any
      devisMock = {
        id: devis.id,
        extractedData,
        totalAmount: devis.totalAmount,
        projectType: devis.projectType || 'renovation',
      }
      addLog(`Devis trouvé: ${devis.id}`)
    }
    // Option 2: Utiliser des données mock
    else if (mockData) {
      addLog('Utilisation des données mock fournies...')
      extractedData = mockData
      devisMock = {
        id: 'test-mock-devis',
        extractedData: mockData,
        totalAmount: mockData.totals.total,
        projectType: 'renovation',
      }
    }
    // Option 3: Utiliser des données mock par défaut
    else {
      addLog('Utilisation de données mock par défaut...')
      extractedData = {
        company: {
          name: 'Entreprise Test BTP',
          siret: '12345678901234',
          address: '123 Rue Test, 75001 Paris',
        },
        totals: {
          total: '15000',
          subtotal: '12500',
          tva: '2500',
        },
        project: {
          title: 'Rénovation appartement',
          location: 'Paris, Ile-de-France',
        },
        items: [
          { description: 'Peinture murs', quantity: 50, unitPrice: 15, totalPrice: 750 },
          { description: 'Carrelage sol', quantity: 30, unitPrice: 45, totalPrice: 1350 },
        ],
      }
      devisMock = {
        id: 'test-default-mock',
        extractedData,
        totalAmount: '15000',
        projectType: 'renovation',
      }
    }

    // Inférer les paramètres du contexte
    const inferProjectType = (data: any): 'construction' | 'renovation' | 'extension' | 'maintenance' => {
      const text = JSON.stringify(data).toLowerCase()
      if (text.includes('construction') || text.includes('neuf')) return 'construction'
      if (text.includes('extension')) return 'extension'
      if (text.includes('maintenance') || text.includes('entretien')) return 'maintenance'
      return 'renovation'
    }

    const inferProjectAmount = (total: string): 'low' | 'medium' | 'high' => {
      const amount = parseFloat(total)
      if (amount < 10000) return 'low'
      if (amount < 50000) return 'medium'
      return 'high'
    }

    const inferTradeType = (data: any): string => {
      const text = JSON.stringify(data).toLowerCase()
      if (text.includes('plomberie')) return 'plomberie'
      if (text.includes('électricité')) return 'electricite'
      if (text.includes('maçonnerie')) return 'maconnerie'
      if (text.includes('charpente')) return 'charpente'
      return 'general'
    }

    const extractRegion = (location: string | undefined): string => {
      if (!location) return 'ILE_DE_FRANCE'
      const locationLower = location.toLowerCase()
      if (locationLower.includes('paris') || locationLower.includes('ile-de-france')) return 'ILE_DE_FRANCE'
      if (locationLower.includes('lyon') || locationLower.includes('rhône')) return 'AUVERGNE_RHONE_ALPES'
      if (locationLower.includes('marseille') || locationLower.includes('paca')) return 'PROVENCE_ALPES_COTE_AZUR'
      return 'ILE_DE_FRANCE'
    }

    const projectType = contextOverride?.projectType || inferProjectType(extractedData)
    const projectAmount = contextOverride?.projectAmount || inferProjectAmount(extractedData.totals?.total || '0')
    const tradeType = contextOverride?.tradeType || inferTradeType(extractedData)
    const region = contextOverride?.region || extractRegion(extractedData.project?.location)

    const context = {
      profile: contextOverride?.profile || ('B2C' as const),
      projectType,
      projectAmount,
      region,
      tradeType,
    }

    addLog(`Contexte: ${JSON.stringify(context)}`)

    // 1. Enrichissement des données
    addLog('Début de l\'enrichissement des données...')
    const enrichmentStart = Date.now()
    
    let enrichmentData: any
    try {
      const enrichmentService = new AdvancedEnrichmentService()
      enrichmentData = await enrichmentService.enrichForScoring(
        extractedData,
        projectType,
        tradeType,
        region
      )
      const enrichmentDuration = Date.now() - enrichmentStart
      addLog(`Enrichissement terminé (${enrichmentDuration}ms)`)
      
      // Compter les sources disponibles
      const sources: string[] = []
      if (enrichmentData.company?.siret) sources.push('Sirene')
      if (enrichmentData.priceReferences?.length) sources.push(`Prix (${enrichmentData.priceReferences.length})`)
      if (enrichmentData.regionalData) sources.push('Régional')
      if (enrichmentData.complianceData) sources.push('Conformité')
      if (enrichmentData.weatherData) sources.push('Météo')
      if (enrichmentData.dtus?.length) sources.push(`DTU (${enrichmentData.dtus.length})`)
      
      addLog(`Sources disponibles: ${sources.join(', ') || 'Aucune'}`)
    } catch (error) {
      addLog(`⚠️  Erreur lors de l'enrichissement: ${error instanceof Error ? error.message : String(error)}`)
      // Continuer avec des données minimales
      enrichmentData = {
        company: {
          siret: extractedData.company?.siret || '',
          siren: extractedData.company?.siret?.substring(0, 9) || '',
          name: extractedData.company?.name || '',
        },
        priceReferences: [],
        regionalData: null,
        complianceData: null,
        weatherData: null,
        dtus: [],
        certifications: [],
      }
    }

    // 2. Calcul du score avancé
    addLog('Début du calcul du score avancé...')
    const scoringStart = Date.now()
    
    let score: any
    try {
      const scoringEngine = new AdvancedScoringEngine()
      score = await scoringEngine.calculateScore(
        devisMock,
        enrichmentData,
        context
      )
      const scoringDuration = Date.now() - scoringStart
      addLog(`Score calculé (${scoringDuration}ms)`)
    } catch (error) {
      addLog(`❌ Erreur lors du calcul du score: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }

    const totalDuration = Date.now() - startTime

    addLog(`✅ Test terminé avec succès (${totalDuration}ms total)`)

    return NextResponse.json({
      success: true,
      data: {
        score,
        enrichment: {
          sources: Object.keys(enrichmentData).filter(key => enrichmentData[key] !== null),
          summary: {
            hasCompanyData: !!enrichmentData.company?.siret,
            hasPriceReferences: (enrichmentData.priceReferences?.length || 0) > 0,
            hasRegionalData: !!enrichmentData.regionalData,
            hasComplianceData: !!enrichmentData.complianceData,
            hasWeatherData: !!enrichmentData.weatherData,
            hasDTUs: (enrichmentData.dtus?.length || 0) > 0,
          },
        },
        context,
        timing: {
          enrichment: Date.now() - enrichmentStart,
          scoring: Date.now() - scoringStart,
          total: totalDuration,
        },
      },
      logs,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    addLog(`❌ Erreur: ${errorMessage}`)
    
    return NextResponse.json(
      {
        error: 'Test failed',
        message: errorMessage,
        logs,
      },
      { status: 500 }
    )
  }
}

