/**
 * API Route pour créer un test A/B
 */

import { NextRequest, NextResponse } from 'next/server'
import { ABTestEngine } from '@/services/ab-testing/ab-test-engine'
import { loggers } from '@/lib/logger'

const log = loggers.api
const abEngine = new ABTestEngine()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const testConfig = {
      testId: body.testId || `test_${Date.now()}`,
      name: body.name || 'Test A/B ML',
      variants: {
        control: {
          id: 'control',
          name: 'Contrôle (sans ML)',
          useML: false,
          mlWeight: 0,
          version: '2.0.0',
        },
        variant: {
          id: 'variant',
          name: 'Variante (avec ML)',
          useML: true,
          mlWeight: 0.3,
          version: '2.1.0',
        },
        ...body.variants,
      },
      trafficSplit: body.trafficSplit || 0.5,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      metrics: body.metrics || ['scoreAccuracy', 'confidence'],
    }

    abEngine.createTest(testConfig)

    return NextResponse.json({
      success: true,
      data: {
        testId: testConfig.testId,
        message: 'Test A/B créé avec succès',
      },
    })
  } catch (error) {
    log.error({ err: error }, '❌ Erreur')
    return NextResponse.json(
      {
        error: 'Erreur lors de la création du test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

