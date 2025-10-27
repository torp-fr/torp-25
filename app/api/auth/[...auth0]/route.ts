/**
 * Auth0 Dynamic Route Handler
 * Handles all Auth0 authentication routes:
 * - /api/auth/login
 * - /api/auth/logout
 * - /api/auth/callback
 * - /api/auth/me
 */

import { handleAuth } from '@auth0/nextjs-auth0'

// Export GET and POST handlers for Auth0
const handler = handleAuth()

export const GET = handler
export const POST = handler
