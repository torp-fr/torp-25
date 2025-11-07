/**
 * Script de test pour l'enrichissement intelligent complet
 * Usage: npx tsx scripts/test-intelligent-enrichment.ts [SIRET]
 */

import { CompanyEnrichmentService } from '../services/data-enrichment/company-service'

const testSiret = process.argv[2] || '91789983300029' // SIRET de test: NDT Nord Diffusion Toiture

async function testIntelligentEnrichment() {
  console.log(`\n🔍 Test d'enrichissement intelligent pour SIRET: ${testSiret}`)
  console.log('='.repeat(80))

  const service = new CompanyEnrichmentService()

  try {
    const profile = await service.enrichFromSiretComplete(testSiret)

    if (!profile) {
      console.error('\n❌ Aucune donnée récupérée')
      process.exit(1)
    }

    console.log('\n✅ Profil enrichi récupéré avec succès')
    console.log('='.repeat(80))

    // 1. Informations de base
    console.log('\n📋 INFORMATIONS DE BASE')
    console.log(`  SIRET: ${profile.siret}`)
    console.log(`  SIREN: ${profile.siren}`)
    console.log(`  Nom: ${profile.name}`)
    console.log(`  Statut juridique: ${profile.legalStatus || 'N/A'}`)

    // 2. Date de création et âge
    console.log('\n📅 CRÉATION ET ÂGE')
    if (profile.creationDate) {
      console.log(`  Date de création: ${profile.creationDate}`)
      console.log(`  Âge: ${profile.companyAge} an${profile.companyAge! > 1 ? 's' : ''}`)
      console.log(`  Statut: ${profile.isRecent ? '🆕 RÉCENTE (< 2 ans)' : '⭐ ÉTABLIE'}`)
    } else {
      console.log(`  ⚠️  Date de création non disponible`)
    }

    // 3. Adresse
    console.log('\n📍 ADRESSE')
    if (profile.address) {
      console.log(`  Rue: ${profile.address.street}`)
      console.log(`  Ville: ${profile.address.city}`)
      console.log(`  Code postal: ${profile.address.postalCode}`)
      console.log(`  Région: ${profile.address.region || 'N/A'}`)
    } else {
      console.log(`  ⚠️  Adresse non disponible`)
    }

    // 4. Activités et mots-clés
    console.log('\n🏭 ACTIVITÉS ET MOTS-CLÉS')
    if (profile.activities && profile.activities.length > 0) {
      console.log('  Activités déclarées:')
      profile.activities.forEach((activity) => {
        console.log(`    - ${activity.code}: ${activity.label}`)
      })
    }
    if (profile.activityKeywords && profile.activityKeywords.length > 0) {
      console.log(`  Mots-clés extraits: ${profile.activityKeywords.join(', ')}`)
    } else {
      console.log(`  ⚠️  Aucun mot-clé d'activité extrait`)
    }

    // 5. Avis clients
    console.log('\n⭐ AVIS CLIENTS')
    const reviews = (profile as any).reviews
    if (reviews && reviews.totalReviews > 0) {
      console.log(`  Note globale: ${reviews.overallRating.toFixed(1)}/5`)
      console.log(`  Total avis: ${reviews.totalReviews}`)
      console.log(`  Tendance: ${reviews.insights.recentTrend}`)
      console.log('\n  Par source:')
      if (reviews.bySource.google.avgRating > 0) {
        console.log(
          `    Google: ${reviews.bySource.google.avgRating.toFixed(1)}/5 (${reviews.bySource.google.count} avis)`
        )
      }
      if (reviews.bySource.trustpilot.avgRating > 0) {
        console.log(
          `    Trustpilot: ${reviews.bySource.trustpilot.avgRating.toFixed(1)}/5 (${reviews.bySource.trustpilot.count} avis)`
        )
      }
      if (reviews.bySource.eldo.avgRating > 0) {
        console.log(
          `    Eldo: ${reviews.bySource.eldo.avgRating.toFixed(1)}/5 (${reviews.bySource.eldo.count} avis)`
        )
      }
      console.log(`\n  Taux de recommandation: ${reviews.insights.recommendationRate}%`)
      console.log(`  Taux de réponse: ${reviews.insights.responseRate}%`)

      if (reviews.keywords.positive.length > 0) {
        console.log(`  Mots-clés positifs: ${reviews.keywords.positive.join(', ')}`)
      }
      if (reviews.keywords.negative.length > 0) {
        console.log(`  Mots-clés négatifs: ${reviews.keywords.negative.join(', ')}`)
      }
    } else {
      console.log(`  ℹ️  Aucun avis client trouvé`)
    }

    // 6. Données financières
    console.log('\n💰 DONNÉES FINANCIÈRES')
    if (profile.financialData) {
      console.log(`  Chiffre d'affaires: ${profile.financialData.ca?.join(', ') || 'N/A'}`)
      console.log(`  Résultat: ${profile.financialData.result?.join(', ') || 'N/A'}`)
    } else {
      console.log(`  ℹ️  Pas de données financières disponibles`)
    }

    // 7. Certifications
    console.log('\n✓ CERTIFICATIONS')
    if (profile.certifications && profile.certifications.length > 0) {
      profile.certifications.forEach((cert) => {
        console.log(
          `  - ${cert.name} (valide: ${cert.valid}, expire: ${cert.validUntil || 'N/A'})`
        )
      })
    } else {
      console.log(`  ℹ️  Aucune certification trouvée`)
    }

    // 8. Statut juridique
    console.log('\n⚖️  STATUT JURIDIQUE')
    if (profile.legalStatusDetails) {
      console.log(
        `  Procédure collective: ${profile.legalStatusDetails.hasCollectiveProcedure ? '⚠️  OUI' : '✅ NON'}`
      )
      if (profile.legalStatusDetails.hasCollectiveProcedure) {
        console.log(`  Type: ${profile.legalStatusDetails.procedureType || 'N/A'}`)
        console.log(`  Date: ${profile.legalStatusDetails.procedureDate || 'N/A'}`)
      }
    } else {
      console.log(`  ℹ️  Aucune information détaillée`)
    }

    // 9. Assurances
    console.log('\n🛡️  ASSURANCES')
    if (profile.insurances) {
      console.log(`  Décennale: ${profile.insurances.hasDecennale ? '✅' : '❌'}`)
      console.log(`  RC Pro: ${profile.insurances.hasRC ? '✅' : '❌'}`)
      if (profile.insurances.hasDecennale) {
        console.log(`  Montant décennale: ${profile.insurances.decennaleAmount || 'N/A'}`)
      }
      if (profile.insurances.hasRC) {
        console.log(`  Montant RC: ${profile.insurances.rcAmount || 'N/A'}`)
      }
    } else {
      console.log(`  ℹ️  Aucune information d'assurance`)
    }

    // 10. Métriques d'enrichissement
    console.log('\n📊 MÉTRIQUES D\'ENRICHISSEMENT')
    console.log(`  Score de complétude: ${profile.dataCompleteness}%`)
    console.log(`  Score de confiance: ${profile.confidenceScore}%`)
    console.log(`  Sources utilisées (${profile.dataSources.length}):`)
    profile.dataSources.forEach((source) => {
      console.log(`    - ${source}`)
    })

    // 11. Statut de vérification
    console.log('\n🔍 VÉRIFICATION')
    console.log(`  SIRET vérifié: ${profile.verificationStatus.siretVerified ? '✅' : '❌'}`)
    console.log(
      `  Adresse vérifiée: ${profile.verificationStatus.addressVerified ? '✅' : '❌'}`
    )
    console.log(
      `  Activité vérifiée: ${profile.verificationStatus.activityVerified ? '✅' : '❌'}`
    )

    // 12. Résumé
    console.log('\n' + '='.repeat(80))
    console.log('📈 RÉSUMÉ')
    const hasAddress = !!profile.address
    const hasActivities = !!(profile.activities && profile.activities.length > 0)
    const hasFinancial = !!profile.financialData
    const hasCertifications = !!(profile.certifications && profile.certifications.length > 0)
    const hasReviews = !!(reviews && reviews.totalReviews > 0)
    const hasCreationDate = !!profile.creationDate

    console.log(`  ✓ SIRET/SIREN: ✅`)
    console.log(`  ✓ Nom: ✅`)
    console.log(`  ✓ Date de création: ${hasCreationDate ? '✅' : '❌'}`)
    console.log(`  ✓ Adresse: ${hasAddress ? '✅' : '❌'}`)
    console.log(`  ✓ Activités: ${hasActivities ? '✅' : '❌'}`)
    console.log(`  ✓ Données financières: ${hasFinancial ? '✅' : '❌'}`)
    console.log(`  ✓ Certifications: ${hasCertifications ? '✅' : '❌'}`)
    console.log(`  ✓ Avis clients: ${hasReviews ? '✅' : '❌'}`)

    const completeness =
      ((hasCreationDate ? 1 : 0) +
        (hasAddress ? 1 : 0) +
        (hasActivities ? 1 : 0) +
        (hasFinancial ? 1 : 0) +
        (hasCertifications ? 1 : 0) +
        (hasReviews ? 1 : 0)) /
      6
    console.log(`\n  Score de complétude calculé: ${Math.round(completeness * 100)}%`)
    console.log(`  Score de complétude service: ${profile.dataCompleteness}%`)

    if (profile.isRecent) {
      console.log(
        '\n  ℹ️  ENTREPRISE RÉCENTE: Données limitées normales pour une jeune entreprise'
      )
    }

    console.log('\n' + '='.repeat(80))
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'enrichissement:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

testIntelligentEnrichment()
