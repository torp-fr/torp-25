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
import type {
  EnrichedCompanyData,
  ScoringEnrichmentData,
} from '../scoring/advanced/types'
import type { ExtractedDevisData } from '@/services/llm/document-analyzer'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

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

        // Source 2: Infogreffe (Premium ou OpenData gratuit)
        if (enrichedCompany?.siren) {
          try {
            const infogreffeData = await this.infogreffeService.enrichCompany(
              enrichedCompany.siren
            )

            if (infogreffeData) {
              // Fusionner données financières
              if (infogreffeData.financialData) {
                enrichedCompany.financialData = infogreffeData.financialData
                sources.push('Infogreffe (données financières)')
                confidence += 5
              }

              // Fusionner statut juridique
              if (infogreffeData.legalStatusDetails) {
                enrichedCompany.legalStatusDetails = infogreffeData.legalStatusDetails
                sources.push('Infogreffe OpenData (procédures)')
                confidence += 5
              }

              // Fusionner autres données si présentes
              if (infogreffeData.name || infogreffeData.address || infogreffeData.activities) {
                enrichedCompany = {
                  ...enrichedCompany,
                  ...infogreffeData,
                } as EnrichedCompanyData
                sources.push('Infogreffe OpenData (RCS)')
                confidence += 3
              }
            }
          } catch (error) {
            log.warn({ err: error }, 'Erreur Infogreffe')
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
              financialData:
                pappersData.financialData || enrichedCompany?.financialData,
              financialScore:
                pappersData.financialScore || enrichedCompany?.financialScore,
              humanResources:
                pappersData.humanResources || enrichedCompany?.humanResources,
            } as EnrichedCompanyData
            sources.push('Pappers.fr')
            confidence += 5
          }
        } catch (error) {
          log.warn({ err: error }, 'Erreur Pappers')
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
          log.warn({ err: error }, 'Erreur réputation')
          confidence -= 2
        }

        // Source 5: Certifications (RGE, Qualibat, etc.)
        try {
          log.debug({ siret: extractedData.company.siret }, 'Recherche certifications')
          const certifications =
            await this.certificationsService.getCompanyCertifications(
              extractedData.company.siret
            )
          if (certifications && certifications.certifications.length > 0) {
            // Ajouter les qualifications dans enrichedCompany
            if (enrichedCompany) {
              enrichedCompany.qualifications =
                certifications.certifications.map((cert) => ({
                  type: cert.type,
                  level: cert.level || 'CERTIFIED',
                  validUntil: cert.expiryDate,
                  scope: cert.activities || [],
                }))

              // Ajouter aussi les certifications avec tous les détails
              enrichedCompany.certifications =
                certifications.certifications.map((cert) => ({
                  name: cert.name,
                  type: cert.type,
                  validUntil: cert.expiryDate,
                  valid: cert.valid,
                }))
            }
            sources.push(
              `Certifications (${certifications.certifications.length})`
            )
            confidence += 8

            // Log détaillé des certifications trouvées
            log.info({
              count: certifications.certifications.length,
              certifications: certifications.certifications.map((c) => ({
                type: c.type,
                name: c.name,
                valid: c.valid,
              })),
            }, 'Certifications trouvées')
          } else {
            log.debug('Aucune certification trouvée pour cette entreprise')
          }
        } catch (error) {
          log.error({ err: error }, 'Erreur certifications')
          confidence -= 2
        }
      } catch (error) {
        log.error({ err: error }, 'Erreur enrichissement entreprise')
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
            this.priceService
              .getPriceReferences(category, region)
              .catch(() => [])
          ),
          this.priceService
            .getPriceReferences(projectType, region)
            .catch(() => []),
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
        const globalRefs = await this.priceService
          .getPriceReferences(projectType, region)
          .catch(() => [])
        priceReferences.push(...globalRefs)
        if (globalRefs.length > 0) {
          sources.push('Service prix de référence')
          confidence += 5
        }
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur prix')
      confidence -= 5
    }

    // Récupérer données régionales en parallèle avec prix
    try {
      regionalData = await this.priceService
        .getRegionalData(region)
        .catch(() => null)
      if (regionalData) {
        sources.push('Service données régionales')
        confidence += 3
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur régional')
      confidence -= 3
    }

    // 3. Conformité et normes
    let complianceData: any = null

    try {
      complianceData = await this.complianceService.getComplianceData(
        projectType,
        tradeType
      )
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
      log.error({ err: error }, 'Erreur conformité')
      confidence -= 5
    }

    // 4. Certifications réelles de l'entreprise (RGE, Qualibat, etc.)
    // Note: Déjà traité dans la section entreprise (Source 5), mais on peut ajouter ici
    // pour les inclure dans le résultat global aussi
    let companyCertifications: any[] = []

    if (enrichedCompany?.certifications) {
      companyCertifications = enrichedCompany.certifications.map(
        (cert: any) => ({
          type: cert.type,
          name: cert.name,
          valid: cert.valid,
          validUntil: cert.validUntil || cert.expiryDate,
        })
      )
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
      log.error({ err: error }, 'Erreur météo')
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
      certifications:
        companyCertifications.length > 0
          ? companyCertifications
          : complianceData?.certifications || [],
    }

    log.info({
      sources: sources.length > 0 ? sources : ['Aucune'],
      sourcesCount: sources.length,
      confidence,
      certificationsCount: result.certifications.length,
    }, 'Enrichissement terminé')

    return result
  }

  /**
   * Extrait les catégories depuis les items
   */
  private extractCategories(items: ExtractedDevisData['items']): string[] {
    const categories = new Set<string>()

    const categoryKeywords: Record<string, string[]> = {
      plomberie: ['plomberie', 'sanitaire', 'robinet', 'tuyau', 'canalisation'],
      électricité: [
        'électricité',
        'électrique',
        'cable',
        'prise',
        'interrupteur',
      ],
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
