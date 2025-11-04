/**
 * Service d'enrichissement des données d'entreprise
 * Utilise l'API Sirene (INSEE et data.gouv.fr) et autres sources
 */

import { ApiClient } from './api-client'
import type { CompanyEnrichment } from './types'
import {
  SireneService,
  type SireneCompany,
} from '../external-apis/sirene-service'
import { InfogreffeService } from '../external-apis/infogreffe-service'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export class CompanyEnrichmentService {
  private sireneClient: ApiClient
  private sireneService: SireneService
  private infogreffeService: InfogreffeService

  constructor() {
    // API Recherche d'Entreprises (data.gouv.fr) - gratuite, sans clé
    // Documentation: https://www.data.gouv.fr/fr/datasets/api-recherche-entreprises/
    this.sireneClient = new ApiClient({
      baseUrl: 'https://recherche-entreprises.api.gouv.fr',
      timeout: 8000,
      retries: 2,
    })

    // Service Sirene complet (INSEE + fallback data.gouv.fr)
    this.sireneService = new SireneService()

    // Service Infogreffe pour données financières et juridiques
    this.infogreffeService = new InfogreffeService()
  }

  /**
   * Enrichit les données d'une entreprise à partir du SIRET
   * Utilise d'abord le service Sirene complet, puis fallback sur API Recherche d'Entreprises
   */
  async enrichFromSiret(siret: string): Promise<CompanyEnrichment | null> {
    try {
      // Nettoyer le SIRET (supprimer espaces)
      const cleanSiret = siret.replace(/\s/g, '')
      log.info({ siret: cleanSiret }, 'Début enrichissement SIRET')

      if (!this.isValidSiret(cleanSiret)) {
        log.warn({ siret, cleanSiret }, 'SIRET invalide')
        return null
      }

      // 1. Essayer d'abord avec le service Sirene complet (API INSEE)
      log.debug('Tentative SireneService.getCompanyBySiret')
      try {
        const sireneCompany =
          await this.sireneService.getCompanyBySiret(cleanSiret)
        if (sireneCompany) {
          log.info('Données récupérées via SireneService')
          return this.mapSireneCompanyToEnrichment(sireneCompany)
        } else {
          log.debug('SireneService.getCompanyBySiret a retourné null')
        }
      } catch (sireneError) {
        log.warn(
          {
            err: sireneError,
            message: sireneError instanceof Error ? sireneError.message : String(sireneError)
          },
          'Erreur SireneService'
        )
      }

      // 2. Fallback sur l'API Recherche d'Entreprises (data.gouv.fr) - gratuite
      log.debug('Fallback sur API Recherche d\'Entreprises (data.gouv.fr)')
      const data = await this.sireneClient.get<{
        results?: Array<{
          siret: string
          siren: string
          nom_complet: string
          forme_juridique?: string
          activite_principale?: string
          libelle_activite_principale?: string
          adresse?: {
            numero_voie?: string
            type_voie?: string
            libelle_voie?: string
            code_postal?: string
            ville?: string
            region?: string
          }
        }>
      }>(`/search`, {
        q: cleanSiret,
        per_page: '1',
      })

      log.debug({
        hasResults: !!data.results,
        resultsCount: data.results?.length || 0,
      }, 'Réponse API Recherche d\'Entreprises')

      if (!data.results || data.results.length === 0) {
        log.warn({ siret }, 'Aucune entreprise trouvée via API Recherche d\'Entreprises')
        return null
      }

      const company = data.results[0]
      log.info({
        siret: company.siret,
        name: company.nom_complet,
        hasAddress: !!company.adresse,
      }, 'Données récupérées via API Recherche d\'Entreprises')

      // Construire l'enrichissement
      const enrichment: CompanyEnrichment = {
        siret: company.siret,
        siren: company.siren,
        name: company.nom_complet,
        legalStatus: company.forme_juridique,
        address: company.adresse
          ? {
              street: [
                company.adresse.numero_voie,
                company.adresse.type_voie,
                company.adresse.libelle_voie,
              ]
                .filter(Boolean)
                .join(' '),
              city: company.adresse.ville || '',
              postalCode: company.adresse.code_postal || '',
              region: company.adresse.region || '',
            }
          : undefined,
        activities: company.activite_principale
          ? [
              {
                code: company.activite_principale,
                label: company.libelle_activite_principale || '',
              },
            ]
          : [],
      }

      // Enrichir avec Infogreffe pour données financières et juridiques
      let infogreffeData = null
      try {
        const siren = company.siren || cleanSiret.substring(0, 9)
        if (siren) {
          log.debug({ siren }, 'Enrichissement Infogreffe')
          infogreffeData = await this.infogreffeService.getCompanyData(siren)

          if (infogreffeData && infogreffeData.available) {
            // Enrichir avec les données financières
            if (infogreffeData.financial) {
              enrichment.financialData = {
                ca:
                  infogreffeData.financial.turnover?.years?.map(
                    (y) => y.amount
                  ) ||
                  (infogreffeData.financial.turnover?.lastYear
                    ? [infogreffeData.financial.turnover.lastYear]
                    : []),
                result:
                  infogreffeData.financial.netResult?.years?.map(
                    (y) => y.amount
                  ) ||
                  (infogreffeData.financial.netResult?.lastYear
                    ? [infogreffeData.financial.netResult.lastYear]
                    : []),
                ebitda: infogreffeData.financial.ebitda,
                debt: infogreffeData.financial.debt?.total,
                lastUpdate:
                  infogreffeData.financial.lastUpdate ||
                  infogreffeData.lastUpdated,
              }
            }

            // Enrichir avec les données juridiques (procédures collectives)
            if (infogreffeData.legal?.collectiveProcedures) {
              const ongoingProcedures =
                infogreffeData.legal.collectiveProcedures.filter(
                  (proc) => proc.status === 'ongoing'
                )
              if (ongoingProcedures.length > 0) {
                enrichment.legalStatusDetails = {
                  hasCollectiveProcedure: true,
                  procedureType: ongoingProcedures[0].type,
                  procedureDate: ongoingProcedures[0].startDate,
                }
              }
            }

            log.info({
              hasFinancial: !!enrichment.financialData,
              hasLegal: !!enrichment.legalStatusDetails,
            }, 'Données Infogreffe récupérées')
          }
        }
      } catch (error) {
        log.warn({ err: error }, 'Erreur enrichissement Infogreffe')
        // Ne pas échouer si Infogreffe échoue, on garde les données Sirene
      }

      // TODO: Enrichir avec d'autres APIs pour les assurances
      // - API Assurance (à implémenter)
      // - API Certifications (à implémenter)

      log.info('Enrichissement terminé avec succès')
      return enrichment
    } catch (error) {
      log.error({
        err: error,
        siret,
        message: error instanceof Error ? error.message : String(error),
      }, 'Erreur lors de l\'enrichissement SIRET')
      return null
    }
  }

  /**
   * Convertit un SireneCompany en CompanyEnrichment
   */
  private mapSireneCompanyToEnrichment(
    company: SireneCompany
  ): CompanyEnrichment {
    return {
      siret: company.siret,
      siren: company.siren,
      name: company.name,
      legalStatus: company.legalFormLabel || company.legalForm,
      address: company.address
        ? {
            street: company.address.street || '',
            city: company.address.city || '',
            postalCode: company.address.postalCode || '',
            region: company.address.region || '',
          }
        : undefined,
      activities: company.nafCode
        ? [
            {
              code: company.nafCode,
              label: company.nafLabel || '',
            },
            ...(company.secondaryActivities || []),
          ]
        : [],
    }
  }

  /**
   * Valide le format d'un SIRET
   */
  private isValidSiret(siret: string): boolean {
    // SIRET = 14 chiffres
    if (!/^\d{14}$/.test(siret)) {
      return false
    }

    // Vérification de la clé de contrôle (algorithme de Luhn)
    let sum = 0
    for (let i = 0; i < 14; i++) {
      let digit = parseInt(siret[i])
      if (i % 2 === 1) {
        digit *= 2
        if (digit > 9) {
          digit -= 9
        }
      }
      sum += digit
    }

    return sum % 10 === 0
  }

  /**
   * Recherche une entreprise par nom
   * Utilise d'abord le service Sirene complet, puis fallback sur API Recherche d'Entreprises
   */
  async searchByName(name: string, limit = 5): Promise<CompanyEnrichment[]> {
    try {
      // 1. Essayer d'abord avec le service Sirene (API INSEE si disponible)
      const sireneResults = await this.sireneService.searchCompanies(name, {
        perPage: limit,
        status: 'ACTIVE',
      })

      if (sireneResults.companies.length > 0) {
        return sireneResults.companies.map((company) =>
          this.mapSireneCompanyToEnrichment(company)
        )
      }

      // 2. Fallback sur l'API Recherche d'Entreprises (data.gouv.fr)
      const data = await this.sireneClient.get<{
        results?: Array<{
          siret: string
          siren: string
          nom_complet: string
          forme_juridique?: string
          adresse?: {
            ville?: string
            code_postal?: string
          }
        }>
      }>(`/search`, {
        q: name,
        per_page: String(limit),
      })

      if (!data.results || data.results.length === 0) {
        return []
      }

      return data.results.map((company) => ({
        siret: company.siret,
        siren: company.siren,
        name: company.nom_complet,
        legalStatus: company.forme_juridique,
        address: company.adresse
          ? {
              city: company.adresse.ville || '',
              postalCode: company.adresse.code_postal || '',
              street: '',
              region: '',
            }
          : undefined,
      }))
    } catch (error) {
      log.error({ err: error, name }, 'Erreur lors de la recherche par nom')
      return []
    }
  }

  /**
   * Vérifie et certifie les données d'une entreprise
   */
  async verifyCompany(data: {
    siren?: string
    siret?: string
    name?: string
    address?: string
  }): Promise<{
    valid: boolean
    company?: CompanyEnrichment
    errors: string[]
    warnings: string[]
    matchScore?: number
  }> {
    try {
      const verification = await this.sireneService.verifyCompany(data)

      return {
        valid: verification.valid,
        company: verification.company
          ? this.mapSireneCompanyToEnrichment(verification.company)
          : undefined,
        errors: verification.errors,
        warnings: verification.warnings,
        matchScore: verification.matchScore,
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur vérification entreprise')
      return {
        valid: false,
        errors: ['Erreur lors de la vérification'],
        warnings: [],
      }
    }
  }
}
