/**
 * POST /api/external/feasibility
 * Génère une étude de faisabilité automatique depuis les données du projet
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { FeasibilityService } from '@/services/external-apis/feasibility-service'
import { BuildingService } from '@/services/external-apis/building-service'
import { loggers } from '@/lib/logger'

nconst log = loggers.api
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const feasibilityRequestSchema = z.object({
  address: z.string().min(1),
  projectType: z.enum(['construction', 'renovation', 'extension', 'maintenance']),
  constraints: z.array(z.string()).optional().default([]),
  accessConditions: z.array(z.string()).optional().default([]),
  rooms: z.array(z.string()).optional().default([]),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = feasibilityRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { address, projectType, constraints, accessConditions, rooms } = parsed.data

    // 1. Récupérer toutes les données nécessaires
    const buildingService = new BuildingService()
    const buildingData = await buildingService.getAggregatedData(address)

    if (!buildingData) {
      return NextResponse.json(
        {
          error: 'Address not found or no data available',
        },
        { status: 404 }
      )
    }

    // 2. Générer l'étude de faisabilité (avec données Géorisques)
    const feasibilityService = new FeasibilityService()
    const study = await feasibilityService.generateFeasibilityStudy(
      address,
      projectType,
      buildingData,
      buildingData.cadastre || null,
      buildingData.plu || null,
      constraints,
      accessConditions,
      rooms,
      buildingData.georisques || null
    )

    return NextResponse.json({
      success: true,
      data: study,
    })
  } catch (error) {
    log.error('[API Feasibility] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate feasibility study',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

