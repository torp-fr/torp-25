/**
 * API Route pour rechercher des bâtiments RNB dans l'index local
 * POST /api/rnb/search
 *
 * Body: {
 *   postalCode?: string
 *   address?: string
 *   coordinates?: { lat: number; lng: number }
 *   department?: string
 *   codeINSEE?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { RNBIndexer } from '@/services/external-apis/rnb-indexer'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

const searchSchema = z.object({
  postalCode: z.string().optional(),
  address: z.string().optional(),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  department: z.string().optional(),
  codeINSEE: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = searchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const indexer = new RNBIndexer()

    // Si recherche simple (un seul critère), utiliser searchBuilding
    if (parsed.data.postalCode || parsed.data.address || parsed.data.coordinates) {
      const building = await indexer.searchBuilding(
        parsed.data.postalCode,
        parsed.data.address,
        parsed.data.coordinates
      )

      return NextResponse.json({
        success: true,
        data: building,
      })
    }

    // Sinon, recherche multiple avec searchBuildings
    const buildings = await indexer.searchBuildings(parsed.data)

    return NextResponse.json({
      success: true,
      data: buildings,
      count: buildings.length,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur recherche RNB')
    return NextResponse.json(
      {
        error: 'Failed to search RNB data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

