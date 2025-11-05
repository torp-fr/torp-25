#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script pour exécuter le benchmark TORP
 * Usage: npx tsx scripts/run-benchmark.ts [sampleSize]
 */

import { BenchmarkEngine } from '../services/benchmark/benchmark-engine'

async function main() {
  const sampleSize = parseInt(process.argv[2] || '50', 10)
  
  log.info('🚀 Démarrage du benchmark TORP...\n')
  log.info(`📊 Échantillon: ${sampleSize} devis\n`)

  try {
    const engine = new BenchmarkEngine()
    const startTime = Date.now()
    
    const result = await engine.runBenchmark(sampleSize)
    
    const duration = Date.now() - startTime

    log.info('\n' + '='.repeat(60))
    log.info('📈 RÉSULTATS DU BENCHMARK')
    log.info('='.repeat(60))
    log.info(`Version: ${result.version}`)
    log.info(`Date: ${new Date(result.timestamp).toLocaleString('fr-FR')}`)
    log.info(`Échantillon: ${result.sampleSize} devis`)
    log.info(`Durée: ${duration}ms\n`)

    log.info('🎯 PRÉCISION')
    log.info(`  Score Prediction: ${result.metrics.accuracy.scorePredictionAccuracy.toFixed(1)}%`)
    log.info(`  Grade Prediction: ${result.metrics.accuracy.gradePredictionAccuracy.toFixed(1)}%`)
    log.info(`  Price Estimation: ${result.metrics.accuracy.priceEstimationAccuracy.toFixed(1)}%\n`)

    log.info('🔄 COHÉRENCE')
    log.info(`  Score Stability: ${result.metrics.consistency.scoreStability.toFixed(1)}%`)
    log.info(`  Inter-Rater Reliability: ${result.metrics.consistency.interRaterReliability.toFixed(1)}%`)
    log.info(`  Temporal Consistency: ${result.metrics.consistency.temporalConsistency.toFixed(1)}%\n`)

    log.info('📦 QUALITÉ DES DONNÉES')
    log.info(`  Data Completeness: ${result.metrics.dataQuality.dataCompleteness.toFixed(1)}%`)
    log.info(`  Data Freshness: ${result.metrics.dataQuality.dataFreshness.toFixed(1)}%`)
    log.info(`  Source Reliability: ${result.metrics.dataQuality.sourceReliability.toFixed(1)}%`)
    log.info(`  Enrichment Success: ${result.metrics.dataQuality.enrichmentSuccessRate.toFixed(1)}%\n`)

    log.info('⚡ PERFORMANCE ALGORITHMIQUE')
    log.info(`  Scoring Speed: ${result.metrics.algorithmPerformance.scoringSpeed.toFixed(0)}ms`)
    log.info(`  Criteria Coverage: ${result.metrics.algorithmPerformance.criteriaCoverage.toFixed(1)}%`)
    log.info(`  False Positive Rate: ${result.metrics.algorithmPerformance.falsePositiveRate.toFixed(1)}%`)
    log.info(`  False Negative Rate: ${result.metrics.algorithmPerformance.falseNegativeRate.toFixed(1)}%\n`)

    log.info('💼 IMPACT BUSINESS')
    log.info(`  User Satisfaction: ${result.metrics.businessImpact.userSatisfaction.toFixed(1)}/5`)
    log.info(`  Recommendation Accuracy: ${result.metrics.businessImpact.recommendationAccuracy.toFixed(1)}%`)
    log.info(`  Alert Precision: ${result.metrics.businessImpact.alertPrecision.toFixed(1)}%\n`)

    log.info('💡 RECOMMANDATIONS')
    result.recommendations.forEach((rec, i) => {
      log.info(`  ${i + 1}. ${rec}`)
    })

    log.info('\n' + '='.repeat(60))
    log.info('✅ Benchmark terminé avec succès')
    log.info('='.repeat(60) + '\n')

    // Sauvegarder le résultat en JSON
    const fs = await import('fs/promises')
    const outputPath = `benchmark-${Date.now()}.json`
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2))
    log.info(`💾 Résultats sauvegardés dans: ${outputPath}\n`)

  } catch (error) {
    log.error('❌ Erreur lors du benchmark:', error)
    process.exit(1)
  }
}

main()

