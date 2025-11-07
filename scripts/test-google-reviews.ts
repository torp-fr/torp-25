/**
 * Script de test pour vérifier l'intégration Google Reviews
 * Usage: npx tsx scripts/test-google-reviews.ts "Nom Entreprise" "Ville"
 */

// Charger les variables d'environnement depuis .env
import { config } from 'dotenv'
config()

import { ReviewsAggregator } from '../services/external-apis/reviews-aggregator'

const companyName = process.argv[2] || 'IXINA'
const city = process.argv[3] || 'Saint-Pol-sur-Mer'
const siret = process.argv[4] || undefined

async function testGoogleReviews() {
  console.log('\n🔍 Test Google Reviews API')
  console.log('='.repeat(80))
  console.log(`Entreprise: ${companyName}`)
  console.log(`Ville: ${city}`)
  if (siret) {
    console.log(`SIRET: ${siret}`)
  }
  console.log('='.repeat(80))

  // Vérifier que la clé API est configurée
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('\n❌ ERREUR: GOOGLE_PLACES_API_KEY non configurée dans .env')
    console.log('\nPour configurer:')
    console.log('1. Créer/éditer le fichier .env à la racine du projet')
    console.log('2. Ajouter: GOOGLE_PLACES_API_KEY=votre_clé_ici')
    process.exit(1)
  }

  console.log('\n✅ Clé API Google trouvée:', apiKey.substring(0, 20) + '...')

  try {
    const aggregator = new ReviewsAggregator()

    console.log('\n⏳ Récupération des avis...')
    const reviews = await aggregator.aggregateReviews(companyName, siret, city)

    if (!reviews) {
      console.log('\n⚠️  Aucun avis trouvé pour cette entreprise')
      console.log('\nRaisons possibles:')
      console.log('- L\'entreprise n\'a pas de profil Google Business')
      console.log('- Le nom ou la ville ne correspond pas exactement')
      console.log('- L\'entreprise n\'a pas encore d\'avis')
      return
    }

    console.log('\n✅ Avis récupérés avec succès!')
    console.log('='.repeat(80))

    // Afficher les résultats
    console.log('\n📊 RÉSULTATS GLOBAUX')
    console.log(`Note globale: ${reviews.overallRating.toFixed(1)}/5 ⭐`)
    console.log(`Total avis: ${reviews.totalReviews}`)

    console.log('\n📈 PAR SOURCE')

    // Google
    if (reviews.bySource.google.count > 0) {
      console.log(`\n🔵 Google Reviews:`)
      console.log(`  Note moyenne: ${reviews.bySource.google.avgRating.toFixed(1)}/5`)
      console.log(`  Nombre d'avis: ${reviews.bySource.google.count}`)
      console.log(`  Poids: ${reviews.bySource.google.weight * 100}%`)
      console.log(`  Contribution: ${(reviews.bySource.google.avgRating * reviews.bySource.google.weight).toFixed(2)}`)
    } else {
      console.log('\n🔵 Google Reviews: Aucun avis')
    }

    // Trustpilot
    if (reviews.bySource.trustpilot.count > 0) {
      console.log(`\n🟢 Trustpilot:`)
      console.log(`  Note moyenne: ${reviews.bySource.trustpilot.avgRating.toFixed(1)}/5`)
      console.log(`  Nombre d'avis: ${reviews.bySource.trustpilot.count}`)
      console.log(`  Poids: ${reviews.bySource.trustpilot.weight * 100}%`)
    } else {
      console.log('\n🟢 Trustpilot: Aucun avis')
    }

    // Eldo
    if (reviews.bySource.eldo.count > 0) {
      console.log(`\n🟠 Avis Eldo:`)
      console.log(`  Note moyenne: ${reviews.bySource.eldo.avgRating.toFixed(1)}/5`)
      console.log(`  Nombre d'avis: ${reviews.bySource.eldo.count}`)
      console.log(`  Poids: ${reviews.bySource.eldo.weight * 100}%`)
    } else {
      console.log('\n🟠 Avis Eldo: Aucun avis')
    }

    // Distribution
    console.log('\n📊 DISTRIBUTION DES NOTES')
    console.log(`  5 étoiles: ${reviews.distribution[5]} avis`)
    console.log(`  4 étoiles: ${reviews.distribution[4]} avis`)
    console.log(`  3 étoiles: ${reviews.distribution[3]} avis`)
    console.log(`  2 étoiles: ${reviews.distribution[2]} avis`)
    console.log(`  1 étoile:  ${reviews.distribution[1]} avis`)

    // Insights
    console.log('\n💡 INSIGHTS')
    console.log(`  Taux de recommandation: ${reviews.insights.recommendationRate}%`)
    console.log(`  Taux de réponse: ${reviews.insights.responseRate}%`)
    console.log(`  Tendance: ${reviews.insights.recentTrend}`)

    // Mots-clés
    if (reviews.keywords.positive.length > 0) {
      console.log(`\n✅ Mots-clés positifs:`)
      console.log(`  ${reviews.keywords.positive.join(', ')}`)
    }

    if (reviews.keywords.negative.length > 0) {
      console.log(`\n⚠️  Mots-clés négatifs:`)
      console.log(`  ${reviews.keywords.negative.join(', ')}`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Test réussi!')
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      if (error.message.includes('API key')) {
        console.log('\n💡 Conseil: Vérifiez que votre clé API Google est valide')
        console.log('   Consultez: https://console.cloud.google.com/apis/credentials')
      }
    }
    process.exit(1)
  }
}

testGoogleReviews()
