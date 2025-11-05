/**
 * Script de test pour l'API Pappers
 * Teste l'enrichissement des données entreprise
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Charger les variables d'environnement depuis .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') })

import { PappersEnrichmentService } from '../services/data-enrichment/pappers-service'

async function testPappers() {
  console.log('🧪 Test API Pappers\n')

  // SIRET test : Apple France (connu et public)
  const testSiret = '55208131700013'

  console.log(`📋 Test avec SIRET: ${testSiret}`)
  console.log(`🔑 Clé API configurée: ${process.env.PAPPERS_API_KEY ? 'Oui' : 'Non'}\n`)

  const service = new PappersEnrichmentService()

  try {
    console.log('⏳ Appel API Pappers...')
    const result = await service.enrichCompany(testSiret)

    if (result) {
      console.log('\n✅ Données récupérées avec succès!\n')
      console.log('📊 Résultat:')
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log('\n⚠️  Aucune donnée récupérée (API key manquante ou erreur)')
    }
  } catch (error) {
    console.error('\n❌ Erreur:', error)
  }
}

testPappers().then(() => {
  console.log('\n✅ Test terminé')
  process.exit(0)
}).catch((error) => {
  console.error('\n❌ Erreur fatale:', error)
  process.exit(1)
})
