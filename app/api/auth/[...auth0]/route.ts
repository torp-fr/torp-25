/**
 * Auth0 Dynamic Route Handler
 * Handles all Auth0 authentication routes:
 * - /api/auth/login
 * - /api/auth/logout
 * - /api/auth/callback
 * - /api/auth/me
 */

import { handleAuth } from '@auth0/nextjs-auth0'

// Force dynamic rendering to ensure environment variables are available
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// handleAuth() returns a single handler that handles all auth routes
// For Next.js App Router, we need to export it for both GET and POST
export const GET = handleAuth()
export const POST = handleAuth()
