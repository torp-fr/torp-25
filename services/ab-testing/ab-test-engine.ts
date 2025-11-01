/**
 * TORP A/B Testing Engine
 * Compare différentes versions de l'algorithme de scoring
 */

import type { Devis } from '@/types'
import { AdvancedScoringEngine } from '@/services/scoring/advanced/advanced-scoring-engine'
import type { FinalScore } from '@/services/scoring/advanced/types'

export interface ABTestConfig {
  testId: string
  name: string
  variants: {
    control: {
      id: string
      name: string
      useML: boolean
      mlWeight: number
      version: string
    }
    variant: {
      id: string
      name: string
      useML: boolean
      mlWeight: number
      version: string
    }
  }
  trafficSplit: number // 0-1, proportion vers variant
  startDate: Date
  endDate?: Date
  metrics: string[] // Métriques à comparer
}

export interface ABTestResult {
  testId: string
  status: 'running' | 'completed' | 'paused'
  variant: 'control' | 'variant'
  score: number
  confidence: number
  metrics: {
    scoreAccuracy: number
    userSatisfaction?: number
    recommendationAccuracy?: number
  }
}

export interface ABTestComparison {
  testId: string
  control: ABTestResult
  variant: ABTestResult
  improvement: {
    scoreAccuracy: number // % amélioration
    confidence: number // Différence de confiance
  }
  significance: {
    pValue: number
    significant: boolean
  }
  recommendation: 'control' | 'variant' | 'inconclusive'
}

export class ABTestEngine {
  private activeTests: Map<string, ABTestConfig> = new Map()

  /**
   * Crée une nouvelle configuration de test A/B
   */
  createTest(config: ABTestConfig): void {
    // Valider la configuration
    if (config.trafficSplit < 0 || config.trafficSplit > 1) {
      throw new Error('trafficSplit must be between 0 and 1')
    }
    if (config.startDate > (config.endDate || new Date())) {
      throw new Error('startDate must be before endDate')
    }

    this.activeTests.set(config.testId, config)
    console.log(`[ABTestEngine] ✅ Test A/B créé: ${config.name} (${config.testId})`)
  }

  /**
   * Détermine quelle variante utiliser pour un devis
   */
  getVariant(testId: string, devisId: string): 'control' | 'variant' {
    const test = this.activeTests.get(testId)
    if (!test) {
      return 'control' // Fallback sur contrôle
    }

    // Vérifier si le test est actif
    const now = new Date()
    if (now < test.startDate) return 'control'
    if (test.endDate && now > test.endDate) return 'control'

    // Distribution basée sur hash du devisId (déterministe)
    const hash = this.simpleHash(devisId)
    const threshold = test.trafficSplit * 1000

    return hash < threshold ? 'variant' : 'control'
  }

  /**
   * Exécute le scoring avec la variante appropriée
   */
  async scoreWithVariant(
    testId: string,
    devis: Devis,
    enrichmentData: any,
    context: any
  ): Promise<{ score: FinalScore; variant: 'control' | 'variant' }> {
    const test = this.activeTests.get(testId)
    if (!test) {
      // Fallback sur scoring standard
      const engine = new AdvancedScoringEngine(true)
      const score = await engine.calculateScore(devis, enrichmentData, context)
      return { score, variant: 'control' }
    }

    const variant = this.getVariant(testId, devis.id)
    const variantConfig = test.variants[variant]

    // Créer le moteur avec la configuration appropriée
    const engine = new AdvancedScoringEngine(variantConfig.useML)
    
    // Calculer le score
    const score = await engine.calculateScore(devis, enrichmentData, context)

    // Logger pour tracking
    await this.logTestResult(testId, devis.id, variant, score)

    return { score, variant }
  }

  /**
   * Compare les résultats d'un test A/B
   */
  async compareTest(testId: string): Promise<ABTestComparison> {
    const test = this.activeTests.get(testId)
    if (!test) {
      throw new Error(`Test ${testId} not found`)
    }

    // Récupérer les résultats depuis la base
    const results = await this.getTestResults(testId)
    
    const controlResults = results.filter((r) => r.variant === 'control')
    const variantResults = results.filter((r) => r.variant === 'variant')

    if (controlResults.length === 0 || variantResults.length === 0) {
      throw new Error('Insufficient data for comparison')
    }

    // Calculer les moyennes
    const controlAvg = this.calculateAverage(controlResults)
    const variantAvg = this.calculateAverage(variantResults)

    // Test de significativité (t-test simplifié)
    const significance = this.calculateSignificance(controlResults, variantResults)

    // Calculer l'amélioration
    const improvement = {
      scoreAccuracy: ((variantAvg.metrics.scoreAccuracy - controlAvg.metrics.scoreAccuracy) / controlAvg.metrics.scoreAccuracy) * 100,
      confidence: variantAvg.confidence - controlAvg.confidence,
    }

    // Recommandation
    let recommendation: 'control' | 'variant' | 'inconclusive'
    if (significance.significant && improvement.scoreAccuracy > 5) {
      recommendation = 'variant'
    } else if (significance.significant && improvement.scoreAccuracy < -5) {
      recommendation = 'control'
    } else {
      recommendation = 'inconclusive'
    }

    return {
      testId,
      control: controlAvg,
      variant: variantAvg,
      improvement,
      significance,
      recommendation,
    }
  }

  /**
   * Hash simple pour distribution déterministe
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash % 1000)
  }

  /**
   * Log les résultats d'un test
   */
  private async logTestResult(
    _testId: string,
    _devisId: string,
    variant: 'control' | 'variant',
    score: FinalScore
  ): Promise<void> {
    try {
      // Stocker dans une table dédiée (ou utiliser les métadonnées du score)
      // Pour l'instant, on log seulement
      console.log(`[ABTestEngine] 📊 Test: ${variant} - Score ${score.totalScore} (${score.grade})`)
      
      // TODO: Créer une table ABTestResult dans Prisma si nécessaire
    } catch (error) {
      console.error('[ABTestEngine] Erreur logging:', error)
    }
  }

  /**
   * Récupère les résultats d'un test
   */
  private async getTestResults(_testId: string): Promise<ABTestResult[]> {
    // TODO: Implémenter récupération depuis la base
    // Pour l'instant, retourner des données vides
    return []
  }

  /**
   * Calcule la moyenne des résultats
   */
  private calculateAverage(results: ABTestResult[]): ABTestResult {
    if (results.length === 0) {
      throw new Error('Empty results')
    }

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length
    const avgAccuracy = results.reduce((sum, r) => sum + r.metrics.scoreAccuracy, 0) / results.length

    return {
      testId: results[0].testId,
      status: 'completed',
      variant: results[0].variant,
      score: avgScore,
      confidence: avgConfidence,
      metrics: {
        scoreAccuracy: avgAccuracy,
      },
    }
  }

  /**
   * Calcule la significativité statistique (t-test simplifié)
   */
  private calculateSignificance(
    control: ABTestResult[],
    variant: ABTestResult[]
  ): { pValue: number; significant: boolean } {
    // Simplification: comparer les moyennes avec seuil arbitraire
    // Dans un vrai cas, utiliser un vrai test statistique
    const controlAvg = control.reduce((sum, r) => sum + r.score, 0) / control.length
    const variantAvg = variant.reduce((sum, r) => sum + r.score, 0) / variant.length
    
    const diff = Math.abs(variantAvg - controlAvg)
    const pooledStd = Math.sqrt(
      (this.variance(control.map((r) => r.score)) + this.variance(variant.map((r) => r.score))) / 2
    )

    // t-statistic simplifié
    const tStat = diff / (pooledStd / Math.sqrt(Math.min(control.length, variant.length)))
    
    // p-value approximative (seuil 0.05)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStat)))
    const significant = pValue < 0.05

    return { pValue, significant }
  }

  /**
   * Calcule la variance
   */
  private variance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length
  }

  /**
   * Fonction de distribution normale cumulative (approximation)
   */
  private normalCDF(x: number): number {
    // Approximation simple
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)))
  }

  /**
   * Fonction d'erreur (approximation)
   */
  private erf(x: number): number {
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const sign = x < 0 ? -1 : 1
    x = Math.abs(x)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
  }
}

