#!/usr/bin/env node
/**
 * Wrapper script pour migrations Prisma avec vérification DATABASE_URL
 *
 * OBJECTIF: Skip complètement les migrations si DATABASE_URL n'est pas disponible
 * (cas du build Vercel où les migrations ne sont pas nécessaires)
 *
 * Si DATABASE_URL existe:
 *   1. Nettoie les migrations échouées
 *   2. Exécute prisma migrate deploy
 *
 * Si DATABASE_URL n'existe PAS:
 *   - Exit 0 (succès) sans rien faire
 */

const { spawn } = require('child_process')

async function runMigrationsWithCheck() {
  // Vérifier si DATABASE_URL existe
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL non trouvé (normal en build Vercel)')
    console.log('✅ Skip migrations complètement, continuation du build...\n')
    process.exit(0)
  }

  console.log('✅ DATABASE_URL trouvé, exécution des migrations...\n')

  // ÉTAPE 1: Nettoyage pré-migration
  console.log('📋 Étape 1/2: Nettoyage des migrations échouées...')

  try {
    await runCommand('node', ['scripts/pre-migrate-cleanup.js'])
    console.log('✅ Nettoyage terminé\n')
  } catch (error) {
    console.warn('⚠️  Nettoyage échoué, continuation quand même...\n')
  }

  // ÉTAPE 2: Prisma migrate deploy
  console.log('📋 Étape 2/2: Application des migrations Prisma...')

  try {
    await runCommand('npx', ['prisma', 'migrate', 'deploy'])
    console.log('✅ Migrations appliquées avec succès\n')
    process.exit(0)
  } catch (error) {
    console.error('❌ Échec des migrations:', error.message)
    process.exit(1)
  }
}

/**
 * Exécute une commande et retourne une promesse
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on('error', (error) => {
      reject(error)
    })
  })
}

// Exécuter
runMigrationsWithCheck().catch((error) => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
