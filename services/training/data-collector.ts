/**
 * TORP Training Data Collector
 * Collecte et prépare les données d'entraînement pour le ML
 */

import { prisma } from '@/lib/db'
import type { MLFeatures } from '@/services/ml/scoring-ml'
import { ScoringML } from '@/services/ml/scoring-ml'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment
export interface TrainingExample {
  id: string
  features: MLFeatures
  actualScore: number
  actualGrade: string
  predictedScore?: number
  predictedGrade?: string
  error?: number
  enrichmentData: any
  metadata: {
    devisId: string
    createdAt: string
    region: string
    projectType: string
    dataCompleteness: number
    sourcesCount: number
  }
}

export interface TrainingDataset {
  version: string
  createdAt: string
  examples: TrainingExample[]
  statistics: {
    total: number
    byGrade: Record<string, number>
    averageScore: number
    averageCompleteness: number
    regions: string[]
    projectTypes: string[]
  }
}

export class TrainingDataCollector {
  private mlEngine: ScoringML

  constructor() {
    this.mlEngine = new ScoringML()
  }

  /**
   * Collecte les données d'entraînement depuis les devis existants
   */
  async collectTrainingData(options?: {
    limit?: number
    dateRange?: { start: Date; end: Date }
  }): Promise<TrainingExample[]> {
    const limit = options?.limit || 100
    const dateRange = options?.dateRange

    // Construire la clause WHERE
    const whereClause: any = {}
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      }
    }

    const devis = await prisma.devis.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        torpScores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    const examples: TrainingExample[] = []

    for (const currentDevis of devis) {
      try {
        const latestScore = currentDevis.torpScores[0]
        if (!latestScore) continue // Ignorer les devis sans score

        // Extraire les features
        const enrichedData = (currentDevis as any).enrichedData || {}
        const extractedData = (currentDevis.extractedData as any) || {}
        
        const features = this.mlEngine.extractFeatures(currentDevis as any, enrichedData)

        // Calculer la complétude
        const dataCompleteness = this.calculateCompleteness(currentDevis as any, enrichedData)
        const sourcesCount = this.countSources(enrichedData)

        const example: TrainingExample = {
          id: `training_${currentDevis.id}_${Date.now()}`,
          features,
          actualScore: Number(latestScore.scoreValue),
          actualGrade: latestScore.scoreGrade,
          enrichmentData: enrichedData,
          metadata: {
            devisId: currentDevis.id,
            createdAt: currentDevis.createdAt.toISOString(),
            region: extractedData.project?.location?.region || 'unknown',
            projectType: extractedData.project?.type || 'unknown',
            dataCompleteness,
            sourcesCount,
          },
        }

        // Calculer l'erreur si prédiction disponible
        try {
          const prediction = await this.mlEngine.predictScore(features, Number(latestScore.scoreValue))
          example.predictedScore = prediction.predictedScore
          example.predictedGrade = prediction.predictedGrade
          example.error = Math.abs(prediction.predictedScore - Number(latestScore.scoreValue))
        } catch (error) {
          log.warn({ err: error, devisId: currentDevis.id }, 'Erreur prédiction')
        }

        examples.push(example)
      } catch (error) {
        console.error(`[TrainingCollector] Erreur traitement devis ${currentDevis.id}:`, error)
      }
    }

    log.debug({ count: examples.length }, 'Exemples collectés')
    return examples
  }

  /**
   * Crée un dataset d'entraînement complet
   */
  async createDataset(examples: TrainingExample[], version = '1.0.0'): Promise<TrainingDataset> {
    const byGrade: Record<string, number> = {}
    let totalScore = 0
    let totalCompleteness = 0
    const regions = new Set<string>()
    const projectTypes = new Set<string>()

    examples.forEach((ex) => {
      byGrade[ex.actualGrade] = (byGrade[ex.actualGrade] || 0) + 1
      totalScore += ex.actualScore
      totalCompleteness += ex.metadata.dataCompleteness
      regions.add(ex.metadata.region)
      projectTypes.add(ex.metadata.projectType)
    })

    return {
      version,
      createdAt: new Date().toISOString(),
      examples,
      statistics: {
        total: examples.length,
        byGrade,
        averageScore: examples.length > 0 ? totalScore / examples.length : 0,
        averageCompleteness: examples.length > 0 ? totalCompleteness / examples.length : 0,
        regions: Array.from(regions),
        projectTypes: Array.from(projectTypes),
      },
    }
  }

  /**
   * Exporte les données en JSON
   */
  async exportToJson(dataset: TrainingDataset): Promise<string> {
    return JSON.stringify(dataset, null, 2)
  }

  /**
   * Calcule la complétude des données d'un devis
   */
  private calculateCompleteness(devis: any, enrichedData: any): number {
    let completeness = 0
    let max = 0

    // Données de base
    max += 3
    if (devis.extractedData) completeness += 1
    if (enrichedData.company) completeness += 1
    if (enrichedData.priceReferences?.length > 0) completeness += 1

    // Données enrichies
    max += 5
    if (enrichedData.regionalData) completeness += 1
    if (enrichedData.complianceData) completeness += 1
    if (enrichedData.weatherData) completeness += 1
    if (enrichedData.dtus?.length > 0) completeness += 1
    if (enrichedData.certifications?.length > 0) completeness += 1

    return max > 0 ? (completeness / max) * 100 : 0
  }

  /**
   * Compte le nombre de sources utilisées
   */
  private countSources(enrichedData: any): number {
    let count = 0
    if (enrichedData.company) count++
    if (enrichedData.priceReferences?.length > 0) count++
    if (enrichedData.regionalData) count++
    if (enrichedData.complianceData) count++
    if (enrichedData.weatherData) count++
    if (enrichedData.dtus?.length > 0) count++
    if (enrichedData.certifications?.length > 0) count++
    return count
  }
}
