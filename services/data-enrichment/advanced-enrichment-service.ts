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
import { CertificationsEnrichmentService } from './certifications-service'
import type { EnrichedCompanyData, ScoringEnrichmentData } from '../scoring/advanced/types'
import type { ExtractedDevisData } from '@/services/llm/document-analyzer'

/**
 * NOTE: Ce service est maintenant utilisé en ASYNCHRONE pour ne pas bloquer la réponse
 * Pour enrichissement minimal (<50ms), utiliser MinimalEnrichmentService
 */

export class AdvancedEnrichmentService {
  private companyService: CompanyEnrichmentService
  private infogreffeService: InfogreffeEnrichmentService
  private pappersService: PappersEnrichmentService
  private reputationService: ReputationEnrichmentService
  private priceService: PriceEnrichmentService
  private complianceService: ComplianceEnrichmentService
  private weatherService: WeatherEnrichmentService
  private certificationsService: CertificationsEnrichmentService

  constructor() {
    this.companyService = new CompanyEnrichmentService()
    this.infogreffeService = new InfogreffeEnrichmentService()
    this.pappersService = new PappersEnrichmentService()
    this.reputationService = new ReputationEnrichmentService()
    this.priceService = new PriceEnrichmentService()
    this.complianceService = new ComplianceEnrichmentService()
    this.weatherService = new WeatherEnrichmentService()
    this.certificationsService = new CertificationsEnrichmentService()
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

        // Source 2: Infogreffe (si disponible) - Parallélisé
        if (enrichedCompany?.siren) {
          try {
            // Récupérer données financières et juridiques en parallèle
            const [financialData, legalStatus] = await Promise.allSettled([
              this.infogreffeService.enrichFinancialData(enrichedCompany.siren),
              this.infogreffeService.checkCollectiveProcedures(enrichedCompany.siren),
            ])

            if (financialData.status === 'fulfilled' && financialData.value) {
              enrichedCompany.financialData = financialData.value
              sources.push('Infogreffe (données financières)')
              confidence += 5
            }

            if (legalStatus.status === 'fulfilled' && legalStatus.value) {
              enrichedCompany.legalStatusDetails = legalStatus.value
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
          if (reputation && enrichedCompany) {
            enrichedCompany.reputation = reputation
            sources.push('Service réputation')
            confidence += 3
          }
        } catch (error) {
          console.warn('[AdvancedEnrichment] Erreur réputation:', error)
          confidence -= 2
        }

        // Source 5: Certifications (RGE, Qualibat, etc.)
        try {
          console.log(`[AdvancedEnrichment] 🔍 Recherche certifications pour SIRET: ${extractedData.company.siret}`)
          const certifications = await this.certificationsService.getCompanyCertifications(
            extractedData.company.siret
          )
          if (certifications && certifications.certifications.length > 0) {
            // Ajouter les qualifications dans enrichedCompany
            if (enrichedCompany) {
              enrichedCompany.qualifications = certifications.certifications.map(cert => ({
                type: cert.type,
                level: cert.level || 'CERTIFIED',
                validUntil: cert.expiryDate,
                scope: cert.activities || [],
              }))
            }
            sources.push(`Certifications (${certifications.certifications.length})`)
            confidence += 8
            
            // Log détaillé des certifications trouvées
            console.log(`[AdvancedEnrichment] ✅ ${certifications.certifications.length} certification(s) trouvée(s):`, 
              certifications.certifications.map(c => `${c.type}: ${c.name} (valide: ${c.valid})`).join(', ')
            )
          } else {
            console.log('[AdvancedEnrichment] ℹ️ Aucune certification trouvée pour cette entreprise')
          }
        } catch (error) {
          console.error('[AdvancedEnrichment] ❌ Erreur certifications:', error)
          confidence -= 2
        }
      } catch (error) {
        console.error('[AdvancedEnrichment] Erreur enrichissement entreprise:', error)
        confidence -= 10
      }
    }

    // 2. Prix et données régionales (parallélisé)
    let priceReferences: any[] = []
    let regionalData: any = null

    try {
      // Paralléliser la récupération des prix par catégorie
      if (extractedData.items && extractedData.items.length > 0) {
        const categories = this.extractCategories(extractedData.items)
        
        // Récupérer tous les prix en parallèle
        const pricePromises = [
          ...categories.map((category) => 
            this.priceService.getPriceReferences(category, region).catch(() => [])
          ),
          this.priceService.getPriceReferences(projectType, region).catch(() => [])
        ]
        
        const priceResults = await Promise.allSettled(pricePromises)
        priceReferences = priceResults
          .filter((result) => result.status === 'fulfilled')
          .flatMap((result) => (result as PromiseFulfilledResult<any[]>).value)
        
        if (priceReferences.length > 0) {
          sources.push('Service prix de référence')
          confidence += 5
        }
      } else {
        // Si pas d'items, récupérer au moins les prix globaux
        const globalRefs = await this.priceService.getPriceReferences(projectType, region).catch(() => [])
        priceReferences.push(...globalRefs)
        if (globalRefs.length > 0) {
          sources.push('Service prix de référence')
          confidence += 5
        }
      }
    } catch (error) {
      console.error('[AdvancedEnrichment] Erreur prix:', error)
      confidence -= 5
    }

    // Récupérer données régionales en parallèle avec prix
    try {
      regionalData = await this.priceService.getRegionalData(region).catch(() => null)
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

    // 4. Certifications réelles de l'entreprise (RGE, Qualibat, etc.)
    let companyCertifications: any[] = []
    
    if (extractedData.company.siret) {
      try {
        console.log(`[AdvancedEnrichment] 🔍 Recherche certifications entreprise pour SIRET: ${extractedData.company.siret}`)
        const certifications = await this.certificationsService.getCompanyCertifications(
          extractedData.company.siret
        )
        if (certifications && certifications.certifications.length > 0) {
          companyCertifications = certifications.certifications.map(cert => ({
            type: cert.type,
            name: cert.name,
            valid: cert.valid,
            number: cert.number,
            expiryDate: cert.expiryDate,
            activities: cert.activities || [],
            source: cert.source,
            verifiedAt: cert.verifiedAt,
          }))
          
          if (companyCertifications.length > 0) {
            sources.push(`Certifications entreprise (${companyCertifications.length})`)
            console.log(`[AdvancedEnrichment] ✅ ${companyCertifications.length} certification(s) entreprise trouvée(s):`, 
              companyCertifications.map(c => `${c.type}: ${c.name} (valide: ${c.valid})`).join(', ')
            )
          }
        } else {
          console.log('[AdvancedEnrichment] ℹ️ Aucune certification entreprise trouvée')
        }
      } catch (error) {
        console.error('[AdvancedEnrichment] ❌ Erreur certifications entreprise:', error)
      }
    } else {
      console.log('[AdvancedEnrichment] ⚠️ Pas de SIRET disponible pour recherche certifications')
    }

    // 5. Météo
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

    const result = {
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
      // Prioriser les certifications réelles de l'entreprise, sinon utiliser celles de compliance
      certifications: companyCertifications.length > 0 
        ? companyCertifications 
        : (complianceData?.certifications || []),
    }

    console.log('[AdvancedEnrichment] ✅ Enrichissement terminé')
    console.log(`[AdvancedEnrichment] 📊 Sources utilisées: ${sources.join(', ') || 'Aucune'}`)
    console.log(`[AdvancedEnrichment] 📈 Confiance finale: ${confidence}%`)
    console.log(`[AdvancedEnrichment] 🏅 Certifications: ${result.certifications.length} trouvée(s)`)
    
    return result
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

