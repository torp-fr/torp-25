/**
 * TORP Score API Route
 * Calculate and retrieve TORP scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { torpScoringEngine } from '@/services/scoring/torp-score'
import { z } from 'zod'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limiter'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Score API')

export const dynamic = 'force-dynamic'

// POST calculate new score
export async function POST(request: NextRequest) {
  // Rate limiting check
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.DEFAULT)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: rateLimitResult.message,
        resetTime: new Date(rateLimitResult.resetTime).toISOString(),
      },
      { status: 429 }
    )
  }

  try {
    // Auth0 désactivé - accès libre
    const body = await request.json()
    const scoreRequestSchema = z.object({
      devisId: z.string().min(1),
      region: z.string().default('ILE_DE_FRANCE').optional(),
    })
    const parsed = scoreRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      )
    }
    const { devisId, region = 'ILE_DE_FRANCE' } = parsed.data

    if (!devisId) {
      return NextResponse.json(
        { error: 'Devis ID is required' },
        { status: 400 }
      )
    }

    // Fetch devis
    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis not found' },
        { status: 404 }
      )
    }

    // Calculate score
    // Note: Prisma type needs to be compatible with Devis type from scoring engine
    // TODO: Define proper shared type interface between Prisma schema and scoring types
    const score = await torpScoringEngine.calculateScore(devis, {
      region,
      projectType: devis.projectType || 'renovation',
    })

    // Save score to database
    const savedScore = await prisma.tORPScore.create({
      data: {
        devisId: devis.id,
        userId: devis.userId,
        scoreValue: score.scoreValue,
        scoreGrade: score.scoreGrade,
        confidenceLevel: score.confidenceLevel,
        breakdown: JSON.parse(JSON.stringify(score.breakdown)),
        alerts: JSON.parse(JSON.stringify(score.alerts)),
        recommendations: JSON.parse(JSON.stringify(score.recommendations)),
        regionalBenchmark: score.regionalBenchmark ? JSON.parse(JSON.stringify(score.regionalBenchmark)) : null,
        algorithmVersion: score.algorithmVersion,
      },
    })

    return NextResponse.json({
      success: true,
      data: savedScore,
    })
  } catch (error) {
    logger.error('Score calculation error', error)
    return NextResponse.json(
      { error: 'Failed to calculate score' },
      { status: 500 }
    )
  }
}

// GET retrieve score by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scoreId = searchParams.get('scoreId')
    const devisId = searchParams.get('devisId')

    if (!scoreId && !devisId) {
      return NextResponse.json(
        { error: 'Score ID or Devis ID is required' },
        { status: 400 }
      )
    }

    let score

    if (scoreId) {
      score = await prisma.tORPScore.findUnique({
        where: { id: scoreId },
        include: {
          devis: true,
        },
      })
    } else if (devisId) {
      score = await prisma.tORPScore.findFirst({
        where: { devisId },
        include: {
          devis: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    if (!score) {
      return NextResponse.json(
        { error: 'Score not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: score,
    })
  } catch (error) {
    logger.error('Score fetch error', error)
    return NextResponse.json(
      { error: 'Failed to fetch score' },
      { status: 500 }
    )
  }
}
