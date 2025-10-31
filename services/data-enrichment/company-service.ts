/**
 * Service d'enrichissement des données d'entreprise
 * Utilise l'API Sirene (INSEE et data.gouv.fr) et autres sources
 */

import { ApiClient } from './api-client'
import type { CompanyEnrichment } from './types'
import { SireneService, type SireneCompany } from '../external-apis/sirene-service'

export class CompanyEnrichmentService {
  private sireneClient: ApiClient
  private sireneService: SireneService

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
  }

  /**
   * Enrichit les données d'une entreprise à partir du SIRET
   * Utilise d'abord le service Sirene complet, puis fallback sur API Recherche d'Entreprises
   */
  async enrichFromSiret(siret: string): Promise<CompanyEnrichment | null> {
    try {
      // Nettoyer le SIRET (supprimer espaces)
      const cleanSiret = siret.replace(/\s/g, '')

      if (!this.isValidSiret(cleanSiret)) {
        console.warn(`[CompanyService] SIRET invalide: ${siret}`)
        return null
      }

      // 1. Essayer d'abord avec le service Sirene complet (API INSEE)
      const sireneCompany = await this.sireneService.getCompanyBySiret(cleanSiret)
      if (sireneCompany) {
        return this.mapSireneCompanyToEnrichment(sireneCompany)
      }

      // 2. Fallback sur l'API Recherche d'Entreprises (data.gouv.fr) - gratuite
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

      if (!data.results || data.results.length === 0) {
        console.warn(`[CompanyService] Aucune entreprise trouvée pour SIRET: ${siret}`)
        return null
      }

      const company = data.results[0]

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

      // TODO: Enrichir avec d'autres APIs pour les assurances
      // - API Infogreffe (payante) pour données financières
      // - API Assurance (à implémenter)
      // - API Certifications (à implémenter)

      return enrichment
    } catch (error) {
      console.error(`[CompanyService] Erreur lors de l'enrichissement SIRET ${siret}:`, error)
      return null
    }
  }

  /**
   * Convertit un SireneCompany en CompanyEnrichment
   */
  private mapSireneCompanyToEnrichment(company: SireneCompany): CompanyEnrichment {
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
      console.error(`[CompanyService] Erreur lors de la recherche par nom "${name}":`, error)
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
      console.error('[CompanyService] Erreur vérification entreprise:', error)
      return {
        valid: false,
        errors: ['Erreur lors de la vérification'],
        warnings: [],
      }
    }
  }
}

