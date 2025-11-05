/**
 * TORP Machine Learning Module
 * Amélioration de la précision du scoring via ML
 */

import type { Devis } from '@/types'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment
export interface MLFeatures {
  // Features prix
  totalAmount: number
  pricePerSqm?: number
  itemsCount: number
  averageItemPrice: number
  
  // Features entreprise
  companyHasSiret: boolean
  companyHasFinancialData: boolean
  companyHasCertifications: boolean
  companyYearsActive?: number
  
  // Features données enrichies
  enrichmentSourcesCount: number
  hasPriceReferences: boolean
  hasRegionalData: boolean
  hasComplianceData: boolean
  
  // Features qualité
  itemsDescriptionQuality: number // 0-1
  technicalDetailsCompleteness: number // 0-1
  materialsSpecified: number // count
  quantitiesAccuracy: number // 0-1
  
  // Features contexte
  projectType: string
  region: string
  projectSize: 'small' | 'medium' | 'large'
}

export interface MLPrediction {
  predictedScore: number
  predictedGrade: 'A' | 'B' | 'C' | 'D' | 'E'
  confidence: number // 0-1
  featureImportance: Record<string, number>
  adjustments: {
    priceAdjustment: number
    qualityAdjustment: number
    riskAdjustment: number
  }
}

export class ScoringML {
  // Modèles simples basés sur règles (à remplacer par vrai ML)
  private priceModel: PricePredictor
  private qualityModel: QualityPredictor
  private riskModel: RiskPredictor

  constructor() {
    this.priceModel = new PricePredictor()
    this.qualityModel = new QualityPredictor()
    this.riskModel = new RiskPredictor()
  }

  /**
   * Extrait les features d'un devis pour le ML
   */
  extractFeatures(devis: Devis, enrichmentData?: any): MLFeatures {
    const extractedData = devis.extractedData as any || {}
    const items = extractedData.items || []
    
    const totalAmount = Number(devis.totalAmount) || 0
    const itemsCount = items.length
    const averageItemPrice = itemsCount > 0 
      ? items.reduce((sum: number, item: any) => sum + (Number(item.totalPrice) || 0), 0) / itemsCount
      : 0

    // Calcul qualité description
    let descriptionQuality = 0
    items.forEach((item: any) => {
      const desc = (item.description || '').length
      if (desc > 50) descriptionQuality += 1
    })
    descriptionQuality = itemsCount > 0 ? descriptionQuality / itemsCount : 0

    // Calcul complétude technique
    let technicalCompleteness = 0
    items.forEach((item: any) => {
      const hasUnit = !!(item.unit)
      const hasQuantity = !!(item.quantity)
      const hasUnitPrice = !!(item.unitPrice)
      technicalCompleteness += (hasUnit && hasQuantity && hasUnitPrice ? 1 : 0)
    })
    technicalCompleteness = itemsCount > 0 ? technicalCompleteness / itemsCount : 0

    // Compter matériaux spécifiés
    const materialsSpecified = items.filter((item: any) => {
      const desc = (item.description || '').toLowerCase()
      return desc.includes('marque') || desc.includes('référence') || desc.includes('modèle')
    }).length

    // Enrichissement
    const enrichmentSources: string[] = []
    if (enrichmentData?.company?.siret) enrichmentSources.push('sirene')
    if (enrichmentData?.company?.financialData) enrichmentSources.push('infogreffe')
    if (enrichmentData?.priceReferences?.length) enrichmentSources.push('prices')
    if (enrichmentData?.regionalData) enrichmentSources.push('regional')
    if (enrichmentData?.complianceData) enrichmentSources.push('compliance')

    // Taille projet
    let projectSize: 'small' | 'medium' | 'large' = 'small'
    if (totalAmount > 100000) projectSize = 'large'
    else if (totalAmount > 30000) projectSize = 'medium'

    return {
      totalAmount,
      pricePerSqm: extractedData.project?.surface ? totalAmount / extractedData.project.surface : undefined,
      itemsCount,
      averageItemPrice,
      companyHasSiret: !!(extractedData.company?.siret || enrichmentData?.company?.siret),
      companyHasFinancialData: !!(enrichmentData?.company?.financialData),
      companyHasCertifications: !!(enrichmentData?.company?.certifications?.length),
      companyYearsActive: enrichmentData?.company?.yearsActive,
      enrichmentSourcesCount: enrichmentSources.length,
      hasPriceReferences: !!(enrichmentData?.priceReferences?.length),
      hasRegionalData: !!enrichmentData?.regionalData,
      hasComplianceData: !!enrichmentData?.complianceData,
      itemsDescriptionQuality: descriptionQuality,
      technicalDetailsCompleteness: technicalCompleteness,
      materialsSpecified,
      quantitiesAccuracy: technicalCompleteness, // Approximation
      projectType: extractedData.project?.type || 'unknown',
      region: extractedData.project?.location?.region || 'unknown',
      projectSize,
    }
  }

  /**
   * Prédit le score avec ML
   */
  async predictScore(features: MLFeatures, baseScore: number): Promise<MLPrediction> {
    // Prédictions par modèle
    const pricePrediction = this.priceModel.predict(features)
    const qualityPrediction = this.qualityModel.predict(features)
    const riskPrediction = this.riskModel.predict(features)

    // Calcul ajustements
    const priceAdjustment = pricePrediction.adjustment
    const qualityAdjustment = qualityPrediction.adjustment
    const riskAdjustment = riskPrediction.adjustment

    // Score ajusté
    const adjustedScore = baseScore + priceAdjustment + qualityAdjustment + riskAdjustment
    const finalScore = Math.max(0, Math.min(1000, adjustedScore))

    // Importance des features
    const featureImportance = {
      totalAmount: pricePrediction.importance,
      enrichmentSourcesCount: qualityPrediction.importance,
      companyHasFinancialData: riskPrediction.importance,
      itemsDescriptionQuality: qualityPrediction.importance * 0.8,
      technicalDetailsCompleteness: qualityPrediction.importance * 0.6,
    }

    // Confiance basée sur la qualité des données
    const confidence = Math.min(1, 
      0.5 + // Base
      (features.enrichmentSourcesCount / 5) * 0.2 + // Sources
      features.itemsDescriptionQuality * 0.15 + // Qualité descriptions
      features.technicalDetailsCompleteness * 0.15 // Complétude technique
    )

    return {
      predictedScore: finalScore,
      predictedGrade: this.scoreToGrade(finalScore),
      confidence,
      featureImportance,
      adjustments: {
        priceAdjustment,
        qualityAdjustment,
        riskAdjustment,
      },
    }
  }

  /**
   * Convertit un score en grade
   */
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (score >= 800) return 'A'
    if (score >= 650) return 'B'
    if (score >= 500) return 'C'
    if (score >= 350) return 'D'
    return 'E'
  }

  /**
   * Entraîne les modèles (placeholder pour futur vrai ML)
   */
  async train(trainingData: Array<{ features: MLFeatures; actualScore: number }>): Promise<void> {
    // TODO: Implémenter l'entraînement avec TensorFlow.js ou autre
    log.debug({ count: trainingData.length }, 'Entraînement modèle')
    
    // Pour l'instant, ajustement des poids basé sur les données
    this.priceModel.adjustWeights(trainingData)
    this.qualityModel.adjustWeights(trainingData)
    this.riskModel.adjustWeights(trainingData)
  }
}

/**
 * Modèle de prédiction prix
 */
class PricePredictor {
  predict(features: MLFeatures): { adjustment: number; importance: number } {
    let adjustment = 0
    let importance = 0

    // Détection de surcoût
    if (features.hasPriceReferences) {
      // Logique simplifiée - à améliorer avec vraies données de prix
      if (features.averageItemPrice > 500) {
        adjustment -= 20 // Surcoût détecté
        importance = 0.8
      } else if (features.averageItemPrice < 100) {
        adjustment += 10 // Prix compétitif
        importance = 0.6
      }
    }

    // Ajustement selon taille projet
    if (features.projectSize === 'large' && features.itemsCount < 20) {
      adjustment -= 15 // Peu d'items pour grand projet = suspect
      importance = Math.max(importance, 0.7)
    }

    return { adjustment, importance }
  }

  adjustWeights(trainingData: any[]): void {
    // Placeholder - à implémenter avec vraie optimisation
    log.debug({ count: trainingData.length }, 'Ajustement poids PricePredictor')
  }
}

/**
 * Modèle de prédiction qualité
 */
class QualityPredictor {
  predict(features: MLFeatures): { adjustment: number; importance: number } {
    let adjustment = 0
    let importance = 0.7

    // Qualité descriptions
    if (features.itemsDescriptionQuality > 0.8) {
      adjustment += 15
    } else if (features.itemsDescriptionQuality < 0.5) {
      adjustment -= 20
    }

    // Complétude technique
    if (features.technicalDetailsCompleteness > 0.9) {
      adjustment += 10
    } else if (features.technicalDetailsCompleteness < 0.6) {
      adjustment -= 15
    }

    // Matériaux spécifiés
    if (features.materialsSpecified > features.itemsCount * 0.3) {
      adjustment += 5
    }

    return { adjustment, importance }
  }

  adjustWeights(trainingData: any[]): void {
    log.debug({ count: trainingData.length }, 'Ajustement poids QualityPredictor')
  }
}

/**
 * Modèle de prédiction risque
 */
class RiskPredictor {
  predict(features: MLFeatures): { adjustment: number; importance: number } {
    let adjustment = 0
    let importance = 0.6

    // Données financières
    if (!features.companyHasFinancialData) {
      adjustment -= 10 // Risque accru sans données financières
      importance = 0.8
    }

    // Certifications
    if (!features.companyHasCertifications && features.projectSize === 'large') {
      adjustment -= 15 // Projet important sans certifications
      importance = 0.9
    }

    // Enrichissement limité
    if (features.enrichmentSourcesCount < 2) {
      adjustment -= 5 // Moins de confiance avec peu de sources
    }

    return { adjustment, importance }
  }

  adjustWeights(trainingData: any[]): void {
    log.debug({ count: trainingData.length }, 'Ajustement poids RiskPredictor')
  }
}

