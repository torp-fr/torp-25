/**
 * Health Check API Route
 * Tests database connectivity and environment setup
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`

    // Check environment variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      AWS_CONFIGURED: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      AUTH0_CONFIGURED: !!(process.env.AUTH0_SECRET && process.env.AUTH0_CLIENT_ID),
    }

    // Count records in database
    const counts = {
      users: await prisma.user.count(),
      documents: await prisma.document.count(),
      devis: await prisma.devis.count(),
      torpScores: await prisma.tORPScore.count(),
    }

    return NextResponse.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'TORP Platform',
      environment: envCheck,
      database: {
        connected: true,
        counts,
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Échec health check')
    return NextResponse.json(
      {
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'TORP Platform',
      },
      { status: 500 }
    )
  }
}
