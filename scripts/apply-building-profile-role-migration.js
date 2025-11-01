#!/usr/bin/env node
/**
 * Script pour appliquer la migration Building Profile Role
 * Supporte plusieurs méthodes d'exécution : Railway, DATABASE_URL directe, ou interactive
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🗄️  Migration Building Profile Role')
console.log('====================================\n')

// Chemin vers le fichier de migration SQL
const migrationSQLPath = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20250131_add_building_profile_role',
  'migration.sql'
)

// Méthode 1 : Via Prisma migrate deploy (recommandé)
async function applyViaPrismaMigrate() {
  console.log('📦 Tentative d\'application via Prisma migrate deploy...\n')

  try {
    // Essayer d'abord avec Railway
    if (commandExists('railway')) {
      console.log('✅ Railway CLI détecté, tentative via Railway...\n')
      try {
        execSync('railway run npx prisma migrate deploy', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        })
        console.log('\n✅ Migration appliquée avec succès via Railway !\n')
        return true
      } catch (error) {
        console.log('\n⚠️  Railway n\'a pas pu appliquer la migration (projet non lié ?)\n')
      }
    }

    // Essayer directement avec Prisma (nécessite DATABASE_URL)
    if (process.env.DATABASE_URL) {
      console.log('✅ DATABASE_URL détectée, application directe...\n')
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env },
      })
      console.log('\n✅ Migration appliquée avec succès !\n')
      return true
    }

    return false
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'application via Prisma:', error.message)
    return false
  }
}

// Méthode 2 : Via SQL direct (si Prisma ne fonctionne pas)
async function applyViaSQL() {
  console.log('📄 Tentative d\'application via SQL direct...\n')

  const sqlContent = fs.readFileSync(migrationSQLPath, 'utf-8')

  try {
    if (commandExists('railway')) {
      console.log('✅ Railway CLI détecté, exécution SQL via Railway...\n')
      // Utiliser Railway pour exécuter psql
      const tempFile = path.join(__dirname, 'migration_temp.sql')
      fs.writeFileSync(tempFile, sqlContent)

      try {
        execSync(`railway run psql $DATABASE_URL -f ${tempFile}`, {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..'),
        })
        fs.unlinkSync(tempFile)
        console.log('\n✅ Migration appliquée avec succès via Railway SQL !\n')
        return true
      } catch (error) {
        fs.unlinkSync(tempFile)
        console.log('\n⚠️  Railway SQL n\'a pas fonctionné\n')
      }
    }

    if (commandExists('psql') && process.env.DATABASE_URL) {
      console.log('✅ psql détecté, exécution directe...\n')
      execSync(`psql "${process.env.DATABASE_URL}" -f "${migrationSQLPath}"`, {
        stdio: 'inherit',
      })
      console.log('\n✅ Migration appliquée avec succès via psql !\n')
      return true
    }

    return false
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'application SQL:', error.message)
    return false
  }
}

// Fonction utilitaire pour vérifier si une commande existe
function commandExists(command) {
  try {
    if (process.platform === 'win32') {
      execSync(`where ${command}`, { stdio: 'ignore' })
    } else {
      execSync(`which ${command}`, { stdio: 'ignore' })
    }
    return true
  } catch {
    return false
  }
}

// Fonction principale
async function main() {
  // Essayer Prisma migrate deploy d'abord
  const prismaSuccess = await applyViaPrismaMigrate()

  if (prismaSuccess) {
    console.log('📊 Modifications effectuées :')
    console.log('  - Enum \'building_profile_role\' créé (PROPRIETAIRE, LOCATAIRE)')
    console.log('  - Colonnes ajoutées : role, parent_profile_id, lot_number, tenant_data')
    console.log('  - Index unique créé pour garantir l\'unicité des cartes propriétaire')
    console.log('  - Relations parent/enfant configurées')
    console.log('\n🎉 Migration terminée !\n')
    process.exit(0)
  }

  // Si Prisma n'a pas fonctionné, essayer SQL direct
  console.log('💡 Tentative avec une méthode alternative...\n')
  const sqlSuccess = await applyViaSQL()

  if (sqlSuccess) {
    console.log('📊 Modifications effectuées :')
    console.log('  - Enum \'building_profile_role\' créé (PROPRIETAIRE, LOCATAIRE)')
    console.log('  - Colonnes ajoutées : role, parent_profile_id, lot_number, tenant_data')
    console.log('  - Index unique créé pour garantir l\'unicité des cartes propriétaire')
    console.log('  - Relations parent/enfant configurées')
    console.log('\n🎉 Migration terminée !\n')
    process.exit(0)
  }

  // Si aucune méthode n'a fonctionné, donner des instructions
  console.log('❌ Aucune méthode automatique n\'a fonctionné.\n')
  console.log('📋 Options manuelles :\n')
  console.log('1. Lier Railway et réessayer :')
  console.log('   railway link')
  console.log('   railway run npx prisma migrate deploy\n')
  console.log('2. Configurer DATABASE_URL localement :')
  console.log('   export DATABASE_URL="postgresql://..."  # Linux/Mac')
  console.log('   $env:DATABASE_URL="postgresql://..."   # Windows PowerShell')
  console.log('   node scripts/apply-building-profile-role-migration.js\n')
  console.log('3. Exécuter le SQL directement :')
  console.log('   railway run psql $DATABASE_URL -f prisma/migrations/20250131_add_building_profile_role/migration.sql\n')
  console.log('4. Consultez le guide complet :')
  console.log('   scripts/apply-migration-building-profile-role.md\n')

  process.exit(1)
}

// Exécuter
main().catch((error) => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})


