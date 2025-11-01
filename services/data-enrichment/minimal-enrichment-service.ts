/**
 * Service d'enrichissement minimal pour réponse rapide (<5s)
 * Utilise uniquement le cache et données critiques
 */

import { globalCache } from '@/services/cache/data-cache'
import type { ExtractedDevisData } from '@/services/llm/document-analyzer'

export interface MinimalEnrichmentData {
  company?: {
    siret?: string
    siren?: string
    name?: string
    legalStatus?: string
  }
  // Pas de prix, conformité, météo - seulement données critiques en cache
}

export class MinimalEnrichmentService {
  /**
   * Récupère un enrichissement minimal depuis le cache uniquement
   * Ne fait aucun appel API - temps <50ms
   */
  async getMinimalEnrichment(
    extractedData: ExtractedDevisData
  ): Promise<MinimalEnrichmentData | null> {
    const startTime = Date.now()
    
    try {
      const enrichment: MinimalEnrichmentData = {}

      // Seulement données d'entreprise en cache
      if (extractedData.company.siret) {
        const cachedCompany = globalCache.getEnrichment<{
          siret: string
          siren: string
          name: string
          legalStatus?: string
        }>(`company:${extractedData.company.siret}`)

        if (cachedCompany) {
          enrichment.company = {
            siret: cachedCompany.siret,
            siren: cachedCompany.siren,
            name: cachedCompany.name,
            legalStatus: cachedCompany.legalStatus,
          }
        } else {
          // Données minimales depuis extraction
          enrichment.company = {
            siret: extractedData.company.siret,
            siren: extractedData.company.siret?.substring(0, 9),
            name: extractedData.company.name,
          }
        }
      } else if (extractedData.company.name) {
        // Données minimales sans SIRET
        enrichment.company = {
          name: extractedData.company.name,
        }
      }

      const duration = Date.now() - startTime
      console.log(`[MinimalEnrichment] Enrichissement minimal récupéré (${duration}ms)`)
      
      return enrichment.company ? enrichment : null
    } catch (error) {
      console.warn('[MinimalEnrichment] Erreur enrichissement minimal:', error)
      return null
    }
  }
}

