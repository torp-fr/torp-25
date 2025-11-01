/**
 * Service d'enrichissement des prix de référence
 * Utilise diverses APIs pour obtenir les prix de matériaux et prestations BTP
 */

import { ApiClient } from './api-client'
import type { PriceReference, RegionalData } from './types'
import { globalCache } from '@/services/cache/data-cache'

export class PriceEnrichmentService {
  private reefPremiumClient?: ApiClient

  constructor() {
    // API Reef Premium (si disponible)
    const reefApiKey = process.env.REEF_PREMIUM_API_KEY
    if (reefApiKey) {
      this.reefPremiumClient = new ApiClient({
        baseUrl: process.env.REEF_PREMIUM_API_URL || 'https://api.reef-premium.fr/v1',
        apiKey: reefApiKey,
        timeout: 10000,
        retries: 2,
      })
    }
  }

  /**
   * Récupère les prix de référence pour une catégorie de matériaux/prestations
   */
  async getPriceReferences(
    category: string,
    region: string = 'ILE_DE_FRANCE',
    item?: string
  ): Promise<PriceReference[]> {
    // Vérifier le cache
    const cacheKey = `price:${category}:${region}:${item || 'all'}`
    const cached = globalCache.getPriceReference<PriceReference[]>(cacheKey)
    if (cached) {
      console.log('[PriceService] ✅ Prix récupérés depuis le cache')
      return cached
    }

    const references: PriceReference[] = []

    try {
      // 1. Essayer Reef Premium si disponible
      if (this.reefPremiumClient && item) {
        try {
          const reefData = await this.reefPremiumClient.get<{
            prices: Array<{
              item: string
              unit: string
              prices: {
                min: number
                max: number
                average: number
                median: number
              }
            }>
          }>(`/prices`, {
            category,
            item,
            region,
          })

          if (reefData.prices) {
            references.push(
              ...reefData.prices.map((p) => ({
                item: p.item,
                category,
                unit: p.unit,
                prices: p.prices,
                region,
                source: 'reef-premium',
                lastUpdate: new Date().toISOString(),
              }))
            )
          }
        } catch (error) {
          console.warn('[PriceService] Erreur Reef Premium:', error)
        }
      }

      // 2. Utiliser des données de référence locales si Reef Premium n'est pas disponible
      if (references.length === 0) {
        references.push(...this.getFallbackPrices(category, region, item))
      }
    } catch (error) {
      console.error(`[PriceService] Erreur lors de la récupération des prix:`, error)
      // Fallback sur des prix de référence basiques
      references.push(...this.getFallbackPrices(category, region, item))
    }

    // Mettre en cache les résultats
    if (references.length > 0) {
      globalCache.setPriceReference(cacheKey, references)
    }

    return references
  }

  /**
   * Prix de référence de fallback (basés sur des données moyennes du marché français)
   */
  private getFallbackPrices(
    category: string,
    region: string,
    item?: string
  ): PriceReference[] {
    // Multiplicateurs régionaux pour ajuster les prix
    const regionalMultipliers: Record<string, number> = {
      ILE_DE_FRANCE: 1.15,
      PROVENCE_ALPES_COTE_AZUR: 1.1,
      AUVERGNE_RHONE_ALPES: 1.05,
      NOUVELLE_AQUITAINE: 0.95,
      OCCITANIE: 0.98,
      HAUTS_DE_FRANCE: 0.92,
      GRAND_EST: 0.93,
      NORMANDIE: 0.94,
      BRETAGNE: 0.96,
      PAYS_DE_LA_LOIRE: 0.97,
      CENTRE_VAL_DE_LOIRE: 0.95,
      BOURGOGNE_FRANCHE_COMTE: 0.94,
      CORSE: 1.05,
    }

    const multiplier = regionalMultipliers[region] || 1.0

    // Prix de base par m² selon le type de projet (en €/m²)
    const basePrices: Record<string, { min: number; max: number; average: number }> = {
      renovation: {
        min: 800 * multiplier,
        max: 1500 * multiplier,
        average: 1150 * multiplier,
      },
      construction: {
        min: 1200 * multiplier,
        max: 2000 * multiplier,
        average: 1600 * multiplier,
      },
      extension: {
        min: 1000 * multiplier,
        max: 1800 * multiplier,
        average: 1400 * multiplier,
      },
    }

    const basePrice = basePrices[category.toLowerCase()] || basePrices.renovation

    return [
      {
        item: item || `Prix au m² - ${category}`,
        category,
        unit: 'm²',
        prices: {
          min: basePrice.min,
          max: basePrice.max,
          average: basePrice.average,
          median: (basePrice.min + basePrice.max) / 2,
        },
        region,
        source: 'fallback-reference',
        lastUpdate: new Date().toISOString(),
      },
    ]
  }

  /**
   * Récupère les données régionales pour le benchmark
   */
  async getRegionalData(region: string): Promise<RegionalData | null> {
    try {
      // TODO: Intégrer avec une vraie API de données immobilières/construction
      // - API Perval
      // - API ADIL
      // - API data.gouv.fr (base de données construction)

      // Pour l'instant, on retourne des données estimées
      return this.getFallbackRegionalData(region)
    } catch (error) {
      console.error(`[PriceService] Erreur lors de la récupération des données régionales:`, error)
      return this.getFallbackRegionalData(region)
    }
  }

  /**
   * Données régionales de fallback
   */
  private getFallbackRegionalData(region: string): RegionalData {
    const basePrices: Record<string, number> = {
      ILE_DE_FRANCE: 1800,
      PROVENCE_ALPES_COTE_AZUR: 1700,
      AUVERGNE_RHONE_ALPES: 1500,
      NOUVELLE_AQUITAINE: 1400,
      OCCITANIE: 1450,
      HAUTS_DE_FRANCE: 1350,
      GRAND_EST: 1380,
      NORMANDIE: 1400,
      BRETAGNE: 1420,
      PAYS_DE_LA_LOIRE: 1390,
      CENTRE_VAL_DE_LOIRE: 1350,
      BOURGOGNE_FRANCHE_COMTE: 1330,
      CORSE: 1650,
    }

    const avgPrice = basePrices[region] || 1500

    return {
      region,
      averagePriceSqm: avgPrice,
      priceRange: {
        min: avgPrice * 0.7,
        max: avgPrice * 1.5,
        percentile25: avgPrice * 0.85,
        percentile75: avgPrice * 1.2,
      },
      marketTrend: 'stable',
    }
  }
}

