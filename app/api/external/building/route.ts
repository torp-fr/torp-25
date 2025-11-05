/**
 * POST /api/external/building
 * Agrége les données du bâti (ONTB, PLU, DPE, Urbanisme) depuis une adresse
 */

import { NextRequest, NextResponse } from 'next/server'
import { BuildingService } from '@/services/external-apis/building-service'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const buildingDataSchema = z.object({
  address: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = buildingDataSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { address } = parsed.data

    const buildingService = new BuildingService()
    const data = await buildingService.getAggregatedData(address)

    if (!data) {
      return NextResponse.json(
        {
          error: 'Address not found or no data available',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    log.error('[API Building] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch building data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

