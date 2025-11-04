/**
 * API Route pour exécuter des benchmarks
 */

import { NextRequest, NextResponse } from 'next/server'
import { BenchmarkEngine } from '@/services/benchmark/benchmark-engine'
import { loggers } from '@/lib/logger'

const log = loggers.api

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

    log.info({
      sampleSize,
      dateRange: dateRange ? `${dateRange.start.toISOString()} - ${dateRange.end.toISOString()}` : 'Tous',
    }, 'Démarrage benchmark')

    const engine = new BenchmarkEngine()
    const result = await engine.runBenchmark(sampleSize, dateRange)

    log.info({
      sampleSize: result.sampleSize,
      metrics: Object.keys(result.metrics),
      recommendations: result.recommendations.length,
    }, 'Benchmark terminé')

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur benchmark')
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'exécution du benchmark',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

