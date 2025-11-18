/**
 * Devis API Routes
 * CRUD operations for devis (quotes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createDevisSchema } from '@/lib/validations/devis'
import {
  parsePaginationParams,
  getPrismaSkipTake,
  buildPaginationResult,
  buildPrismaOrderBy,
} from '@/lib/pagination'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Devis API')

export const dynamic = 'force-dynamic'

// Auth0 temporairement désactivé - utilise un userId demo
const DEMO_USER_ID = 'demo-user-id'

// GET all devis for a user (with pagination)
export async function GET(request: NextRequest) {
  try {
    // Auth0 désactivé - utilisateur demo par défaut
    const userId = DEMO_USER_ID

    // Parse pagination parameters
    const { page, limit, sortBy, sortOrder } = parsePaginationParams(
      request.nextUrl.searchParams
    )

    // Get total count
    const total = await prisma.devis.count({
      where: { userId },
    })

    // Get paginated data
    const devisList = await prisma.devis.findMany({
      where: { userId },
      include: {
        document: true,
        torpScores: true,
      },
      orderBy: buildPrismaOrderBy(sortBy, sortOrder),
      ...getPrismaSkipTake(page, limit),
    })

    // Build paginated response
    const result = buildPaginationResult(devisList, total, page, limit)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('Devis fetch error', error)
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    )
  }
}

// POST create new devis
export async function POST(request: NextRequest) {
  try {
    // Auth0 désactivé - utilisateur demo par défaut
    const userId = DEMO_USER_ID

    const body = await request.json()
    const parsed = createDevisSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      )
    }
    const { documentId, extractedData, projectType, tradeType } = parsed.data

    // Validate required fields
    if (!documentId || !extractedData) {
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
    logger.error('Devis creation error', error)
    return NextResponse.json(
      { error: 'Failed to create devis' },
      { status: 500 }
    )
  }
}
