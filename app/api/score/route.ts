/**
 * TORP Score API Route
 * Calculate and retrieve TORP scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { torpScoringEngine } from '@/services/scoring/torp-score'

// POST calculate new score
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { devisId, region = 'ILE_DE_FRANCE' } = body

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
    const score = await torpScoringEngine.calculateScore(devis as any, {
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
        breakdown: score.breakdown as any,
        alerts: score.alerts as any,
        recommendations: score.recommendations as any,
        regionalBenchmark: score.regionalBenchmark as any,
        algorithmVersion: score.algorithmVersion,
      },
    })

    return NextResponse.json({
      success: true,
      data: savedScore,
    })
  } catch (error) {
    console.error('Score calculation error:', error)
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
    console.error('Score fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score' },
      { status: 500 }
    )
  }
}
