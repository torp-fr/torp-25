#!/usr/bin/env node
/**
 * Script de test de connexion à la base de données Railway
 * Usage: export DATABASE_URL='...' && node scripts/test-connection.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔌 Test de connexion à la base de données Railway...')
  console.log('')

  try {
    // Test de connexion
    await prisma.$connect()
    console.log('✅ Connexion établie avec succès !')
    console.log('')

    // Compter les enregistrements dans chaque table
    const stats = {
      users: await prisma.user.count(),
      documents: await prisma.document.count(),
      devis: await prisma.devis.count(),
      torpScores: await prisma.tORPScore.count(),
      subscriptions: await prisma.subscription.count(),
    }

    console.log('📊 Statistiques de la base de données :')
    console.log(`   - Utilisateurs : ${stats.users}`)
    console.log(`   - Documents : ${stats.documents}`)
    console.log(`   - Devis : ${stats.devis}`)
    console.log(`   - Scores TORP : ${stats.torpScores}`)
    console.log(`   - Abonnements : ${stats.subscriptions}`)
    console.log('')

    // Tester une requête simple
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `
    console.log(`✅ Nombre de tables créées : ${tableCount[0].count}`)
    console.log('')

    console.log('🎉 Base de données prête et fonctionnelle !')

  } catch (error) {
    console.error('❌ Erreur de connexion :', error.message)
    console.log('')
    console.log('Vérifiez que :')
    console.log('  1. DATABASE_URL est correctement défini')
    console.log('  2. La base de données Railway est active')
    console.log('  3. Les migrations ont été appliquées')
    console.log('')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
