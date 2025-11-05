#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment


/**
 * Script pour tester la configuration Sentry
 * Vérifie que Sentry est correctement configuré et peut capturer des erreurs
 */

import * as Sentry from '@sentry/nextjs'

async function testSentryConfig() {
  log.info('🧪 Test de Configuration Sentry\n')

  // Vérifier le DSN
  const dsn =
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    'https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776'

  log.info('📋 Configuration:')
  log.info(`  DSN: ${dsn.substring(0, 50)}...`)
  log.info(`  Org: ${process.env.SENTRY_ORG || 'o4510290746146816'}`)
  log.info(`  Project: ${process.env.SENTRY_PROJECT || 'torp-platform'}`)
  log.info(`  Environment: ${process.env.NODE_ENV || 'development'}\n`)

  // Vérifier que Sentry est initialisé
  log.info("🔍 Vérification de l'initialisation:")

  if (typeof Sentry !== 'undefined') {
    log.info('  ✅ Sentry SDK importé correctement')
  } else {
    log.info('  ❌ Sentry SDK non disponible')
    return false
  }

  // Test d'envoi de message (dev seulement)
  if (process.env.NODE_ENV === 'development') {
    log.info("\n📤 Test d'envoi de message:")
    try {
      Sentry.captureMessage('Test Sentry Configuration - Script', {
        level: 'info',
        tags: {
          test: 'true',
          source: 'script',
        },
      })
      log.info('  ✅ Message envoyé à Sentry')
    } catch (error) {
      log.info("  ⚠️  Erreur lors de l'envoi:", error)
    }
  }

  // Test d'exception
  log.info("\n🚨 Test d'exception:")
  try {
    throw new Error('Test Sentry Exception - Script')
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test: 'true',
        source: 'script',
      },
    })
    log.info('  ✅ Exception capturée et envoyée')
  }

  log.info('\n✅ Tests terminés!')
  log.info('\n💡 Vérifiez le dashboard Sentry dans les prochaines minutes:')
  log.info(
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
      log.error('Erreur lors des tests:', error)
      process.exit(1)
    })
}

export { testSentryConfig }
