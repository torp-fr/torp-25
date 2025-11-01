#!/usr/bin/env tsx

/**
 * Script pour tester Sentry en production (après déploiement Vercel)
 * À exécuter après le déploiement pour vérifier que Sentry fonctionne
 */

async function testProductionSentry() {
  const productionUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://torp-platform.vercel.app'

  console.log('🧪 Test Sentry Production\n')
  console.log(`📍 URL Production: ${productionUrl}\n`)

  const endpoints = ['/api/test-sentry', '/api/test-sentry-complete']

  for (const endpoint of endpoints) {
    console.log(`🔍 Test ${endpoint}...`)
    try {
      const response = await fetch(`${productionUrl}${endpoint}`)
      const data = await response.json()

      if (response.ok) {
        console.log(`  ✅ Succès`)
        if (data.sentry) {
          console.log(`     Sentry: ${JSON.stringify(data.sentry)}`)
        }
      } else {
        console.log(`  ⚠️  Réponse: ${response.status}`)
        console.log(`     ${JSON.stringify(data)}`)
      }
    } catch (error) {
      console.log(
        `  ❌ Erreur: ${error instanceof Error ? error.message : 'Unknown'}`
      )
    }
    console.log('')
  }

  console.log('✅ Tests terminés!')
  console.log('\n💡 Vérifiez le dashboard Sentry:')
  console.log(
    '   https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/\n'
  )
}

if (require.main === module) {
  testProductionSentry().catch(console.error)
}

export { testProductionSentry }
