/**
 * API Route pour traiter la queue de scraping
 * À appeler périodiquement (cron job)
 */

import { NextRequest, NextResponse } from 'next/server'
import { globalScraper } from '@/services/scraping/data-scraper'

export async function POST(request: NextRequest) {
  try {
    console.log('[API Scraping] 🚀 Démarrage traitement queue...')
    
    await globalScraper.processQueue()
    
    const stats = globalScraper.getQueueStats()
    
    return NextResponse.json({
      success: true,
      stats,
      message: 'Queue traitée avec succès',
    })
  } catch (error) {
    console.error('[API Scraping] ❌ Erreur:', error)
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

