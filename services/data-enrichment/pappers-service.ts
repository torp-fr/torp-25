/**
 * Service d'enrichissement via Pappers.fr
 * Données entreprises enrichies, scores, avis
 */

import { ApiClient } from './api-client'
import type { EnrichedCompanyData } from '../scoring/advanced/types'

export class PappersEnrichmentService {
  private apiClient?: ApiClient

  constructor() {
    // Pappers API (généralement payante)
    const pappersApiKey = process.env.PAPPERS_API_KEY
    if (pappersApiKey) {
      this.apiClient = new ApiClient({
        baseUrl: process.env.PAPPERS_API_URL || 'https://api.pappers.fr/v2',
        apiKey: pappersApiKey,
        timeout: 10000,
        retries: 2,
      })
    }
  }

  /**
   * Enrichit les données complètes depuis Pappers
   */
  async enrichCompany(siret: string): Promise<Partial<EnrichedCompanyData> | null> {
    try {
      if (!this.apiClient) {
        console.warn('[PappersService] API key non configurée')
        return null
      }

      const data = await this.apiClient.get<{
        entreprise?: {
          siret: string
          siren: string
          denomination: string
          forme_juridique?: string
          adresse?: {
            numero_voie?: string
            type_voie?: string
            libelle_voie?: string
            code_postal?: string
            ville?: string
            region?: string
          }
          activite_principale?: string
          effectifs?: number
          chiffre_affaires?: number
          resultat?: number
          score?: {
            valeur?: string
            type?: string
          }
        }
      }>(`/entreprise`, {
        siret,
      })

      if (!data.entreprise) {
        return null
      }

      const entreprise = data.entreprise

      return {
        siret: entreprise.siret,
        siren: entreprise.siren,
        name: entreprise.denomination,
        legalStatus: entreprise.forme_juridique,
        address: entreprise.adresse
          ? {
              street: [
                entreprise.adresse.numero_voie,
                entreprise.adresse.type_voie,
                entreprise.adresse.libelle_voie,
              ]
                .filter(Boolean)
                .join(' '),
              city: entreprise.adresse.ville || '',
              postalCode: entreprise.adresse.code_postal || '',
              region: entreprise.adresse.region || '',
            }
          : undefined,
        activities: entreprise.activite_principale
          ? [
              {
                code: entreprise.activite_principale,
                label: '',
              },
            ]
          : [],
        humanResources: entreprise.effectifs
          ? {
              employees: entreprise.effectifs,
            }
          : undefined,
        financialData: entreprise.chiffre_affaires || entreprise.resultat
          ? {
              ca: entreprise.chiffre_affaires ? [entreprise.chiffre_affaires] : [],
              result: entreprise.resultat ? [entreprise.resultat] : [],
              lastUpdate: new Date().toISOString(),
            }
          : undefined,
        financialScore: entreprise.score
          ? {
              banqueDeFrance: entreprise.score.valeur,
            }
          : undefined,
      }
    } catch (error) {
      console.error(`[PappersService] Erreur enrichissement SIRET ${siret}:`, error)
      return null
    }
  }

  /**
   * Récupère les avis et la réputation (si disponible via Pappers ou scraping légal)
   */
  async getReputation(siret: string): Promise<EnrichedCompanyData['reputation'] | null> {
    try {
      // Note: Pappers peut avoir des données d'avis agrégés
      // Sinon, on peut utiliser un service de scraping légal d'avis
      if (!this.apiClient) {
        return null
      }

      // TODO: Implémenter la récupération d'avis via Pappers si disponible
      // Pour l'instant, retourner null et utiliser un service dédié
      return null
    } catch (error) {
      console.error(`[PappersService] Erreur réputation SIRET ${siret}:`, error)
      return null
    }
  }
}

