/**
 * Auth0 Dynamic Route Handler
 * Handles all Auth0 authentication routes:
 * - /api/auth/login
 * - /api/auth/logout
 * - /api/auth/callback
 * - /api/auth/me
 */

import { handleAuth, handleLogin } from '@auth0/nextjs-auth0'

// Force dynamic rendering to ensure environment variables are available
export const dynamic = 'force-dynamic'

// Check if Auth0 is properly configured
const requiredVars = [
  'AUTH0_SECRET',
  'AUTH0_BASE_URL',
  'AUTH0_ISSUER_BASE_URL',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
]

const missingVars = requiredVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('[Auth0] Missing configuration:', missingVars)
  console.error('[Auth0] Please configure these environment variables on Vercel')
}

// Configure Auth0 handlers
// handleAuth returns the actual route handlers, not a wrapper
const handlers = handleAuth({
  login: handleLogin({
    returnTo: '/dashboard',
  }),
})

export const GET = handlers
export const POST = handlers
