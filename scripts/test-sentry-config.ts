#!/usr/bin/env tsx

/**
 * Script pour tester la configuration Sentry
 * Vérifie que Sentry est correctement configuré et peut capturer des erreurs
 */

import * as Sentry from '@sentry/nextjs'

async function testSentryConfig() {
  console.log('🧪 Test de Configuration Sentry\n')

  // Vérifier le DSN
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776'

  console.log('📋 Configuration:')
  console.log(`  DSN: ${dsn.substring(0, 50)}...`)
  console.log(`  Org: ${process.env.SENTRY_ORG || 'o4510290746146816'}`)
  console.log(`  Project: ${process.env.SENTRY_PROJECT || 'torp-platform'}`)
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}\n`)

  // Vérifier que Sentry est initialisé
  console.log("🔍 Vérification de l'initialisation:")

  if (typeof Sentry !== 'undefined') {
    console.log('  ✅ Sentry SDK importé correctement')
  } else {
    console.log('  ❌ Sentry SDK non disponible')
    return false
  }

  // Test d'envoi de message (dev seulement)
  if (process.env.NODE_ENV === 'development') {
    console.log("\n📤 Test d'envoi de message:")
    try {
      Sentry.captureMessage('Test Sentry Configuration - Script', {
        level: 'info',
        tags: {
          test: 'true',
          source: 'script',
        },
      })
      console.log('  ✅ Message envoyé à Sentry')
    } catch (error) {
      console.log("  ⚠️  Erreur lors de l'envoi:", error)
    }
  }

  // Test d'exception
  console.log("\n🚨 Test d'exception:")
  try {
    throw new Error('Test Sentry Exception - Script')
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: 'true',
        source: 'script',
      },
    })
    console.log('  ✅ Exception capturée et envoyée')
  }

  console.log('\n✅ Tests terminés!')
  console.log('\n💡 Vérifiez le dashboard Sentry dans les prochaines minutes:')
  console.log(
    '   https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/\n'
  )

  return true
}

// Exécuter les tests
if (require.main === module) {
  testSentryConfig()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Erreur lors des tests:', error)
      process.exit(1)
    })
}

export { testSentryConfig }
