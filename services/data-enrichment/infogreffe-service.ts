/**
 * Service d'enrichissement via Infogreffe
 * Données financières, bilans, procédures collectives
 */

import { ApiClient } from './api-client'
import type { EnrichedCompanyData } from '../scoring/advanced/types'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export class InfogreffeEnrichmentService {
  private apiClient?: ApiClient

  constructor() {
    // Infogreffe API (peut nécessiter une clé API selon l'offre)
    // Note: Infogreffe propose une API payante, mais certaines données sont accessibles via scraping légal
    const infogreffeApiKey = process.env.INFOGREFFE_API_KEY
    if (infogreffeApiKey) {
      this.apiClient = new ApiClient({
        baseUrl: process.env.INFOGREFFE_API_URL || 'https://api.infogreffe.fr/v1',
        apiKey: infogreffeApiKey,
        timeout: 10000,
        retries: 2,
      })
    }
  }

  /**
   * Enrichit les données financières depuis Infogreffe
   */
  async enrichFinancialData(siren: string): Promise<EnrichedCompanyData['financialData'] | null> {
    try {
      if (!this.apiClient) {
        log.warn('API key Infogreffe non configurée - données limitées')
        return null
      }

      // Appel à l'API Infogreffe pour les bilans
      const data = await this.apiClient.get<{
        bilans?: Array<{
          annee: number
          chiffreAffaires?: number
          resultat?: number
          ebitda?: number
          dette?: number
        }>
      }>(`/companies/${siren}/bilans`, {
        years: '3', // 3 dernières années
      })

      if (!data.bilans || data.bilans.length === 0) {
        return null
      }

      // Trier par année et extraire les données
      const sortedBilans = data.bilans.sort((a, b) => b.annee - a.annee)

      return {
        ca: sortedBilans.map((b) => b.chiffreAffaires || 0),
        result: sortedBilans.map((b) => b.resultat || 0),
        ebitda: sortedBilans[0]?.ebitda,
        debt: sortedBilans[0]?.dette,
        lastUpdate: new Date().toISOString(),
      }
    } catch (error) {
      log.error({ err: error, siren }, 'Erreur enrichissement financier Infogreffe')
      return null
    }
  }

  /**
   * Vérifie les procédures collectives
   */
  async checkCollectiveProcedures(siren: string): Promise<EnrichedCompanyData['legalStatusDetails'] | null> {
    try {
      if (!this.apiClient) {
        // Fallback: Vérification via BODACC (API publique data.gouv.fr)
        return await this.checkBODACC(siren)
      }

      const data = await this.apiClient.get<{
        procedures?: Array<{
          type: string
          dateOuverture: string
          statut: string
        }>
      }>(`/companies/${siren}/procedures`)

      if (!data.procedures || data.procedures.length === 0) {
        return {
          hasCollectiveProcedure: false,
        }
      }

      const activeProcedures = data.procedures.filter((p) => p.statut === 'en_cours')

      return {
        hasCollectiveProcedure: activeProcedures.length > 0,
        procedureType: activeProcedures[0]?.type,
        procedureDate: activeProcedures[0]?.dateOuverture,
      }
    } catch (error) {
      console.error(`[InfogreffeService] Erreur vérification procédures SIREN ${siren}:`, error)
      return await this.checkBODACC(siren)
    }
  }

  /**
   * Vérification via BODACC (Bulletin Officiel des Annonces Civiles et Commerciales)
   * API publique gratuite via data.gouv.fr
   */
  private async checkBODACC(siren: string): Promise<EnrichedCompanyData['legalStatusDetails'] | null> {
    try {
      const bodaccClient = new ApiClient({
        baseUrl: 'https://data.gouv.fr/api/1',
        timeout: 8000,
        retries: 2,
      })

      // Recherche dans BODACC (dataset public)
      const data = await bodaccClient.get<{
        results?: Array<{
          type: string
          date: string
          statut: string
        }>
      }>(`/datasets/bodacc`, {
        q: siren,
        rows: '10',
      })

      if (!data.results || data.results.length === 0) {
        return {
          hasCollectiveProcedure: false,
        }
      }

      // Filtrer les procédures collectives
      const procedures = data.results.filter((r) =>
        ['liquidation', 'redressement', 'sauvegarde'].includes(r.type.toLowerCase())
      )

      return {
        hasCollectiveProcedure: procedures.length > 0,
        procedureType: procedures[0]?.type,
        procedureDate: procedures[0]?.date,
      }
    } catch (error) {
      console.error(`[InfogreffeService] Erreur BODACC SIREN ${siren}:`, error)
      return null
    }
  }

  /**
   * Récupère le score Banque de France (si accessible)
   */
  async getBanqueDeFranceScore(siren: string): Promise<string | null> {
    try {
      // Note: L'API Banque de France n'est généralement pas accessible publiquement
      // Cette fonction est un placeholder pour une future intégration
      // TODO: Utiliser siren pour récupérer le score BDF
      return null
    } catch (error) {
      console.error(`[InfogreffeService] Erreur score BDF SIREN ${siren}:`, error)
      return null
    }
  }
}

