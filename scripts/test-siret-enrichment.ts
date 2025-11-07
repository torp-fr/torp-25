/**
 * Script de test pour l'enrichissement d'un SIRET
 * Usage: npx tsx scripts/test-siret-enrichment.ts [SIRET]
 */

import { CompanyEnrichmentService } from '../services/data-enrichment/company-service'

const testSiret = process.argv[2] || '49294200019' // SIRET de test: IXINA ST POL SUR MER

async function testEnrichment() {
  console.log(`\n🔍 Test d'enrichissement pour SIRET: ${testSiret}`)
  console.log('='.repeat(60))

  const service = new CompanyEnrichmentService()

  try {
    const result = await service.enrichFromSiret(testSiret)

    if (!result) {
      console.error('\n❌ Aucune donnée récupérée')
      process.exit(1)
    }

    console.log('\n✅ Données récupérées avec succès:')
    console.log('='.repeat(60))
    console.log('\n📋 Informations de base:')
    console.log(`  SIRET: ${result.siret}`)
    console.log(`  SIREN: ${result.siren}`)
    console.log(`  Nom: ${result.name}`)
    console.log(`  Statut juridique: ${result.legalStatus || 'N/A'}`)

    if (result.address) {
      console.log('\n📍 Adresse:')
      console.log(`  Rue: ${result.address.street}`)
      console.log(`  Ville: ${result.address.city}`)
      console.log(`  Code postal: ${result.address.postalCode}`)
      console.log(`  Région: ${result.address.region || 'N/A'}`)
    } else {
      console.log('\n⚠️  Pas d\'adresse disponible')
    }

    if (result.activities && result.activities.length > 0) {
      console.log('\n🏭 Activités:')
      result.activities.forEach((activity) => {
        console.log(`  - ${activity.code}: ${activity.label}`)
      })
    } else {
      console.log('\n⚠️  Pas d\'activités disponibles')
    }

    if (result.financialData) {
      console.log('\n💰 Données financières:')
      console.log(`  Chiffre d'affaires: ${result.financialData.ca?.join(', ') || 'N/A'}`)
      console.log(`  Résultat: ${result.financialData.results?.join(', ') || 'N/A'}`)
    } else {
      console.log('\n⚠️  Pas de données financières disponibles')
    }

    if (result.qualifications && result.qualifications.length > 0) {
      console.log('\n🎓 Qualifications:')
      result.qualifications.forEach((qual) => {
        console.log(`  - ${qual.type} (niveau: ${qual.level})`)
      })
    } else {
      console.log('\n⚠️  Pas de qualifications disponibles')
    }

    if (result.certifications && result.certifications.length > 0) {
      console.log('\n✓ Certifications:')
      result.certifications.forEach((cert) => {
        console.log(
          `  - ${cert.name} (valide: ${cert.valid}, expire: ${cert.validUntil || 'N/A'})`
        )
      })
    } else {
      console.log('\n⚠️  Pas de certifications disponibles')
    }

    if (result.legalStatusDetails) {
      console.log('\n⚖️  Statut juridique détaillé:')
      console.log(
        `  Procédure collective: ${result.legalStatusDetails.hasCollectiveProcedure ? 'OUI ⚠️' : 'NON ✓'}`
      )
      if (result.legalStatusDetails.hasCollectiveProcedure) {
        console.log(`  Type: ${result.legalStatusDetails.procedureType || 'N/A'}`)
        console.log(`  Date: ${result.legalStatusDetails.procedureDate || 'N/A'}`)
      }
    }

    // Résumé de complétude
    console.log('\n📊 Résumé de complétude des données:')
    const hasAddress = !!result.address
    const hasActivities = !!(result.activities && result.activities.length > 0)
    const hasFinancial = !!result.financialData
    const hasCertifications = !!(result.certifications && result.certifications.length > 0)

    console.log(`  ✓ SIRET/SIREN: ✅`)
    console.log(`  ✓ Nom: ✅`)
    console.log(`  ✓ Adresse: ${hasAddress ? '✅' : '❌'}`)
    console.log(`  ✓ Activités: ${hasActivities ? '✅' : '❌'}`)
    console.log(`  ✓ Données financières: ${hasFinancial ? '✅' : '❌'}`)
    console.log(`  ✓ Certifications: ${hasCertifications ? '✅' : '❌'}`)

    const completeness =
      ((hasAddress ? 1 : 0) +
        (hasActivities ? 1 : 0) +
        (hasFinancial ? 1 : 0) +
        (hasCertifications ? 1 : 0)) /
      4
    console.log(`\n  Score de complétude: ${Math.round(completeness * 100)}%`)

    if (completeness < 0.5) {
      console.log(
        '\n⚠️  ATTENTION: Moins de 50% des données sont disponibles. Cela déclenchera le message "Données d\'enrichissement limitées".'
      )
    }

    console.log('\n' + '='.repeat(60))
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'enrichissement:', error)
    process.exit(1)
  }
}

testEnrichment()
