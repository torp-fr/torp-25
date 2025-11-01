/**
 * API Route pour collecter les données d'entraînement
 */

import { NextRequest, NextResponse } from 'next/server'
import { TrainingDataCollector } from '@/services/training/data-collector'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const limit = body.limit || 100
    const startDate = body.startDate ? new Date(body.startDate) : undefined
    const endDate = body.endDate ? new Date(body.endDate) : undefined
    
    console.log('[API Training] 🔍 Collecte données d\'entraînement...')

    const collector = new TrainingDataCollector()
    const examples = await collector.collectFromDevis(limit, 
      startDate && endDate ? { start: startDate, end: endDate } : undefined
    )

    // Nettoyer les exemples invalides
    const cleanExamples = collector.cleanDataset(examples)

    // Créer le dataset
    const dataset = await collector.createTrainingDataset(cleanExamples)

    return NextResponse.json({
      success: true,
      data: {
        dataset,
        statistics: {
          totalCollected: examples.length,
          validExamples: cleanExamples.length,
          invalidExamples: examples.length - cleanExamples.length,
        },
      },
    })
  } catch (error) {
    console.error('[API Training] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la collecte',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

