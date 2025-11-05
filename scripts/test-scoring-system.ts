import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script de test complet pour valider le système de scoring TORP
 * Teste l'intégration complète : LLM + Enrichissement + Scoring
 */

import { DocumentAnalyzer } from '../services/llm/document-analyzer'
import { AdvancedEnrichmentService } from '../services/data-enrichment/advanced-enrichment-service'
import { AdvancedScoringEngine } from '../services/scoring/advanced/advanced-scoring-engine'
import fs from 'fs'
import path from 'path'

interface TestResult {
  step: string
  success: boolean
  duration: number
  error?: string
  data?: any
}

class ScoringSystemTester {
  private results: TestResult[] = []

  private async timeStep<T>(stepName: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      this.results.push({
        step: stepName,
        success: true,
        duration,
        data: result,
      })
      log.info(`✅ ${stepName} (${duration}ms)`)
      return result
    } catch (error) {
      const duration = Date.now() - start
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.results.push({
        step: stepName,
        success: false,
        duration,
        error: errorMessage,
      })
      log.error(`❌ ${stepName} (${duration}ms): ${errorMessage}`)
      throw error
    }
  }

  /**
   * Test 1: Analyse LLM d'un fichier de devis
   */
  async testLLMAnalysis(filePath: string) {
    log.info('\n📄 Test 1: Analyse LLM...')
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier non trouvé: ${filePath}`)
    }

    const analyzer = new DocumentAnalyzer()
    const analysis = await this.timeStep('Analyse LLM du document', async () => {
      return await analyzer.analyzeDevis(filePath)
    })

    // Validation des données extraites
    if (!analysis.extractedData) {
      throw new Error('Aucune donnée extraite')
    }

    log.info(`   - Données extraites: ${Object.keys(analysis.extractedData).length} champs`)
    log.info(`   - Score LLM initial: ${analysis.score}/100`)
    log.info(`   - Entreprise: ${analysis.extractedData.company?.name || 'N/A'}`)
    log.info(`   - SIRET: ${analysis.extractedData.company?.siret || 'N/A'}`)
    log.info(`   - Montant total: ${analysis.extractedData.totals?.total || 'N/A'}€`)

    return analysis
  }

  /**
   * Test 2: Enrichissement avancé des données
   */
  async testDataEnrichment(extractedData: any) {
    log.info('\n🔍 Test 2: Enrichissement des données...')

    const enrichmentService = new AdvancedEnrichmentService()
    
    // Inférer les paramètres nécessaires
    const projectType = this.inferProjectType(extractedData) || 'renovation'
    const tradeType = this.inferTradeType(extractedData) || 'general'
    const region = extractedData.project?.location 
      ? this.extractRegion(extractedData.project.location) 
      : 'ILE_DE_FRANCE'

    const enrichment = await this.timeStep('Enrichissement multi-sources', async () => {
      return await enrichmentService.enrichForScoring(
        extractedData,
        projectType,
        tradeType,
        region
      )
    })

    // Afficher les sources de données disponibles
    const sources: string[] = []
    if (enrichment.company?.siret) sources.push('Sirene')
    if (enrichment.priceReferences?.length) sources.push('Prix références')
    if (enrichment.regionalData) sources.push('Données régionales')
    if (enrichment.complianceData) sources.push('Conformité')
    if (enrichment.weatherData) sources.push('Météo')
    if (enrichment.dtus?.length) sources.push('DTU')

    log.info(`   - Sources utilisées: ${sources.join(', ') || 'Aucune'}`)
    log.info(`   - Données enrichies: ${Object.keys(enrichment).length} catégories`)

    return enrichment
  }

  /**
   * Test 3: Calcul du score avancé
   */
  async testAdvancedScoring(devisMock: any, enrichmentData: any, context: any) {
    log.info('\n🎯 Test 3: Calcul du score avancé...')

    const scoringEngine = new AdvancedScoringEngine()
    
    const score = await this.timeStep('Calcul score multi-axes', async () => {
      return await scoringEngine.calculateScore(
        devisMock,
        enrichmentData,
        context
      )
    })

    log.info(`   - Score total: ${score.totalScore}/1200`)
    log.info(`   - Grade: ${score.grade}`)
    log.info(`   - Confiance: ${score.confidenceLevel}%`)
    log.info(`   - Axes évalués: ${score.breakdown.axes.length}`)
    log.info(`   - Alertes: ${score.alerts.length}`)
    log.info(`   - Recommandations: ${score.recommendations.length}`)

    // Afficher le détail par axe
    log.info('\n   📊 Détail par axe:')
    score.breakdown.axes.forEach((axis: any) => {
      const percentage = ((axis.score / axis.maxPoints) * 100).toFixed(1)
      log.info(`      - ${axis.name}: ${axis.score}/${axis.maxPoints} (${percentage}%)`)
    })

    return score
  }

  /**
   * Test complet du workflow
   */
  async runFullTest(filePath?: string) {
    log.info('🚀 Test complet du système TORP Scoring\n')
    log.info('='.repeat(60))

    try {
      // Si pas de fichier fourni, créer un devis mock pour test
      if (!filePath) {
        log.info('ℹ️  Aucun fichier fourni, utilisation d\'un devis mock pour test...\n')
        return await this.testWithMockData()
      }

      // Test avec fichier réel
      const analysis = await this.testLLMAnalysis(filePath)
      
      const enrichment = await this.testDataEnrichment(analysis.extractedData)

      // Créer un mock de devis pour le scoring
      const devisMock = {
        id: 'test-devis',
        extractedData: analysis.extractedData,
        totalAmount: analysis.extractedData.totals?.total || '0',
        projectType: this.inferProjectType(analysis.extractedData) || 'renovation',
      }

      const context = {
        profile: 'B2C' as const,
        projectType: this.inferProjectType(analysis.extractedData) || 'renovation',
        projectAmount: this.inferProjectAmount(analysis.extractedData.totals?.total),
        region: analysis.extractedData.project?.location 
          ? this.extractRegion(analysis.extractedData.project.location) 
          : 'ILE_DE_FRANCE',
        tradeType: this.inferTradeType(analysis.extractedData),
      }

      const score = await this.testAdvancedScoring(devisMock, enrichment, context)

      // Résumé final
      this.printSummary()

      return {
        analysis,
        enrichment,
        score,
      }
    } catch (error) {
      log.error('\n❌ Erreur lors du test:', error)
      this.printSummary()
      throw error
    }
  }

  /**
   * Test avec données mock (sans fichier)
   */
  async testWithMockData() {
    const mockExtractedData = {
      company: {
        name: 'Entreprise Test BTP',
        siret: '12345678901234',
        address: '123 Rue Test, 75001 Paris',
      },
      totals: {
        total: '15000',
        subtotal: '12500',
        tva: '2500',
      },
      project: {
        title: 'Rénovation appartement',
        location: 'Paris, Ile-de-France',
      },
      items: [
        { description: 'Peinture murs', quantity: 50, unitPrice: 15, totalPrice: 750 },
        { description: 'Carrelage sol', quantity: 30, unitPrice: 45, totalPrice: 1350 },
      ],
    }

    const enrichment = await this.testDataEnrichment(mockExtractedData)

    const devisMock = {
      id: 'test-devis-mock',
      extractedData: mockExtractedData,
      totalAmount: '15000',
      projectType: 'renovation',
    }

    const context = {
      profile: 'B2C' as const,
      projectType: 'renovation' as const,
      projectAmount: 'medium' as const,
      region: 'ILE_DE_FRANCE',
      tradeType: 'general',
    }

    const score = await this.testAdvancedScoring(devisMock, enrichment, context)

    this.printSummary()

    return {
      enrichment,
      score,
    }
  }

  private printSummary() {
    log.info('\n' + '='.repeat(60))
    log.info('📋 Résumé des tests\n')

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    const successCount = this.results.filter(r => r.success).length
    const failCount = this.results.filter(r => !r.success).length

    this.results.forEach(r => {
      const icon = r.success ? '✅' : '❌'
      const status = r.success ? 'OK' : `ERREUR: ${r.error}`
      log.info(`${icon} ${r.step}: ${status} (${r.duration}ms)`)
    })

    log.info(`\n📊 Total: ${successCount} succès, ${failCount} échecs, ${totalDuration}ms`)
  }

  // Helpers
  private inferProjectType(data: any): 'construction' | 'renovation' | 'extension' | 'maintenance' {
    const text = JSON.stringify(data).toLowerCase()
    if (text.includes('construction') || text.includes('neuf')) return 'construction'
    if (text.includes('extension')) return 'extension'
    if (text.includes('maintenance') || text.includes('entretien')) return 'maintenance'
    return 'renovation'
  }

  private inferProjectAmount(total: string | number | undefined): 'small' | 'medium' | 'large' {
    const amount = typeof total === 'string' ? parseFloat(total) : (total || 0)
    if (amount < 10000) return 'small'
    if (amount < 50000) return 'medium'
    return 'large'
  }

  private inferTradeType(data: any): string {
    const text = JSON.stringify(data).toLowerCase()
    if (text.includes('plomberie')) return 'plomberie'
    if (text.includes('électricité')) return 'electricite'
    if (text.includes('maçonnerie')) return 'maconnerie'
    if (text.includes('charpente')) return 'charpente'
    return 'general'
  }

  private extractRegion(location: string): string {
    const locationLower = location.toLowerCase()
    if (locationLower.includes('paris') || locationLower.includes('ile-de-france')) return 'ILE_DE_FRANCE'
    if (locationLower.includes('lyon') || locationLower.includes('rhône')) return 'AUVERGNE_RHONE_ALPES'
    if (locationLower.includes('marseille') || locationLower.includes('paca')) return 'PROVENCE_ALPES_COTE_AZUR'
    return 'ILE_DE_FRANCE' // Par défaut
  }
}

// Exécution du script
async function main() {
  const tester = new ScoringSystemTester()
  const filePath = process.argv[2] // Fichier optionnel en argument

  try {
    await tester.runFullTest(filePath)
    log.info('\n✨ Tous les tests sont passés avec succès!')
    process.exit(0)
  } catch (error) {
    log.error('\n💥 Échec des tests')
    process.exit(1)
  }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  main()
}

export { ScoringSystemTester }

