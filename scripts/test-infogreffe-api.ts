/**
 * Script de test pour l'API Infogreffe OpenDataSoft
 * Usage: npx tsx scripts/test-infogreffe-api.ts [SIREN]
 */

// Charger les variables d'environnement depuis .env
import { config } from 'dotenv'
config()

import { InfogreffeService } from '../services/external-apis/infogreffe-service'

const testSiren = process.argv[2] || '917899833' // SIREN de test (NDT = 91789983)

async function testInfogreffeAPI() {
  console.log('\n🏦 Test API Infogreffe OpenDataSoft')
  console.log('='.repeat(80))
  console.log(`SIREN: ${testSiren}`)
  console.log('='.repeat(80))

  // Vérifier si clé API configurée
  const apiKey = process.env.INFOGREFFE_API_KEY
  if (apiKey) {
    console.log(`\n✅ Clé API Infogreffe configurée: ${apiKey.substring(0, 10)}...`)
  } else {
    console.log('\nℹ️  Pas de clé API Infogreffe (optionnel, fonctionne sans)')
  }

  try {
    const service = new InfogreffeService()

    console.log('\n⏳ Récupération des données Infogreffe...')
    const data = await service.getCompanyData(testSiren)

    if (!data) {
      console.log('\n⚠️  Aucune donnée Infogreffe récupérée')
      return
    }

    if (!data.available) {
      console.log('\n⚠️  Données Infogreffe non disponibles pour ce SIREN')
      console.log('Sources tentées:', data.sources.join(', '))
      return
    }

    console.log('\n✅ Données Infogreffe récupérées avec succès!')
    console.log('='.repeat(80))

    // Informations de base
    console.log('\n📋 INFORMATIONS DE BASE')
    console.log(`  SIREN: ${data.siren}`)
    if (data.siret) {
      console.log(`  SIRET: ${data.siret}`)
    }
    console.log(`  Sources: ${data.sources.join(', ')}`)
    console.log(`  Dernière mise à jour: ${new Date(data.lastUpdated).toLocaleDateString('fr-FR')}`)

    // Données financières
    if (data.financial) {
      console.log('\n💰 DONNÉES FINANCIÈRES')

      // Chiffre d'affaires
      if (data.financial.turnover) {
        console.log('\n  📊 Chiffre d\'affaires:')
        if (data.financial.turnover.lastYear !== undefined) {
          console.log(
            `    Dernière année: ${data.financial.turnover.lastYear.toLocaleString('fr-FR')} €`
          )
        }
        if (data.financial.turnover.previousYear !== undefined) {
          console.log(
            `    Année précédente: ${data.financial.turnover.previousYear.toLocaleString('fr-FR')} €`
          )
        }
        if (data.financial.turnover.evolution !== undefined) {
          const sign = data.financial.turnover.evolution >= 0 ? '+' : ''
          const icon = data.financial.turnover.evolution >= 0 ? '📈' : '📉'
          console.log(
            `    Évolution: ${icon} ${sign}${data.financial.turnover.evolution.toFixed(1)}%`
          )
        }
        if (data.financial.turnover.years && data.financial.turnover.years.length > 0) {
          console.log('    Historique:')
          data.financial.turnover.years.forEach((y) => {
            console.log(`      ${y.year}: ${y.amount.toLocaleString('fr-FR')} €`)
          })
        }
      }

      // Résultat net
      if (data.financial.netResult) {
        console.log('\n  📊 Résultat net:')
        if (data.financial.netResult.lastYear !== undefined) {
          console.log(
            `    Dernière année: ${data.financial.netResult.lastYear.toLocaleString('fr-FR')} €`
          )
        }
        if (data.financial.netResult.previousYear !== undefined) {
          console.log(
            `    Année précédente: ${data.financial.netResult.previousYear.toLocaleString('fr-FR')} €`
          )
        }
        if (data.financial.netResult.evolution !== undefined) {
          const sign = data.financial.netResult.evolution >= 0 ? '+' : ''
          const icon = data.financial.netResult.evolution >= 0 ? '📈' : '📉'
          console.log(
            `    Évolution: ${icon} ${sign}${data.financial.netResult.evolution.toFixed(1)}%`
          )
        }
        if (data.financial.netResult.years && data.financial.netResult.years.length > 0) {
          console.log('    Historique:')
          data.financial.netResult.years.forEach((y) => {
            console.log(`      ${y.year}: ${y.amount.toLocaleString('fr-FR')} €`)
          })
        }
      }

      // Capital social
      if (data.financial.capital !== undefined) {
        console.log(
          `\n  💼 Capital social: ${data.financial.capital.toLocaleString('fr-FR')} €`
        )
      }

      // EBITDA
      if (data.financial.ebitda !== undefined) {
        console.log(`  📊 EBITDA: ${data.financial.ebitda.toLocaleString('fr-FR')} €`)
      }

      // Dettes
      if (data.financial.debt) {
        console.log('\n  💳 Endettement:')
        if (data.financial.debt.total !== undefined) {
          console.log(`    Total: ${data.financial.debt.total.toLocaleString('fr-FR')} €`)
        }
        if (data.financial.debt.shortTerm !== undefined) {
          console.log(
            `    Court terme: ${data.financial.debt.shortTerm.toLocaleString('fr-FR')} €`
          )
        }
        if (data.financial.debt.longTerm !== undefined) {
          console.log(
            `    Long terme: ${data.financial.debt.longTerm.toLocaleString('fr-FR')} €`
          )
        }
      }
    } else {
      console.log('\n💰 DONNÉES FINANCIÈRES: Non disponibles')
    }

    // Données juridiques
    if (data.legal) {
      console.log('\n⚖️  DONNÉES JURIDIQUES')

      // Statut juridique
      if (data.legal.legalStatus) {
        console.log(`  Statut: ${data.legal.legalStatus}`)
      }

      // Procédures collectives
      if (data.legal.collectiveProcedures && data.legal.collectiveProcedures.length > 0) {
        console.log('\n  ⚠️  PROCÉDURES COLLECTIVES:')
        data.legal.collectiveProcedures.forEach((proc, idx) => {
          console.log(`    ${idx + 1}. ${proc.type}`)
          console.log(`       Status: ${proc.status === 'ongoing' ? '🔴 En cours' : '✅ Terminée'}`)
          if (proc.startDate) {
            console.log(`       Début: ${proc.startDate}`)
          }
          if (proc.endDate) {
            console.log(`       Fin: ${proc.endDate}`)
          }
          if (proc.details) {
            console.log(`       Détails: ${proc.details}`)
          }
        })
      }

      // Mandataires sociaux
      if (data.legal.representatives && data.legal.representatives.length > 0) {
        console.log('\n  👥 MANDATAIRES SOCIAUX:')
        data.legal.representatives.forEach((rep, idx) => {
          console.log(`    ${idx + 1}. ${rep.firstName} ${rep.lastName} - ${rep.role}`)
        })
      }

      // Modifications récentes
      if (data.legal.recentChanges && data.legal.recentChanges.length > 0) {
        console.log('\n  📝 MODIFICATIONS RÉCENTES:')
        data.legal.recentChanges.forEach((change, idx) => {
          console.log(`    ${idx + 1}. ${change.date} - ${change.type}`)
          console.log(`       ${change.description}`)
        })
      }
    } else {
      console.log('\n⚖️  DONNÉES JURIDIQUES: Non disponibles')
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Test terminé avec succès!')
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

testInfogreffeAPI()
