/**
 * Tests simplifiés pour AdvancedScoringEngine
 */

import { describe, it, expect } from 'vitest'
import { AdvancedScoringEngine } from '@/services/scoring/advanced/advanced-scoring-engine'

describe('AdvancedScoringEngine - Tests simplifiés', () => {
  describe('Constructor', () => {
    it('should initialize with ML disabled', () => {
      const engine = new AdvancedScoringEngine(false)
      expect(engine).toBeDefined()
      expect(engine).toBeInstanceOf(AdvancedScoringEngine)
    })

    it('should initialize with ML enabled', () => {
      const engine = new AdvancedScoringEngine(true)
      expect(engine).toBeDefined()
      expect(engine).toBeInstanceOf(AdvancedScoringEngine)
    })

    it('should initialize with default ML setting', () => {
      const engine = new AdvancedScoringEngine()
      expect(engine).toBeDefined()
    })
  })

  describe('Type Structure', () => {
    it('should be properly exported', () => {
      expect(AdvancedScoringEngine).toBeDefined()
      expect(typeof AdvancedScoringEngine).toBe('function')
    })
  })
})
