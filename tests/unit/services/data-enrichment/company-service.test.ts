/**
 * Tests simplifiés pour CompanyEnrichmentService
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { CompanyEnrichmentService } from '@/services/data-enrichment/company-service'

describe('CompanyEnrichmentService - Tests simplifiés', () => {
  let service: CompanyEnrichmentService

  beforeAll(() => {
    service = new CompanyEnrichmentService()
  })

  describe('Constructor', () => {
    it('should initialize correctly', () => {
      const instance = new CompanyEnrichmentService()
      expect(instance).toBeDefined()
      expect(instance).toBeInstanceOf(CompanyEnrichmentService)
    })
  })

  describe('SIRET Validation Logic', () => {
    it('should handle invalid SIRET format (too short)', async () => {
      const result = await service.enrichFromSiret('123')
      expect(result).toBeNull()
    })

    it('should handle invalid SIRET format (too long)', async () => {
      const result = await service.enrichFromSiret('123456789012345')
      expect(result).toBeNull()
    })

    it('should handle empty SIRET', async () => {
      const result = await service.enrichFromSiret('')
      expect(result).toBeNull()
    })

    it('should handle SIRET with only spaces', async () => {
      const result = await service.enrichFromSiret('   ')
      expect(result).toBeNull()
    })

    it('should handle non-numeric SIRET', async () => {
      const result = await service.enrichFromSiret('1234567890000A')
      expect(result).toBeNull()
    })
  })
})
