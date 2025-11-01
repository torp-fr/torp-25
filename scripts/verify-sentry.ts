#!/usr/bin/env tsx

/**
 * Script pour vérifier la configuration Sentry
 */

function checkSentryConfig() {
  console.log('🔍 Vérification de la configuration Sentry...\n')

  const requiredVars = [
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_ORG',
    'SENTRY_PROJECT',
  ]

  const optionalVars = ['SENTRY_AUTH_TOKEN']

  let allGood = true

  // Vérifier les variables requises
  console.log('📋 Variables requises:')
  requiredVars.forEach((varName) => {
    const value = process.env[varName]
    if (value) {
      console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`)
    } else {
      console.log(`  ❌ ${varName}: Non définie`)
      allGood = false
    }
  })

  console.log('\n📋 Variables optionnelles:')
  optionalVars.forEach((varName) => {
    const value = process.env[varName]
    if (value) {
      console.log(`  ✅ ${varName}: Définie`)
    } else {
      console.log(`  ⚠️  ${varName}: Non définie (source maps upload limité)`)
    }
  })

  console.log('\n📁 Fichiers de configuration:')
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
      console.log(`  ✅ ${file}`)
    } else {
      console.log(`  ❌ ${file}: Manquant`)
      allGood = false
    }
  })

  console.log('\n📊 Résultat:')
  if (allGood) {
    console.log('  ✅ Configuration Sentry complète!')
    console.log('\n💡 Prochaines étapes:')
    console.log('  1. Visitez /test-sentry pour tester')
    console.log('  2. Vérifiez le dashboard Sentry pour les erreurs')
  } else {
    console.log('  ❌ Configuration incomplète')
    console.log('\n💡 Actions nécessaires:')
    console.log('  1. Créez un projet sur https://sentry.io')
    console.log("  2. Ajoutez les variables d'environnement dans .env.local")
    console.log('  3. Relancez ce script pour vérifier')
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
