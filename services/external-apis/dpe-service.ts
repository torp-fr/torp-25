/**
 * Service pour récupérer les données DPE (Diagnostic de Performance Energétique) certifiées
 * Source : API ADEME Data-Fair
 * URL: https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants
 *
 * REFONTE 2025-11-06: Utilise l'API temps réel au lieu d'un index local
 */

import type { AddressData, EnergyData } from './types'

export interface DPEData extends EnergyData {
  // Identifiants
  dpeId?: string
  buildingId?: string

  // Informations de diagnostic
  diagnosticDate?: string
  diagnosticType?: string
  diagnosticStatus?: string

  // Détails énergétiques
  energyConsumptionPrimary?: number // Consommation énergie primaire (kWh/m²/an)
  energyConsumptionFinal?: number // Consommation énergie finale (kWh/m²/an)
  ghgEmissionsPrimary?: number // Émissions GES primaire (kg CO2/m²/an)
  ghgEmissionsFinal?: number // Émissions GES finale (kg CO2/m²/an)

  // Classe énergétique
  energyClassPrimary?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  energyClassGES?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

  // Caractéristiques du bâtiment
  buildingType?: string
  constructionYear?: number
  surface?: number // Surface habitable en m²
  heatingSystem?: string
  hotWaterSystem?: string
  coolingSystem?: string

  // Informations géographiques
  address?: string
  postalCode?: string
  city?: string
  codeINSEE?: string
  coordinates?: { lat: number; lng: number }

  // Métadonnées
  source: string
  lastUpdated?: string
}

interface ADEMEDPEResponse {
  total: number
  results: Array<{
    N_DPE?: string // Identifiant DPE
    Date_etablissement_DPE?: string
    Classe_consommation_energie?: string
    Consommation_energie?: number
    Classe_emission_GES?: string
    Emission_GES?: number
    Conso_5_usages_m2_e_primaire?: number
    Conso_5_usages_m2_e_finale?: number
    Emission_GES_5_usages_m2?: number
    Type_batiment?: string
    Annee_construction?: string
    Surface_habitable?: number
    Type_energie_chauffage?: string
    Type_energie_ECS?: string
    Adresse?: string
    Code_postal?: string
    Nom_commune?: string
    Code_INSEE?: string
    Longitude?: number
    Latitude?: number
    [key: string]: any
  }>
}

export class DPEService {
  private readonly apiUrl = 'https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants'

  /**
   * Récupère les données DPE pour une adresse donnée
   * Utilise l'API ADEME Data-Fair en temps réel
   */
  async getDPEData(address: AddressData): Promise<DPEData | null> {
    try {
      console.log('[DPEService] 🔄 Recherche DPE via API ADEME pour:', {
        formatted: address.formatted,
        city: address.city,
        postalCode: address.postalCode,
        hasCoordinates: !!address.coordinates,
      })

      // 1. Recherche par coordonnées GPS (plus précis)
      if (address.coordinates) {
        const dpeByGPS = await this.searchByCoordinates(
          address.coordinates.lat,
          address.coordinates.lng,
          200 // Rayon 200m
        )
        if (dpeByGPS) {
          console.log('[DPEService] ✅ DPE trouvé par coordonnées GPS')
          return dpeByGPS
        }
      }

      // 2. Fallback: Recherche par adresse textuelle
      const dpeByAddress = await this.searchByAddress(address.formatted, address.postalCode)
      if (dpeByAddress) {
        console.log('[DPEService] ✅ DPE trouvé par adresse textuelle')
        return dpeByAddress
      }

      console.warn('[DPEService] ⚠️ Aucun DPE trouvé pour cette adresse')
      return null
    } catch (error) {
      console.error('[DPEService] ❌ Erreur récupération DPE:', error)
      return null
    }
  }

  /**
   * Recherche DPE par coordonnées GPS
   */
  private async searchByCoordinates(
    lat: number,
    lng: number,
    radiusMeters: number = 200
  ): Promise<DPEData | null> {
    try {
      // API Data-Fair utilise le format: lat,lon,distance
      const geoDistance = `${lat},${lng},${radiusMeters}m`

      const params = new URLSearchParams({
        geo_distance: geoDistance,
        size: '5', // Récupérer 5 résultats max
        sort: 'Date_etablissement_DPE:-1', // Tri par date décroissante (plus récent d'abord)
      })

      const response = await fetch(`${this.apiUrl}/lines?${params}`, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        console.warn('[DPEService] Erreur API ADEME:', response.status, response.statusText)
        return null
      }

      const data: ADEMEDPEResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        return null
      }

      // Prendre le DPE le plus récent
      return this.parseDPEResult(data.results[0])
    } catch (error) {
      console.error('[DPEService] Erreur recherche GPS:', error)
      return null
    }
  }

  /**
   * Recherche DPE par adresse textuelle
   */
  private async searchByAddress(address: string, postalCode?: string): Promise<DPEData | null> {
    try {
      // Construire la requête de recherche
      let searchQuery = address
      if (postalCode) {
        searchQuery += ` ${postalCode}`
      }

      const params = new URLSearchParams({
        q: searchQuery,
        q_fields: 'Adresse,Code_postal,Nom_commune',
        size: '5',
        sort: 'Date_etablissement_DPE:-1',
      })

      const response = await fetch(`${this.apiUrl}/lines?${params}`, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        console.warn('[DPEService] Erreur API ADEME:', response.status, response.statusText)
        return null
      }

      const data: ADEMEDPEResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        return null
      }

      // Prendre le DPE le plus récent
      return this.parseDPEResult(data.results[0])
    } catch (error) {
      console.error('[DPEService] Erreur recherche adresse:', error)
      return null
    }
  }

  /**
   * Parse un résultat de l'API ADEME en format DPEData
   */
  private parseDPEResult(result: ADEMEDPEResponse['results'][0]): DPEData {
    // Parser l'année de construction
    let constructionYear: number | undefined
    if (result.Annee_construction) {
      const year = parseInt(result.Annee_construction, 10)
      if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear()) {
        constructionYear = year
      }
    }

    return {
      // Identifiants
      dpeId: result.N_DPE,

      // Dates
      diagnosticDate: result.Date_etablissement_DPE,
      dpeDate: result.Date_etablissement_DPE,

      // Classes énergétiques
      dpeClass: this.normalizeDPEClass(result.Classe_consommation_energie),
      energyClassPrimary: this.normalizeDPEClass(result.Classe_consommation_energie),
      energyClassGES: this.normalizeDPEClass(result.Classe_emission_GES),

      // Consommations et émissions
      energyConsumption: result.Consommation_energie,
      energyConsumptionPrimary: result.Conso_5_usages_m2_e_primaire,
      energyConsumptionFinal: result.Conso_5_usages_m2_e_finale,
      ghgEmissions: result.Emission_GES,
      ghgEmissionsPrimary: result.Emission_GES_5_usages_m2,

      // Caractéristiques bâtiment
      buildingType: result.Type_batiment,
      constructionYear,
      surface: result.Surface_habitable,
      heatingSystem: result.Type_energie_chauffage,
      hotWaterSystem: result.Type_energie_ECS,

      // Informations géographiques
      address: result.Adresse,
      postalCode: result.Code_postal,
      city: result.Nom_commune,
      codeINSEE: result.Code_INSEE,
      coordinates: result.Latitude && result.Longitude ? {
        lat: result.Latitude,
        lng: result.Longitude,
      } : undefined,

      // Métadonnées
      source: 'ADEME DPE (API Data-Fair)',
      lastUpdated: result.Date_etablissement_DPE,

      // Recommendations vide pour compatibilité
      recommendations: [],
    }
  }

  /**
   * Normalise une classe DPE (A-G)
   */
  private normalizeDPEClass(classe?: string): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | undefined {
    if (!classe) return undefined
    const normalized = classe.trim().toUpperCase()
    if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(normalized)) {
      return normalized as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
    }
    return undefined
  }

  /**
   * Convertit les données brutes DPE au format EnergyData
   */
  convertToEnergyData(dpeData: DPEData): EnergyData {
    return {
      dpeDate: dpeData.diagnosticDate || dpeData.dpeDate,
      dpeClass: dpeData.energyClassPrimary || dpeData.dpeClass,
      energyConsumption: dpeData.energyConsumptionPrimary || dpeData.energyConsumption,
      ghgEmissions: dpeData.ghgEmissionsPrimary || dpeData.ghgEmissions,
      recommendations: dpeData.recommendations || [],
    }
  }
}
