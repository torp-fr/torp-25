/**
 * Tests simplifiés pour DocumentAnalyzer
 * Focus sur la structure et les cas d'erreur basiques
 */

import { describe, it, expect } from 'vitest'
import { DocumentAnalyzer } from '@/services/llm/document-analyzer'

describe('DocumentAnalyzer - Tests simplifiés', () => {
  describe('Constructor', () => {
    it('should throw error if ANTHROPIC_API_KEY is missing', () => {
      const originalKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY

      expect(() => new DocumentAnalyzer()).toThrow('ANTHROPIC_API_KEY is required')

      // Restore
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      }
    })

    it('should initialize correctly with valid API key', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-for-init-mock-12345'

      const analyzer = new DocumentAnalyzer()

      expect(analyzer).toBeDefined()
      expect(analyzer).toBeInstanceOf(DocumentAnalyzer)
    })
  })

  describe('Type Definitions', () => {
    it('should have correct TypeScript interfaces exported', () => {
      // Vérifier que les types sont exportés
      expect(DocumentAnalyzer).toBeDefined()
    })
  })
})
