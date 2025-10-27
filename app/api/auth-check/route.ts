/**
 * Auth0 Diagnostic Route
 * Vérifie si les variables d'environnement Auth0 sont configurées
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const requiredVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
  ]

  const status: Record<string, boolean> = {}

  requiredVars.forEach(varName => {
    status[varName] = !!process.env[varName]
  })

  const allConfigured = Object.values(status).every(v => v === true)

  return NextResponse.json({
    configured: allConfigured,
    variables: status,
    message: allConfigured
      ? 'Toutes les variables Auth0 sont configurées ✓'
      : 'Certaines variables Auth0 manquent ✗',
    auth0BaseUrl: process.env.AUTH0_BASE_URL || 'NOT SET',
    issuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL || 'NOT SET',
  }, { status: allConfigured ? 200 : 500 })
}
