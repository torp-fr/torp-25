/**
 * Service pour récupérer les données DPE (Diagnostic de Performance Energétique) certifiées
 * Source : https://www.data.gouv.fr/fr/datasets/dpe-v2-logements-existants/
 * Dataset ID: 67f7e5758ffc5d79ab9e8c27
 * 
 * Le dataset DPE contient :
 * - Classes énergétiques (A à G)
 * - Consommations énergétiques (kWh/m²/an)
 * - Émissions de GES (kg CO2/m²/an)
 * - Dates de diagnostic
 * - Informations géographiques (adresse, code INSEE, coordonnées)
 * - Type de bâtiment et autres caractéristiques
 */

import type { AddressData, EnergyData } from './types'
import { ApiClient } from '../data-enrichment/api-client'

export interface DPEData extends EnergyData {
  // Identifiants
  dpeId?: string // Identifiant unique du DPE
  buildingId?: string // Identifiant du bâtiment
  
  // Informations de diagnostic
  diagnosticDate?: string // Date du diagnostic DPE
  diagnosticType?: string // Type de diagnostic (vendu, location, etc.)
  diagnosticStatus?: string // Statut du diagnostic (valide, expiré, etc.)
  
  // Détails énergétiques
  energyConsumptionPrimary?: number // Consommation énergie primaire (kWh/m²/an)
  energyConsumptionFinal?: number // Consommation énergie finale (kWh/m²/an)
  ghgEmissionsPrimary?: number // Émissions GES primaire (kg CO2/m²/an)
  ghgEmissionsFinal?: number // Émissions GES finale (kg CO2/m²/an)
  
  // Classe énergétique
  energyClassPrimary?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  energyClassGES?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  
  // Caractéristiques du bâtiment
  buildingType?: string // Type de bâtiment
  constructionYear?: number
  surface?: number // Surface habitable en m²
  heatingSystem?: string // Système de chauffage
  hotWaterSystem?: string // Système eau chaude
  coolingSystem?: string // Système de refroidissement
  
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

interface DataGouvDPEDataset {
  id: string
  title: string
  resources: Array<{
    id: string
    title: string
    url: string
    format: string
    filesize: number
    last_modified: string
  }>
}

// Interface pour les ressources DPE (structure dépend du format CSV/JSON)
// type DataGouvDPEResource = Record<string, any>

export class DPEService {
  private readonly datasetId = '67f7e5758ffc5d79ab9e8c27'
  private readonly baseUrl = 'https://www.data.gouv.fr/api/1'
  private client: ApiClient

  constructor() {
    this.client = new ApiClient({
      baseUrl: this.baseUrl,
      timeout: 10000,
      retries: 2,
    })
  }

  /**
   * Récupère les données DPE pour une adresse donnée
   * Essaie d'abord l'index local si disponible, sinon fait un appel direct
   */
  async getDPEData(address: AddressData): Promise<DPEData | null> {
    try {
      // 1. Essayer de récupérer depuis un index local (si implémenté)
      // TODO: Implémenter DPEIndexer similaire à RNBIndexer si nécessaire

      // 2. Recherche directe via API data.gouv.fr ou ressources du dataset
      const dpeData = await this.searchDPEByAddress(address)
      
      if (dpeData) {
        return dpeData
      }

      // 3. Si aucune donnée trouvée, retourner null
      return null
    } catch (error) {
      console.error('[DPEService] Erreur récupération données DPE:', error)
      return null
    }
  }

  /**
   * Recherche DPE par adresse
   * Utilise les ressources du dataset pour rechercher les DPE correspondants
   */
  private async searchDPEByAddress(address: AddressData): Promise<DPEData | null> {
    try {
      // Récupérer les métadonnées du dataset
      const dataset = await this.getDatasetInfo()
      if (!dataset || !dataset.resources || dataset.resources.length === 0) {
        console.warn('[DPEService] Aucune ressource trouvée pour le dataset DPE')
        return null
      }

      // Extraire le code INSEE depuis l'adresse
      const codeINSEE = this.extractCodeINSEE(address.postalCode, address.city)
      
      // Chercher la ressource la plus récente
      const latestResource = dataset.resources
        .filter(r => r.format === 'csv' || r.format === 'json' || r.format === 'geojson')
        .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0]

      if (!latestResource) {
        console.warn('[DPEService] Aucune ressource récente trouvée')
        return null
      }

      // Pour les gros fichiers, on peut utiliser une recherche par département
      // ou utiliser un service d'indexation local
      // Pour l'instant, on retourne les métadonnées avec indication que l'indexation est nécessaire
      
      return {
        source: 'DPE data.gouv.fr (métadonnées)',
        codeINSEE: codeINSEE || address.postalCode?.substring(0, 5),
        address: address.formatted,
        city: address.city,
        postalCode: address.postalCode,
        coordinates: address.coordinates,
        lastUpdated: latestResource.last_modified,
      }
    } catch (error) {
      console.error('[DPEService] Erreur recherche DPE par adresse:', error)
      return null
    }
  }

  /**
   * Récupère les informations du dataset depuis data.gouv.fr
   */
  private async getDatasetInfo(): Promise<DataGouvDPEDataset | null> {
    try {
      const response = await this.client.get<DataGouvDPEDataset>(
        `/datasets/${this.datasetId}/`
      )
      return response
    } catch (error) {
      console.error('[DPEService] Erreur récupération métadonnées dataset:', error)
      return null
    }
  }

  /**
   * Récupère les données DPE depuis une ressource spécifique
   * Pour les gros fichiers, cette méthode peut être utilisée avec un index local
   */
  async getDPEFromResource(
    resourceUrl: string,
    _address: AddressData
  ): Promise<DPEData | null> {
    try {
      // Note: Pour les très gros fichiers CSV/JSON, il est recommandé d'utiliser
      // un système d'indexation local (similaire à RNBIndexer)
      // ou d'utiliser un service de recherche externe

      // Pour l'instant, on retourne null et indique qu'une indexation est nécessaire
      console.log('[DPEService] Recherche dans ressource:', resourceUrl)
      console.log('[DPEService] Indexation recommandée pour recherche efficace')

      return null
    } catch (error) {
      console.error('[DPEService] Erreur lecture ressource DPE:', error)
      return null
    }
  }

  /**
   * Recherche DPE par code INSEE et coordonnées
   */
  async searchDPEByLocation(
    _codeINSEE: string,
    _coordinates?: { lat: number; lng: number }
  ): Promise<DPEData[]> {
    try {
      // TODO: Implémenter recherche par localisation
      // Peut utiliser un index local ou une API de recherche
      return []
    } catch (error) {
      console.error('[DPEService] Erreur recherche DPE par localisation:', error)
      return []
    }
  }

  /**
   * Extrait le code INSEE depuis le code postal et la ville
   */
  private extractCodeINSEE(postalCode?: string, _city?: string): string | null {
    if (!postalCode) return null
    
    // Les 5 premiers chiffres du code postal peuvent servir d'approximation
    // Pour un code INSEE précis, il faudrait utiliser l'API Adresse
    return postalCode.substring(0, 5)
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
      recommendations: [], // À extraire depuis les données DPE si disponible
    }
  }
}

