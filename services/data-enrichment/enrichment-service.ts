/**
 * Service principal d'enrichissement de données
 * Orchestre tous les services d'enrichissement pour un devis
 */

import { CompanyEnrichmentService } from './company-service'
import { PriceEnrichmentService } from './price-service'
import { ComplianceEnrichmentService } from './compliance-service'
import { WeatherEnrichmentService } from './weather-service'
import { InfogreffeEnrichmentService } from './infogreffe-service'
import { PappersEnrichmentService } from './pappers-service'
import { ReputationEnrichmentService } from './reputation-service'
import type {
  DevisEnrichment,
  CompanyEnrichment,
  PriceReference,
  RegionalData,
  ComplianceData,
  WeatherData,
} from './types'
import type { ExtractedDevisData } from '@/services/llm/document-analyzer'
import type { EnrichedCompanyData, ScoringEnrichmentData } from '../scoring/advanced/types'

export class DataEnrichmentService {
  private companyService: CompanyEnrichmentService
  private priceService: PriceEnrichmentService
  private complianceService: ComplianceEnrichmentService
  private weatherService: WeatherEnrichmentService

  constructor() {
    this.companyService = new CompanyEnrichmentService()
    this.priceService = new PriceEnrichmentService()
    this.complianceService = new ComplianceEnrichmentService()
    this.weatherService = new WeatherEnrichmentService()
  }

  /**
   * Enrichit toutes les données pour un devis
   */
  async enrichDevis(
    extractedData: ExtractedDevisData,
    projectType: string = 'renovation',
    tradeType?: string,
    region: string = 'ILE_DE_FRANCE'
  ): Promise<DevisEnrichment> {
    const sources: string[] = []
    let confidence = 100

    // 1. Enrichissement des données d'entreprise
    let companyData: CompanyEnrichment | null = null
    if (extractedData.company.siret) {
      try {
        companyData = await this.companyService.enrichFromSiret(
          extractedData.company.siret
        )
        if (companyData) {
          sources.push('API Sirene (data.gouv.fr)')
          confidence = Math.min(confidence + 10, 100)
        }
      } catch (error) {
        console.error('[EnrichmentService] Erreur enrichissement entreprise:', error)
        confidence -= 5
      }
    }

    // Si pas de SIRET mais un nom d'entreprise, essayer la recherche par nom
    if (!companyData && extractedData.company.name) {
      try {
        const results = await this.companyService.searchByName(
          extractedData.company.name,
          1
        )
        if (results.length > 0) {
          companyData = results[0]
          sources.push('API Sirene (recherche par nom)')
          confidence -= 10 // Moins fiable sans SIRET exact
        }
      } catch (error) {
        console.error('[EnrichmentService] Erreur recherche entreprise:', error)
      }
    }

    // 2. Enrichissement des prix de référence
    let priceReferences: PriceReference[] = []
    try {
      // Récupérer les prix pour les catégories principales du devis
      if (extractedData.items && extractedData.items.length > 0) {
        // Extraire les catégories principales des items
        const categories = this.extractCategories(extractedData.items)

        for (const category of categories) {
          const refs = await this.priceService.getPriceReferences(
            category,
            region
          )
          priceReferences.push(...refs)
        }
      }

      // Prix globaux par type de projet
      const globalRefs = await this.priceService.getPriceReferences(
        projectType,
        region
      )
      priceReferences.push(...globalRefs)

      sources.push('Service prix de référence')
      if (priceReferences.length > 0) {
        confidence += 5
      }
    } catch (error) {
      console.error('[EnrichmentService] Erreur enrichissement prix:', error)
      confidence -= 10
    }

    // 3. Données régionales
    let regionalData: RegionalData | null = null
    try {
      regionalData = await this.priceService.getRegionalData(region)
      if (regionalData) {
        sources.push('Service données régionales')
        confidence += 5
      }
    } catch (error) {
      console.error('[EnrichmentService] Erreur données régionales:', error)
      confidence -= 5
    }

    // 4. Données de conformité
    let complianceData: ComplianceData | null = null
    try {
      complianceData = await this.complianceService.getComplianceData(
        projectType,
        tradeType
      )
      if (complianceData) {
        sources.push('Service conformité et normes')
        confidence += 5
      }
    } catch (error) {
      console.error('[EnrichmentService] Erreur données conformité:', error)
      confidence -= 5
    }

    // 5. Données météorologiques
    let weatherData: WeatherData | null = null
    try {
      weatherData = await this.weatherService.getWeatherData(region)
      if (weatherData) {
        sources.push('Service météorologie')
        confidence += 3
      }
    } catch (error) {
      console.error('[EnrichmentService] Erreur données météo:', error)
      confidence -= 3
    }

    return {
      company: companyData,
      priceReferences,
      regionalData,
      complianceData,
      weatherData,
      metadata: {
        enrichmentDate: new Date().toISOString(),
        sources,
        confidence: Math.max(0, Math.min(100, confidence)),
      },
    }
  }

  /**
   * Extrait les catégories principales depuis les items du devis
   */
  private extractCategories(items: ExtractedDevisData['items']): string[] {
    const categories = new Set<string>()

    // Mots-clés pour identifier les catégories
    const categoryKeywords: Record<string, string[]> = {
      plomberie: ['plomberie', 'sanitaire', 'robinet', 'tuyau', 'canalisation'],
      'électricité': ['électricité', 'électrique', 'cable', 'prise', 'interrupteur'],
      maçonnerie: ['maçonnerie', 'mur', 'béton', 'ciment', 'carrelage'],
      menuiserie: ['menuiserie', 'fenêtre', 'porte', 'bois', 'charpente'],
      peinture: ['peinture', 'enduit', 'revêtement'],
      isolation: ['isolation', 'thermique', 'laine', 'polystyrène'],
    }

    for (const item of items) {
      const description = item.description.toLowerCase()

      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some((keyword) => description.includes(keyword))) {
          categories.add(category)
        }
      }
    }

    // Si aucune catégorie trouvée, retourner 'general'
    return categories.size > 0 ? Array.from(categories) : ['general']
  }
}

