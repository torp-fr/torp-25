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
export const runtime = 'nodejs'

// Ensure baseURL always matches the current request origin to avoid redirect_uri mismatches
const handler = handleAuth({
  async login(request) {
    const origin = new URL(request.url).origin
    return handleLogin(request, {
      returnTo: '/dashboard',
      // @ts-ignore - baseURL is supported in v3 runtime
      baseURL: origin,
    })
  },
})

export const GET = handler
export const POST = handler
