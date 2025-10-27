/**
 * Auth0 Debug Route
 * Teste la configuration Auth0 et affiche les informations de debug
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const debug: Record<string, any> = {}

  // Vérifier les variables d'environnement
  debug.env = {
    AUTH0_SECRET: process.env.AUTH0_SECRET ? `Set (${process.env.AUTH0_SECRET.substring(0, 10)}...)` : 'NOT SET',
    AUTH0_BASE_URL: process.env.AUTH0_BASE_URL || 'NOT SET',
    AUTH0_ISSUER_BASE_URL: process.env.AUTH0_ISSUER_BASE_URL || 'NOT SET',
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID || 'NOT SET',
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET ? `Set (${process.env.AUTH0_CLIENT_SECRET.substring(0, 10)}...)` : 'NOT SET',
  }

  // Tester l'import du SDK
  try {
    const { getSession } = await import('@auth0/nextjs-auth0')
    debug.sdkImport = 'SUCCESS'

    // Essayer d'obtenir la session
    try {
      const session = await getSession()
      debug.session = session ? 'User logged in' : 'No session'
    } catch (sessionError: any) {
      debug.sessionError = sessionError.message || 'Unknown error'
    }
  } catch (importError: any) {
    debug.sdkImportError = importError.message || 'Failed to import SDK'
  }

  // Tester handleAuth
  try {
    const { handleAuth } = await import('@auth0/nextjs-auth0')
    debug.handleAuthImport = 'SUCCESS'
    debug.handleAuthType = typeof handleAuth
  } catch (handleAuthError: any) {
    debug.handleAuthError = handleAuthError.message || 'Failed to import handleAuth'
  }

  return NextResponse.json(debug, { status: 200 })
}
