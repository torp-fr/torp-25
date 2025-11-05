/**
 * POST /api/ccf
 * Crée ou met à jour un CCF (Cahier des Charges Fonctionnel)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

const ccfSchema = z.object({
  projectType: z.enum(['construction', 'renovation', 'extension', 'maintenance']),
  projectTitle: z.string().optional(),
  projectDescription: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  buildingData: z.any().optional(),
  urbanismData: z.any().optional(),
  energyData: z.any().optional(),
  constraints: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  budgetRange: z.object({
    min: z.number(),
    max: z.number(),
    preferred: z.number().optional(),
  }).optional(),
  devisId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = ccfSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const data = parsed.data
    const userId = DEMO_USER_ID // TODO: Récupérer depuis Auth0

    // Créer ou mettre à jour le CCF
    const ccf = await prisma.projectCCF.upsert({
      where: {
        devisId: data.devisId || '',
      },
      update: {
        ...data,
        status: data.devisId ? 'linked' : 'completed',
      },
      create: {
        userId,
        ...data,
        status: data.devisId ? 'linked' : 'completed',
      },
    })

    return NextResponse.json({
      success: true,
      data: ccf,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    return NextResponse.json(
      {
        error: 'Failed to save CCF',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

