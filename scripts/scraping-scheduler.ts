#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script de planification du scraping
 * À exécuter toutes les heures via cron job
 */

import { globalScraper } from '../services/scraping/data-scraper'
import { prisma } from '../lib/db'

async function main() {
  log.info('🕐 Scraping Scheduler - Démarrage...\n')

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

    log.info(`📋 ${recentDevis.length} devis récents trouvés\n`)

    // 2. Programmer le scraping pour chaque devis
    for (const devis of recentDevis) {
      await globalScraper.scheduleDevisScraping(devis.id)
    }

    // 3. Traiter la queue
    log.info('\n🚀 Traitement de la queue...\n')
    await globalScraper.processQueue()

    // 4. Afficher les statistiques
    const stats = globalScraper.getQueueStats()
    log.info('\n📊 Statistiques:')
    log.info(`  Total: ${stats.total}`)
    log.info(`  En attente: ${stats.pending}`)
    log.info(`  En cours: ${stats.inProgress}`)
    log.info(`  Complétées: ${stats.completed}`)
    log.info(`  Échouées: ${stats.failed}\n`)

    log.info('✅ Scraping scheduler terminé\n')

  } catch (error) {
    log.error('❌ Erreur:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

