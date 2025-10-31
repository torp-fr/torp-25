/**
 * Auth0 Dynamic Route Handler
 * Handles all Auth0 authentication routes:
 * - /api/auth/login
 * - /api/auth/logout
 * - /api/auth/callback
 * - /api/auth/me
 * 
 * Note: Auth0 is temporarily disabled - this handler remains for future use
 */

import { handleAuth } from '@auth0/nextjs-auth0'

// Force dynamic rendering to ensure environment variables are available
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Simple handler - Auth0 temporarily disabled
const handler = handleAuth()

export const GET = handler
export const POST = handler
