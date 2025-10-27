/**
 * Auth0 Dynamic Route Handler
 * Handles all Auth0 authentication routes:
 * - /api/auth/login
 * - /api/auth/logout
 * - /api/auth/callback
 * - /api/auth/me
 */

import { handleAuth, handleLogin } from '@auth0/nextjs-auth0'
import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering to ensure environment variables are available
export const dynamic = 'force-dynamic'

// Check if Auth0 is properly configured
function checkAuth0Config() {
  const requiredVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
  ]

  const missing = requiredVars.filter(varName => !process.env[varName])

  if (missing.length > 0) {
    return {
      configured: false,
      missing,
    }
  }

  return { configured: true }
}

// Wrap handleAuth with error handling
async function safeHandleAuth(req: NextRequest) {
  const config = checkAuth0Config()

  if (!config.configured) {
    console.error('[Auth0] Missing configuration:', config.missing)
    return NextResponse.json(
      {
        error: 'Auth0 not configured',
        message: 'Please configure Auth0 environment variables on Vercel',
        missing: config.missing,
        help: 'Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
      },
      { status: 500 }
    )
  }

  try {
    // Configure Auth0 handlers with explicit options for Next.js 15
    const handler = handleAuth({
      login: handleLogin({
        returnTo: '/dashboard',
      }),
    })

    return handler(req)
  } catch (error) {
    console.error('[Auth0] Handler error:', error)
    return NextResponse.json(
      {
        error: 'Auth0 handler failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export const GET = safeHandleAuth
export const POST = safeHandleAuth
