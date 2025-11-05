#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment


/**
 * Script pour vérifier la configuration Sentry
 */

function checkSentryConfig() {
  log.info('🔍 Vérification de la configuration Sentry...\n')

  const requiredVars = [
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_ORG',
    'SENTRY_PROJECT',
  ]

  const optionalVars = ['SENTRY_AUTH_TOKEN']

  let allGood = true

  // Vérifier les variables requises
  log.info('📋 Variables requises:')
  requiredVars.forEach((varName) => {
    const value = process.env[varName]
    if (value) {
      log.info(`  ✅ ${varName}: ${value.substring(0, 20)}...`)
    } else {
      log.info(`  ❌ ${varName}: Non définie`)
      allGood = false
    }
  })

  log.info('\n📋 Variables optionnelles:')
  optionalVars.forEach((varName) => {
    const value = process.env[varName]
    if (value) {
      log.info(`  ✅ ${varName}: Définie`)
    } else {
      log.info(`  ⚠️  ${varName}: Non définie (source maps upload limité)`)
    }
  })

  log.info('\n📁 Fichiers de configuration:')
  const configFiles = [
    'sentry.client.config.ts',
    'sentry.server.config.ts',
    'sentry.edge.config.ts',
    '.instrumentation.ts',
  ]

  const fs = require('fs')
  const path = require('path')

  configFiles.forEach((file) => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      log.info(`  ✅ ${file}`)
    } else {
      log.info(`  ❌ ${file}: Manquant`)
      allGood = false
    }
  })

  log.info('\n📊 Résultat:')
  if (allGood) {
    log.info('  ✅ Configuration Sentry complète!')
    log.info('\n💡 Prochaines étapes:')
    log.info('  1. Visitez /test-sentry pour tester')
    log.info('  2. Vérifiez le dashboard Sentry pour les erreurs')
  } else {
    log.info('  ❌ Configuration incomplète')
    log.info('\n💡 Actions nécessaires:')
    log.info('  1. Créez un projet sur https://sentry.io')
    log.info("  2. Ajoutez les variables d'environnement dans .env.local")
    log.info('  3. Relancez ce script pour vérifier')
  }

  return allGood
}

// Exécuter la vérification
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' })
  const success = checkSentryConfig()
  process.exit(success ? 0 : 1)
}

export { checkSentryConfig }
