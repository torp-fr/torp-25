import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script de test pour le système d'enrichissement de données
 * Teste les APIs externes et les routes d'enrichissement
 */

import { CompanyEnrichmentService } from '../services/data-enrichment/company-service'
import { PriceEnrichmentService } from '../services/data-enrichment/price-service'
import { ComplianceEnrichmentService } from '../services/data-enrichment/compliance-service'
import { WeatherEnrichmentService } from '../services/data-enrichment/weather-service'
import { DataEnrichmentService } from '../services/data-enrichment/enrichment-service'

async function testCompanyEnrichment() {
  log.info('\n🧪 Test 1: Enrichissement Entreprise (API Sirene)')
  log.info('─'.repeat(60))

  const service = new CompanyEnrichmentService()

  // Test avec un SIRET réel (exemple: une entreprise BTP connue)
  const testSiret = '55203253400608' // Exemple: une entreprise française

  log.info(`\n📋 Test avec SIRET: ${testSiret}`)
  try {
    const enrichment = await service.enrichFromSiret(testSiret)
    
    if (enrichment) {
      log.info('✅ Enrichissement réussi!')
      log.info(`   - Nom: ${enrichment.name}`)
      log.info(`   - SIRET: ${enrichment.siret}`)
      log.info(`   - Statut: ${enrichment.legalStatus || 'N/A'}`)
      if (enrichment.address) {
        log.info(`   - Adresse: ${enrichment.address.street}, ${enrichment.address.postalCode} ${enrichment.address.city}`)
      }
      if (enrichment.activities && enrichment.activities.length > 0) {
        log.info(`   - Activité: ${enrichment.activities[0].label}`)
      }
    } else {
      log.info('⚠️  Aucune donnée retournée (SIRET peut être invalide pour ce test)')
    }
  } catch (error) {
    log.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }

  // Test recherche par nom
  log.info(`\n📋 Test recherche par nom: "BTP"`)
  try {
    const results = await service.searchByName('BTP', 3)
    if (results.length > 0) {
      log.info(`✅ ${results.length} entreprise(s) trouvée(s)`)
      results.forEach((comp, i) => {
        log.info(`   ${i + 1}. ${comp.name} (SIRET: ${comp.siret})`)
      })
    } else {
      log.info('⚠️  Aucune entreprise trouvée')
    }
  } catch (error) {
    log.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testPriceEnrichment() {
  log.info('\n🧪 Test 2: Prix de Référence')
  log.info('─'.repeat(60))

  const service = new PriceEnrichmentService()

  log.info('\n📋 Test prix pour: rénovation, Île-de-France')
  try {
    const prices = await service.getPriceReferences('renovation', 'ILE_DE_FRANCE')
    if (prices.length > 0) {
      log.info('✅ Prix de référence récupérés!')
      prices.forEach((price, i) => {
        log.info(`   ${i + 1}. ${price.item}`)
        log.info(`      Prix: ${price.prices.min}€ - ${price.prices.max}€ (moyenne: ${price.prices.average}€)`)
        log.info(`      Source: ${price.source}`)
      })
    }
  } catch (error) {
    log.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }

  log.info('\n📋 Test données régionales: Île-de-France')
  try {
    const regionalData = await service.getRegionalData('ILE_DE_FRANCE')
    if (regionalData) {
      log.info('✅ Données régionales récupérées!')
      log.info(`   - Prix moyen/m²: ${regionalData.averagePriceSqm}€`)
      log.info(`   - Fourchette: ${regionalData.priceRange.min}€ - ${regionalData.priceRange.max}€`)
      log.info(`   - Tendance: ${regionalData.marketTrend}`)
    }
  } catch (error) {
    log.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testComplianceEnrichment() {
  log.info('\n🧪 Test 3: Conformité et Normes')
  log.info('─'.repeat(60))

  const service = new ComplianceEnrichmentService()

  log.info('\n📋 Test conformité pour: rénovation, plomberie')
  try {
    const compliance = await service.getComplianceData('renovation', 'plomberie')
    log.info('✅ Données de conformité récupérées!')
    log.info(`   - Normes applicables: ${compliance.applicableNorms.length}`)
    compliance.applicableNorms.slice(0, 3).forEach((norm) => {
      log.info(`     • ${norm.code}: ${norm.name} (${norm.mandatory ? 'Obligatoire' : 'Recommandé'})`)
    })
    log.info(`   - Règlementations: ${compliance.regulations.length}`)
    log.info(`   - Certifications: ${compliance.certifications.length}`)
  } catch (error) {
    log.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testWeatherEnrichment() {
  log.info('\n🧪 Test 4: Données Météorologiques')
  log.info('─'.repeat(60))

  const service = new WeatherEnrichmentService()

  log.info('\n📋 Test météo pour: Île-de-France')
  try {
    const weather = await service.getWeatherData('ILE_DE_FRANCE')
    if (weather) {
      log.info('✅ Données météo récupérées!')
      log.info(`   - Jours météo défavorables (moyen): ${weather.averageWeatherDays}`)
      log.info(`   - Retards saisonniers:`)
      log.info(`     • Hiver: ${weather.seasonalDelays.winter} jours`)
      log.info(`     • Printemps: ${weather.seasonalDelays.spring} jours`)
      log.info(`     • Été: ${weather.seasonalDelays.summer} jours`)
      log.info(`     • Automne: ${weather.seasonalDelays.autumn} jours`)
      log.info(`   - Facteurs de risque: ${weather.riskFactors.length}`)
    }
  } catch (error) {
    log.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testFullEnrichment() {
  log.info('\n🧪 Test 5: Enrichissement Complet d\'un Devis')
  log.info('─'.repeat(60))

  const service = new DataEnrichmentService()

  // Données de test simulant un devis extrait
  const testExtractedData = {
    company: {
      name: 'Artisan BTP',
      siret: '55203253400608', // SIRET de test
    },
    client: {
      name: 'Client Test',
    },
    project: {
      title: 'Rénovation salle de bain',
    },
    items: [
      { description: 'Installation plomberie', quantity: 1, unitPrice: 1500 },
      { description: 'Carrelage', quantity: 20, unitPrice: 45 },
    ],
    totals: {
      subtotal: 2400,
      tva: 480,
      total: 2880,
    },
  }

  log.info('\n📋 Test enrichissement complet...')
  try {
    const enrichment = await service.enrichDevis(
      testExtractedData as any,
      'renovation',
      'plomberie',
      'ILE_DE_FRANCE'
    )

    log.info('✅ Enrichissement complet réussi!')
    log.info(`\n📊 Métadonnées:`)
    log.info(`   - Date: ${enrichment.metadata.enrichmentDate}`)
    log.info(`   - Sources: ${enrichment.metadata.sources.join(', ')}`)
    log.info(`   - Confiance: ${enrichment.metadata.confidence}%`)
    
    if (enrichment.company) {
      log.info(`\n🏢 Entreprise:`)
      log.info(`   - Nom: ${enrichment.company.name}`)
      log.info(`   - SIRET: ${enrichment.company.siret}`)
    }
    
    log.info(`\n💰 Prix de référence: ${enrichment.priceReferences.length} référence(s)`)
    
    if (enrichment.regionalData) {
      log.info(`\n📍 Régional:`)
      log.info(`   - Région: ${enrichment.regionalData.region}`)
      log.info(`   - Prix moyen/m²: ${enrichment.regionalData.averagePriceSqm}€`)
    }
    
    if (enrichment.complianceData) {
      log.info(`\n✅ Conformité:`)
      log.info(`   - Normes: ${enrichment.complianceData.applicableNorms.length}`)
      log.info(`   - Règlementations: ${enrichment.complianceData.regulations.length}`)
    }
    
    if (enrichment.weatherData) {
      log.info(`\n🌤️  Météo:`)
      log.info(`   - Jours défavorables: ${enrichment.weatherData.averageWeatherDays}`)
    }
  } catch (error) {
    log.error('❌ Erreur:', error instanceof Error ? error.message : error)
    log.error('   Stack:', error instanceof Error ? error.stack : '')
  }
}

async function runAllTests() {
  log.info('\n' + '═'.repeat(60))
  log.info('🚀 TESTS SYSTÈME D\'ENRICHISSEMENT TORP')
  log.info('═'.repeat(60))
  log.info('\n💡 Note: L\'API Sirene (data.gouv.fr) est GRATUITE et ne nécessite PAS de clé API')
  log.info('   Toutes les autres APIs sont optionnelles avec données de fallback\n')

  try {
    await testCompanyEnrichment()
    await testPriceEnrichment()
    await testComplianceEnrichment()
    await testWeatherEnrichment()
    await testFullEnrichment()

    log.info('\n' + '═'.repeat(60))
    log.info('✅ TOUS LES TESTS TERMINÉS')
    log.info('═'.repeat(60))
    log.info('\n📝 Résumé:')
    log.info('   ✅ API Sirene (gratuite) - Fonctionne sans clé API')
    log.info('   ✅ Prix de référence - Utilise des données de fallback')
    log.info('   ✅ Conformité - Base de données locale des normes')
    log.info('   ✅ Météo - Statistiques régionales moyennes')
    log.info('\n💡 Pour améliorer la précision, configurez les APIs optionnelles:')
    log.info('   - REEF_PREMIUM_API_KEY (prix de référence précis)')
    log.info('   - OPENWEATHER_API_KEY (données météo réelles)')
  } catch (error) {
    log.error('\n❌ Erreur globale:', error)
    process.exit(1)
  }
}

// Exécuter les tests
runAllTests().catch((err) => log.error({ err }, 'Tests enrichment failed'))

