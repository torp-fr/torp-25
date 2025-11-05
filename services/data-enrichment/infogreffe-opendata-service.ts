/**
 * Service d'enrichissement via API OpenData Infogreffe
 * API GRATUITE basée sur Opendatasoft
 *
 * Documentation: https://opendata.datainfogreffe.fr/api/explore/v2.1/swagger.json
 *
 * Datasets disponibles:
 * - Immatriculations au RCS
 * - Comptes annuels déposés
 * - Annonces BODACC (procédures collectives)
 * - Radiations
 */

import { loggers } from '@/lib/logger'
import type { EnrichedCompanyData } from '../scoring/advanced/types'

const log = loggers.enrichment

interface InfogreffeOpenDataConfig {
  baseUrl: string
  apiKey?: string // Optionnel pour l'API publique
}

export class InfogreffeOpenDataService {
  private config: InfogreffeOpenDataConfig

  constructor() {
    this.config = {
      baseUrl: 'https://opendata.datainfogreffe.fr/api/explore/v2.1',
      apiKey: process.env.INFOGREFFE_OPENDATA_API_KEY || undefined,
    }
  }

  /**
   * Enrichit les données entreprise depuis Infogreffe OpenData
   */
  async enrichCompany(siren: string): Promise<Partial<EnrichedCompanyData> | null> {
    try {
      log.debug({ siren }, 'Enrichissement Infogreffe OpenData')

      const results: Partial<EnrichedCompanyData> = {}

      // 1. Récupérer les données d'immatriculation RCS
      const rcsData = await this.getCompanyRCSData(siren)
      if (rcsData) {
        Object.assign(results, rcsData)
      }

      // 2. Récupérer les comptes annuels (bilans)
      const financialData = await this.getCompanyFinancials(siren)
      if (financialData) {
        results.financialData = financialData
      }

      // 3. Vérifier les procédures collectives
      const legalStatus = await this.checkCollectiveProcedures(siren)
      if (legalStatus) {
        results.legalStatusDetails = legalStatus
      }

      if (Object.keys(results).length === 0) {
        log.warn({ siren }, 'Aucune donnée Infogreffe trouvée')
        return null
      }

      log.info({ siren, keysFound: Object.keys(results) }, 'Données Infogreffe récupérées')
      return results

    } catch (error) {
      log.error({ err: error, siren }, 'Erreur enrichissement Infogreffe OpenData')
      return null
    }
  }

  /**
   * Récupère les données d'immatriculation RCS
   */
  private async getCompanyRCSData(siren: string): Promise<Partial<EnrichedCompanyData> | null> {
    try {
      // Dataset probable: "immatriculations" ou "entreprises-immatriculees"
      // On utilise une requête ODSQL pour chercher par SIREN
      const url = this.buildUrl(`/catalog/datasets/immatriculations/records`, {
        where: `siren="${siren}"`,
        limit: '1',
      })

      const response = await fetch(url)
      if (!response.ok) {
        log.debug({ status: response.status, siren }, 'Dataset immatriculations non trouvé')
        return null
      }

      const data = await response.json()
      if (!data.results || data.results.length === 0) {
        return null
      }

      const record = data.results[0]

      return {
        siren: record.siren,
        siret: record.siret,
        name: record.denomination || record.nom_entreprise,
        legalStatus: record.forme_juridique || record.libelle_forme_juridique,
        address: record.adresse ? {
          street: record.adresse,
          city: record.ville || record.libelle_commune,
          postalCode: record.code_postal,
          region: record.region,
        } : undefined,
        activities: record.code_naf || record.activite_principale ? [{
          code: record.code_naf || record.activite_principale,
          label: record.libelle_naf || record.activite_principale_libelle || '',
        }] : [],
      }
    } catch (error) {
      log.debug({ err: error, siren }, 'Erreur récupération RCS')
      return null
    }
  }

  /**
   * Récupère les données financières (bilans/comptes annuels)
   */
  private async getCompanyFinancials(siren: string): Promise<any | null> {
    try {
      // Dataset probable: "comptes-annuels" ou "bilans-publies"
      const url = this.buildUrl(`/catalog/datasets/comptes-annuels/records`, {
        where: `siren="${siren}"`,
        order_by: 'date_cloture_exercice desc',
        limit: '3', // 3 derniers exercices
      })

      const response = await fetch(url)
      if (!response.ok) {
        log.debug({ status: response.status, siren }, 'Dataset comptes-annuels non trouvé')
        return null
      }

      const data = await response.json()
      if (!data.results || data.results.length === 0) {
        return null
      }

      // Extraire CA, résultats, etc.
      const financials = {
        ca: data.results.map((r: any) => r.chiffre_affaires || r.montant_ca).filter(Boolean),
        result: data.results.map((r: any) => r.resultat || r.resultat_net).filter(Boolean),
        debt: data.results[0]?.dettes || data.results[0]?.total_dettes,
        lastUpdate: data.results[0]?.date_cloture_exercice,
      }

      return Object.values(financials).some(v => v !== null && v !== undefined) ? financials : null
    } catch (error) {
      log.debug({ err: error, siren }, 'Erreur récupération bilans')
      return null
    }
  }

  /**
   * Vérifie les procédures collectives (BODACC)
   */
  private async checkCollectiveProcedures(siren: string): Promise<any | null> {
    try {
      // Dataset BODACC - Annonces légales
      const url = this.buildUrl(`/catalog/datasets/bodacc-annonces/records`, {
        where: `siren="${siren}" and (type_procedure="Procédure collective" or famille_evenement="Procédure collective")`,
        order_by: 'date_publication desc',
        limit: '1',
      })

      const response = await fetch(url)
      if (!response.ok) {
        log.debug({ status: response.status, siren }, 'Dataset BODACC non trouvé')
        return null
      }

      const data = await response.json()
      if (!data.results || data.results.length === 0) {
        // Aucune procédure = bon signe
        return {
          hasCollectiveProcedure: false,
        }
      }

      const record = data.results[0]

      return {
        hasCollectiveProcedure: true,
        procedureType: record.type_procedure || record.evenement,
        procedureDate: record.date_jugement || record.date_publication,
        tribunal: record.tribunal,
      }
    } catch (error) {
      log.debug({ err: error, siren }, 'Erreur vérification procédures collectives')
      return null
    }
  }

  /**
   * Construit l'URL avec les paramètres
   */
  private buildUrl(path: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.config.baseUrl}${path}`)

    // Ajouter l'API key si disponible
    if (this.config.apiKey) {
      url.searchParams.set('apikey', this.config.apiKey)
    }

    // Ajouter les autres paramètres
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    return url.toString()
  }

  /**
   * Liste les datasets disponibles (pour debug)
   */
  async listAvailableDatasets(): Promise<string[]> {
    try {
      const url = this.buildUrl('/catalog/datasets', { limit: '100' })
      const response = await fetch(url)

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.results.map((d: any) => d.dataset_id)
    } catch (error) {
      log.error({ err: error }, 'Erreur liste datasets')
      return []
    }
  }
}
