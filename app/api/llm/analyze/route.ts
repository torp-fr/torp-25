import { NextRequest, NextResponse } from 'next/server'
import { DocumentAnalyzer } from '@/services/llm/document-analyzer'
import { AdvancedEnrichmentService } from '@/services/data-enrichment/advanced-enrichment-service'
import { MinimalEnrichmentService } from '@/services/data-enrichment/minimal-enrichment-service'
import { AdvancedScoringEngine } from '@/services/scoring/advanced/advanced-scoring-engine'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Decimal } from '@prisma/client/runtime/library'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Auth0 temporairement désactivé - utilise un userId demo
const DEMO_USER_ID = 'demo-user-id'

/**
 * POST /api/llm/analyze
 * Analyse complète d'un devis avec Claude:
 * 1. Upload du fichier
 * 2. Analyse LLM (extraction + scoring)
 * 3. Création du devis en DB
 * 4. Création du score TORP en DB
 * 5. Retourne l'ID du devis
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null

  try {
    // Auth0 désactivé - utilisateur demo par défaut
    const userId = DEMO_USER_ID
    
    // S'assurer que l'utilisateur demo existe en DB
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      update: {},
      create: {
        id: DEMO_USER_ID,
        email: 'demo@torp.fr',
        role: 'CONSUMER',
      },
    })

    // Récupérer le fichier uploadé
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ccfDataStr = formData.get('ccfData') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      )
    }


    // Vérifier le format
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format de fichier non supporté. Utilisez PDF, JPG ou PNG.' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 10MB' },
        { status: 400 }
      )
    }

    // Créer un fichier temporaire dans /tmp (Vercel-compatible)
    const uploadsDir = '/tmp'
    // Pas besoin de créer /tmp, il existe toujours sur Vercel

    const timestamp = Date.now()
    const fileExt = path.extname(file.name)
    const tempFileName = `${userId}-${timestamp}${fileExt}`
    tempFilePath = path.join(uploadsDir, tempFileName)

    // Écrire le fichier
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(tempFilePath, buffer)

    console.log(`[LLM Analyze] Fichier sauvegardé: ${tempFilePath}`)

    // OPTIMISATION: Une seule analyse LLM avec enrichissement minimal en cache
    const analysisStartTime = Date.now()
    console.log('[LLM Analyze] Début de l\'analyse optimisée (objectif <5s)...')
    const analyzer = new DocumentAnalyzer()
    
    // Parser les données CCF si fournies
    let ccfData: any = null
    try {
      if (ccfDataStr) {
        ccfData = JSON.parse(ccfDataStr)
      }
    } catch (error) {
      console.warn('[LLM Analyze] Erreur parsing CCF:', error)
    }

    // 1. Enrichissement minimal et rapide (<50ms, cache uniquement)
    const minimalEnrichmentStartTime = Date.now()
    const minimalEnrichmentService = new MinimalEnrichmentService()
    
    // Parser CCF et enrichissement minimal en parallèle
    const minimalEnrichmentPromise = Promise.resolve().then(async () => {
      // Attendre d'avoir les données extraites depuis CCF si disponibles
      if (ccfData?.company?.siret) {
        return await minimalEnrichmentService.getMinimalEnrichment({
          company: {
            siret: ccfData.company.siret,
            name: ccfData.company.name || '',
          },
        } as any)
      }
      return null
    }).catch(() => null)
    
    // 2. Analyse LLM UNIQUE (une seule fois, avec enrichissement minimal si disponible)
    // On évite la double analyse (initiale + finale) pour gagner ~2-3s
    const llmStartTime = Date.now()
    
    // Attendre enrichissement minimal (très rapide, <50ms)
    const resolvedMinimalEnrichment = await minimalEnrichmentPromise
    const minimalEnrichmentDuration = Date.now() - minimalEnrichmentStartTime
    if (minimalEnrichmentDuration > 10) {
      console.log(`[LLM Analyze] Enrichissement minimal préparé (${minimalEnrichmentDuration}ms)`)
    }
    
    const analysis = await analyzer.analyzeDevis(
      tempFilePath, 
      resolvedMinimalEnrichment || undefined
    )
    const llmDuration = Date.now() - llmStartTime
    console.log(`[LLM Analyze] Analyse LLM terminée (${llmDuration}ms, objectif: <3500ms)`)

    // 3. Enrichissement asynchrone (non-bloquant) pour mise à jour ultérieure
    // On lance l'enrichissement complet en arrière-plan sans attendre
    const enrichmentService = new AdvancedEnrichmentService()
    const tradeType = ccfData?.tradeType || inferTradeType(analysis.rawText)
    const region = ccfData?.region 
      || (analysis.extractedData.project?.location 
        ? extractRegion(analysis.extractedData.project.location)
        : 'ILE_DE_FRANCE')
    const projectType = ccfData?.projectType 
      || (inferProjectType(analysis.extractedData) as 'construction' | 'renovation' | 'extension' | 'maintenance')
    
    // Enrichissement asynchrone (ne bloque pas la réponse utilisateur)
    Promise.resolve().then(async () => {
      try {
        const fullEnrichmentData = await enrichmentService.enrichForScoring(
          analysis.extractedData,
          projectType,
          tradeType,
          region
        )
        
        // Mettre en cache pour accélérer les prochaines analyses
        if (analysis.extractedData.company.siret && fullEnrichmentData.company) {
          const { globalCache } = await import('@/services/cache/data-cache')
          globalCache.setEnrichment(
            `company:${analysis.extractedData.company.siret}`,
            fullEnrichmentData.company
          )
        }
        console.log('[LLM Analyze] ✅ Enrichissement asynchrone terminé et mis en cache')
      } catch (error) {
        console.warn('[LLM Analyze] ⚠️ Erreur enrichissement asynchrone (non-bloquant):', error)
      }
    })

    const totalAnalysisDuration = Date.now() - analysisStartTime
    console.log(`[LLM Analyze] Analyse complète terminée (${totalAnalysisDuration}ms, objectif: <5000ms)`)

    console.log('[LLM Analyze] Analyse terminée, création en DB...')

    // 1. Créer le Document d'abord
    const document = await prisma.document.create({
      data: {
        userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: `temp://${tempFileName}`, // Fichier temporaire, supprimé après analyse
        uploadStatus: 'COMPLETED',
        ocrStatus: 'COMPLETED',
      },
    })

    console.log(`[LLM Analyze] Document créé: ${document.id}`)

    // 2. Créer le Devis avec le documentId
    const devis = await prisma.devis.create({
      data: {
        documentId: document.id,
        userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractedData: analysis.extractedData as any,
        validationStatus: 'COMPLETED',
        totalAmount: new Decimal(analysis.extractedData.totals.total),
        projectType: analysis.extractedData.project.title || 'Non spécifié',
        tradeType: inferTradeType(analysis.rawText),
      },
    })

    console.log(`[LLM Analyze] Devis créé: ${devis.id}`)

    // Programmer le scraping pour enrichissement asynchrone
    try {
      const { globalScraper } = await import('@/services/scraping/data-scraper')
      await globalScraper.scheduleDevisScraping(devis.id)
      console.log(`[LLM Analyze] Scraping programmé pour devis ${devis.id}`)
    } catch (error) {
      console.warn('[LLM Analyze] Erreur programmation scraping (non bloquant):', error)
    }

    // 3. Calcul du score OPTIMISÉ (utilisation du score LLM directement si disponible)
    const scoringStartTime = Date.now()
    let advancedScore = null
    let useAdvancedScoring = false

    // OPTIMISATION: Utiliser directement le score LLM pour éviter un calcul supplémentaire
    // Le LLM a déjà calculé un score, on l'utilise comme base
    if (analysis.torpscore && analysis.torpscore.scoreValue > 0) {
      // Convertir le score LLM (0-1000) vers le format avancé (0-1200)
      const llmScore = analysis.torpscore.scoreValue
      const convertedScore = Math.round((llmScore / 1000) * 1200) // Échelle 0-1200
      
      // Utiliser le score LLM directement (plus rapide)
      advancedScore = {
        totalScore: convertedScore,
        grade: analysis.torpscore.scoreGrade,
        confidenceLevel: analysis.torpscore.confidenceLevel,
        breakdown: {
          prix: {
            score: analysis.torpscore.breakdown.prix.score * 1.2, // Échelle à 1200
            weight: analysis.torpscore.breakdown.prix.weight,
            justification: analysis.torpscore.breakdown.prix.justification,
          },
          qualite: {
            score: analysis.torpscore.breakdown.qualite.score * 1.2,
            weight: analysis.torpscore.breakdown.qualite.weight,
            justification: analysis.torpscore.breakdown.qualite.justification,
          },
          delais: {
            score: analysis.torpscore.breakdown.delais.score * 1.2,
            weight: analysis.torpscore.breakdown.delais.weight,
            justification: analysis.torpscore.breakdown.delais.justification,
          },
          conformite: {
            score: analysis.torpscore.breakdown.conformite.score * 1.2,
            weight: analysis.torpscore.breakdown.conformite.weight,
            justification: analysis.torpscore.breakdown.conformite.justification,
          },
        },
        alerts: analysis.torpscore.alerts || [],
        recommendations: analysis.torpscore.recommendations || [],
        algorithmVersion: 'llm-optimized-v2.2',
      } as any
      
      useAdvancedScoring = true
      const scoringDuration = Date.now() - scoringStartTime
      console.log(`[LLM Analyze] Score LLM utilisé directement (${scoringDuration}ms): ${advancedScore.totalScore}/1200 (${advancedScore.grade})`)
    } else {
      // Fallback sur scoring avancé si score LLM manquant (rare)
      try {
        const scoringEngine = new AdvancedScoringEngine(false) // ML désactivé pour vitesse
        
        const userProfile = 'B2C'
        const projectTypeForScoring = ccfData?.projectType 
          || (inferProjectType(analysis.extractedData) as 'construction' | 'renovation' | 'extension' | 'maintenance')
        const projectAmount = ccfData?.budgetRange?.preferred
          ? (ccfData.budgetRange.preferred < 10000 ? 'low' : ccfData.budgetRange.preferred < 50000 ? 'medium' : 'high')
          : inferProjectAmount(analysis.extractedData.totals.total)
        const tradeTypeForScoring = ccfData?.tradeType || inferTradeType(analysis.rawText)
        const regionForScoring = ccfData?.region 
          || (analysis.extractedData.project?.location 
            ? extractRegion(analysis.extractedData.project.location)
            : 'ILE_DE_FRANCE')

        const devisForScoring = {
          ...devis,
          extractedData: analysis.extractedData,
        } as any

        // Convertir MinimalEnrichmentData en ScoringEnrichmentData
        const scoringEnrichmentData: any = {
          company: resolvedMinimalEnrichment?.company || {
            siret: analysis.extractedData.company.siret || '',
            siren: analysis.extractedData.company.siret?.substring(0, 9) || '',
            name: analysis.extractedData.company.name,
          },
          priceReferences: [],
          regionalData: null,
          complianceData: null,
          weatherData: null,
          dtus: [],
          certifications: [],
        }

        advancedScore = await scoringEngine.calculateScore(
          devisForScoring,
          scoringEnrichmentData,
          {
            profile: userProfile,
            projectType: projectTypeForScoring,
            projectAmount,
            region: regionForScoring,
            tradeType: tradeTypeForScoring,
          }
        )

        const scoringDuration = Date.now() - scoringStartTime
        console.log(`[LLM Analyze] Score avancé calculé (fallback, ${scoringDuration}ms): ${advancedScore.totalScore}/1200`)
        useAdvancedScoring = true
      } catch (error) {
        console.error('[LLM Analyze] Erreur scoring avancé:', error)
        useAdvancedScoring = false
      }
    }

    // 4. Créer le score TORP (utiliser score avancé si disponible, sinon fallback LLM)
    const finalRegion = analysis.extractedData.project?.location 
      ? extractRegion(analysis.extractedData.project.location)
      : 'ILE_DE_FRANCE'
    
    const finalScore = useAdvancedScoring && advancedScore
      ? {
          scoreValue: new Decimal(advancedScore.totalScore),
          scoreGrade: advancedScore.grade,
          confidenceLevel: new Decimal(advancedScore.confidenceLevel),
          breakdown: {
            // Score avancé : structure complète avec 8 axes
            version: 'advanced-v2.0.0',
            totalScore: advancedScore.totalScore,
            percentage: advancedScore.percentage,
            axes: advancedScore.axisScores.map((axis: any) => ({
              id: axis.axisId,
              score: axis.score,
              maxPoints: axis.maxPoints,
              percentage: axis.percentage,
              subCriteria: axis.subCriteriaScores,
            })),
            // Rétrocompatibilité avec l'ancien format
            prix: findAxisScore(advancedScore, 'prix'),
            qualite: findAxisScore(advancedScore, 'qualite'),
            delais: findAxisScore(advancedScore, 'delais'),
            conformite: findAxisScore(advancedScore, 'conformite'),
          },
          alerts: advancedScore.overallAlerts,
          recommendations: advancedScore.overallRecommendations,
          algorithmVersion: 'advanced-v2.0.0',
          regionalBenchmark: (useAdvancedScoring && advancedScore && 'axisScores' in advancedScore && advancedScore.axisScores)
            ? null // Les données régionales seront enrichies en arrière-plan
            : {
                region: finalRegion,
                averagePriceSqm: 1500,
                percentilePosition: 50,
                comparisonData: {
                  devisPrice: analysis.extractedData.totals.total,
                  averagePrice: analysis.extractedData.totals.total,
                  priceRange: {
                    min: analysis.extractedData.totals.total * 0.8,
                    max: analysis.extractedData.totals.total * 1.2,
                  },
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
        }
      : {
          // Fallback sur score LLM classique
          scoreValue: new Decimal(analysis.torpscore.scoreValue),
          scoreGrade: analysis.torpscore.scoreGrade,
          confidenceLevel: new Decimal(analysis.torpscore.confidenceLevel),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          breakdown: analysis.torpscore.breakdown as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          alerts: analysis.torpscore.alerts as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recommendations: analysis.torpscore.recommendations as any,
          algorithmVersion: 'claude-llm-v2.0-enhanced',
          regionalBenchmark: {
            region: finalRegion,
            averagePriceSqm: 1500,
            percentilePosition: 50,
            comparisonData: {
              devisPrice: analysis.extractedData.totals.total,
              averagePrice: analysis.extractedData.totals.total,
              priceRange: {
                min: analysis.extractedData.totals.total * 0.8,
                max: analysis.extractedData.totals.total * 1.2,
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        }

    const torpScore = await prisma.tORPScore.create({
      data: {
        devisId: devis.id,
        userId,
        ...finalScore,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        breakdown: finalScore.breakdown as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alerts: finalScore.alerts as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recommendations: finalScore.recommendations as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        regionalBenchmark: finalScore.regionalBenchmark as any,
      },
    })

    console.log(`[LLM Analyze] Score TORP créé: ${torpScore.id}`)

    // 5. Lier le CCF au devis si fourni
    if (ccfData && ccfData.projectType) {
      try {
        await prisma.projectCCF.upsert({
          where: {
            devisId: devis.id,
          },
          update: {
            devisId: devis.id,
            status: 'linked',
          },
          create: {
            userId,
            devisId: devis.id,
            projectType: ccfData.projectType,
            projectTitle: ccfData.projectTitle,
            projectDescription: ccfData.projectDescription,
            address: ccfData.address,
            postalCode: ccfData.postalCode,
            city: ccfData.city,
            region: ccfData.region,
            coordinates: ccfData.coordinates,
            buildingData: ccfData.buildingData,
            urbanismData: ccfData.urbanismData,
            energyData: ccfData.energyData,
            constraints: ccfData.constraints,
            requirements: ccfData.requirements,
            budgetRange: ccfData.budgetRange,
            status: 'linked',
          },
        })
        console.log('[LLM Analyze] CCF lié au devis')
      } catch (error) {
        console.warn('[LLM Analyze] Erreur lors de la liaison CCF:', error)
        // Ne pas bloquer si la liaison CCF échoue
      }
    }

    // Retourner la réponse
    return NextResponse.json(
      {
        success: true,
        message: 'Analyse complète réussie',
        data: {
          devisId: devis.id,
          scoreId: torpScore.id,
          scoreGrade: torpScore.scoreGrade,
          scoreValue: torpScore.scoreValue,
          extractedData: analysis.extractedData,
          analysis: {
            alerts: analysis.torpscore.alerts,
            recommendations: analysis.torpscore.recommendations,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[LLM Analyze] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'analyse du document',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  } finally {
    // Nettoyer le fichier temporaire
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
        console.log(`[LLM Analyze] Fichier temporaire supprimé: ${tempFilePath}`)
      } catch (err) {
        console.error('Erreur lors de la suppression du fichier temporaire:', err)
      }
    }
  }
}

/**
 * Calcule le percentile d'un prix par rapport aux données régionales
 */
function calculatePercentile(
  price: number,
  regionalData: { priceRange: { min: number; max: number; percentile25: number; percentile75: number } }
): number {
  const { min, max, percentile25, percentile75 } = regionalData.priceRange

  if (price <= min) return 0
  if (price >= max) return 100
  if (price <= percentile25) {
    // Entre min et percentile25 (0-25%)
    return (price - min) / (percentile25 - min) * 25
  }
  if (price <= percentile75) {
    // Entre percentile25 et percentile75 (25-75%)
    return 25 + ((price - percentile25) / (percentile75 - percentile25)) * 50
  }
  // Entre percentile75 et max (75-100%)
  return 75 + ((price - percentile75) / (max - percentile75)) * 25
}

/**
 * Inférer le type de métier depuis le texte brut
 */
function inferTradeType(rawText: string): string {
  const text = rawText.toLowerCase()

  if (text.includes('plomberie') || text.includes('plombier') || text.includes('sanitaire')) {
    return 'plomberie'
  }
  if (text.includes('électricité') || text.includes('électricien') || text.includes('électrique')) {
    return 'electricite'
  }
  if (text.includes('maçonnerie') || text.includes('maçon') || text.includes('gros œuvre')) {
    return 'maconnerie'
  }
  if (text.includes('menuiserie') || text.includes('menuisier') || text.includes('charpente')) {
    return 'menuiserie'
  }
  if (text.includes('peinture') || text.includes('peintre') || text.includes('revêtement')) {
    return 'peinture'
  }
  if (text.includes('chauffage') || text.includes('climatisation') || text.includes('cvc')) {
    return 'chauffage'
  }
  if (text.includes('toiture') || text.includes('couvreur') || text.includes('zinguerie')) {
    return 'couverture'
  }

  return 'general'
}

/**
 * Inférer le type de projet depuis les données extraites
 */
function inferProjectType(extractedData: any): string {
  const projectTitle = extractedData.project?.title?.toLowerCase() || ''
  const projectDesc = extractedData.project?.description?.toLowerCase() || ''

  if (projectTitle.includes('construction') || projectTitle.includes('neuf') ||
      projectDesc.includes('construction') || projectDesc.includes('neuf')) {
    return 'construction'
  }
  if (projectTitle.includes('rénovation') || projectTitle.includes('renovation') ||
      projectDesc.includes('rénovation') || projectDesc.includes('renovation')) {
    return 'renovation'
  }
  if (projectTitle.includes('extension') || projectDesc.includes('extension')) {
    return 'extension'
  }
  if (projectTitle.includes('maintenance') || projectTitle.includes('entretien') ||
      projectDesc.includes('maintenance') || projectDesc.includes('entretien')) {
    return 'maintenance'
  }

  // Par défaut, rénovation (le plus commun)
  return 'renovation'
}

/**
 * Inférer le montant du projet depuis le total
 */
function inferProjectAmount(total: number): 'low' | 'medium' | 'high' {
  if (total < 10000) return 'low'
  if (total <= 50000) return 'medium'
  return 'high'
}

/**
 * Extraire la région depuis une localisation
 */
function extractRegion(location: string): string {
  const loc = location.toLowerCase()
  
  // Mapping simplifié des régions françaises
  if (loc.includes('paris') || loc.includes('île-de-france') || loc.includes('ile-de-france')) {
    return 'ILE_DE_FRANCE'
  }
  if (loc.includes('lyon') || loc.includes('rhône') || loc.includes('auvergne')) {
    return 'AUVERGNE_RHONE_ALPES'
  }
  if (loc.includes('marseille') || loc.includes('paca') || loc.includes('provence')) {
    return 'PROVENCE_ALPES_COTE_AZUR'
  }
  if (loc.includes('toulouse') || loc.includes('occitanie')) {
    return 'OCCITANIE'
  }
  if (loc.includes('nantes') || loc.includes('pays de loire')) {
    return 'PAYS_DE_LA_LOIRE'
  }
  if (loc.includes('bordeaux') || loc.includes('nouvelle-aquitaine')) {
    return 'NOUVELLE_AQUITAINE'
  }
  
  // Par défaut
  return 'ILE_DE_FRANCE'
}

/**
 * Extraire les sources depuis les données enrichies
 */
function extractSourcesFromEnrichment(enrichmentData: any): string[] {
  const sources: string[] = []
  if (!enrichmentData) return sources
  if (enrichmentData?.company?.siret) sources.push('Sirene')
  if (enrichmentData?.company?.financialData) sources.push('Infogreffe')
  if (enrichmentData?.company?.reputation) sources.push('Réputation')
  if (enrichmentData?.priceReferences?.length > 0) sources.push('Prix Référence')
  if (enrichmentData?.regionalData) sources.push('Données Régionales')
  if (enrichmentData?.complianceData) sources.push('Conformité')
  if (enrichmentData?.weatherData) sources.push('Météo')
  return sources
}

/**
 * Trouver le score d'un axe spécifique (pour rétrocompatibilité)
 */
function findAxisScore(advancedScore: any, axisId: string): any {
  const axis = advancedScore.axisScores.find((a: any) => a.axisId === axisId)
  if (!axis) return { score: 0, weight: 0, justification: 'Non calculé' }
  
  return {
    score: axis.score,
    weight: axis.maxPoints / 1200,
    justification: `Score: ${axis.score}/${axis.maxPoints} (${axis.percentage.toFixed(1)}%)`,
  }
}
