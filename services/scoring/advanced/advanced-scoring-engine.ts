/**
 * TORP Advanced Scoring Engine
 * Architecture multi-niveaux : 9 axes, 48 sous-critères, 250+ points de contrôle
 * Score total : 1350 points
 */

import type {
  FinalScore,
  AxisScore,
  UserProfile,
  ProjectType,
  ProjectAmount,
  ScoreGrade,
  ScoringEnrichmentData,
  Recommendation,
} from './types'
import type { Devis } from '@/types'

// Import des axes
import { Axe1Conformite } from './axes/axe1-conformite'
import { Axe2Prix } from './axes/axe2-prix'
import { Axe3Qualite } from './axes/axe3-qualite'
import { Axe4Faisabilite } from './axes/axe4-faisabilite'
import { Axe5Transparence } from './axes/axe5-transparence'
import { Axe6Garanties } from './axes/axe6-garanties'
import { Axe7Innovation } from './axes/axe7-innovation'
import { Axe8Delais } from './axes/axe8-delais'
import { Axe9Coherence } from './axes/axe9-coherence'
import { ScoringML } from '@/services/ml/scoring-ml'

interface AxisConfig {
  id: string
  name: string
  weight: number
  weightB2C: number
  weightB2B: number
  maxPoints: number
}

export class AdvancedScoringEngine {
  private readonly version = '2.2.0' // Version avec Axe 9 Cohérence
  private axesConfig!: AxisConfig[]
  private axeInstances!: {
    conformite: Axe1Conformite
    prix: Axe2Prix
    qualite: Axe3Qualite
    faisabilite: Axe4Faisabilite
    transparence: Axe5Transparence
    garanties: Axe6Garanties
    innovation: Axe7Innovation
    delais: Axe8Delais
    coherence: Axe9Coherence
  }
  private mlEngine: ScoringML
  private useML: boolean

  constructor(useML: boolean = true) {
    this.useML = useML
    this.mlEngine = new ScoringML()
    this.initializeAxesConfig()
    this.initializeAxes()
  }

  private initializeAxes() {
    this.axeInstances = {
      conformite: new Axe1Conformite(),
      prix: new Axe2Prix(),
      qualite: new Axe3Qualite(),
      faisabilite: new Axe4Faisabilite(),
      transparence: new Axe5Transparence(),
      garanties: new Axe6Garanties(),
      innovation: new Axe7Innovation(),
      delais: new Axe8Delais(),
      coherence: new Axe9Coherence(),
    }
  }

  private initializeAxesConfig() {
    this.axesConfig = [
      {
        id: 'conformite',
        name: 'Conformité Réglementaire & Technique',
        weight: 0.29,
        weightB2C: 0.35,
        weightB2B: 0.26,
        maxPoints: 350,
      },
      {
        id: 'prix',
        name: 'Analyse Prix & Marché',
        weight: 0.21,
        weightB2C: 0.18,
        weightB2B: 0.28,
        maxPoints: 250,
      },
      {
        id: 'qualite',
        name: 'Qualité & Réputation Entreprise',
        weight: 0.17,
        weightB2C: 0.22,
        weightB2B: 0.15,
        maxPoints: 200,
      },
      {
        id: 'faisabilite',
        name: 'Faisabilité & Cohérence Technique',
        weight: 0.12,
        weightB2C: 0.08,
        weightB2B: 0.18,
        maxPoints: 150,
      },
      {
        id: 'transparence',
        name: 'Transparence & Communication',
        weight: 0.08,
        weightB2C: 0.15,
        weightB2B: 0.05,
        maxPoints: 100,
      },
      {
        id: 'garanties',
        name: 'Garanties & Assurances',
        weight: 0.07,
        weightB2C: 0.10,
        weightB2B: 0.05,
        maxPoints: 80,
      },
      {
        id: 'innovation',
        name: 'Innovation & Développement Durable',
        weight: 0.04,
        weightB2C: 0.02,
        weightB2B: 0.08,
        maxPoints: 50,
      },
      {
        id: 'delais',
        name: 'Gestion Projet & Délais',
        weight: 0.06,
        weightB2C: 0.05,
        weightB2B: 0.10,
        maxPoints: 70,
      },
      {
        id: 'coherence',
        name: 'Cohérence Demande/Devis',
        weight: 0.11,
        weightB2C: 0.12,
        weightB2B: 0.08,
        maxPoints: 150,
      },
    ]
  }

  /**
   * Calcule le score complet pour un devis
   */
  async calculateScore(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: {
      profile: UserProfile
      projectType: ProjectType
      projectAmount: ProjectAmount
      region?: string
      tradeType?: string
    }
  ): Promise<FinalScore> {
    const axisScores: AxisScore[] = []
    const allAlerts: any[] = []
    const allRecommendations: Recommendation[] = []

    // Calculer chaque axe
    const scoringContext = {
      projectType: context.projectType,
      tradeType: context.tradeType,
      region: context.region || 'ILE_DE_FRANCE',
      projectAmount: context.projectAmount,
    }

    // Axe 1: Conformité
    const conformiteScore = await this.axeInstances.conformite.calculate(
      devis,
      enrichmentData,
      scoringContext
    )
    axisScores.push(this.applyWeight(conformiteScore, 'conformite', context.profile))

    // Axe 2: Prix
    const prixScore = await this.axeInstances.prix.calculate(
      devis,
      enrichmentData,
      { projectType: context.projectType, region: scoringContext.region }
    )
    axisScores.push(this.applyWeight(prixScore, 'prix', context.profile))

    // Axe 3: Qualité
    const qualiteScore = await this.axeInstances.qualite.calculate(
      devis,
      enrichmentData,
      { projectType: context.projectType, projectAmount: context.projectAmount }
    )
    axisScores.push(this.applyWeight(qualiteScore, 'qualite', context.profile))

    // Axe 4: Faisabilité
    const faisabiliteScore = await this.axeInstances.faisabilite.calculate(
      devis,
      enrichmentData,
      { projectType: context.projectType }
    )
    axisScores.push(this.applyWeight(faisabiliteScore, 'faisabilite', context.profile))

    // Axe 5: Transparence
    const transparenceScore = await this.axeInstances.transparence.calculate(
      devis,
      enrichmentData
    )
    axisScores.push(this.applyWeight(transparenceScore, 'transparence', context.profile))

    // Axe 6: Garanties
    const garantiesScore = await this.axeInstances.garanties.calculate(
      devis,
      enrichmentData
    )
    axisScores.push(this.applyWeight(garantiesScore, 'garanties', context.profile))

    // Axe 7: Innovation
    const innovationScore = await this.axeInstances.innovation.calculate(
      devis,
      enrichmentData,
      { projectType: context.projectType }
    )
    axisScores.push(this.applyWeight(innovationScore, 'innovation', context.profile))

    // Axe 8: Délais
    const delaisScore = await this.axeInstances.delais.calculate(
      devis,
      enrichmentData,
      { projectType: context.projectType, region: scoringContext.region }
    )
    axisScores.push(this.applyWeight(delaisScore, 'delais', context.profile))

    // Axe 9: Cohérence Demande/Devis
    const coherenceScore = await this.axeInstances.coherence.calculate(
      devis,
      enrichmentData,
      {
        projectType: context.projectType,
        coherenceData: (context as any).coherenceData, // Données CCF du wizard
      }
    )
    axisScores.push(this.applyWeight(coherenceScore, 'coherence', context.profile))

    // Agréger tous les scores
    // Les scores sont déjà pondérés par applyWeight, on les somme directement
    let totalScore = 0
    for (const axisScore of axisScores) {
      totalScore += axisScore.score
      allAlerts.push(...axisScore.alerts)
      allRecommendations.push(...axisScore.recommendations)
    }

    // Normaliser sur 1350 points (les poids B2C/B2B sont déjà appliqués)
    const totalWeightedMax = this.getTotalWeightedPoints(context.profile)
    totalScore = (totalScore / totalWeightedMax) * 1350

    // Ajustement ML si activé
    let finalScore = totalScore
    let mlPrediction = null
    
    if (this.useML) {
      try {
        const features = this.mlEngine.extractFeatures(devis, enrichmentData)
        mlPrediction = await this.mlEngine.predictScore(features, totalScore)
        
        // Appliquer l'ajustement ML avec pondération de confiance
        const mlWeight = mlPrediction.confidence * 0.3 // Max 30% d'ajustement
        finalScore = totalScore * (1 - mlWeight) + mlPrediction.predictedScore * mlWeight
        finalScore = Math.max(0, Math.min(1350, finalScore))
        
        console.log(`[AdvancedScoringEngine] ML adjustment: ${(finalScore - totalScore).toFixed(1)} points (confidence: ${(mlPrediction.confidence * 100).toFixed(1)}%)`)
      } catch (error) {
        console.warn('[AdvancedScoringEngine] Erreur ML, utilisation score de base:', error)
      }
    }

    // Déterminer le grade
    const grade = this.getGradeFromScore(finalScore)
    const percentage = (finalScore / 1350) * 100

    // Calculer le niveau de confiance global
    let confidenceLevel = this.calculateConfidenceLevel(axisScores, enrichmentData)
    
    // Ajuster confiance avec ML si disponible
    if (mlPrediction) {
      confidenceLevel = confidenceLevel * 0.7 + mlPrediction.confidence * 100 * 0.3
    }

    // Générer recommandations globales
    const finalRecommendations = this.generateOverallRecommendations(
      totalScore,
      axisScores,
      context
    )
    allRecommendations.push(...finalRecommendations)

    return {
      totalScore: Math.round(finalScore),
      grade,
      percentage: Math.round(percentage * 10) / 10,
      axisScores,
      overallAlerts: allAlerts.filter((a) => a.type === 'critical' || a.type === 'major'),
      overallRecommendations: allRecommendations.sort((a: Recommendation, b: Recommendation) => {
        const priorityOrder: Record<'high' | 'medium' | 'low', number> = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }),
      confidenceLevel: Math.round(confidenceLevel * 10) / 10,
      mlPrediction: mlPrediction ? {
        adjustments: mlPrediction.adjustments,
        featureImportance: mlPrediction.featureImportance,
        confidence: mlPrediction.confidence,
      } : undefined,
      metadata: {
        profile: context.profile,
        projectType: context.projectType,
        projectAmount: context.projectAmount,
        scoringVersion: this.version,
        enrichedDataSources: this.extractSources(enrichmentData),
        enrichmentDate: new Date().toISOString(),
      },
    }
  }

  /**
   * Applique la pondération adaptative à un score d'axe
   */
  private applyWeight(
    axisScore: AxisScore,
    axisId: string,
    profile: UserProfile
  ): AxisScore {
    const axisConfig = this.axesConfig.find((a) => a.id === axisId)
    if (!axisConfig) return axisScore

    const weight = profile === 'B2C' ? axisConfig.weightB2C : axisConfig.weightB2B
    const adjustedScore = axisScore.score * weight
    const adjustedMaxPoints = axisConfig.maxPoints * weight

    return {
      ...axisScore,
      score: adjustedScore,
      maxPoints: adjustedMaxPoints,
      percentage: (adjustedScore / adjustedMaxPoints) * 100,
    }
  }

  /**
   * Calcule le total des points pondérés selon le profil
   */
  private getTotalWeightedPoints(profile: UserProfile): number {
    return this.axesConfig.reduce((sum, axis) => {
      const weight = profile === 'B2C' ? axis.weightB2C : axis.weightB2B
      return sum + axis.maxPoints * weight
    }, 0)
  }

  /**
   * Génère des recommandations globales selon le score
   */
  private generateOverallRecommendations(
    totalScore: number,
    axisScores: AxisScore[],
    _context: any
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Identifier les axes les plus faibles
    const weakAxes = axisScores
      .filter((a) => a.percentage < 60)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 2)

    for (const axis of weakAxes) {
      recommendations.push({
        priority: 'high',
        category: axis.axisId,
        suggestion: `Améliorer ${this.getAxisName(axis.axisId)} (${Math.round(axis.percentage)}% actuellement)`,
        potentialImpact: `+${Math.round((70 - axis.percentage) * axis.maxPoints / 100)} points possibles`,
        actionable: true,
      })
    }

    // Recommandations selon le grade
    if (totalScore < 600) {
      recommendations.push({
        priority: 'high',
        category: 'general',
        suggestion: 'Rechercher des alternatives - Ce devis présente des risques significatifs',
        potentialImpact: 'Réduction des risques financiers et techniques',
        actionable: true,
      })
    } else if (totalScore < 840) {
      recommendations.push({
        priority: 'medium',
        category: 'general',
        suggestion: 'Effectuer des vérifications supplémentaires avant validation',
        potentialImpact: 'Sécurisation du projet',
        actionable: true,
      })
    }

    return recommendations
  }

  /**
   * Obtient le nom d'un axe depuis son ID
   */
  private getAxisName(axisId: string): string {
    const axis = this.axesConfig.find((a) => a.id === axisId)
    return axis?.name || axisId
  }

  /**
   * Détermine le grade depuis le score
   */
  private getGradeFromScore(score: number): ScoreGrade {
    // Seuils ajustés pour 1350 points (90%, 80%, 70%, 60%, 50%)
    if (score >= 1215) return 'A+' // 90% de 1350
    if (score >= 1080) return 'A' // 80% de 1350
    if (score >= 945) return 'B' // 70% de 1350
    if (score >= 810) return 'C' // 60% de 1350
    if (score >= 675) return 'D' // 50% de 1350
    return 'E'
  }

  /**
   * Calcule le niveau de confiance global
   */
  private calculateConfidenceLevel(
    _axisScores: AxisScore[],
    enrichmentData: ScoringEnrichmentData
  ): number {
    // Base de confiance selon les données enrichies disponibles
    // TODO: Utiliser _axisScores pour ajuster la confiance selon la qualité des scores
    let confidence = 70

    if (enrichmentData.company?.financialData) confidence += 10
    if (enrichmentData.company?.reputation) confidence += 5
    if (enrichmentData.company?.legalStatusDetails) confidence += 5
    if (enrichmentData.priceReferences.length > 0) confidence += 5
    if (enrichmentData.regionalData) confidence += 3
    if (enrichmentData.complianceData) confidence += 2

    return Math.min(100, confidence)
  }

  /**
   * Extrait les sources de données enrichies
   */
  private extractSources(enrichmentData: ScoringEnrichmentData): string[] {
    const sources: string[] = []

    if (enrichmentData.company?.siret) sources.push('Sirene')
    if (enrichmentData.company?.financialData) sources.push('Infogreffe')
    if (enrichmentData.priceReferences.length > 0) sources.push('Prix Référence')
    if (enrichmentData.regionalData) sources.push('Données Régionales')
    if (enrichmentData.complianceData) sources.push('Conformité')
    if (enrichmentData.weatherData) sources.push('Météo')

    return sources
  }
}

