/**
 * Script de débogage pour simuler l'enrichissement complet
 * comme l'API route le ferait
 */

import { config } from 'dotenv'
config()

import { CompanyEnrichmentService } from '../services/data-enrichment/company-service'

const testSiret = '91789983300029' // NDT Nord Diffusion Toiture

async function debugEnrichment() {
  console.log('\n🔍 DÉBOGAGE ENRICHISSEMENT COMPLET')
  console.log('='.repeat(80))
  console.log(`SIRET: ${testSiret}`)
  console.log('='.repeat(80))

  try {
    const companyService = new CompanyEnrichmentService()

    console.log('\n⏳ Appel enrichFromSiretComplete()...')
    const enrichedProfile = await companyService.enrichFromSiretComplete(testSiret, {
      name: 'NDT Nord Diffusion Toiture',
      address: '968 ACHILLE PERES',
      postalCode: '59640',
      city: 'DUNKERQUE',
    })

    if (!enrichedProfile) {
      console.error('\n❌ enrichFromSiretComplete a retourné null')
      return
    }

    console.log('\n✅ Données enrichies récupérées')
    console.log('='.repeat(80))

    // Simuler ce que l'API retournerait
    const apiResponse = {
      success: true,
      data: enrichedProfile,
    }

    console.log('\n📤 RÉPONSE API SIMULÉE:')
    console.log(JSON.stringify(apiResponse, null, 2))

    console.log('\n' + '='.repeat(80))
    console.log('📊 PROPRIÉTÉS CLÉS POUR L\'UI')
    console.log('='.repeat(80))

    // Vérifier les propriétés utilisées par CompanyAuditCard
    const checks = [
      { name: 'siret', value: enrichedProfile.siret, required: true },
      { name: 'siren', value: enrichedProfile.siren, required: false },
      { name: 'name', value: enrichedProfile.name, required: true },
      { name: 'legalStatus', value: enrichedProfile.legalStatus, required: false },
      { name: 'address', value: enrichedProfile.address, required: false },
      { name: 'activities', value: enrichedProfile.activities, required: false },
      { name: 'creationDate', value: enrichedProfile.creationDate, required: true },
      { name: 'companyAge', value: enrichedProfile.companyAge, required: true },
      { name: 'isRecent', value: enrichedProfile.isRecent, required: true },
      { name: 'activityKeywords', value: enrichedProfile.activityKeywords, required: true },
      { name: 'dataCompleteness', value: enrichedProfile.dataCompleteness, required: true },
      { name: 'dataSources', value: enrichedProfile.dataSources, required: true },
      { name: 'confidenceScore', value: enrichedProfile.confidenceScore, required: true },
      { name: 'verificationStatus', value: enrichedProfile.verificationStatus, required: true },
      {
        name: 'reviews',
        value: (enrichedProfile as any).reviews,
        required: false,
      },
    ]

    console.log('\n✓ = Présent | ✗ = Manquant | ⚠ = Non requis mais manquant\n')

    checks.forEach((check) => {
      const isPresent = check.value !== undefined && check.value !== null
      const symbol = isPresent ? '✓' : check.required ? '✗' : '⚠'
      const color = isPresent ? '\x1b[32m' : check.required ? '\x1b[31m' : '\x1b[33m'
      const reset = '\x1b[0m'

      console.log(
        `${color}${symbol}${reset} ${check.name.padEnd(20)} ${isPresent ? JSON.stringify(check.value).substring(0, 60) : '(manquant)'}`
      )
    })

    // Détails des propriétés clés
    console.log('\n' + '='.repeat(80))
    console.log('📋 DÉTAILS DES PROPRIÉTÉS ENRICHIES')
    console.log('='.repeat(80))

    if (enrichedProfile.creationDate) {
      console.log(`\n📅 Date de création: ${enrichedProfile.creationDate}`)
      console.log(`   Âge: ${enrichedProfile.companyAge} an(s)`)
      console.log(`   Récente: ${enrichedProfile.isRecent ? '🆕 OUI (< 2 ans)' : '⭐ NON (établie)'}`)
    } else {
      console.log('\n❌ Date de création non calculée')
    }

    if (enrichedProfile.activityKeywords && enrichedProfile.activityKeywords.length > 0) {
      console.log(`\n🏷️  Mots-clés activité: ${enrichedProfile.activityKeywords.join(', ')}`)
    } else {
      console.log('\n⚠️  Aucun mot-clé d\'activité extrait')
    }

    if ((enrichedProfile as any).reviews) {
      const reviews = (enrichedProfile as any).reviews
      console.log(`\n⭐ Avis clients:`)
      console.log(`   Note globale: ${reviews.overallRating}/5`)
      console.log(`   Total: ${reviews.totalReviews} avis`)
    } else {
      console.log('\n⚠️  Aucun avis client récupéré')
    }

    console.log(`\n📊 Score de complétude: ${enrichedProfile.dataCompleteness}%`)
    console.log(`🎯 Score de confiance: ${enrichedProfile.confidenceScore}%`)
    console.log(`📚 Sources utilisées: ${enrichedProfile.dataSources.join(', ')}`)

    console.log('\n' + '='.repeat(80))
    console.log('✅ VÉRIFICATION DU MAPPING UI')
    console.log('='.repeat(80))

    // Simuler ce que reçoit CompanyAuditCard
    const companyData = enrichedProfile

    console.log('\nVérification des sections UI qui devraient s\'afficher:')

    // Section Date de création
    if (companyData.creationDate) {
      console.log('✓ Section "Date de création et âge" devrait s\'afficher')
    } else {
      console.log('✗ Section "Date de création" ne s\'affichera PAS')
    }

    // Section Mots-clés
    if (companyData.activityKeywords && companyData.activityKeywords.length > 0) {
      console.log('✓ Section "Mots-clés d\'activité" devrait s\'afficher')
    } else {
      console.log('✗ Section "Mots-clés" ne s\'affichera PAS')
    }

    // Section Avis
    if ((companyData as any).reviews && (companyData as any).reviews.totalReviews > 0) {
      console.log('✓ Section "Avis clients" devrait s\'afficher')
    } else {
      console.log('⚠ Section "Avis clients" ne s\'affichera PAS (normal sans avis)')
    }

    // Section Complétude
    if (companyData.dataCompleteness !== undefined) {
      console.log('✓ Section "Score de complétude" devrait s\'afficher')
    } else {
      console.log('✗ Section "Complétude" ne s\'affichera PAS')
    }

    console.log('\n' + '='.repeat(80))
    console.log('💡 DIAGNOSTIC')
    console.log('='.repeat(80))

    const hasCreationDate = !!enrichedProfile.creationDate
    const hasActivityKeywords =
      !!enrichedProfile.activityKeywords && enrichedProfile.activityKeywords.length > 0
    const hasDataCompleteness = enrichedProfile.dataCompleteness !== undefined

    if (hasCreationDate && hasActivityKeywords && hasDataCompleteness) {
      console.log('\n✅ TOUTES les propriétés essentielles sont présentes!')
      console.log('   Les nouvelles sections devraient s\'afficher dans l\'UI.')
      console.log('\n🔧 Si l\'UI ne les affiche pas:')
      console.log('   1. Vérifier que le serveur Next.js a été redémarré après les modifications')
      console.log('   2. Vider le cache du navigateur (Ctrl+Shift+R)')
      console.log('   3. Vérifier que l\'API route retourne bien ces données')
      console.log('   4. Inspecter les props reçues par CompanyAuditCard dans la console')
    } else {
      console.log('\n❌ PROBLÈME: Certaines propriétés essentielles manquent!')
      if (!hasCreationDate) {
        console.log('   ✗ creationDate manquant')
      }
      if (!hasActivityKeywords) {
        console.log('   ✗ activityKeywords manquant ou vide')
      }
      if (!hasDataCompleteness) {
        console.log('   ✗ dataCompleteness manquant')
      }
    }

    console.log('\n' + '='.repeat(80))
  } catch (error) {
    console.error('\n❌ Erreur:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

debugEnrichment()
