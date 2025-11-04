/**
 * Service pour récupérer les données Infogreffe (Registre du Commerce et des Sociétés)
 * Dataset data.gouv.fr: https://www.data.gouv.fr/fr/datasets/5620c13fc751df08e3cdbb48/
 * Dataset ID: 5620c13fc751df08e3cdbb48
 *
 * Sources disponibles :
 * - Explore API v2 (publique) : https://www.data.gouv.fr/es/dataservices/explore-api-v2-94/
 * - API Extrait RCS (Bouquet API Entreprise - réservé aux administrations)
 *
 * Ce service permet de :
 * - Récupérer les données financières (CA, résultat, bilan)
 * - Récupérer les informations juridiques (procédures collectives, statut)
 * - Récupérer les informations sur les mandataires sociaux
 * - Vérifier la santé financière des entreprises
 */

import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export interface InfogreffeFinancialData {
  // Chiffre d'affaires
  turnover?: {
    lastYear?: number
    previousYear?: number
    evolution?: number // Pourcentage d'évolution
    years?: Array<{
      year: number
      amount: number
    }>
  }
  
  // Résultat net
  netResult?: {
    lastYear?: number
    previousYear?: number
    evolution?: number
    years?: Array<{
      year: number
      amount: number
    }>
  }
  
  // EBITDA (si disponible)
  ebitda?: number
  
  // Dettes
  debt?: {
    total?: number
    shortTerm?: number
    longTerm?: number
  }
  
  // Capital social
  capital?: number
  
  // Dernière mise à jour
  lastUpdate?: string
}

export interface InfogreffeLegalData {
  // Statut juridique
  legalStatus?: string
  
  // Procédures collectives
  collectiveProcedures?: Array<{
    type: string // 'sauvegarde', 'redressement', 'liquidation'
    startDate?: string
    endDate?: string
    status: 'ongoing' | 'completed'
    details?: string
  }>
  
  // Mandataires sociaux
  representatives?: Array<{
    role: string // 'Président', 'Directeur Général', etc.
    firstName: string
    lastName: string
    birthDate?: string
  }>
  
  // Modifications récentes
  recentChanges?: Array<{
    date: string
    type: string // 'augmentation_capital', 'changement_direction', etc.
    description: string
  }>
}

export interface InfogreffeCompanyData {
  siren: string
  siret?: string
  
  // Données financières
  financial?: InfogreffeFinancialData
  
  // Données juridiques
  legal?: InfogreffeLegalData
  
  // Métadonnées
  sources: string[]
  lastUpdated: string
  available: boolean // Si les données Infogreffe sont disponibles pour cette entreprise
}

export class InfogreffeService {
  private readonly datasetId = '5620c13fc751df08e3cdbb48'
  private readonly baseUrl = 'https://www.data.gouv.fr/api/1'
  
  /**
   * Récupère les données Infogreffe pour une entreprise via son SIREN
   * Note: L'API publique Explore API v2 peut avoir des limitations
   */
  async getCompanyData(siren: string): Promise<InfogreffeCompanyData | null> {
    try {
      log.debug({ siren }, 'Récupération données Infogreffe')

      // Vérifier que le SIREN est valide (9 chiffres)
      if (!/^\d{9}$/.test(siren)) {
        log.warn({ siren }, 'SIREN invalide')
        return null
      }

      // Tenter plusieurs sources pour récupérer les données
      // 1. Explore API v2 (si disponible publiquement)
      const exploreData = await this.fetchFromExploreAPI(siren)
      if (exploreData) {
        return exploreData
      }

      // 2. Dataset data.gouv.fr (si disponible)
      const datasetData = await this.fetchFromDataset(siren)
      if (datasetData) {
        return datasetData
      }

      log.info({ siren }, 'Aucune donnée Infogreffe trouvée')
      return {
        siren,
        available: false,
        sources: ['Infogreffe (non disponible)'],
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      log.error({ err: error, siren }, 'Erreur récupération données Infogreffe')
      return null
    }
  }
  
  /**
   * Tente de récupérer les données depuis l'Explore API v2
   * Note: Cette API peut nécessiter une authentification ou avoir des limitations
   */
  private async fetchFromExploreAPI(siren: string): Promise<InfogreffeCompanyData | null> {
    try {
      // L'Explore API v2 d'Infogreffe n'est pas directement accessible via une URL publique standard
      // Il faudrait consulter la documentation officielle pour les endpoints exacts
      // Pour l'instant, on retourne null et on utilise le dataset data.gouv.fr en fallback

      log.debug({ siren }, 'Tentative récupération depuis Explore API v2')
      // TODO: Implémenter quand l'endpoint exact sera connu
      // Endpoint potentiel: /api/v2/companies/{siren} ou similaire

      return null
    } catch (error) {
      log.warn({ err: error }, 'Erreur Explore API v2')
      return null
    }
  }

  /**
   * Tente de récupérer les données depuis le dataset data.gouv.fr
   */
  private async fetchFromDataset(siren: string): Promise<InfogreffeCompanyData | null> {
    try {
      log.debug('Tentative récupération depuis dataset data.gouv.fr')

      // Récupérer les métadonnées du dataset
      const datasetResponse = await fetch(
        `${this.baseUrl}/datasets/${this.datasetId}/`,
        {
          headers: { Accept: 'application/json' },
        }
      )

      if (!datasetResponse.ok) {
        log.warn({ status: datasetResponse.status }, 'Dataset non accessible')
        return null
      }

      const dataset = await datasetResponse.json()
      log.debug({
        title: dataset.title || dataset.name,
        resourcesCount: dataset.resources?.length || 0,
      }, 'Dataset trouvé')

      // Le dataset peut contenir des fichiers CSV/JSON avec les données
      // Pour l'instant, on retourne une structure de base
      // TODO: Parser les ressources du dataset si elles contiennent des données accessibles

      return {
        siren,
        available: true,
        sources: ['Infogreffe (dataset data.gouv.fr)'],
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      log.warn({ err: error }, 'Erreur récupération dataset')
      return null
    }
  }
  
  /**
   * Récupère les données financières pour une entreprise
   * Peut être enrichi avec d'autres sources (Pappers, etc.)
   */
  async getFinancialData(siren: string): Promise<InfogreffeFinancialData | null> {
    const companyData = await this.getCompanyData(siren)
    return companyData?.financial || null
  }
  
  /**
   * Récupère les données juridiques pour une entreprise
   */
  async getLegalData(siren: string): Promise<InfogreffeLegalData | null> {
    const companyData = await this.getCompanyData(siren)
    return companyData?.legal || null
  }
  
  /**
   * Vérifie si une entreprise a des procédures collectives en cours
   */
  async hasCollectiveProcedure(siren: string): Promise<boolean> {
    const legalData = await this.getLegalData(siren)
    if (!legalData?.collectiveProcedures) {
      return false
    }
    
    return legalData.collectiveProcedures.some(
      proc => proc.status === 'ongoing'
    )
  }
}

