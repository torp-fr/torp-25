#!/usr/bin/env tsx
/**
 * Script de planification du scraping
 * À exécuter toutes les heures via cron job
 */

import { globalScraper } from '../services/scraping/data-scraper'
import { prisma } from '../lib/db'

async function main() {
  console.log('🕐 Scraping Scheduler - Démarrage...\n')

  try {
    // 1. Récupérer les nouveaux devis sans scraping
    const recentDevis = await prisma.devis.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 24), // Dernières 24h
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    })

    console.log(`📋 ${recentDevis.length} devis récents trouvés\n`)

    // 2. Programmer le scraping pour chaque devis
    for (const devis of recentDevis) {
      await globalScraper.scheduleDevisScraping(devis.id)
    }

    // 3. Traiter la queue
    console.log('\n🚀 Traitement de la queue...\n')
    await globalScraper.processQueue()

    // 4. Afficher les statistiques
    const stats = globalScraper.getQueueStats()
    console.log('\n📊 Statistiques:')
    console.log(`  Total: ${stats.total}`)
    console.log(`  En attente: ${stats.pending}`)
    console.log(`  En cours: ${stats.inProgress}`)
    console.log(`  Complétées: ${stats.completed}`)
    console.log(`  Échouées: ${stats.failed}\n`)

    console.log('✅ Scraping scheduler terminé\n')

  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

