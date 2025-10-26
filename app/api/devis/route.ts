/**
 * Devis API Routes
 * CRUD operations for devis (quotes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET all devis for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const devisList = await prisma.devis.findMany({
      where: { userId },
      include: {
        document: true,
        torpScores: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: devisList,
    })
  } catch (error) {
    console.error('Devis fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    )
  }
}

// POST create new devis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, userId, extractedData, projectType, tradeType } = body

    // Validate required fields
    if (!documentId || !userId || !extractedData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate total amount from extracted data
    const totalAmount = extractedData.totals?.total || 0

    const devis = await prisma.devis.create({
      data: {
        documentId,
        userId,
        extractedData,
        projectType,
        tradeType,
        totalAmount,
        validationStatus: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      data: devis,
    })
  } catch (error) {
    console.error('Devis creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create devis' },
      { status: 500 }
    )
  }
}
