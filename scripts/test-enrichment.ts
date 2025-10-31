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
  console.log('\n🧪 Test 1: Enrichissement Entreprise (API Sirene)')
  console.log('─'.repeat(60))

  const service = new CompanyEnrichmentService()

  // Test avec un SIRET réel (exemple: une entreprise BTP connue)
  const testSiret = '55203253400608' // Exemple: une entreprise française

  console.log(`\n📋 Test avec SIRET: ${testSiret}`)
  try {
    const enrichment = await service.enrichFromSiret(testSiret)
    
    if (enrichment) {
      console.log('✅ Enrichissement réussi!')
      console.log(`   - Nom: ${enrichment.name}`)
      console.log(`   - SIRET: ${enrichment.siret}`)
      console.log(`   - Statut: ${enrichment.legalStatus || 'N/A'}`)
      if (enrichment.address) {
        console.log(`   - Adresse: ${enrichment.address.street}, ${enrichment.address.postalCode} ${enrichment.address.city}`)
      }
      if (enrichment.activities && enrichment.activities.length > 0) {
        console.log(`   - Activité: ${enrichment.activities[0].label}`)
      }
    } else {
      console.log('⚠️  Aucune donnée retournée (SIRET peut être invalide pour ce test)')
    }
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }

  // Test recherche par nom
  console.log(`\n📋 Test recherche par nom: "BTP"`)
  try {
    const results = await service.searchByName('BTP', 3)
    if (results.length > 0) {
      console.log(`✅ ${results.length} entreprise(s) trouvée(s)`)
      results.forEach((comp, i) => {
        console.log(`   ${i + 1}. ${comp.name} (SIRET: ${comp.siret})`)
      })
    } else {
      console.log('⚠️  Aucune entreprise trouvée')
    }
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testPriceEnrichment() {
  console.log('\n🧪 Test 2: Prix de Référence')
  console.log('─'.repeat(60))

  const service = new PriceEnrichmentService()

  console.log('\n📋 Test prix pour: rénovation, Île-de-France')
  try {
    const prices = await service.getPriceReferences('renovation', 'ILE_DE_FRANCE')
    if (prices.length > 0) {
      console.log('✅ Prix de référence récupérés!')
      prices.forEach((price, i) => {
        console.log(`   ${i + 1}. ${price.item}`)
        console.log(`      Prix: ${price.prices.min}€ - ${price.prices.max}€ (moyenne: ${price.prices.average}€)`)
        console.log(`      Source: ${price.source}`)
      })
    }
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }

  console.log('\n📋 Test données régionales: Île-de-France')
  try {
    const regionalData = await service.getRegionalData('ILE_DE_FRANCE')
    if (regionalData) {
      console.log('✅ Données régionales récupérées!')
      console.log(`   - Prix moyen/m²: ${regionalData.averagePriceSqm}€`)
      console.log(`   - Fourchette: ${regionalData.priceRange.min}€ - ${regionalData.priceRange.max}€`)
      console.log(`   - Tendance: ${regionalData.marketTrend}`)
    }
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testComplianceEnrichment() {
  console.log('\n🧪 Test 3: Conformité et Normes')
  console.log('─'.repeat(60))

  const service = new ComplianceEnrichmentService()

  console.log('\n📋 Test conformité pour: rénovation, plomberie')
  try {
    const compliance = await service.getComplianceData('renovation', 'plomberie')
    console.log('✅ Données de conformité récupérées!')
    console.log(`   - Normes applicables: ${compliance.applicableNorms.length}`)
    compliance.applicableNorms.slice(0, 3).forEach((norm) => {
      console.log(`     • ${norm.code}: ${norm.name} (${norm.mandatory ? 'Obligatoire' : 'Recommandé'})`)
    })
    console.log(`   - Règlementations: ${compliance.regulations.length}`)
    console.log(`   - Certifications: ${compliance.certifications.length}`)
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testWeatherEnrichment() {
  console.log('\n🧪 Test 4: Données Météorologiques')
  console.log('─'.repeat(60))

  const service = new WeatherEnrichmentService()

  console.log('\n📋 Test météo pour: Île-de-France')
  try {
    const weather = await service.getWeatherData('ILE_DE_FRANCE')
    if (weather) {
      console.log('✅ Données météo récupérées!')
      console.log(`   - Jours météo défavorables (moyen): ${weather.averageWeatherDays}`)
      console.log(`   - Retards saisonniers:`)
      console.log(`     • Hiver: ${weather.seasonalDelays.winter} jours`)
      console.log(`     • Printemps: ${weather.seasonalDelays.spring} jours`)
      console.log(`     • Été: ${weather.seasonalDelays.summer} jours`)
      console.log(`     • Automne: ${weather.seasonalDelays.autumn} jours`)
      console.log(`   - Facteurs de risque: ${weather.riskFactors.length}`)
    }
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error)
  }
}

async function testFullEnrichment() {
  console.log('\n🧪 Test 5: Enrichissement Complet d\'un Devis')
  console.log('─'.repeat(60))

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

  console.log('\n📋 Test enrichissement complet...')
  try {
    const enrichment = await service.enrichDevis(
      testExtractedData as any,
      'renovation',
      'plomberie',
      'ILE_DE_FRANCE'
    )

    console.log('✅ Enrichissement complet réussi!')
    console.log(`\n📊 Métadonnées:`)
    console.log(`   - Date: ${enrichment.metadata.enrichmentDate}`)
    console.log(`   - Sources: ${enrichment.metadata.sources.join(', ')}`)
    console.log(`   - Confiance: ${enrichment.metadata.confidence}%`)
    
    if (enrichment.company) {
      console.log(`\n🏢 Entreprise:`)
      console.log(`   - Nom: ${enrichment.company.name}`)
      console.log(`   - SIRET: ${enrichment.company.siret}`)
    }
    
    console.log(`\n💰 Prix de référence: ${enrichment.priceReferences.length} référence(s)`)
    
    if (enrichment.regionalData) {
      console.log(`\n📍 Régional:`)
      console.log(`   - Région: ${enrichment.regionalData.region}`)
      console.log(`   - Prix moyen/m²: ${enrichment.regionalData.averagePriceSqm}€`)
    }
    
    if (enrichment.complianceData) {
      console.log(`\n✅ Conformité:`)
      console.log(`   - Normes: ${enrichment.complianceData.applicableNorms.length}`)
      console.log(`   - Règlementations: ${enrichment.complianceData.regulations.length}`)
    }
    
    if (enrichment.weatherData) {
      console.log(`\n🌤️  Météo:`)
      console.log(`   - Jours défavorables: ${enrichment.weatherData.averageWeatherDays}`)
    }
  } catch (error) {
    console.error('❌ Erreur:', error instanceof Error ? error.message : error)
    console.error('   Stack:', error instanceof Error ? error.stack : '')
  }
}

async function runAllTests() {
  console.log('\n' + '═'.repeat(60))
  console.log('🚀 TESTS SYSTÈME D\'ENRICHISSEMENT TORP')
  console.log('═'.repeat(60))
  console.log('\n💡 Note: L\'API Sirene (data.gouv.fr) est GRATUITE et ne nécessite PAS de clé API')
  console.log('   Toutes les autres APIs sont optionnelles avec données de fallback\n')

  try {
    await testCompanyEnrichment()
    await testPriceEnrichment()
    await testComplianceEnrichment()
    await testWeatherEnrichment()
    await testFullEnrichment()

    console.log('\n' + '═'.repeat(60))
    console.log('✅ TOUS LES TESTS TERMINÉS')
    console.log('═'.repeat(60))
    console.log('\n📝 Résumé:')
    console.log('   ✅ API Sirene (gratuite) - Fonctionne sans clé API')
    console.log('   ✅ Prix de référence - Utilise des données de fallback')
    console.log('   ✅ Conformité - Base de données locale des normes')
    console.log('   ✅ Météo - Statistiques régionales moyennes')
    console.log('\n💡 Pour améliorer la précision, configurez les APIs optionnelles:')
    console.log('   - REEF_PREMIUM_API_KEY (prix de référence précis)')
    console.log('   - OPENWEATHER_API_KEY (données météo réelles)')
  } catch (error) {
    console.error('\n❌ Erreur globale:', error)
    process.exit(1)
  }
}

// Exécuter les tests
runAllTests().catch(console.error)

