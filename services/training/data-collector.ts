/**
 * TORP Training Data Collector
 * Collecte et prépare les données d'entraînement pour le ML
 */

import { prisma } from '@/lib/db'
import type { Devis, TORPScore } from '@/types'
import type { MLFeatures } from '@/services/ml/scoring-ml'
import { ScoringML } from '@/services/ml/scoring-ml'

export interface TrainingExample {
  id: string
  features: MLFeatures
  actualScore: number
  actualGrade: string
  predictedScore?: number
  predictedGrade?: string
  error?: number
  enrichmentData?: any
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
  private readonly mlEngine = new ScoringML()

  /**
   * Collecte les données d'entraînement depuis les devis existants
   */
  async collectFromDevis(
    limit: number = 100,
    dateRange?: { start: Date; end: Date }
  ): Promise<TrainingExample[]> {
    console.log(`[TrainingCollector] 🔍 Collecte données depuis ${limit} devis...`)

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

    for (const devis of devis) {
      try {
        const latestScore = devis.torpScores[0]
        if (!latestScore) continue // Ignorer les devis sans score

        // Extraire les features
        const extractedData = devis.extractedData as any || {}
        const enrichedData = devis.enrichedData as any || {}
        
        const features = this.mlEngine.extractFeatures(devis, enrichedData)

        // Calculer la complétude
        const dataCompleteness = this.calculateCompleteness(devis, enrichedData)
        const sourcesCount = this.countSources(enrichedData)

        const example: TrainingExample = {
          id: `training_${devis.id}_${Date.now()}`,
          features,
          actualScore: latestScore.scoreValue,
          actualGrade: latestScore.scoreGrade,
          enrichmentData: enrichedData,
          metadata: {
            devisId: devis.id,
            createdAt: devis.createdAt.toISOString(),
            region: extractedData.project?.location?.region || 'unknown',
            projectType: extractedData.project?.type || 'unknown',
            dataCompleteness,
            sourcesCount,
          },
        }

        // Calculer l'erreur si prédiction disponible
        try {
          const prediction = await this.mlEngine.predictScore(features, latestScore.scoreValue)
          example.predictedScore = prediction.predictedScore
          example.predictedGrade = prediction.predictedGrade
          example.error = Math.abs(prediction.predictedScore - latestScore.scoreValue)
        } catch (error) {
          console.warn(`[TrainingCollector] Erreur prédiction pour ${devis.id}:`, error)
        }

        examples.push(example)
      } catch (error) {
        console.error(`[TrainingCollector] Erreur traitement devis ${devis.id}:`, error)
      }
    }

    console.log(`[TrainingCollector] ✅ ${examples.length} exemples collectés`)
    return examples
  }

  /**
   * Crée un dataset d'entraînement complet
   */
  async createTrainingDataset(
    examples: TrainingExample[],
    version: string = '1.0.0'
  ): Promise<TrainingDataset> {
    // Statistiques
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
   * Exporte le dataset en JSON
   */
  async exportDataset(dataset: TrainingDataset, filePath: string): Promise<void> {
    const fs = await import('fs/promises')
    await fs.writeFile(filePath, JSON.stringify(dataset, null, 2))
    console.log(`[TrainingCollector] 💾 Dataset exporté: ${filePath}`)
  }

  /**
   * Calcule la complétude des données
   */
  private calculateCompleteness(devis: any, enrichedData: any): number {
    let total = 0
    let filled = 0

    // Données extraites
    const extractedData = devis.extractedData as any || {}
    if (extractedData.company?.siret) filled++
    total++
    if (extractedData.company?.name) filled++
    total++
    if (extractedData.items?.length) filled++
    total++
    if (extractedData.project?.type) filled++
    total++

    // Données enrichies
    if (enrichedData?.company?.financialData) filled++
    total++
    if (enrichedData?.priceReferences?.length) filled++
    total++
    if (enrichedData?.regionalData) filled++
    total++
    if (enrichedData?.complianceData) filled++
    total++

    return total > 0 ? (filled / total) * 100 : 0
  }

  /**
   * Compte les sources de données
   */
  private countSources(enrichedData: any): number {
    let count = 0
    if (enrichedData?.company?.siret) count++
    if (enrichedData?.company?.financialData) count++
    if (enrichedData?.priceReferences?.length) count++
    if (enrichedData?.regionalData) count++
    if (enrichedData?.complianceData) count++
    return count
  }

  /**
   * Valide un exemple d'entraînement
   */
  validateExample(example: TrainingExample): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Vérifier les features essentielles
    if (!example.features.totalAmount || example.features.totalAmount <= 0) {
      errors.push('totalAmount manquant ou invalide')
    }
    if (example.features.itemsCount <= 0) {
      errors.push('itemsCount doit être > 0')
    }
    if (!example.actualScore || example.actualScore < 0 || example.actualScore > 1000) {
      errors.push('actualScore invalide')
    }

    // Vérifier la complétude
    if (example.metadata.dataCompleteness < 30) {
      errors.push('dataCompleteness trop faible (<30%)')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Nettoie et filtre les exemples invalides
   */
  cleanDataset(examples: TrainingExample[]): TrainingExample[] {
    return examples.filter((ex) => {
      const validation = this.validateExample(ex)
      if (!validation.valid) {
        console.warn(`[TrainingCollector] Exemple invalide ignoré:`, validation.errors)
      }
      return validation.valid
    })
  }
}

