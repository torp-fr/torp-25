/**
 * Service d'enrichissement des données d'entreprise
 * Utilise l'API Sirene (data.gouv.fr) et autres sources
 */

import { ApiClient } from './api-client'
import type { CompanyEnrichment } from './types'

export class CompanyEnrichmentService {
  private sireneClient: ApiClient

  constructor() {
    // API Recherche d'Entreprises (data.gouv.fr) - gratuite, sans clé
    // Documentation: https://www.data.gouv.fr/fr/datasets/api-recherche-entreprises/
    this.sireneClient = new ApiClient({
      baseUrl: 'https://recherche-entreprises.api.gouv.fr',
      timeout: 8000,
      retries: 2,
    })
  }

  /**
   * Enrichit les données d'une entreprise à partir du SIRET
   */
  async enrichFromSiret(siret: string): Promise<CompanyEnrichment | null> {
    try {
      // Nettoyer le SIRET (supprimer espaces)
      const cleanSiret = siret.replace(/\s/g, '')

      if (!this.isValidSiret(cleanSiret)) {
        console.warn(`[CompanyService] SIRET invalide: ${siret}`)
        return null
      }

      // Appel à l'API Recherche d'Entreprises (data.gouv.fr)
      // Endpoint: GET /search?q={siret}
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
   */
  async searchByName(name: string, limit = 5): Promise<CompanyEnrichment[]> {
    try {
      // Appel à l'API Recherche d'Entreprises par nom
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
}

