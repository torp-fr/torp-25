/**
 * API Route pour traiter la queue de scraping
 * À appeler périodiquement (cron job)
 */

import { NextRequest, NextResponse } from 'next/server'
import { globalScraper } from '@/services/scraping/data-scraper'
import { loggers } from '@/lib/logger'

nconst log = loggers.api
export async function POST(_request: NextRequest) {
  try {
    log.info('[API Scraping] 🚀 Démarrage traitement queue...')
    
    await globalScraper.processQueue()
    
    const stats = globalScraper.getQueueStats()
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Queue traitée avec succès',
    })
  } catch (error) {
    log.error('[API Scraping] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors du traitement de la queue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const stats = globalScraper.getQueueStats()
  
  return NextResponse.json({
    success: true,
    stats,
  })
}

