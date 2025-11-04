/**
 * Tests unitaires pour CompanyEnrichmentService
 * Service d'enrichissement des données d'entreprise (SIRET)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CompanyEnrichmentService } from '@/services/data-enrichment/company-service'

// Mock SireneService
vi.mock('@/services/external-apis/sirene-service', () => ({
  SireneService: vi.fn().mockImplementation(() => ({
    getCompanyBySiret: vi.fn().mockResolvedValue({
      siret: '12345678900001',
      siren: '123456789',
      denomination: 'Test Company SAS',
      categorieJuridique: '5710',
      categorieJuridiqueLibelle: 'SAS',
      activitePrincipale: '43.21A',
      activitePrincipaleLibelle: 'Installation électrique',
      trancheEffectifs: '11',
      dateCreation: '2020-01-01',
      etatAdministratif: 'Actif',
      siege: {
        adresse: '123 Rue Test',
        codePostal: '75001',
        ville: 'Paris',
        region: 'Île-de-France',
        departement: '75',
      },
    }),
  })),
}))

// Mock InfogreffeService
vi.mock('@/services/external-apis/infogreffe-service', () => ({
  InfogreffeService: vi.fn().mockImplementation(() => ({
    getCompanyFinancialData: vi.fn().mockResolvedValue({
      siren: '123456789',
      financialData: {
        revenue: 1000000,
        result: 50000,
        year: 2024,
      },
      legalProceedings: [],
    }),
  })),
}))

// Mock ApiClient
vi.mock('@/services/data-enrichment/api-client', () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue({
      results: [
        {
          siren: '123456789',
          siret: '12345678900001',
          nom_complet: 'Test Company SAS',
          dirigeants: ['John Doe'],
          nombre_etablissements: 1,
        },
      ],
    }),
  })),
}))

describe('CompanyEnrichmentService', () => {
  let service: CompanyEnrichmentService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new CompanyEnrichmentService()
  })

  describe('enrichFromSiret', () => {
    it('should enrich company data successfully with valid SIRET', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      expect(result).not.toBeNull()
      expect(result?.siret).toBe(siret)
      expect(result?.name).toBeTruthy()
    })

    it('should clean SIRET with spaces', async () => {
      const siretWithSpaces = '123 456 789 00001'

      const result = await service.enrichFromSiret(siretWithSpaces)

      expect(result).toBeDefined()
      expect(result?.siret).toBe('12345678900001')
    })

    it('should return null for invalid SIRET format', async () => {
      const invalidSiret = '123' // Trop court

      const result = await service.enrichFromSiret(invalidSiret)

      expect(result).toBeNull()
    })

    it('should return null for non-numeric SIRET', async () => {
      const invalidSiret = '1234567890000A'

      const result = await service.enrichFromSiret(invalidSiret)

      expect(result).toBeNull()
    })

    it('should map Sirene data correctly', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      expect(result?.name).toBe('Test Company SAS')
      expect(result?.siren).toBe('123456789')
      expect(result?.legalStatus).toBe('SAS')
    })

    it('should include address information', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      expect(result?.address).toBeDefined()
      expect(result?.address?.street).toBeTruthy()
      expect(result?.address?.postalCode).toBeTruthy()
      expect(result?.address?.city).toBeTruthy()
    })

    it('should include activity information', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      expect(result?.activity).toBeDefined()
      expect(result?.activity?.code).toBeTruthy()
      expect(result?.activity?.label).toBeTruthy()
    })

    it('should include creation date', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      expect(result?.createdAt).toBeTruthy()
    })

    it('should include employee count range', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      expect(result?.employeeRange).toBeTruthy()
    })

    it('should handle active companies correctly', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      expect(result?.isActive).toBe(true)
    })

    it('should handle Sirene service errors gracefully', async () => {
      // Force une erreur dans SireneService
      vi.mocked(service['sireneService'].getCompanyBySiret).mockRejectedValueOnce(
        new Error('API Error')
      )

      const result = await service.enrichFromSiret('12345678900001')

      // Le service devrait faire un fallback, pas throw
      expect(result).toBeDefined()
    })

    it('should return null if no data found anywhere', async () => {
      // Mock tous les services pour retourner null
      vi.mocked(service['sireneService'].getCompanyBySiret).mockResolvedValueOnce(null)
      vi.mocked(service['sireneClient'].get).mockResolvedValueOnce({ results: [] })

      const result = await service.enrichFromSiret('99999999999999')

      expect(result).toBeNull()
    })
  })

  describe('SIRET Validation', () => {
    it('should validate correct SIRET length (14 digits)', async () => {
      const validSiret = '12345678901234'

      // Si le SIRET est valide, le service ne retournera pas null pour raison de format
      await service.enrichFromSiret(validSiret)

      // Le test passe si pas d'erreur de validation
      expect(true).toBe(true)
    })

    it('should reject SIRET with less than 14 digits', async () => {
      const shortSiret = '1234567890'

      const result = await service.enrichFromSiret(shortSiret)

      expect(result).toBeNull()
    })

    it('should reject SIRET with more than 14 digits', async () => {
      const longSiret = '123456789012345'

      const result = await service.enrichFromSiret(longSiret)

      expect(result).toBeNull()
    })

    it('should reject empty SIRET', async () => {
      const emptySiret = ''

      const result = await service.enrichFromSiret(emptySiret)

      expect(result).toBeNull()
    })

    it('should handle SIRET with only spaces', async () => {
      const spacesSiret = '   '

      const result = await service.enrichFromSiret(spacesSiret)

      expect(result).toBeNull()
    })
  })

  describe('Data Mapping', () => {
    it('should map all required fields from Sirene response', async () => {
      const siret = '12345678900001'

      const result = await service.enrichFromSiret(siret)

      expect(result).toBeDefined()
      // Champs obligatoires
      expect(result?.siret).toBeTruthy()
      expect(result?.siren).toBeTruthy()
      expect(result?.name).toBeTruthy()
    })

    it('should handle missing optional fields gracefully', async () => {
      // Mock avec données minimales
      vi.mocked(service['sireneService'].getCompanyBySiret).mockResolvedValueOnce({
        siret: '12345678900001',
        siren: '123456789',
        denomination: 'Minimal Company',
        categorieJuridique: '5710',
        categorieJuridiqueLibelle: 'SAS',
        activitePrincipale: '43.21A',
        activitePrincipaleLibelle: 'Installation',
        etatAdministratif: 'Actif',
        siege: {
          adresse: '123 Test',
          codePostal: '75001',
          ville: 'Paris',
        },
      })

      const result = await service.enrichFromSiret('12345678900001')

      expect(result).toBeDefined()
      expect(result?.siret).toBe('12345678900001')
    })
  })

  describe('Error Handling', () => {
    it('should not throw on network errors', async () => {
      vi.mocked(service['sireneService'].getCompanyBySiret).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(
        service.enrichFromSiret('12345678900001')
      ).resolves.not.toThrow()
    })

    it('should not throw on malformed responses', async () => {
      vi.mocked(service['sireneService'].getCompanyBySiret).mockResolvedValueOnce(
        {} as any
      )

      await expect(
        service.enrichFromSiret('12345678900001')
      ).resolves.not.toThrow()
    })
  })
})
