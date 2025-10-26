/**
 * Health Check API Route
 * Returns the health status of the application
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'TORP Platform',
  })
}
