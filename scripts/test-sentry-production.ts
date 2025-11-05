#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment


/**
 * Script pour tester Sentry en production (après déploiement Vercel)
 * À exécuter après le déploiement pour vérifier que Sentry fonctionne
 */

async function testProductionSentry() {
  const productionUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://torp-platform.vercel.app'

  log.info('🧪 Test Sentry Production\n')
  log.info(`📍 URL Production: ${productionUrl}\n`)

  const endpoints = ['/api/test-sentry', '/api/test-sentry-complete']

  for (const endpoint of endpoints) {
    log.info(`🔍 Test ${endpoint}...`)
    try {
      const response = await fetch(`${productionUrl}${endpoint}`)
      const data = await response.json()

      if (response.ok) {
        log.info(`  ✅ Succès`)
        if (data.sentry) {
          log.info(`     Sentry: ${JSON.stringify(data.sentry)}`)
        }
      } else {
        log.info(`  ⚠️  Réponse: ${response.status}`)
        log.info(`     ${JSON.stringify(data)}`)
      }
    } catch (error) {
      log.info(
        `  ❌ Erreur: ${error instanceof Error ? error.message : 'Unknown'}`
      )
    }
    log.info('')
  }

  log.info('✅ Tests terminés!')
  log.info('\n💡 Vérifiez le dashboard Sentry:')
  log.info(
    '   https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/\n'
  )
}

if (require.main === module) {
  testProductionSentry().catch(console.error)
}

export { testProductionSentry }
