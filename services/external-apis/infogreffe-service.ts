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
      console.log(`[InfogreffeService] 🔍 Récupération données Infogreffe pour SIREN: ${siren}`)
      
      // Vérifier que le SIREN est valide (9 chiffres)
      if (!/^\d{9}$/.test(siren)) {
        console.warn(`[InfogreffeService] ⚠️ SIREN invalide: ${siren}`)
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
      
      console.warn(`[InfogreffeService] ⚠️ Aucune donnée Infogreffe trouvée pour SIREN: ${siren}`)
      return {
        siren,
        available: false,
        sources: ['Infogreffe (non disponible)'],
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[InfogreffeService] ❌ Erreur récupération données Infogreffe:', error)
      return null
    }
  }
  
  /**
   * Tente de récupérer les données depuis l'Explore API v2
   * Note: Cette API peut nécessiter une authentification ou avoir des limitations
   */
  private async fetchFromExploreAPI(siren: string): Promise<InfogreffeCompanyData | null> {
    try {
      console.log(`[InfogreffeService] 🔄 Tentative récupération depuis Explore API v2 pour SIREN: ${siren}`)

      // Base URL de l'API OpenDataSoft Infogreffe
      const baseUrl = 'https://opendata.datainfogreffe.fr/api/explore/v2.1'
      const apiKey = process.env.INFOGREFFE_API_KEY || ''

      // Dataset IDs connus sur opendata.datainfogreffe.fr
      // Pour trouver les datasets: GET /catalog/datasets
      const datasetsToTry = [
        'comptes-annuels', // Potentiel dataset des comptes annuels
        'entreprises', // Potentiel dataset des entreprises
        'bilans', // Potentiel dataset des bilans
      ]

      // Tenter de récupérer les données depuis différents datasets
      for (const datasetId of datasetsToTry) {
        try {
          // Construire l'URL de requête
          const url = new URL(`${baseUrl}/catalog/datasets/${datasetId}/records`)
          url.searchParams.append('where', `siren="${siren}"`)
          url.searchParams.append('limit', '10')
          if (apiKey) {
            url.searchParams.append('apikey', apiKey)
          }

          console.log(`[InfogreffeService] 📡 Requête dataset: ${datasetId}`)

          const response = await fetch(url.toString())

          // Si 404, le dataset n'existe pas, passer au suivant
          if (response.status === 404) {
            continue
          }

          if (!response.ok) {
            console.warn(`[InfogreffeService] ⚠️ Erreur HTTP ${response.status} pour dataset ${datasetId}`)
            continue
          }

          const data = await response.json()

          // Vérifier si des résultats sont retournés
          if (data.results && data.results.length > 0) {
            console.log(`[InfogreffeService] ✅ Données trouvées dans dataset: ${datasetId}`)

            // Parser les résultats (format à adapter selon le dataset réel)
            return this.parseInfogreffeData(siren, data.results, datasetId)
          }
        } catch (datasetError) {
          console.warn(`[InfogreffeService] ⚠️ Erreur dataset ${datasetId}:`, datasetError)
          continue
        }
      }

      console.log(`[InfogreffeService] ℹ️ Aucune donnée trouvée dans les datasets Infogreffe pour SIREN: ${siren}`)
      return null
    } catch (error) {
      console.warn('[InfogreffeService] ⚠️ Erreur Explore API v2:', error)
      return null
    }
  }

  /**
   * Parse les données brutes de l'API Infogreffe OpenDataSoft
   */
  private parseInfogreffeData(
    siren: string,
    results: any[],
    datasetId: string
  ): InfogreffeCompanyData {
    const sources = [`Infogreffe OpenDataSoft (${datasetId})`]

    // Extraction des données financières
    const financial: InfogreffeFinancialData = {}
    const legal: InfogreffeLegalData = {}

    // Parser selon le format du dataset
    // Note: Le format exact dépend du dataset Infogreffe utilisé
    // Voici une implémentation générique à adapter

    for (const record of results) {
      const fields = record.fields || record

      // Chiffre d'affaires
      if (fields.ca || fields.chiffre_affaires || fields.turnover) {
        const ca = fields.ca || fields.chiffre_affaires || fields.turnover
        if (!financial.turnover) {
          financial.turnover = { years: [] }
        }
        if (fields.annee || fields.year) {
          financial.turnover.years?.push({
            year: parseInt(fields.annee || fields.year),
            amount: parseFloat(ca),
          })
        }
      }

      // Résultat net
      if (fields.resultat || fields.result || fields.net_result) {
        const result = fields.resultat || fields.result || fields.net_result
        if (!financial.netResult) {
          financial.netResult = { years: [] }
        }
        if (fields.annee || fields.year) {
          financial.netResult.years?.push({
            year: parseInt(fields.annee || fields.year),
            amount: parseFloat(result),
          })
        }
      }

      // Capital social
      if (fields.capital || fields.capital_social) {
        financial.capital = parseFloat(fields.capital || fields.capital_social)
      }

      // Procédures collectives
      if (fields.procedure_collective || fields.collective_procedure) {
        if (!legal.collectiveProcedures) {
          legal.collectiveProcedures = []
        }
        legal.collectiveProcedures.push({
          type: fields.type_procedure || 'unknown',
          startDate: fields.date_debut || fields.start_date,
          status: fields.statut === 'en_cours' ? 'ongoing' : 'completed',
        })
      }
    }

    // Calculer les dernières valeurs et évolutions
    if (financial.turnover?.years && financial.turnover.years.length > 0) {
      const sorted = financial.turnover.years.sort((a, b) => b.year - a.year)
      financial.turnover.lastYear = sorted[0]?.amount
      financial.turnover.previousYear = sorted[1]?.amount

      if (financial.turnover.lastYear && financial.turnover.previousYear) {
        financial.turnover.evolution =
          ((financial.turnover.lastYear - financial.turnover.previousYear) /
            financial.turnover.previousYear) *
          100
      }
    }

    if (financial.netResult?.years && financial.netResult.years.length > 0) {
      const sorted = financial.netResult.years.sort((a, b) => b.year - a.year)
      financial.netResult.lastYear = sorted[0]?.amount
      financial.netResult.previousYear = sorted[1]?.amount

      if (financial.netResult.lastYear && financial.netResult.previousYear) {
        financial.netResult.evolution =
          ((financial.netResult.lastYear - financial.netResult.previousYear) /
            financial.netResult.previousYear) *
          100
      }
    }

    financial.lastUpdate = new Date().toISOString()

    return {
      siren,
      financial: Object.keys(financial).length > 1 ? financial : undefined,
      legal: Object.keys(legal).length > 0 ? legal : undefined,
      sources,
      lastUpdated: new Date().toISOString(),
      available: true,
    }
  }
  
  /**
   * Tente de récupérer les données depuis le dataset data.gouv.fr
   */
  private async fetchFromDataset(siren: string): Promise<InfogreffeCompanyData | null> {
    try {
      console.log(`[InfogreffeService] 🔄 Tentative récupération depuis dataset data.gouv.fr...`)
      
      // Récupérer les métadonnées du dataset
      const datasetResponse = await fetch(
        `${this.baseUrl}/datasets/${this.datasetId}/`,
        {
          headers: { Accept: 'application/json' },
        }
      )
      
      if (!datasetResponse.ok) {
        console.warn(`[InfogreffeService] ⚠️ Dataset non accessible: ${datasetResponse.status}`)
        return null
      }
      
      const dataset = await datasetResponse.json()
      console.log(`[InfogreffeService] ✅ Dataset trouvé:`, {
        title: dataset.title || dataset.name,
        resourcesCount: dataset.resources?.length || 0,
      })
      
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
      console.warn('[InfogreffeService] ⚠️ Erreur récupération dataset:', error)
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

