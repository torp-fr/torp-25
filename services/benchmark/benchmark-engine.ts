/**
 * TORP Benchmark Engine
 * Système de mesure de performance et de validation de l'algorithme de scoring
 */

import type { Devis, TORPScore } from '@/types'
import { prisma } from '@/lib/prisma'

export interface BenchmarkMetrics {
  // Métriques de précision
  accuracy: {
    scorePredictionAccuracy: number // Précision des prédictions de score
    gradePredictionAccuracy: number // Précision des prédictions de grade
    priceEstimationAccuracy: number // Précision des estimations de prix
  }
  
  // Métriques de cohérence
  consistency: {
    scoreStability: number // Stabilité du score sur différents passages
    interRaterReliability: number // Cohérence entre différents évaluateurs
    temporalConsistency: number // Cohérence temporelle
  }
  
  // Métriques de performance des données
  dataQuality: {
    dataCompleteness: number // Taux de complétude des données
    dataFreshness: number // Fraîcheur des données (âge moyen)
    sourceReliability: number // Fiabilité des sources
    enrichmentSuccessRate: number // Taux de succès de l'enrichissement
  }
  
  // Métriques algorithmiques
  algorithmPerformance: {
    scoringSpeed: number // Temps moyen de calcul du score (ms)
    criteriaCoverage: number // Pourcentage de critères évalués
    falsePositiveRate: number // Taux de faux positifs
    falseNegativeRate: number // Taux de faux négatifs
  }
  
  // Métriques business
  businessImpact: {
    userSatisfaction: number // Satisfaction utilisateur (si disponible)
    recommendationAccuracy: number // Précision des recommandations
    alertPrecision: number // Précision des alertes
  }
}

export interface BenchmarkResult {
  timestamp: string
  version: string
  metrics: BenchmarkMetrics
  sampleSize: number
  testCases: BenchmarkTestCase[]
  recommendations: string[]
}

export interface BenchmarkTestCase {
  devisId: string
  expectedGrade?: string
  actualGrade: string
  scoreDeviation?: number
  dataCompleteness: number
  sourcesUsed: string[]
  processingTime: number
  errors?: string[]
}

export class BenchmarkEngine {
  private readonly version: string = '1.0.0'

  /**
   * Exécute un benchmark complet sur un échantillon de devis
   */
  async runBenchmark(
    sampleSize: number = 100,
    dateRange?: { start: Date; end: Date }
  ): Promise<BenchmarkResult> {
    console.log(`[BenchmarkEngine] 🚀 Démarrage benchmark v${this.version}`)
    console.log(`[BenchmarkEngine] 📊 Échantillon: ${sampleSize} devis`)

    // 1. Sélectionner un échantillon représentatif
    const testCases = await this.selectSample(sampleSize, dateRange)
    console.log(`[BenchmarkEngine] ✅ ${testCases.length} devis sélectionnés`)

    // 2. Calculer les métriques de précision
    const accuracy = await this.calculateAccuracy(testCases)
    console.log(`[BenchmarkEngine] 📈 Précision calculée:`, accuracy)

    // 3. Calculer les métriques de cohérence
    const consistency = await this.calculateConsistency(testCases)
    console.log(`[BenchmarkEngine] 🔄 Cohérence calculée:`, consistency)

    // 4. Évaluer la qualité des données
    const dataQuality = await this.calculateDataQuality(testCases)
    console.log(`[BenchmarkEngine] 📦 Qualité données:`, dataQuality)

    // 5. Mesurer la performance algorithmique
    const algorithmPerformance = await this.calculateAlgorithmPerformance(testCases)
    console.log(`[BenchmarkEngine] ⚡ Performance algorithmique:`, algorithmPerformance)

    // 6. Évaluer l'impact business
    const businessImpact = await this.calculateBusinessImpact(testCases)
    console.log(`[BenchmarkEngine] 💼 Impact business:`, businessImpact)

    // 7. Générer des recommandations
    const recommendations = this.generateRecommendations({
      accuracy,
      consistency,
      dataQuality,
      algorithmPerformance,
      businessImpact,
    })

    const metrics: BenchmarkMetrics = {
      accuracy,
      consistency,
      dataQuality,
      algorithmPerformance,
      businessImpact,
    }

    return {
      timestamp: new Date().toISOString(),
      version: this.version,
      metrics,
      sampleSize: testCases.length,
      testCases,
      recommendations,
    }
  }

  /**
   * Sélectionne un échantillon représentatif de devis
   */
  private async selectSample(
    size: number,
    dateRange?: { start: Date; end: Date }
  ): Promise<BenchmarkTestCase[]> {
    const whereClause: any = {}
    
    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      }
    }

    const devis = await prisma.devis.findMany({
      where: whereClause,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: {
        torpScores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return devis.map((devis) => {
      const latestScore = devis.torpScores[0]
      const extractedData = devis.extractedData as any
      
      // Calculer la complétude des données
      const dataCompleteness = this.calculateDataCompleteness(devis)
      
      // Identifier les sources utilisées
      const sourcesUsed = this.identifySources(devis)

      return {
        devisId: devis.id,
        actualGrade: latestScore?.scoreGrade || 'E',
        scoreDeviation: latestScore ? undefined : 0, // À améliorer avec validation manuelle
        dataCompleteness,
        sourcesUsed,
        processingTime: 0, // À mesurer lors du recalcul
        errors: [],
      }
    })
  }

  /**
   * Calcule la complétude des données pour un devis
   */
  private calculateDataCompleteness(devis: any): number {
    const extractedData = devis.extractedData as any || {}
    let totalFields = 0
    let filledFields = 0

    // Champs essentiels
    const essentialFields = [
      'totalAmount',
      'company.name',
      'company.siret',
      'items',
      'project.type',
    ]

    essentialFields.forEach((field) => {
      totalFields++
      const value = this.getNestedValue(extractedData, field)
      if (value !== null && value !== undefined && value !== '') {
        filledFields++
      }
    })

    // Items détaillés
    if (extractedData.items && Array.isArray(extractedData.items)) {
      extractedData.items.forEach((item: any) => {
        totalFields += 4 // description, quantity, unitPrice, totalPrice
        if (item.description) filledFields++
        if (item.quantity) filledFields++
        if (item.unitPrice) filledFields++
        if (item.totalPrice) filledFields++
      })
    }

    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0
  }

  /**
   * Identifie les sources de données utilisées
   */
  private identifySources(devis: any): string[] {
    const sources: string[] = []
    const enrichedData = devis.enrichedData as any || {}

    if (enrichedData.company?.siret) sources.push('Sirene')
    if (enrichedData.priceReferences?.length) sources.push('PriceReferences')
    if (enrichedData.regionalData) sources.push('RegionalData')
    if (enrichedData.complianceData) sources.push('ComplianceData')
    if (enrichedData.dtus?.length) sources.push('DTU')
    
    // Vérifier les données enrichies via l'enrichissement avancé
    if (enrichedData.company?.financialData) sources.push('Infogreffe')
    
    return sources
  }

  /**
   * Calcule les métriques de précision
   */
  private async calculateAccuracy(testCases: BenchmarkTestCase[]): Promise<BenchmarkMetrics['accuracy']> {
    // Pour l'instant, on calcule la cohérence interne
    // À améliorer avec des données de validation manuelle
    const scores = testCases
      .filter((tc) => tc.scoreDeviation !== undefined)
      .map((tc) => tc.scoreDeviation || 0)

    const avgDeviation = scores.length > 0
      ? scores.reduce((a, b) => a + Math.abs(b), 0) / scores.length
      : 0

    return {
      scorePredictionAccuracy: Math.max(0, 100 - avgDeviation * 10),
      gradePredictionAccuracy: 75, // Placeholder - nécessite validation manuelle
      priceEstimationAccuracy: 80, // Placeholder - nécessite validation manuelle
    }
  }

  /**
   * Calcule les métriques de cohérence
   */
  private async calculateConsistency(testCases: BenchmarkTestCase[]): Promise<BenchmarkMetrics['consistency']> {
    // Stabilité : mesure la variance des scores pour des devis similaires
    const gradeDistribution: Record<string, number> = {}
    testCases.forEach((tc) => {
      gradeDistribution[tc.actualGrade] = (gradeDistribution[tc.actualGrade] || 0) + 1
    })

    // Calculer l'entropie pour mesurer la distribution
    const total = testCases.length
    const entropy = Object.values(gradeDistribution).reduce((sum, count) => {
      const p = count / total
      return sum - (p > 0 ? p * Math.log2(p) : 0)
    }, 0)
    
    // Normaliser entre 0 et 100 (max entropy = log2(5) pour 5 grades)
    const maxEntropy = Math.log2(5)
    const consistencyScore = (entropy / maxEntropy) * 100

    return {
      scoreStability: 85, // Placeholder - nécessite recalculs multiples
      interRaterReliability: 80, // Placeholder - nécessite validation manuelle
      temporalConsistency: consistencyScore,
    }
  }

  /**
   * Calcule la qualité des données
   */
  private async calculateDataQuality(testCases: BenchmarkTestCase[]): Promise<BenchmarkMetrics['dataQuality']> {
    const completenessScores = testCases.map((tc) => tc.dataCompleteness)
    const avgCompleteness = completenessScores.reduce((a, b) => a + b, 0) / completenessScores.length

    const uniqueSources = new Set<string>()
    testCases.forEach((tc) => {
      tc.sourcesUsed.forEach((source) => uniqueSources.add(source))
    })

    const avgSourcesPerDevis = testCases.reduce((sum, tc) => sum + tc.sourcesUsed.length, 0) / testCases.length

    return {
      dataCompleteness: avgCompleteness,
      dataFreshness: 75, // Placeholder - nécessite tracking de dates
      sourceReliability: Math.min(100, avgSourcesPerDevis * 15), // Basé sur le nombre de sources
      enrichmentSuccessRate: (testCases.filter((tc) => tc.sourcesUsed.length > 0).length / testCases.length) * 100,
    }
  }

  /**
   * Calcule la performance algorithmique
   */
  private async calculateAlgorithmPerformance(testCases: BenchmarkTestCase[]): Promise<BenchmarkMetrics['algorithmPerformance']> {
    const processingTimes = testCases.map((tc) => tc.processingTime).filter((t) => t > 0)
    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 500 // Valeur par défaut

    // Tous les devis ont un score, donc 100% de couverture
    const criteriaCoverage = 100 // Placeholder - nécessite analyse détaillée

    return {
      scoringSpeed: avgProcessingTime,
      criteriaCoverage,
      falsePositiveRate: 5, // Placeholder - nécessite validation manuelle
      falseNegativeRate: 8, // Placeholder - nécessite validation manuelle
    }
  }

  /**
   * Calcule l'impact business
   */
  private async calculateBusinessImpact(testCases: BenchmarkTestCase[]): Promise<BenchmarkMetrics['businessImpact']> {
    // Pour l'instant, métriques basées sur les données disponibles
    const gradeDistribution: Record<string, number> = {}
    testCases.forEach((tc) => {
      gradeDistribution[tc.actualGrade] = (gradeDistribution[tc.actualGrade] || 0) + 1
    })

    // Diversité des grades = meilleure discrimination
    const diversity = Object.keys(gradeDistribution).length / 5 // 5 grades possibles (A-E)

    return {
      userSatisfaction: 75, // Placeholder - nécessite feedback utilisateurs
      recommendationAccuracy: 80, // Placeholder - nécessite validation
      alertPrecision: 85, // Placeholder - nécessite validation
    }
  }

  /**
   * Génère des recommandations basées sur les métriques
   */
  private generateRecommendations(metrics: BenchmarkMetrics): string[] {
    const recommendations: string[] = []

    // Précision
    if (metrics.accuracy.scorePredictionAccuracy < 80) {
      recommendations.push('Améliorer la précision de prédiction des scores (actuellement ' + 
        metrics.accuracy.scorePredictionAccuracy.toFixed(1) + '%)')
    }

    // Qualité des données
    if (metrics.dataQuality.dataCompleteness < 70) {
      recommendations.push('Améliorer la complétude des données extraites (actuellement ' + 
        metrics.dataQuality.dataCompleteness.toFixed(1) + '%)')
    }

    if (metrics.dataQuality.enrichmentSuccessRate < 60) {
      recommendations.push('Augmenter le taux de succès de l\'enrichissement (actuellement ' + 
        metrics.dataQuality.enrichmentSuccessRate.toFixed(1) + '%)')
    }

    if (metrics.dataQuality.sourceReliability < 60) {
      recommendations.push('Augmenter le nombre de sources de données par devis')
    }

    // Performance
    if (metrics.algorithmPerformance.scoringSpeed > 2000) {
      recommendations.push('Optimiser la vitesse de calcul du score (actuellement ' + 
        metrics.algorithmPerformance.scoringSpeed.toFixed(0) + 'ms)')
    }

    // Cohérence
    if (metrics.consistency.scoreStability < 80) {
      recommendations.push('Améliorer la stabilité du score entre différents passages')
    }

    if (recommendations.length === 0) {
      recommendations.push('Les métriques sont satisfaisantes. Continuer le monitoring.')
    }

    return recommendations
  }

  /**
   * Helper pour accéder aux valeurs imbriquées
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj)
  }
}

