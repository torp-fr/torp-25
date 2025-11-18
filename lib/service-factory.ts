/**
 * Service Factory - Singleton Pattern
 * Provides centralized service instantiation to prevent memory leaks
 * All services should be instantiated through this factory
 */

import { CompanyEnrichmentService } from '@/services/data-enrichment/company-service'
import { AdvancedEnrichmentService } from '@/services/data-enrichment/advanced-enrichment-service'
import { DataEnrichmentService } from '@/services/data-enrichment/enrichment-service'
import { BuildingProfileService } from '@/services/building-profile-service'
import { BuildingProfileEnrichmentService } from '@/services/building-profile-enrichment-service'
import { BuildingRecommendationsService } from '@/services/building-recommendations-service'

/**
 * Service Factory class managing singleton instances
 */
class ServiceFactory {
  private static instance: ServiceFactory

  // Service instances cache
  private services: Map<string, any> = new Map()

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  /**
   * Get singleton instance of ServiceFactory
   */
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }

  /**
   * Get or create CompanyEnrichmentService instance
   */
  getCompanyEnrichmentService(): CompanyEnrichmentService {
    const key = 'CompanyEnrichmentService'
    if (!this.services.has(key)) {
      this.services.set(key, new CompanyEnrichmentService())
    }
    return this.services.get(key)
  }

  /**
   * Get or create AdvancedEnrichmentService instance
   */
  getAdvancedEnrichmentService(): AdvancedEnrichmentService {
    const key = 'AdvancedEnrichmentService'
    if (!this.services.has(key)) {
      this.services.set(key, new AdvancedEnrichmentService())
    }
    return this.services.get(key)
  }

  /**
   * Get or create DataEnrichmentService instance
   */
  getDataEnrichmentService(): DataEnrichmentService {
    const key = 'DataEnrichmentService'
    if (!this.services.has(key)) {
      this.services.set(key, new DataEnrichmentService())
    }
    return this.services.get(key)
  }

  /**
   * Get or create BuildingProfileService instance
   */
  getBuildingProfileService(): BuildingProfileService {
    const key = 'BuildingProfileService'
    if (!this.services.has(key)) {
      this.services.set(key, new BuildingProfileService())
    }
    return this.services.get(key)
  }

  /**
   * Get or create BuildingProfileEnrichmentService instance
   */
  getBuildingProfileEnrichmentService(): BuildingProfileEnrichmentService {
    const key = 'BuildingProfileEnrichmentService'
    if (!this.services.has(key)) {
      this.services.set(key, new BuildingProfileEnrichmentService())
    }
    return this.services.get(key)
  }

  /**
   * Get or create BuildingRecommendationsService instance
   */
  getBuildingRecommendationsService(): BuildingRecommendationsService {
    const key = 'BuildingRecommendationsService'
    if (!this.services.has(key)) {
      this.services.set(key, new BuildingRecommendationsService())
    }
    return this.services.get(key)
  }

  /**
   * Clear all cached services (useful for testing)
   */
  clearCache(): void {
    this.services.clear()
  }

  /**
   * Get service cache size (for monitoring)
   */
  getCacheSize(): number {
    return this.services.size
  }
}

// Export singleton instance getter
export const getServiceFactory = () => ServiceFactory.getInstance()

// Export convenience functions for common services
export const getCompanyEnrichmentService = () =>
  getServiceFactory().getCompanyEnrichmentService()

export const getAdvancedEnrichmentService = () =>
  getServiceFactory().getAdvancedEnrichmentService()

export const getDataEnrichmentService = () =>
  getServiceFactory().getDataEnrichmentService()

export const getBuildingProfileService = () =>
  getServiceFactory().getBuildingProfileService()

export const getBuildingProfileEnrichmentService = () =>
  getServiceFactory().getBuildingProfileEnrichmentService()

export const getBuildingRecommendationsService = () =>
  getServiceFactory().getBuildingRecommendationsService()
