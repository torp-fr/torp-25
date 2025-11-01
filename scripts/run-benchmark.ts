#!/usr/bin/env tsx
/**
 * Script pour exécuter le benchmark TORP
 * Usage: npx tsx scripts/run-benchmark.ts [sampleSize]
 */

import { BenchmarkEngine } from '../services/benchmark/benchmark-engine'

async function main() {
  const sampleSize = parseInt(process.argv[2] || '50', 10)
  
  console.log('🚀 Démarrage du benchmark TORP...\n')
  console.log(`📊 Échantillon: ${sampleSize} devis\n`)

  try {
    const engine = new BenchmarkEngine()
    const startTime = Date.now()
    
    const result = await engine.runBenchmark(sampleSize)
    
    const duration = Date.now() - startTime

    console.log('\n' + '='.repeat(60))
    console.log('📈 RÉSULTATS DU BENCHMARK')
    console.log('='.repeat(60))
    console.log(`Version: ${result.version}`)
    console.log(`Date: ${new Date(result.timestamp).toLocaleString('fr-FR')}`)
    console.log(`Échantillon: ${result.sampleSize} devis`)
    console.log(`Durée: ${duration}ms\n`)

    console.log('🎯 PRÉCISION')
    console.log(`  Score Prediction: ${result.metrics.accuracy.scorePredictionAccuracy.toFixed(1)}%`)
    console.log(`  Grade Prediction: ${result.metrics.accuracy.gradePredictionAccuracy.toFixed(1)}%`)
    console.log(`  Price Estimation: ${result.metrics.accuracy.priceEstimationAccuracy.toFixed(1)}%\n`)

    console.log('🔄 COHÉRENCE')
    console.log(`  Score Stability: ${result.metrics.consistency.scoreStability.toFixed(1)}%`)
    console.log(`  Inter-Rater Reliability: ${result.metrics.consistency.interRaterReliability.toFixed(1)}%`)
    console.log(`  Temporal Consistency: ${result.metrics.consistency.temporalConsistency.toFixed(1)}%\n`)

    console.log('📦 QUALITÉ DES DONNÉES')
    console.log(`  Data Completeness: ${result.metrics.dataQuality.dataCompleteness.toFixed(1)}%`)
    console.log(`  Data Freshness: ${result.metrics.dataQuality.dataFreshness.toFixed(1)}%`)
    console.log(`  Source Reliability: ${result.metrics.dataQuality.sourceReliability.toFixed(1)}%`)
    console.log(`  Enrichment Success: ${result.metrics.dataQuality.enrichmentSuccessRate.toFixed(1)}%\n`)

    console.log('⚡ PERFORMANCE ALGORITHMIQUE')
    console.log(`  Scoring Speed: ${result.metrics.algorithmPerformance.scoringSpeed.toFixed(0)}ms`)
    console.log(`  Criteria Coverage: ${result.metrics.algorithmPerformance.criteriaCoverage.toFixed(1)}%`)
    console.log(`  False Positive Rate: ${result.metrics.algorithmPerformance.falsePositiveRate.toFixed(1)}%`)
    console.log(`  False Negative Rate: ${result.metrics.algorithmPerformance.falseNegativeRate.toFixed(1)}%\n`)

    console.log('💼 IMPACT BUSINESS')
    console.log(`  User Satisfaction: ${result.metrics.businessImpact.userSatisfaction.toFixed(1)}/5`)
    console.log(`  Recommendation Accuracy: ${result.metrics.businessImpact.recommendationAccuracy.toFixed(1)}%`)
    console.log(`  Alert Precision: ${result.metrics.businessImpact.alertPrecision.toFixed(1)}%\n`)

    console.log('💡 RECOMMANDATIONS')
    result.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('✅ Benchmark terminé avec succès')
    console.log('='.repeat(60) + '\n')

    // Sauvegarder le résultat en JSON
    const fs = await import('fs/promises')
    const outputPath = `benchmark-${Date.now()}.json`
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2))
    console.log(`💾 Résultats sauvegardés dans: ${outputPath}\n`)

  } catch (error) {
    console.error('❌ Erreur lors du benchmark:', error)
    process.exit(1)
  }
}

main()

