/**
 * Auth0 Dynamic Route Handler
 * Handles all Auth0 authentication routes:
 * - /api/auth/login
 * - /api/auth/logout
 * - /api/auth/callback
 * - /api/auth/me
 */

import { handleAuth, handleLogin } from '@auth0/nextjs-auth0'

// Configure Auth0 handlers with explicit options for Next.js 15
export const GET = handleAuth({
  login: handleLogin({
    returnTo: '/dashboard',
  }),
})

export const POST = GET
