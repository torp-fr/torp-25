#!/usr/bin/env node
import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script automatique pour appliquer la migration Building Profile Role
 * Tente plusieurs méthodes automatiquement
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

log.info('🗄️  Application Automatique de la Migration Building Profile Role')
log.info('==================================================================\n')

const migrationPath = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20250131_add_building_profile_role',
  'migration.sql'
)

// Méthode 1 : Railway CLI (si lié)
async function tryRailwayMigrate() {
  log.info('📦 Méthode 1 : Via Railway CLI...\n')
  
  try {
    // Vérifier si Railway est lié
    const status = execSync('railway status', { 
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    
    log.info('✅ Railway est lié, application de la migration...\n')
    execSync('railway run npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    })
    log.info('\n✅ Migration appliquée avec succès via Railway !\n')
    return true
  } catch (error: any) {
    if (error.message.includes('No linked project')) {
      log.info('⚠️  Railway n\'est pas lié\n')
    } else {
      log.info('⚠️  Railway a échoué:', error.message, '\n')
    }
    return false
  }
}

// Méthode 2 : DATABASE_URL dans l'environnement
async function tryEnvMigrate() {
  log.info('📦 Méthode 2 : Via DATABASE_URL environnementale...\n')
  
  const dbUrl = process.env.DATABASE_URL
  
  if (!dbUrl) {
    log.info('⚠️  DATABASE_URL non trouvée dans l\'environnement\n')
    return false
  }
  
  try {
    log.info('✅ DATABASE_URL trouvée, application de la migration...\n')
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
    })
    log.info('\n✅ Migration appliquée avec succès !\n')
    return true
  } catch (error: any) {
    log.info('⚠️  Échec de la migration:', error.message, '\n')
    return false
  }
}

// Méthode 3 : Prisma db push (alternative, crée les changements sans migration)
async function tryDbPush() {
  log.info('📦 Méthode 3 : Via Prisma db push (alternative)...\n')
  
  try {
    log.info('⚠️  ATTENTION : db push applique les changements sans créer de migration historique\n')
    log.info('   Cette méthode est utile pour le développement mais pas recommandée pour la production\n')
    
    // Demander confirmation (mais en mode automatique, on peut essayer)
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    })
    log.info('\n✅ Changements appliqués avec succès via db push !\n')
    return true
  } catch (error: any) {
    log.info('⚠️  db push a échoué:', error.message, '\n')
    return false
  }
}

// Méthode 4 : Lier Railway automatiquement (si un seul projet)
async function tryAutoLinkRailway() {
  log.info('📦 Méthode 4 : Tentative de liaison automatique Railway...\n')
  
  try {
    // Lister les projets Railway
    const projects = execSync('railway list', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    
    log.info('Projets Railway disponibles:')
    log.info(projects)
    log.info('\n⚠️  Sélection manuelle requise. Utilisez: railway link\n')
    return false
  } catch (error: any) {
    log.info('⚠️  Impossible de lister les projets Railway:', error.message, '\n')
    return false
  }
}

// Fonction principale
async function main() {
  // Essayer les méthodes dans l'ordre
  if (await tryRailwayMigrate()) {
    process.exit(0)
  }
  
  if (await tryEnvMigrate()) {
    process.exit(0)
  }
  
  // Essayer db push comme dernier recours (uniquement si explicitement demandé)
  log.info('💡 Options restantes :\n')
  log.info('1. Lier Railway manuellement :')
  log.info('   railway link')
  log.info('   railway run npx prisma migrate deploy\n')
  
  log.info('2. Configurer DATABASE_URL :')
  log.info('   export DATABASE_URL="postgresql://..."  # Linux/Mac')
  log.info('   $env:DATABASE_URL="postgresql://..."   # Windows PowerShell')
  log.info('   node scripts/apply-migration-auto.ts\n')
  
  log.info('3. Utiliser Prisma db push (développement uniquement) :')
  log.info('   npx prisma db push --accept-data-loss\n')
  
  log.info('4. Consultez le guide complet :')
  log.info('   scripts/APPLY_MIGRATION_GUIDE.md\n')
  
  // Pour mode automatique, on peut aussi essayer db push si l'utilisateur veut
  const forceDbPush = process.argv.includes('--db-push')
  if (forceDbPush) {
    log.info('🔄 Tentative avec db push (demandé explicitement)...\n')
    if (await tryDbPush()) {
      process.exit(0)
    }
  }
  
  process.exit(1)
}

main().catch((error) => {
  log.error('❌ Erreur fatale:', error)
  process.exit(1)
})

