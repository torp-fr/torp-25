/**
 * Service d'enrichissement avancé complet
 * Agrége toutes les sources pour un enrichissement maximal
 */

import { CompanyEnrichmentService } from './company-service'
import { InfogreffeEnrichmentService } from './infogreffe-service'
import { PappersEnrichmentService } from './pappers-service'
import { ReputationEnrichmentService } from './reputation-service'
import { PriceEnrichmentService } from './price-service'
import { ComplianceEnrichmentService } from './compliance-service'
import { WeatherEnrichmentService } from './weather-service'
import type { EnrichedCompanyData, ScoringEnrichmentData } from '../scoring/advanced/types'
import type { ExtractedDevisData } from '@/services/llm/document-analyzer'

export class AdvancedEnrichmentService {
  private companyService: CompanyEnrichmentService
  private infogreffeService: InfogreffeEnrichmentService
  private pappersService: PappersEnrichmentService
  private reputationService: ReputationEnrichmentService
  private priceService: PriceEnrichmentService
  private complianceService: ComplianceEnrichmentService
  private weatherService: WeatherEnrichmentService

  constructor() {
    this.companyService = new CompanyEnrichmentService()
    this.infogreffeService = new InfogreffeEnrichmentService()
    this.pappersService = new PappersEnrichmentService()
    this.reputationService = new ReputationEnrichmentService()
    this.priceService = new PriceEnrichmentService()
    this.complianceService = new ComplianceEnrichmentService()
    this.weatherService = new WeatherEnrichmentService()
  }

  /**
   * Enrichissement complet pour scoring avancé
   */
  async enrichForScoring(
    extractedData: ExtractedDevisData,
    projectType: string = 'renovation',
    tradeType?: string,
    region: string = 'ILE_DE_FRANCE'
  ): Promise<ScoringEnrichmentData> {
    const sources: string[] = []
    let confidence = 100

    // 1. Enrichissement entreprise (multi-sources)
    let enrichedCompany: EnrichedCompanyData | null = null

    if (extractedData.company.siret) {
      try {
        // Source 1: API Sirene (data.gouv.fr) - GRATUITE
        const sireneData = await this.companyService.enrichFromSiret(
          extractedData.company.siret
        )

        if (sireneData) {
          sources.push('API Sirene (data.gouv.fr)')
          enrichedCompany = {
            siret: sireneData.siret,
            siren: sireneData.siren || sireneData.siret.substring(0, 9),
            name: sireneData.name,
            legalStatus: sireneData.legalStatus,
            address: sireneData.address,
            activities: sireneData.activities,
          }
          confidence += 10
        }

        // Source 2: Infogreffe (si disponible)
        if (enrichedCompany?.siren) {
          try {
            const financialData = await this.infogreffeService.enrichFinancialData(
              enrichedCompany.siren
            )
            if (financialData) {
              enrichedCompany.financialData = financialData
              sources.push('Infogreffe (données financières)')
              confidence += 5
            }

            const legalStatus = await this.infogreffeService.checkCollectiveProcedures(
              enrichedCompany.siren
            )
            if (legalStatus) {
              enrichedCompany.legalStatusDetails = legalStatus
              sources.push('Infogreffe/BODACC (procédures)')
              confidence += 5
            }
          } catch (error) {
            console.warn('[AdvancedEnrichment] Erreur Infogreffe:', error)
            confidence -= 3
          }
        }

        // Source 3: Pappers (si disponible)
        try {
          const pappersData = await this.pappersService.enrichCompany(
            extractedData.company.siret
          )
          if (pappersData) {
            // Fusionner les données
            enrichedCompany = {
              ...enrichedCompany,
              ...pappersData,
              financialData: pappersData.financialData || enrichedCompany?.financialData,
              financialScore: pappersData.financialScore || enrichedCompany?.financialScore,
              humanResources: pappersData.humanResources || enrichedCompany?.humanResources,
            } as EnrichedCompanyData
            sources.push('Pappers.fr')
            confidence += 5
          }
        } catch (error) {
          console.warn('[AdvancedEnrichment] Erreur Pappers:', error)
          confidence -= 2
        }

        // Source 4: Réputation (multi-sources)
        try {
          const reputation = await this.reputationService.getReputation(
            extractedData.company.name,
            enrichedCompany?.address
          )
          if (reputation) {
            enrichedCompany.reputation = reputation
            sources.push('Service réputation')
            confidence += 3
          }
        } catch (error) {
          console.warn('[AdvancedEnrichment] Erreur réputation:', error)
          confidence -= 2
        }
      } catch (error) {
        console.error('[AdvancedEnrichment] Erreur enrichissement entreprise:', error)
        confidence -= 10
      }
    }

    // 2. Prix et données régionales
    let priceReferences: any[] = []
    let regionalData: any = null

    try {
      if (extractedData.items && extractedData.items.length > 0) {
        const categories = this.extractCategories(extractedData.items)
        for (const category of categories) {
          const refs = await this.priceService.getPriceReferences(category, region)
          priceReferences.push(...refs)
        }
      }
      const globalRefs = await this.priceService.getPriceReferences(projectType, region)
      priceReferences.push(...globalRefs)
      sources.push('Service prix de référence')
      confidence += 5
    } catch (error) {
      console.error('[AdvancedEnrichment] Erreur prix:', error)
      confidence -= 5
    }

    try {
      regionalData = await this.priceService.getRegionalData(region)
      if (regionalData) {
        sources.push('Service données régionales')
        confidence += 3
      }
    } catch (error) {
      console.error('[AdvancedEnrichment] Erreur régional:', error)
      confidence -= 3
    }

    // 3. Conformité et normes
    let complianceData: any = null

    try {
      complianceData = await this.complianceService.getComplianceData(projectType, tradeType)
      if (complianceData) {
        sources.push('Service conformité et normes')
        confidence += 5

        // Enrichir avec les DTU détectés
        const dtus = complianceData.applicableNorms.map((norm: any) => ({
          code: norm.code,
          name: norm.name,
          applicable: norm.mandatory,
          complianceScore: norm.mandatory ? 100 : 50,
        }))

        complianceData.dtus = dtus
      }
    } catch (error) {
      console.error('[AdvancedEnrichment] Erreur conformité:', error)
      confidence -= 5
    }

    // 4. Météo
    let weatherData: any = null

    try {
      weatherData = await this.weatherService.getWeatherData(region)
      if (weatherData) {
        sources.push('Service météorologie')
        confidence += 2
      }
    } catch (error) {
      console.error('[AdvancedEnrichment] Erreur météo:', error)
      confidence -= 2
    }

    return {
      company: enrichedCompany || {
        siret: extractedData.company.siret || '',
        siren: extractedData.company.siret?.substring(0, 9) || '',
        name: extractedData.company.name,
      },
      priceReferences,
      regionalData,
      complianceData,
      weatherData,
      dtus: complianceData?.dtus || [],
      certifications: complianceData?.certifications || [],
    }
  }

  /**
   * Extrait les catégories depuis les items
   */
  private extractCategories(items: ExtractedDevisData['items']): string[] {
    const categories = new Set<string>()

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

    return categories.size > 0 ? Array.from(categories) : ['general']
  }
}

