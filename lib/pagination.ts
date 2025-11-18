/**
 * Pagination Utility
 * Provides consistent pagination across API endpoints
 */

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

/**
 * Parse pagination parameters from URL search params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): Required<PaginationParams> {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE)))
  const rawLimit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT))
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit))
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

  return { page, limit, sortBy, sortOrder }
}

/**
 * Calculate Prisma skip and take values
 */
export function getPrismaSkipTake(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  }
}

/**
 * Build pagination result
 */
export function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  }
}

/**
 * Build Prisma orderBy from sort parameters
 */
export function buildPrismaOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Record<string, 'asc' | 'desc'> {
  // Sanitize sortBy to prevent injection
  const allowedFields = ['createdAt', 'updatedAt', 'name', 'id', 'date']
  const sanitizedSortBy = allowedFields.includes(sortBy) ? sortBy : 'createdAt'

  return { [sanitizedSortBy]: sortOrder }
}
