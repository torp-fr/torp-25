#!/usr/bin/env node
/**
 * Script automatique pour appliquer la migration Building Profile Role
 * Tente plusieurs méthodes automatiquement
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

console.log('🗄️  Application Automatique de la Migration Building Profile Role')
console.log('==================================================================\n')

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
  console.log('📦 Méthode 1 : Via Railway CLI...\n')
  
  try {
    // Vérifier si Railway est lié
    const status = execSync('railway status', { 
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    
    console.log('✅ Railway est lié, application de la migration...\n')
    execSync('railway run npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    })
    console.log('\n✅ Migration appliquée avec succès via Railway !\n')
    return true
  } catch (error: any) {
    if (error.message.includes('No linked project')) {
      console.log('⚠️  Railway n\'est pas lié\n')
    } else {
      console.log('⚠️  Railway a échoué:', error.message, '\n')
    }
    return false
  }
}

// Méthode 2 : DATABASE_URL dans l'environnement
async function tryEnvMigrate() {
  console.log('📦 Méthode 2 : Via DATABASE_URL environnementale...\n')
  
  const dbUrl = process.env.DATABASE_URL
  
  if (!dbUrl) {
    console.log('⚠️  DATABASE_URL non trouvée dans l\'environnement\n')
    return false
  }
  
  try {
    console.log('✅ DATABASE_URL trouvée, application de la migration...\n')
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: { ...process.env },
    })
    console.log('\n✅ Migration appliquée avec succès !\n')
    return true
  } catch (error: any) {
    console.log('⚠️  Échec de la migration:', error.message, '\n')
    return false
  }
}

// Méthode 3 : Prisma db push (alternative, crée les changements sans migration)
async function tryDbPush() {
  console.log('📦 Méthode 3 : Via Prisma db push (alternative)...\n')
  
  try {
    console.log('⚠️  ATTENTION : db push applique les changements sans créer de migration historique\n')
    console.log('   Cette méthode est utile pour le développement mais pas recommandée pour la production\n')
    
    // Demander confirmation (mais en mode automatique, on peut essayer)
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    })
    console.log('\n✅ Changements appliqués avec succès via db push !\n')
    return true
  } catch (error: any) {
    console.log('⚠️  db push a échoué:', error.message, '\n')
    return false
  }
}

// Méthode 4 : Lier Railway automatiquement (si un seul projet)
async function tryAutoLinkRailway() {
  console.log('📦 Méthode 4 : Tentative de liaison automatique Railway...\n')
  
  try {
    // Lister les projets Railway
    const projects = execSync('railway list', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    
    console.log('Projets Railway disponibles:')
    console.log(projects)
    console.log('\n⚠️  Sélection manuelle requise. Utilisez: railway link\n')
    return false
  } catch (error: any) {
    console.log('⚠️  Impossible de lister les projets Railway:', error.message, '\n')
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
  console.log('💡 Options restantes :\n')
  console.log('1. Lier Railway manuellement :')
  console.log('   railway link')
  console.log('   railway run npx prisma migrate deploy\n')
  
  console.log('2. Configurer DATABASE_URL :')
  console.log('   export DATABASE_URL="postgresql://..."  # Linux/Mac')
  console.log('   $env:DATABASE_URL="postgresql://..."   # Windows PowerShell')
  console.log('   node scripts/apply-migration-auto.ts\n')
  
  console.log('3. Utiliser Prisma db push (développement uniquement) :')
  console.log('   npx prisma db push --accept-data-loss\n')
  
  console.log('4. Consultez le guide complet :')
  console.log('   scripts/APPLY_MIGRATION_GUIDE.md\n')
  
  // Pour mode automatique, on peut aussi essayer db push si l'utilisateur veut
  const forceDbPush = process.argv.includes('--db-push')
  if (forceDbPush) {
    console.log('🔄 Tentative avec db push (demandé explicitement)...\n')
    if (await tryDbPush()) {
      process.exit(0)
    }
  }
  
  process.exit(1)
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})

