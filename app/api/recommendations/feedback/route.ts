/**
 * POST /api/recommendations/feedback
 * Enregistre le feedback d'un utilisateur sur une recommandation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

const feedbackSchema = z.object({
  devisId: z.string(),
  userId: z.string().optional(),
  recommendationId: z.string(),
  rating: z.number().min(1).max(5).optional(),
  useful: z.boolean().optional(),
  actionTaken: z.boolean().optional(),
  feedbackText: z.string().optional(),
  documentsAdded: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = feedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { devisId, userId = DEMO_USER_ID, recommendationId, ...feedbackData } = parsed.data

    const feedback = await prisma.recommendationFeedback.upsert({
      where: {
        devisId_recommendationId: {
          devisId,
          recommendationId,
        },
      },
      update: {
        ...feedbackData,
      },
      create: {
        devisId,
        userId,
        recommendationId,
        ...feedbackData,
      },
    })

    return NextResponse.json({
      success: true,
      data: feedback,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    return NextResponse.json(
      {
        error: 'Failed to save feedback',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

