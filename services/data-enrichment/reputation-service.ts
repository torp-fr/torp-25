/**
 * Service de réputation et avis clients
 * Agrége les données depuis plusieurs sources (Google, Pages Jaunes, etc.)
 */

import { ApiClient } from './api-client'
import type { EnrichedCompanyData } from '../scoring/advanced/types'

export class ReputationEnrichmentService {
  private apiClient: ApiClient

  constructor() {
    // Service d'agrégation d'avis (peut être un service tiers ou interne)
    this.apiClient = new ApiClient({
      baseUrl: process.env.REPUTATION_API_URL || 'https://api.reviews-aggregator.com',
      apiKey: process.env.REPUTATION_API_KEY || '',
      timeout: 8000,
      retries: 2,
    })
  }

  /**
   * Récupère la réputation agrégée depuis plusieurs sources
   */
  async getReputation(
    companyName: string,
    address?: { city: string; postalCode: string }
  ): Promise<EnrichedCompanyData['reputation'] | null> {
    try {
      // Pour l'instant, utiliser des données simulées
      // TODO: Intégrer avec des APIs réelles (Google Places, Pages Jaunes, etc.)
      // ou utiliser du scraping légal et éthique

      // Exemple de structure avec données de fallback
      const fallbackReputation: EnrichedCompanyData['reputation'] = {
        averageRating: 3.5, // Moyenne estimée
        numberOfReviews: 0,
        sources: ['estimated'],
      }

      // Si une API de réputation est configurée, l'utiliser
      if (process.env.REPUTATION_API_KEY) {
        try {
          // Construire les paramètres uniquement avec les valeurs définies
          const params: Record<string, string> = {
            name: companyName,
          }
          if (address?.city) {
            params.city = address.city
          }
          if (address?.postalCode) {
            params.postalCode = address.postalCode
          }

          const data = await this.apiClient.get<{
            rating: number
            reviews: number
            sources: string[]
            nps?: number
          }>(`/reputation`, params)

          return {
            averageRating: data.rating,
            numberOfReviews: data.reviews,
            nps: data.nps,
            sources: data.sources,
          }
        } catch (error) {
          console.warn('[ReputationService] API non disponible, utilisation fallback')
          return fallbackReputation
        }
      }

      return fallbackReputation
    } catch (error) {
      console.error(`[ReputationService] Erreur réputation "${companyName}":`, error)
      return null
    }
  }

  /**
   * Scraping légal d'avis Google Business
   * Note: Nécessite respecter les conditions d'utilisation et robots.txt
   */
  async scrapeGoogleReviews(
    companyName: string,
    location?: string
  ): Promise<{ rating: number; reviews: number } | null> {
    try {
      // IMPORTANT: Scraping doit être légal et éthique
      // Utiliser Google Places API officielle si possible
      // ou un service tiers qui respecte les ToS

      // Placeholder - à implémenter avec respect des ToS
      return null
    } catch (error) {
      console.error('[ReputationService] Erreur scraping Google:', error)
      return null
    }
  }

  /**
   * Calcule un NPS (Net Promoter Score) estimé depuis les avis
   */
  calculateNPSEstimate(rating: number, reviewTexts?: string[]): number {
    // NPS basique estimé depuis la note moyenne
    // NPS réel nécessite la question "Recommanderiez-vous?"
    if (rating >= 4.5) return 70
    if (rating >= 4.0) return 50
    if (rating >= 3.5) return 30
    if (rating >= 3.0) return 10
    if (rating >= 2.5) return -20
    return -50
  }
}

