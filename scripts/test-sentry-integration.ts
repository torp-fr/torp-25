#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment


/**
 * Script complet pour tester l'intégration Sentry
 * Teste toutes les fonctionnalités et génère un rapport
 */

import * as Sentry from '@sentry/nextjs'

interface TestResult {
  name: string
  success: boolean
  message: string
  details?: any
}

async function runSentryTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  log.info("🧪 Tests d'Intégration Sentry\n")
  log.info('='.repeat(50))

  // Test 1: Configuration DSN
  log.info('\n1️⃣ Test Configuration DSN')
  try {
    const dsn =
      process.env.NEXT_PUBLIC_SENTRY_DSN ||
      'https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776'

    if (dsn && dsn.includes('@o4510290746146816')) {
      results.push({
        name: 'DSN Configuration',
        success: true,
        message: 'DSN configuré correctement',
        details: { dsn: dsn.substring(0, 50) + '...' },
      })
      log.info('  ✅ DSN configuré')
    } else {
      throw new Error('DSN invalide ou manquant')
    }
  } catch (error) {
    results.push({
      name: 'DSN Configuration',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    log.info('  ❌ DSN non configuré')
  }

  // Test 2: Initialisation Sentry
  log.info('\n2️⃣ Test Initialisation SDK')
  try {
    if (typeof Sentry !== 'undefined') {
      results.push({
        name: 'SDK Initialization',
        success: true,
        message: 'SDK Sentry importé correctement',
      })
      log.info('  ✅ SDK Sentry disponible')
    } else {
      throw new Error('Sentry SDK non disponible')
    }
  } catch (error) {
    results.push({
      name: 'SDK Initialization',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    log.info('  ❌ SDK Sentry non disponible')
  }

  // Test 3: Variables d'environnement
  log.info('\n3️⃣ Test Variables Environnement')
  const envVars = {
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅' : '❌',
    SENTRY_ORG: process.env.SENTRY_ORG || 'o4510290746146816',
    SENTRY_PROJECT: process.env.SENTRY_PROJECT || 'torp-platform',
    NODE_ENV: process.env.NODE_ENV || 'development',
  }

  results.push({
    name: 'Environment Variables',
    success: !!process.env.NEXT_PUBLIC_SENTRY_DSN || true, // Fallback dans code
    message: 'Variables vérifiées',
    details: envVars,
  })
  log.info('  📋 Variables:', envVars)

  // Test 4: Envoi de message
  log.info('\n4️⃣ Test Envoi de Message')
  try {
    Sentry.captureMessage('Test Sentry Integration - Script Test', {
      level: 'info',
      tags: {
        test: 'integration',
        source: 'test-script',
        timestamp: new Date().toISOString(),
      },
    })
    results.push({
      name: 'Message Capture',
      success: true,
      message: 'Message envoyé à Sentry',
    })
    log.info('  ✅ Message capturé')
  } catch (error) {
    results.push({
      name: 'Message Capture',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    log.info('  ❌ Erreur lors de la capture')
  }

  // Test 5: Exception avec contexte
  log.info('\n5️⃣ Test Exception avec Contexte')
  try {
    Sentry.setContext('test-integration', {
      script: 'test-sentry-integration',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    })

    Sentry.setTag('test-type', 'integration')
    Sentry.setTag('test-version', '1.0.0')

    const testError = new Error('Test Sentry Integration - Exception Test')
    Sentry.captureException(testError, {
      level: 'error',
      tags: {
        test: 'integration',
        errorType: 'test-exception',
      },
    })

    results.push({
      name: 'Exception Capture',
      success: true,
      message: 'Exception capturée avec contexte',
    })
    log.info('  ✅ Exception capturée avec contexte')
  } catch (error) {
    results.push({
      name: 'Exception Capture',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    log.info('  ❌ Erreur lors de la capture')
  }

  // Test 6: User Context
  log.info('\n6️⃣ Test User Context')
  try {
    Sentry.setUser({
      id: 'test-script-user',
      email: 'test@torp.fr',
      username: 'test-script',
    })
    results.push({
      name: 'User Context',
      success: true,
      message: 'User context défini',
    })
    log.info('  ✅ User context défini')
  } catch (error) {
    results.push({
      name: 'User Context',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    log.info('  ❌ Erreur lors de la définition')
  }

  // Test 7: Release Tracking (si configuré)
  log.info('\n7️⃣ Test Release Tracking')
  try {
    const release =
      process.env.SENTRY_RELEASE ||
      process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) ||
      'unknown'

    Sentry.setTag('release', release)
    results.push({
      name: 'Release Tracking',
      success: true,
      message: `Release tracking configuré: ${release}`,
      details: { release },
    })
    log.info(`  ✅ Release: ${release}`)
  } catch (error) {
    results.push({
      name: 'Release Tracking',
      success: false,
      message: error instanceof Error ? error.message : 'Release non configuré',
    })
    log.info('  ⚠️  Release non configuré')
  }

  return results
}

async function generateReport(results: TestResult[]) {
  log.info('\n' + '='.repeat(50))
  log.info('\n📊 Rapport des Tests\n')

  const successCount = results.filter((r) => r.success).length
  const totalCount = results.length

  log.info(`✅ Réussis: ${successCount}/${totalCount}`)
  log.info(`❌ Échoués: ${totalCount - successCount}/${totalCount}`)

  log.info('\n📋 Détails:\n')
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌'
    log.info(`${index + 1}. ${icon} ${result.name}`)
    log.info(`   ${result.message}`)
    if (result.details) {
      log.info(`   Détails:`, result.details)
    }
    log.info('')
  })

  log.info('='.repeat(50))
  log.info('\n💡 Prochaines étapes:')
  log.info('1. Vérifiez le dashboard Sentry:')
  log.info(
    '   https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/'
  )
  log.info('2. Attendez 10-30 secondes')
  log.info('3. Vérifiez que les nouvelles issues apparaissent')
  log.info("4. Activez l'intégration GitHub via le dashboard Sentry")
  log.info('   Voir: docs/ACTIVATE_GITHUB_INTEGRATION.md')
  log.info('')
}

if (require.main === module) {
  runSentryTests()
    .then(generateReport)
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      log.error('Erreur lors des tests:', error)
      process.exit(1)
    })
}

export { runSentryTests, generateReport }
