/**
 * Tests d'intégration pour l'API /llm/analyze
 * Workflow complet d'analyse de devis avec Claude AI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/llm/analyze/route'
import { NextRequest } from 'next/server'

// Mock DocumentAnalyzer
vi.mock('@/services/llm/document-analyzer', () => ({
  DocumentAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeDevis: vi.fn().mockResolvedValue({
      extractedData: {
        company: {
          name: 'Test Company',
          siret: '12345678900001',
          address: '123 Test St',
          phone: '0123456789',
          email: 'test@test.com',
        },
        client: {
          name: 'John Doe',
          address: '456 Client Ave',
          phone: '0987654321',
        },
        project: {
          title: 'Rénovation complète',
          description: 'Travaux de rénovation',
          location: 'Paris',
          surface: 50,
        },
        items: [
          {
            description: 'Peinture',
            quantity: 50,
            unit: 'm²',
            unitPrice: 20,
            totalPrice: 1000,
          },
        ],
        totals: {
          subtotal: 1000,
          tva: 200,
          tvaRate: 20,
          total: 1200,
        },
        dates: {
          devis: '2025-01-01',
          validityEnd: '2025-02-01',
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
        alerts: [],
        recommendations: [],
      },
      rawText: 'Contenu du devis...',
    }),
  })),
}))

// Mock AdvancedScoringEngine
vi.mock('@/services/scoring/advanced/advanced-scoring-engine', () => ({
  AdvancedScoringEngine: vi.fn().mockImplementation(() => ({
    calculateScore: vi.fn().mockResolvedValue({
      totalScore: 950,
      grade: 'A',
      axisScores: [],
      alerts: [],
      recommendations: [],
    }),
  })),
}))

// Mock MinimalEnrichmentService
vi.mock('@/services/data-enrichment/minimal-enrichment-service', () => ({
  MinimalEnrichmentService: vi.fn().mockImplementation(() => ({
    enrichFromSiret: vi.fn().mockResolvedValue({
      siret: '12345678900001',
      name: 'Test Company',
      siren: '123456789',
      legalStatus: 'SAS',
      isActive: true,
    }),
  })),
}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  default: {
    devis: {
      create: vi.fn().mockResolvedValue({
        id: 'test-devis-id',
        documentId: 'test-doc-id',
        userId: 'demo-user-id',
        companyName: 'Test Company',
        companySiret: '12345678900001',
        totalAmount: 1200,
      }),
    },
    tORPScore: {
      create: vi.fn().mockResolvedValue({
        id: 'test-score-id',
        devisId: 'test-devis-id',
        scoreValue: 950,
        scoreGrade: 'A',
      }),
    },
  },
}))

// Mock fs pour file operations
vi.mock('fs', () => ({
  default: {
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('test-file-content')),
    unlinkSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  },
}))

describe('POST /api/llm/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Request Validation', () => {
    it('should require multipart/form-data', async () => {
      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should require a file in the request', async () => {
      // Créer un FormData vide
      const formData = new FormData()

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('fichier')
    })

    it('should validate file type (PDF, JPG, PNG)', async () => {
      // Simuler un fichier non supporté
      const formData = new FormData()
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('format')
    })

    it('should validate file size (max 10MB)', async () => {
      // Créer un gros fichier (simulé)
      const largeContent = new Array(11 * 1024 * 1024).fill('a').join('')
      const formData = new FormData()
      const file = new File([largeContent], 'test.pdf', {
        type: 'application/pdf',
      })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('taille')
    })
  })

  describe('Successful Analysis', () => {
    it('should analyze PDF file successfully', async () => {
      const formData = new FormData()
      const file = new File(['pdf content'], 'test.pdf', {
        type: 'application/pdf',
      })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.devisId).toBe('test-devis-id')
    })

    it('should analyze JPG image successfully', async () => {
      const formData = new FormData()
      const file = new File(['jpg content'], 'test.jpg', { type: 'image/jpeg' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should analyze PNG image successfully', async () => {
      const formData = new FormData()
      const file = new File(['png content'], 'test.png', { type: 'image/png' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(true)
      expect(data.success).toBe(true)
    })

    it('should return devisId in response', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data).toBeDefined()
      expect(data.data.devisId).toBeTruthy()
    })

    it('should include TORP score in response', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.score).toBeDefined()
      expect(data.data.score.scoreValue).toBeGreaterThan(0)
      expect(data.data.score.scoreGrade).toBeTruthy()
    })
  })

  describe('CCF Integration', () => {
    it('should accept CCF data in the request', async () => {
      const formData = new FormData()
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      })
      formData.append('file', file)

      const ccfData = {
        projectType: 'RENOVATION',
        projectTitle: 'Rénovation salle de bain',
        address: '123 Test Street',
        budget: { min: 5000, max: 10000 },
      }
      formData.append('ccfData', JSON.stringify(ccfData))

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle DocumentAnalyzer errors', async () => {
      // Force une erreur dans DocumentAnalyzer
      const mockAnalyzer = vi.mocked(
        new (await import('@/services/llm/document-analyzer')).DocumentAnalyzer()
      )
      vi.mocked(mockAnalyzer.analyzeDevis).mockRejectedValueOnce(
        new Error('Claude API Error')
      )

      const formData = new FormData()
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.success).toBe(false)
    })

    it('should handle database errors', async () => {
      // Force une erreur Prisma
      vi.mocked((await import('@/lib/db')).default.devis.create).mockRejectedValueOnce(
        new Error('Database Error')
      )

      const formData = new FormData()
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      formData.append('file', file)

      const request = new NextRequest('http://localhost:3000/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBeGreaterThanOrEqual(400)
      expect(data.success).toBe(false)
    })
  })
})
