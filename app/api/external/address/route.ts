/**
 * POST /api/external/address
 * Recherche d'adresse via API Adresse (data.gouv.fr)
 */

import { NextRequest, NextResponse } from 'next/server'
import { AddressService } from '@/services/external-apis/address-service'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const addressSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(10).optional().default(5),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = addressSearchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { query, limit } = parsed.data

    const addressService = new AddressService()
    const results = await addressService.searchAddress(query)

    return NextResponse.json({
      success: true,
      data: results.slice(0, limit),
      count: results.length,
    })
  } catch (error) {
    log.error('[API Address] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to search address',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

