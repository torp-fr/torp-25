/**
 * Test Setup File
 * Configure mocks et environment pour les tests
 */

import { vi } from 'vitest'

// Mock Prisma Client
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    devis: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tORPScore: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    document: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock Environment Variables
process.env.ANTHROPIC_API_KEY = 'test-api-key-123'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.AWS_ACCESS_KEY_ID = 'test-aws-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret'
process.env.AWS_REGION = 'eu-west-3'
process.env.AWS_S3_BUCKET = 'test-bucket'

// Mock console methods pour éviter pollution des logs de test
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
