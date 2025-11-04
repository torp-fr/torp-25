/**
 * Tests unitaires pour DocumentAnalyzer
 * Service critique d'analyse de devis avec Claude AI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DocumentAnalyzer, type TORPAnalysis } from '@/services/llm/document-analyzer'
import fs from 'fs'
import path from 'path'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                extractedData: {
                  company: {
                    name: 'Test Company',
                    siret: '12345678900001',
                    address: '123 Test Street',
                    phone: '0123456789',
                    email: 'test@example.com',
                  },
                  client: {
                    name: 'John Doe',
                    address: '456 Client St',
                    phone: '0987654321',
                  },
                  project: {
                    title: 'Rénovation salle de bain',
                    description: 'Travaux de plomberie',
                    location: 'Paris',
                    surface: 15,
                  },
                  items: [
                    {
                      description: 'Pose carrelage',
                      quantity: 15,
                      unit: 'm²',
                      unitPrice: 50,
                      totalPrice: 750,
                    },
                  ],
                  totals: {
                    subtotal: 750,
                    tva: 150,
                    tvaRate: 20,
                    total: 900,
                  },
                  dates: {
                    devis: '2025-01-01',
                    validityEnd: '2025-02-01',
                    startDate: '2025-02-15',
                    endDate: '2025-03-15',
                  },
                  legalMentions: {
                    hasInsurance: true,
                    hasGuarantees: true,
                    hasPaymentTerms: true,
                  },
                },
                torpscore: {
                  scoreValue: 850,
                  scoreGrade: 'B',
                  confidenceLevel: 85,
                  breakdown: {
                    prix: {
                      score: 220,
                      weight: 0.3,
                      justification: 'Prix compétitifs',
                    },
                    qualite: {
                      score: 240,
                      weight: 0.3,
                      justification: 'Bonne qualité',
                    },
                    delais: {
                      score: 180,
                      weight: 0.2,
                      justification: 'Délais réalistes',
                    },
                    conformite: {
                      score: 210,
                      weight: 0.2,
                      justification: 'Conforme',
                    },
                  },
                  alerts: [
                    {
                      type: 'price',
                      severity: 'medium',
                      message: 'Vérifier prix carrelage',
                    },
                  ],
                  recommendations: [
                    {
                      category: 'documentation',
                      priority: 'high',
                      suggestion: 'Demander attestation décennale',
                      potentialImpact: 'Sécurité juridique',
                    },
                  ],
                },
                rawText: 'Contenu du devis...',
              }),
            },
          ],
        }),
      },
    })),
  }
})

// Mock ModelResolver
vi.mock('@/services/llm/model-resolver', () => ({
  ModelResolver: vi.fn().mockImplementation(() => ({
    resolveModel: vi.fn().mockResolvedValue({
      model: 'claude-3-5-sonnet-20240620',
      maxTokens: 8000,
    }),
  })),
}))

// Mock fs pour lire les fichiers
vi.mock('fs', () => ({
  default: {
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock-file-content')),
    existsSync: vi.fn().mockReturnValue(true),
  },
}))

describe('DocumentAnalyzer', () => {
  let analyzer: DocumentAnalyzer

  beforeEach(() => {
    // Reset mocks avant chaque test
    vi.clearAllMocks()

    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-api-key'

    analyzer = new DocumentAnalyzer()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Constructor', () => {
    it('should throw error if ANTHROPIC_API_KEY is missing', () => {
      delete process.env.ANTHROPIC_API_KEY

      expect(() => new DocumentAnalyzer()).toThrow('ANTHROPIC_API_KEY is required')
    })

    it('should initialize correctly with valid API key', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'

      const instance = new DocumentAnalyzer()

      expect(instance).toBeDefined()
    })
  })

  describe('analyzeDevis', () => {
    it('should analyze PDF file successfully', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result).toBeDefined()
      expect(result.extractedData).toBeDefined()
      expect(result.extractedData.company.name).toBe('Test Company')
      expect(result.extractedData.company.siret).toBe('12345678900001')
      expect(result.torpscore).toBeDefined()
      expect(result.torpscore.scoreValue).toBe(850)
      expect(result.torpscore.scoreGrade).toBe('B')
    })

    it('should analyze JPG image successfully', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.jpg')

      expect(result).toBeDefined()
      expect(result.extractedData).toBeDefined()
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/test.jpg')
    })

    it('should analyze PNG image successfully', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.png')

      expect(result).toBeDefined()
      expect(result.extractedData).toBeDefined()
    })

    it('should throw error for unsupported file format', async () => {
      await expect(analyzer.analyzeDevis('/path/to/test.txt')).rejects.toThrow(
        'Format de fichier non supporté'
      )
    })

    it('should include enrichment data in prompt when provided', async () => {
      const enrichmentData = {
        company: {
          name: 'Enriched Company',
          siret: '99999999999999',
          financialData: {
            revenue: 1000000,
          },
        },
        priceReferences: [
          {
            item: 'carrelage',
            avgPrice: 45,
            region: 'IDF',
          },
        ],
      }

      const result = await analyzer.analyzeDevis('/path/to/test.pdf', enrichmentData)

      expect(result).toBeDefined()
      expect(result.torpscore.scoreValue).toBeGreaterThan(0)
    })

    it('should handle empty items array', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.extractedData.items).toBeDefined()
      expect(Array.isArray(result.extractedData.items)).toBe(true)
    })

    it('should include alerts in the response', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.torpscore.alerts).toBeDefined()
      expect(Array.isArray(result.torpscore.alerts)).toBe(true)
      expect(result.torpscore.alerts.length).toBeGreaterThan(0)
      expect(result.torpscore.alerts[0]).toHaveProperty('type')
      expect(result.torpscore.alerts[0]).toHaveProperty('severity')
      expect(result.torpscore.alerts[0]).toHaveProperty('message')
    })

    it('should include recommendations in the response', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.torpscore.recommendations).toBeDefined()
      expect(Array.isArray(result.torpscore.recommendations)).toBe(true)
      expect(result.torpscore.recommendations.length).toBeGreaterThan(0)
      expect(result.torpscore.recommendations[0]).toHaveProperty('category')
      expect(result.torpscore.recommendations[0]).toHaveProperty('priority')
      expect(result.torpscore.recommendations[0]).toHaveProperty('suggestion')
    })

    it('should return correct score breakdown', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.torpscore.breakdown).toBeDefined()
      expect(result.torpscore.breakdown.prix).toBeDefined()
      expect(result.torpscore.breakdown.qualite).toBeDefined()
      expect(result.torpscore.breakdown.delais).toBeDefined()
      expect(result.torpscore.breakdown.conformite).toBeDefined()

      // Vérifier que chaque breakdown a les bonnes propriétés
      Object.values(result.torpscore.breakdown).forEach((item) => {
        expect(item).toHaveProperty('score')
        expect(item).toHaveProperty('weight')
        expect(item).toHaveProperty('justification')
      })
    })

    it('should have valid score grade (A-E)', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(['A', 'B', 'C', 'D', 'E']).toContain(result.torpscore.scoreGrade)
    })

    it('should have score value between 0 and 1000', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.torpscore.scoreValue).toBeGreaterThanOrEqual(0)
      expect(result.torpscore.scoreValue).toBeLessThanOrEqual(1000)
    })

    it('should have confidence level between 0 and 100', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.torpscore.confidenceLevel).toBeGreaterThanOrEqual(0)
      expect(result.torpscore.confidenceLevel).toBeLessThanOrEqual(100)
    })
  })

  describe('Data Validation', () => {
    it('should extract valid company data', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.extractedData.company).toBeDefined()
      expect(result.extractedData.company.name).toBeTruthy()
      expect(typeof result.extractedData.company.name).toBe('string')
    })

    it('should extract valid totals', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      expect(result.extractedData.totals).toBeDefined()
      expect(result.extractedData.totals.subtotal).toBeGreaterThanOrEqual(0)
      expect(result.extractedData.totals.tva).toBeGreaterThanOrEqual(0)
      expect(result.extractedData.totals.total).toBeGreaterThanOrEqual(0)
    })

    it('should handle optional legal mentions', async () => {
      const result = await analyzer.analyzeDevis('/path/to/test.pdf')

      if (result.extractedData.legalMentions) {
        expect(typeof result.extractedData.legalMentions.hasInsurance).toBe('boolean')
        expect(typeof result.extractedData.legalMentions.hasGuarantees).toBe('boolean')
        expect(typeof result.extractedData.legalMentions.hasPaymentTerms).toBe('boolean')
      }
    })
  })
})
