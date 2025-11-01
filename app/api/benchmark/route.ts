/**
 * API Route pour exécuter des benchmarks
 */

import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkEngine } from '@/services/benchmark/benchmark-engine'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sampleSize = parseInt(searchParams.get('sampleSize') || '100', 10)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateRange = startDate && endDate
      ? {
          start: new Date(startDate),
          end: new Date(endDate),
        }
      : undefined

    console.log('[API Benchmark] 🚀 Démarrage benchmark:', {
      sampleSize,
      dateRange: dateRange ? `${dateRange.start.toISOString()} - ${dateRange.end.toISOString()}` : 'Tous',
    })

    const engine = new BenchmarkEngine()
    const result = await engine.runBenchmark(sampleSize, dateRange)

    console.log('[API Benchmark] ✅ Benchmark terminé:', {
      sampleSize: result.sampleSize,
      metrics: Object.keys(result.metrics),
      recommendations: result.recommendations.length,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[API Benchmark] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'exécution du benchmark',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

