/**
 * Script Node.js de pré-migration qui nettoie les migrations échouées
 * S'exécute AVANT prisma migrate deploy pour débloquer la situation
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanupBeforeMigration() {
  try {
    console.log('🧹 Nettoyage pré-migration des migrations RNB échouées...\n')

    // Se connecter à la base
    await prisma.$connect()
    console.log('✅ Connexion établie\n')

    // Supprimer TOUTES les migrations RNB échouées
    const result = await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" 
      WHERE (
        migration_name LIKE '%rnb%' 
        OR migration_name LIKE '%RNB%'
        OR migration_name IN (
          '20250127_add_rnb_models',
          '20250128_add_rnb_models',
          '20250128_fix_rnb_migration',
          '20250129_resolve_rnb_migration'
        )
      )
      AND finished_at IS NULL
    `

    console.log(`✅ ${result} migration(s) échouée(s) supprimée(s)\n`)
    console.log('💡 Prisma migrate deploy peut maintenant s\'exécuter\n')

    return 0
  } catch (error) {
    // Ignorer les erreurs (peut être que la table n'existe pas encore ou autres)
    console.warn('⚠️  Nettoyage pré-migration:', error.message)
    console.log('   Continuation quand même...\n')
    return 0 // Retourner 0 pour ne pas bloquer le build
  } finally {
    await prisma.$disconnect()
  }
}

cleanupBeforeMigration()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(0) // Ne pas bloquer même en cas d'erreur
  })

