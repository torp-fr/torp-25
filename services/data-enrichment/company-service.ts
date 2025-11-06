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
   * Avec retry logic et validation assouplie pour meilleure robustesse
   */
  async enrichFromSiret(siret: string): Promise<CompanyEnrichment | null> {
    try {
      // Nettoyer le SIRET (supprimer espaces, tirets, points)
      const cleanSiret = siret.replace(/[\s\-\.]/g, '')
      console.log(
        `[CompanyService] 🔍 Enrichissement pour SIRET: ${cleanSiret} (original: ${siret})`
      )

      // Validation assouplie - vérifier format avant la clé de Luhn
      if (!/^\d{14}$/.test(cleanSiret)) {
        console.warn(
          `[CompanyService] ❌ Format SIRET invalide (doit être 14 chiffres): ${siret} → ${cleanSiret}`
        )
        return null
      }

      // Validation Luhn (mais continuer même si échec pour être plus permissif)
      const isValidLuhn = this.isValidSiret(cleanSiret)
      if (!isValidLuhn) {
        console.warn(
          `[CompanyService] ⚠️ SIRET échoue validation Luhn: ${cleanSiret} (mais on continue quand même)`
        )
        // Ne pas retourner null, continuer avec le SIRET nettoyé
      }

      // Retry logic : jusqu'à 3 tentatives avec backoff exponentiel
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt > 1) {
            const backoff = attempt * 1000 // 1s, 2s, 3s
            console.log(`[CompanyService] ⏳ Retry ${attempt}/3 après ${backoff}ms...`)
            await this.delay(backoff)
          }

          // 1. Essayer d'abord avec le service Sirene complet (API INSEE ou fallback data.gouv.fr)
          console.log(
            `[CompanyService] 🔄 Tentative ${attempt}: SireneService.getCompanyBySiret...`
          )
          const sireneCompany =
            await this.sireneService.getCompanyBySiret(cleanSiret)

          if (sireneCompany) {
            console.log(
              `[CompanyService] ✅ Données récupérées via SireneService (tentative ${attempt})`
            )
            const enrichment = this.mapSireneCompanyToEnrichment(sireneCompany)

            // Enrichir avec Infogreffe après succès Sirene (non bloquant)
            await this.enrichWithInfogreffe(enrichment, cleanSiret)

            return enrichment
          } else {
            console.log(
              `[CompanyService] ⚠️ SireneService a retourné null (tentative ${attempt})`
            )
          }
        } catch (sireneError) {
          lastError = sireneError instanceof Error ? sireneError : new Error(String(sireneError))
          console.warn(
            `[CompanyService] ⚠️ Erreur SireneService (tentative ${attempt}):`,
            lastError.message
          )

          // Si dernière tentative, on ne retry plus
          if (attempt === 3) {
            console.error(
              `[CompanyService] ❌ Échec après 3 tentatives, passage au fallback API Recherche d'Entreprises`
            )
          }
        }
      }

      // 2. Fallback sur l'API Recherche d'Entreprises (data.gouv.fr) - gratuite
      console.log(
        "[CompanyService] 🔄 Fallback sur API Recherche d'Entreprises (data.gouv.fr)..."
      )
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

      console.log(`[CompanyService] 📋 Réponse API Recherche d'Entreprises:`, {
        hasResults: !!data.results,
        resultsCount: data.results?.length || 0,
      })

      if (!data.results || data.results.length === 0) {
        console.warn(
          `[CompanyService] ❌ Aucune entreprise trouvée pour SIRET: ${siret} via API Recherche d'Entreprises`
        )
        return null
      }

      const company = data.results[0]
      console.log(
        "[CompanyService] ✅ Données récupérées via API Recherche d'Entreprises:",
        {
          siret: company.siret,
          name: company.nom_complet,
          hasAddress: !!company.adresse,
        }
      )

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

      // Enrichir avec Infogreffe après succès API Recherche d'Entreprises (non bloquant)
      await this.enrichWithInfogreffe(enrichment, cleanSiret)

      console.log('[CompanyService] ✅ Enrichissement terminé avec succès')
      return enrichment
    } catch (error) {
      console.error(
        `[CompanyService] ❌ Erreur lors de l'enrichissement SIRET ${siret}:`,
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )
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
      console.error(
        `[CompanyService] Erreur lors de la recherche par nom "${name}":`,
        error
      )
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

  /**
   * Enrichit les données avec Infogreffe (non bloquant)
   * Ajoute les données financières et juridiques si disponibles
   */
  private async enrichWithInfogreffe(
    enrichment: CompanyEnrichment,
    siret: string
  ): Promise<void> {
    try {
      const siren = siret.substring(0, 9)
      console.log(
        `[CompanyService] 🔄 Enrichissement Infogreffe pour SIREN: ${siren}`
      )

      const infogreffeData = await this.infogreffeService.getCompanyData(siren)

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

        console.log(`[CompanyService] ✅ Données Infogreffe récupérées:`, {
          hasFinancial: !!enrichment.financialData,
          hasLegal: !!enrichment.legalStatusDetails,
        })
      }
    } catch (error) {
      console.warn(
        `[CompanyService] ⚠️ Erreur enrichissement Infogreffe (non bloquant):`,
        error
      )
      // Ne pas échouer si Infogreffe échoue, on garde les données Sirene
    }
  }

  /**
   * Utilitaire : délai pour retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
