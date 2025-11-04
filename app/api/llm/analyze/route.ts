import { NextRequest, NextResponse } from 'next/server'
import { DocumentAnalyzer } from '@/services/llm/document-analyzer'
import { AdvancedEnrichmentService } from '@/services/data-enrichment/advanced-enrichment-service'
import { MinimalEnrichmentService } from '@/services/data-enrichment/minimal-enrichment-service'
import { AdvancedScoringEngine } from '@/services/scoring/advanced/advanced-scoring-engine'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Decimal } from '@prisma/client/runtime/library'
import { loggers } from '@/lib/logger'

const log = loggers.api

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
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    // Vérifier le format
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]
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

    log.debug({ tempFilePath, fileSize: file.size, fileName: file.name }, 'Fichier sauvegardé')

    // OPTIMISATION: Une seule analyse LLM avec enrichissement minimal en cache
    const analysisStartTime = Date.now()
    log.info({ targetDuration: 5000 }, 'Début de l\'analyse optimisée')
    const analyzer = new DocumentAnalyzer()

    // Parser les données CCF si fournies
    let ccfData: any = null
    try {
      if (ccfDataStr) {
        ccfData = JSON.parse(ccfDataStr)
      }
    } catch (error) {
      log.warn({ err: error }, 'Erreur parsing CCF')
    }

    // 1. Enrichissement minimal et rapide (<50ms, cache uniquement)
    const minimalEnrichmentStartTime = Date.now()
    const minimalEnrichmentService = new MinimalEnrichmentService()

    // Parser CCF et enrichissement minimal en parallèle
    const minimalEnrichmentPromise = Promise.resolve()
      .then(async () => {
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
      })
      .catch(() => null)

    // 2. Analyse LLM UNIQUE (une seule fois, avec enrichissement minimal si disponible)
    // On évite la double analyse (initiale + finale) pour gagner ~2-3s
    const llmStartTime = Date.now()

    // Attendre enrichissement minimal (très rapide, <50ms)
    const resolvedMinimalEnrichment = await minimalEnrichmentPromise
    const minimalEnrichmentDuration = Date.now() - minimalEnrichmentStartTime
    if (minimalEnrichmentDuration > 10) {
      log.debug({ duration: minimalEnrichmentDuration }, 'Enrichissement minimal préparé')
    }

    // Enrichir les données minimales avec les données CCF pour le contexte LLM
    const enrichmentWithCCF = resolvedMinimalEnrichment
      ? {
          ...resolvedMinimalEnrichment,
          ccfData: ccfData
            ? {
                projectType: ccfData.projectType,
                projectTitle: ccfData.projectTitle,
                projectDescription: ccfData.projectDescription,
                address: ccfData.address,
                region: ccfData.region,
                constraints: ccfData.constraints,
                requirements: ccfData.requirements,
                rooms: ccfData.rooms,
                budgetRange: ccfData.budgetRange,
                buildingData: ccfData.buildingData,
                pluData: ccfData.pluData,
                urbanismData: ccfData.urbanismData,
                energyData: ccfData.energyData,
              }
            : undefined,
        }
      : ccfData
        ? {
            ccfData: {
              projectType: ccfData.projectType,
              projectTitle: ccfData.projectTitle,
              projectDescription: ccfData.projectDescription,
              address: ccfData.address,
              region: ccfData.region,
              constraints: ccfData.constraints,
              requirements: ccfData.requirements,
              rooms: ccfData.rooms,
              budgetRange: ccfData.budgetRange,
              buildingData: ccfData.buildingData,
              pluData: ccfData.pluData,
              urbanismData: ccfData.urbanismData,
              energyData: ccfData.energyData,
            },
          }
        : undefined

    const analysis = await analyzer.analyzeDevis(
      tempFilePath,
      enrichmentWithCCF || undefined
    )
    const llmDuration = Date.now() - llmStartTime
    log.info({ duration: llmDuration, target: 3500 }, 'Analyse LLM terminée')

    // 3. DÉCLENCHEMENT IMMÉDIAT de l'enrichissement si SIRET trouvé
    // Dès que l'OCR trouve le SIRET, on lance immédiatement l'enrichissement
    const detectedSiret = analysis.extractedData?.company?.siret
    let enrichmentData: any = null

    if (detectedSiret) {
      log.info({ siret: detectedSiret }, 'SIRET détecté par OCR, déclenchement enrichissement immédiat')

      const enrichmentStartTime = Date.now()
      const enrichmentService = new AdvancedEnrichmentService()
      const tradeType = ccfData?.tradeType || inferTradeType(analysis.rawText)
      const region =
        ccfData?.region ||
        (analysis.extractedData.project?.location
          ? extractRegion(analysis.extractedData.project.location)
          : 'ILE_DE_FRANCE')
      const projectType =
        ccfData?.projectType ||
        (inferProjectType(analysis.extractedData) as
          | 'construction'
          | 'renovation'
          | 'extension'
          | 'maintenance')

      try {
        // Enrichissement SYNCHRONE pour avoir les données avant de créer le devis
        enrichmentData = await enrichmentService.enrichForScoring(
          analysis.extractedData,
          projectType,
          tradeType,
          region
        )

        const enrichmentDuration = Date.now() - enrichmentStartTime
        const sources = extractSourcesFromEnrichment(enrichmentData)
        log.info({
          duration: enrichmentDuration,
          sources: sources.join(', ') || 'aucune',
          hasCompany: !!enrichmentData.company?.siret,
          hasFinancialData: !!enrichmentData.company?.financialData,
          hasReputation: !!enrichmentData.company?.reputation,
          hasCertifications: !!enrichmentData.company?.certifications?.length,
          hasQualifications: !!enrichmentData.company?.qualifications?.length,
        }, 'Enrichissement terminé')

        // Mettre en cache pour accélérer les prochaines analyses
        if (enrichmentData.company?.siret) {
          const { globalCache } = await import('@/services/cache/data-cache')
          globalCache.setEnrichment(
            `company:${enrichmentData.company.siret}`,
            enrichmentData.company
          )
          log.debug({ siret: enrichmentData.company.siret }, 'Données mises en cache')
        }
      } catch (enrichmentError) {
        log.error({
          err: enrichmentError,
          message: enrichmentError instanceof Error ? enrichmentError.message : String(enrichmentError)
        }, 'Erreur enrichissement')
        // Continuer même si l'enrichissement échoue
        enrichmentData = null
      }
    } else {
      log.info('Aucun SIRET détecté, enrichissement non déclenché')
    }

    const totalAnalysisDuration = Date.now() - analysisStartTime
    log.info({
      duration: totalAnalysisDuration,
      target: 5000
    }, 'Analyse complète terminée')

    log.debug('Analyse terminée, création en DB')

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

    log.info({ documentId: document.id, fileName: file.name }, 'Document créé')

    // 2. Créer le Devis avec le documentId et les données enrichies (si disponibles)
    const enrichedDataForDevis = enrichmentData
      ? {
          company: enrichmentData.company || null,
        }
      : null

    const devis = await prisma.devis.create({
      data: {
        documentId: document.id,
        userId,
        extractedData: analysis.extractedData as any,
        enrichedData: enrichedDataForDevis as any,
        validationStatus: 'COMPLETED',
        totalAmount: new Decimal(analysis.extractedData.totals.total),
        projectType: analysis.extractedData.project.title || 'Non spécifié',
        tradeType: inferTradeType(analysis.rawText),
      },
    })

    log.info({
      devisId: devis.id,
      hasEnrichedData: !!enrichedDataForDevis?.company,
      siret: enrichedDataForDevis?.company?.siret
    }, 'Devis créé')

    // Programmer le scraping pour enrichissement asynchrone
    try {
      const { globalScraper } = await import('@/services/scraping/data-scraper')
      await globalScraper.scheduleDevisScraping(devis.id)
      log.debug({ devisId: devis.id }, 'Scraping programmé')
    } catch (error) {
      log.warn({ err: error }, 'Erreur programmation scraping (non bloquant)')
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
            justification:
              analysis.torpscore.breakdown.conformite.justification,
          },
        },
        alerts: analysis.torpscore.alerts || [],
        recommendations: analysis.torpscore.recommendations || [],
        algorithmVersion: 'llm-optimized-v2.2',
      } as any

      useAdvancedScoring = true
      const scoringDuration = Date.now() - scoringStartTime
      log.info({
        duration: scoringDuration,
        score: advancedScore.totalScore,
        grade: advancedScore.grade,
        method: 'llm-direct'
      }, 'Score LLM utilisé directement')
    } else {
      // Fallback sur scoring avancé si score LLM manquant (rare)
      try {
        const scoringEngine = new AdvancedScoringEngine(false) // ML désactivé pour vitesse

        const userProfile = 'B2C'
        const projectTypeForScoring =
          ccfData?.projectType ||
          (inferProjectType(analysis.extractedData) as
            | 'construction'
            | 'renovation'
            | 'extension'
            | 'maintenance')
        const projectAmount = ccfData?.budgetRange?.preferred
          ? ccfData.budgetRange.preferred < 10000
            ? 'low'
            : ccfData.budgetRange.preferred < 50000
              ? 'medium'
              : 'high'
          : inferProjectAmount(analysis.extractedData.totals.total)
        const tradeTypeForScoring =
          ccfData?.tradeType || inferTradeType(analysis.rawText)
        const regionForScoring =
          ccfData?.region ||
          (analysis.extractedData.project?.location
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
        log.info({
          duration: scoringDuration,
          score: advancedScore.totalScore,
          method: 'advanced-fallback'
        }, 'Score avancé calculé (fallback)')
        useAdvancedScoring = true
      } catch (error) {
        log.error({ err: error }, 'Erreur scoring avancé')
        useAdvancedScoring = false
      }
    }

    // 4. Créer le score TORP (utiliser score avancé si disponible, sinon fallback LLM)
    const finalRegion = analysis.extractedData.project?.location
      ? extractRegion(analysis.extractedData.project.location)
      : 'ILE_DE_FRANCE'

    const finalScore =
      useAdvancedScoring && advancedScore
        ? {
            scoreValue: new Decimal(advancedScore.totalScore),
            scoreGrade: advancedScore.grade,
            confidenceLevel: new Decimal(advancedScore.confidenceLevel),
            breakdown: {
              // Score avancé : structure complète avec 8 axes (si disponible)
              version: 'advanced-v2.0.0',
              totalScore: advancedScore.totalScore,
              percentage:
                (advancedScore as any).percentage ||
                Math.round((advancedScore.totalScore / 1200) * 100),
              axes:
                'axisScores' in advancedScore &&
                Array.isArray((advancedScore as any).axisScores)
                  ? (advancedScore as any).axisScores.map((axis: any) => ({
                      id: axis.axisId,
                      score: axis.score,
                      maxPoints: axis.maxPoints,
                      percentage: axis.percentage,
                      subCriteria: axis.subCriteriaScores,
                    }))
                  : [],
              // Rétrocompatibilité avec l'ancien format
              prix: findAxisScore(advancedScore, 'prix'),
              qualite: findAxisScore(advancedScore, 'qualite'),
              delais: findAxisScore(advancedScore, 'delais'),
              conformite: findAxisScore(advancedScore, 'conformite'),
            },
            alerts:
              (advancedScore as any).overallAlerts ||
              (advancedScore as any).alerts ||
              [],
            recommendations:
              (advancedScore as any).overallRecommendations ||
              (advancedScore as any).recommendations ||
              [],
            algorithmVersion:
              (advancedScore as any).algorithmVersion || 'advanced-v2.0.0',
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
            } as any,
          }
        : {
            // Fallback sur score LLM classique
            scoreValue: new Decimal(analysis.torpscore.scoreValue),
            scoreGrade: analysis.torpscore.scoreGrade,
            confidenceLevel: new Decimal(analysis.torpscore.confidenceLevel),

            breakdown: analysis.torpscore.breakdown as any,

            alerts: analysis.torpscore.alerts as any,

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
            } as any,
          }

    const torpScore = await prisma.tORPScore.create({
      data: {
        devisId: devis.id,
        userId,
        ...finalScore,

        breakdown: finalScore.breakdown as any,

        alerts: finalScore.alerts as any,

        recommendations: finalScore.recommendations as any,

        regionalBenchmark: finalScore.regionalBenchmark as any,
      },
    })

    log.info({
      torpScoreId: torpScore.id,
      grade: torpScore.scoreGrade,
      score: Number(torpScore.scoreValue)
    }, 'Score TORP créé')

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
        log.debug({ devisId: devis.id }, 'CCF lié au devis')
      } catch (error) {
        log.warn({ err: error, devisId: devis.id }, 'Erreur lors de la liaison CCF')
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
    log.error({
      err: error,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    }, 'Erreur lors de l\'analyse du document')
    return NextResponse.json(
      {
        error: "Erreur lors de l'analyse du document",
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  } finally {
    // Nettoyer le fichier temporaire
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
        log.debug({ tempFilePath }, 'Fichier temporaire supprimé')
      } catch (err) {
        log.error({ err, tempFilePath }, 'Erreur lors de la suppression du fichier temporaire')
      }
    }
  }
}

/**
 * Inférer le type de métier depuis le texte brut
 */
function inferTradeType(rawText: string): string {
  const text = rawText.toLowerCase()

  if (
    text.includes('plomberie') ||
    text.includes('plombier') ||
    text.includes('sanitaire')
  ) {
    return 'plomberie'
  }
  if (
    text.includes('électricité') ||
    text.includes('électricien') ||
    text.includes('électrique')
  ) {
    return 'electricite'
  }
  if (
    text.includes('maçonnerie') ||
    text.includes('maçon') ||
    text.includes('gros œuvre')
  ) {
    return 'maconnerie'
  }
  if (
    text.includes('menuiserie') ||
    text.includes('menuisier') ||
    text.includes('charpente')
  ) {
    return 'menuiserie'
  }
  if (
    text.includes('peinture') ||
    text.includes('peintre') ||
    text.includes('revêtement')
  ) {
    return 'peinture'
  }
  if (
    text.includes('chauffage') ||
    text.includes('climatisation') ||
    text.includes('cvc')
  ) {
    return 'chauffage'
  }
  if (
    text.includes('toiture') ||
    text.includes('couvreur') ||
    text.includes('zinguerie')
  ) {
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

  if (
    projectTitle.includes('construction') ||
    projectTitle.includes('neuf') ||
    projectDesc.includes('construction') ||
    projectDesc.includes('neuf')
  ) {
    return 'construction'
  }
  if (
    projectTitle.includes('rénovation') ||
    projectTitle.includes('renovation') ||
    projectDesc.includes('rénovation') ||
    projectDesc.includes('renovation')
  ) {
    return 'renovation'
  }
  if (projectTitle.includes('extension') || projectDesc.includes('extension')) {
    return 'extension'
  }
  if (
    projectTitle.includes('maintenance') ||
    projectTitle.includes('entretien') ||
    projectDesc.includes('maintenance') ||
    projectDesc.includes('entretien')
  ) {
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
  if (
    loc.includes('paris') ||
    loc.includes('île-de-france') ||
    loc.includes('ile-de-france')
  ) {
    return 'ILE_DE_FRANCE'
  }
  if (
    loc.includes('lyon') ||
    loc.includes('rhône') ||
    loc.includes('auvergne')
  ) {
    return 'AUVERGNE_RHONE_ALPES'
  }
  if (
    loc.includes('marseille') ||
    loc.includes('paca') ||
    loc.includes('provence')
  ) {
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
  if (enrichmentData?.priceReferences?.length > 0)
    sources.push('Prix Référence')
  if (enrichmentData?.regionalData) sources.push('Données Régionales')
  if (enrichmentData?.complianceData) sources.push('Conformité')
  if (enrichmentData?.weatherData) sources.push('Météo')
  return sources
}

/**
 * Trouver le score d'un axe spécifique (pour rétrocompatibilité)
 */
function findAxisScore(advancedScore: any, axisId: string): any {
  // Vérifier si axisScores existe et est un tableau
  if (
    !advancedScore ||
    !('axisScores' in advancedScore) ||
    !Array.isArray(advancedScore.axisScores)
  ) {
    // Si pas d'axisScores, chercher dans breakdown
    const breakdown = advancedScore?.breakdown || {}
    const axisData = breakdown[axisId]
    if (axisData) {
      return {
        score: axisData.score || 0,
        weight: axisData.weight || 0,
        justification: axisData.justification || 'Non calculé',
      }
    }
    return { score: 0, weight: 0, justification: 'Non calculé' }
  }

  const axis = advancedScore.axisScores.find((a: any) => a.axisId === axisId)
  if (!axis) return { score: 0, weight: 0, justification: 'Non calculé' }

  return {
    score: axis.score,
    weight: axis.maxPoints / 1200,
    justification: `Score: ${axis.score}/${axis.maxPoints} (${axis.percentage?.toFixed(1) || 0}%)`,
  }
}
