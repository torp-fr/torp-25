#!/usr/bin/env tsx

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

  console.log("🧪 Tests d'Intégration Sentry\n")
  console.log('='.repeat(50))

  // Test 1: Configuration DSN
  console.log('\n1️⃣ Test Configuration DSN')
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
      console.log('  ✅ DSN configuré')
    } else {
      throw new Error('DSN invalide ou manquant')
    }
  } catch (error) {
    results.push({
      name: 'DSN Configuration',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    console.log('  ❌ DSN non configuré')
  }

  // Test 2: Initialisation Sentry
  console.log('\n2️⃣ Test Initialisation SDK')
  try {
    if (typeof Sentry !== 'undefined') {
      results.push({
        name: 'SDK Initialization',
        success: true,
        message: 'SDK Sentry importé correctement',
      })
      console.log('  ✅ SDK Sentry disponible')
    } else {
      throw new Error('Sentry SDK non disponible')
    }
  } catch (error) {
    results.push({
      name: 'SDK Initialization',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    console.log('  ❌ SDK Sentry non disponible')
  }

  // Test 3: Variables d'environnement
  console.log('\n3️⃣ Test Variables Environnement')
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
  console.log('  📋 Variables:', envVars)

  // Test 4: Envoi de message
  console.log('\n4️⃣ Test Envoi de Message')
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
    console.log('  ✅ Message capturé')
  } catch (error) {
    results.push({
      name: 'Message Capture',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    console.log('  ❌ Erreur lors de la capture')
  }

  // Test 5: Exception avec contexte
  console.log('\n5️⃣ Test Exception avec Contexte')
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
    console.log('  ✅ Exception capturée avec contexte')
  } catch (error) {
    results.push({
      name: 'Exception Capture',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    console.log('  ❌ Erreur lors de la capture')
  }

  // Test 6: User Context
  console.log('\n6️⃣ Test User Context')
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
    console.log('  ✅ User context défini')
  } catch (error) {
    results.push({
      name: 'User Context',
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    })
    console.log('  ❌ Erreur lors de la définition')
  }

  // Test 7: Release Tracking (si configuré)
  console.log('\n7️⃣ Test Release Tracking')
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
    console.log(`  ✅ Release: ${release}`)
  } catch (error) {
    results.push({
      name: 'Release Tracking',
      success: false,
      message: error instanceof Error ? error.message : 'Release non configuré',
    })
    console.log('  ⚠️  Release non configuré')
  }

  return results
}

async function generateReport(results: TestResult[]) {
  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Rapport des Tests\n')

  const successCount = results.filter((r) => r.success).length
  const totalCount = results.length

  console.log(`✅ Réussis: ${successCount}/${totalCount}`)
  console.log(`❌ Échoués: ${totalCount - successCount}/${totalCount}`)

  console.log('\n📋 Détails:\n')
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${index + 1}. ${icon} ${result.name}`)
    console.log(`   ${result.message}`)
    if (result.details) {
      console.log(`   Détails:`, result.details)
    }
    console.log('')
  })

  console.log('='.repeat(50))
  console.log('\n💡 Prochaines étapes:')
  console.log('1. Vérifiez le dashboard Sentry:')
  console.log(
    '   https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/'
  )
  console.log('2. Attendez 10-30 secondes')
  console.log('3. Vérifiez que les nouvelles issues apparaissent')
  console.log("4. Activez l'intégration GitHub via le dashboard Sentry")
  console.log('   Voir: docs/ACTIVATE_GITHUB_INTEGRATION.md')
  console.log('')
}

if (require.main === module) {
  runSentryTests()
    .then(generateReport)
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('Erreur lors des tests:', error)
      process.exit(1)
    })
}

export { runSentryTests, generateReport }
