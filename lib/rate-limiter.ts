/**
 * Rate Limiter Middleware
 * Simple in-memory rate limiting for API endpoints
 * For production, consider using Redis-based rate limiting
 */

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from './logger'

const logger = createLogger('Rate Limiter')

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
}

interface RequestRecord {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// For production with multiple instances, use Redis
const requestStore = new Map<string, RequestRecord>()

// Default configurations per subscription tier
export const RATE_LIMITS = {
  FREE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    message: 'Rate limit exceeded for FREE tier. Upgrade to Premium for higher limits.',
  },
  PREMIUM: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    message: 'Rate limit exceeded for PREMIUM tier.',
  },
  PRO: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10000,
    message: 'Rate limit exceeded for PRO tier.',
  },
  ENTERPRISE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100000,
    message: 'Rate limit exceeded for ENTERPRISE tier.',
  },
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
    message: 'Too many requests. Please try again later.',
  },
} as const

/**
 * Get rate limit key from request
 * Uses IP address or user ID
 */
function getRateLimitKey(request: NextRequest, prefix: string = 'global'): string {
  // Try to get user ID from headers (set by auth middleware)
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return `${prefix}:user:${userId}`
  }

  // Fallback to IP address
  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'
  return `${prefix}:ip:${ip}`
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): {
  allowed: boolean
  remaining: number
  resetTime: number
  message?: string
} {
  const key = getRateLimitKey(request)
  const now = Date.now()

  let record = requestStore.get(key)

  // If no record exists or window has expired, create new record
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    requestStore.set(key, record)

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: record.resetTime,
    }
  }

  // Increment request count
  record.count++

  // Check if limit exceeded
  if (record.count > config.maxRequests) {
    logger.warn('Rate limit exceeded', {
      key,
      count: record.count,
      limit: config.maxRequests,
    })

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      message: config.message,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = checkRateLimit(request, config)

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': config?.maxRequests.toString() || RATE_LIMITS.DEFAULT.maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    }

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: result.message || 'Too many requests. Please try again later.',
          resetTime: new Date(result.resetTime).toISOString(),
        },
        {
          status: 429,
          headers,
        }
      )
    }

    // Call the original handler
    const response = await handler(request)

    // Add rate limit headers to successful response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}

/**
 * Clean up expired records (call periodically)
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now()
  let cleaned = 0

  for (const [key, record] of requestStore.entries()) {
    if (now > record.resetTime) {
      requestStore.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned up expired rate limit records', { count: cleaned })
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 5 * 60 * 1000)
}

/**
 * Get rate limit config based on user subscription tier
 */
export function getRateLimitConfig(tier?: string): RateLimitConfig {
  switch (tier?.toUpperCase()) {
    case 'FREE':
      return RATE_LIMITS.FREE
    case 'PREMIUM_CONSUMER':
    case 'PREMIUM':
      return RATE_LIMITS.PREMIUM
    case 'PRO':
      return RATE_LIMITS.PRO
    case 'ENTERPRISE':
      return RATE_LIMITS.ENTERPRISE
    default:
      return RATE_LIMITS.DEFAULT
  }
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export function resetRateLimit(key: string): boolean {
  return requestStore.delete(key)
}

/**
 * Get current rate limit stats (monitoring)
 */
export function getRateLimitStats() {
  return {
    totalKeys: requestStore.size,
    records: Array.from(requestStore.entries()).map(([key, record]) => ({
      key,
      count: record.count,
      resetTime: new Date(record.resetTime).toISOString(),
    })),
  }
}
