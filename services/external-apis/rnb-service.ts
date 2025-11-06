/**
 * Service pour récupérer les données du Référentiel National des Bâtiments (RNB)
 * Source : https://www.data.gouv.fr/fr/datasets/referentiel-national-des-batiments/
 * Dataset ID: 65a5568dfc88169d0a5416ca
 * 
 * Le RNB contient :
 * - Données DPE (Diagnostic de Performance Energétique)
 * - Informations bâti (année construction, type, surface, etc.)
 * - Données géospatiales
 * - Haute Valeur Déterminante (HVD)
 */

import type { AddressData } from './types'

export interface RNBBuildingData {
  id: string // Identifiant unique du bâtiment (RNB)
  constructionYear?: number
  buildingType?: string
  surface?: number // Surface totale en m²
  dpeClass?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'N/A'
  dpeDate?: string
  energyConsumption?: number // kWh/m²/an
  ghgEmissions?: number // kg CO2/m²/an
  hvd?: boolean // Haute Valeur Déterminante
  commune?: string
  codeINSEE?: string
  address?: string // Adresse du bâtiment
  coordinates?: { lat: number; lng: number } // Coordonnées géographiques
  sources: string[]
  lastUpdated: string
}

export interface RNBResource {
  id: string
  title: string
  description: string
  url: string
  format: string
  filesize: number
  lastModified: string
  department: string
}

export class RNBService {
  private readonly datasetId = '65a5568dfc88169d0a5416ca'
  private readonly baseUrl = 'https://www.data.gouv.fr/api/1'
  private readonly s3BaseUrl = 'https://rnb-opendata.s3.fr-par.scw.cloud/files'

  /**
   * Récupère les données RNB pour une adresse donnée
   * Essaie d'abord l'index local, sinon lance un appel ponctuel
   * @param address - Adresse complète avec code postal
   */
  async getBuildingData(address: AddressData): Promise<RNBBuildingData | null> {
    try {
      console.log('[RNBService] 🔄 Récupération données RNB pour:', {
        formatted: address.formatted,
        city: address.city,
        postalCode: address.postalCode,
        hasCoordinates: !!address.coordinates,
      })

      // 1. Essayer de récupérer depuis l'index local
      const { RNBIndexer } = await import('./rnb-indexer')
      const indexer = new RNBIndexer()
      
      const indexedData = await indexer.searchBuilding(
        address.postalCode?.substring(0, 5) || '', // Code INSEE approximatif
        address.formatted,
        address.coordinates
      )

      if (indexedData) {
        console.log('[RNBService] ✅ Données récupérées depuis l\'index local:', {
          hasConstructionYear: !!indexedData.constructionYear,
          hasBuildingType: !!indexedData.buildingType,
          hasSurface: !!indexedData.surface,
          hasDPEClass: !!indexedData.dpeClass,
          hasEnergyConsumption: !!indexedData.energyConsumption,
          dpeClass: indexedData.dpeClass,
        })
        return indexedData
      }

      // 2. Si pas dans l'index, récupérer les métadonnées et proposer l'indexation
      const department = this.extractDepartment(address.postalCode)
      if (!department) {
        console.warn('[RNBService] ⚠️ Impossible d\'extraire le département depuis:', address.postalCode)
        return null
      }

      const resource = await this.getDepartmentResource(department)
      if (!resource) {
        console.warn('[RNBService] ⚠️ Aucune ressource RNB trouvée pour le département:', department)
        return null
      }

      // 3. Fallback: Essayer l'API nationale RNB (GRATUITE, temps réel)
      console.log('[RNBService] 🔄 Fallback API nationale RNB...')
      const apiData = await this.searchBuildingFromNationalAPI(address)
      if (apiData) {
        console.log('[RNBService] ✅ Données récupérées via API nationale RNB')
        return apiData
      }

      console.log('[RNBService] ⚠️ Données RNB non trouvées, retour métadonnées uniquement')
      // 4. Dernier recours: Retourner les métadonnées avec indication que l'indexation est recommandée
      return {
        id: `rnb-${department}-metadata`,
        commune: address.city,
        codeINSEE: address.postalCode,
        sources: ['RNB data.gouv.fr (métadonnées)'],
        lastUpdated: resource.lastModified,
      }
    } catch (error) {
      console.error('[RNBService] ❌ Erreur récupération données RNB:', error)
      return null
    }
  }

  /**
   * Recherche un bâtiment via l'API nationale RNB (GRATUITE, sans clé requise)
   * Documentation: https://rnb.beta.gouv.fr/api/v0/docs
   */
  private async searchBuildingFromNationalAPI(
    address: AddressData
  ): Promise<RNBBuildingData | null> {
    try {
      const { coordinates, formatted } = address

      // L'API RNB nationale permet de chercher par coordonnées ou par adresse
      const apiUrl = 'https://rnb.beta.gouv.fr/api/v0'

      // 1. Recherche par coordonnées si disponibles (plus précis)
      if (coordinates) {
        console.log(`[RNBService] 🔎 Recherche par coordonnées: ${coordinates.lat}, ${coordinates.lng}`)
        const response = await fetch(
          `${apiUrl}/buildings?point=${coordinates.lng},${coordinates.lat}&max_distance=50`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TORP-Platform/1.0'
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.buildings && data.buildings.length > 0) {
            const building = data.buildings[0]
            return this.mapNationalAPIResponse(building)
          }
        }
      }

      // 2. Recherche par adresse si pas de coordonnées ou pas trouvé
      if (formatted) {
        console.log(`[RNBService] 🔎 Recherche par adresse: ${formatted}`)
        const response = await fetch(
          `${apiUrl}/buildings?q=${encodeURIComponent(formatted)}&limit=1`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TORP-Platform/1.0'
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.buildings && data.buildings.length > 0) {
            const building = data.buildings[0]
            return this.mapNationalAPIResponse(building)
          }
        }
      }

      return null
    } catch (error) {
      console.warn('[RNBService] ⚠️ Erreur API nationale RNB:', error)
      return null
    }
  }

  /**
   * Mappe la réponse de l'API nationale RNB vers notre interface
   */
  private mapNationalAPIResponse(building: any): RNBBuildingData {
    return {
      id: building.rnb_id || building.id || `rnb-api-${Date.now()}`,
      constructionYear: building.construction_year || building.annee_construction,
      buildingType: building.building_type || building.type_batiment,
      surface: building.surface || building.surface_totale,
      dpeClass: building.dpe_class || building.classe_dpe || 'N/A',
      dpeDate: building.dpe_date || building.date_dpe,
      energyConsumption: building.energy_consumption || building.consommation_energie,
      ghgEmissions: building.ghg_emissions || building.emissions_ges,
      commune: building.commune || building.nom_commune,
      codeINSEE: building.code_insee,
      address: building.address || building.adresse,
      coordinates: building.coordinates
        ? { lat: building.coordinates.lat, lng: building.coordinates.lon || building.coordinates.lng }
        : undefined,
      sources: ['API nationale RNB (temps réel)'],
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Lance l'indexation progressive d'un département
   */
  async startIndexation(department: string): Promise<{ success: boolean; jobId?: string }> {
    try {
      const resource = await this.getDepartmentResource(department)
      if (!resource) {
        return { success: false }
      }

      const { RNBIndexer } = await import('./rnb-indexer')
      const indexer = new RNBIndexer()
      
      // Créer un job d'import (l'import réel sera géré par RNBImporter)
      const jobId = await indexer.createImportJob(
        department,
        resource.url,
        resource.id
      )

      return {
        success: true,
        jobId,
      }
    } catch (error) {
      console.error('[RNBService] Erreur démarrage indexation:', error)
      return { success: false }
    }
  }

  /**
   * Récupère toutes les ressources RNB disponibles par département
   */
  async getAllResources(): Promise<RNBResource[]> {
    try {
      const response = await fetch(`${this.baseUrl}/datasets/${this.datasetId}/`, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        console.warn('[RNBService] Erreur récupération dataset:', response.statusText)
        return []
      }

      const dataset = await response.json()
      const resources: RNBResource[] = []

      if (dataset.resources && Array.isArray(dataset.resources)) {
        for (const resource of dataset.resources) {
          // Filtrer uniquement les exports départementaux
          if (resource.title && resource.title.includes('Export Départemental')) {
            const department = this.extractDepartmentFromTitle(resource.title)
            resources.push({
              id: resource.id,
              title: resource.title,
              description: resource.description || '',
              url: resource.url || `${this.s3BaseUrl}/RNB_${department}.csv.zip`,
              format: resource.format || 'zip',
              filesize: resource.filesize || 0,
              lastModified: resource.last_modified || '',
              department: department || '',
            })
          }
        }
      }

      return resources
    } catch (error) {
      console.error('[RNBService] Erreur récupération ressources:', error)
      return []
    }
  }

  /**
   * Récupère la ressource RNB pour un département spécifique
   */
  async getDepartmentResource(department: string): Promise<RNBResource | null> {
    try {
      const resources = await this.getAllResources()
      return resources.find((r) => r.department === department) || null
    } catch (error) {
      console.error('[RNBService] Erreur récupération ressource département:', error)
      return null
    }
  }

  /**
   * Extrait le code département depuis le code postal
   */
  private extractDepartment(postalCode: string): string | null {
    if (!postalCode || postalCode.length < 2) {
      return null
    }

    // Pour les DOM-TOM (971, 972, 973, 974, 976, etc.)
    if (postalCode.length >= 3 && postalCode.startsWith('97')) {
      return postalCode.substring(0, 3)
    }

    // Pour la métropole (01-95)
    return postalCode.substring(0, 2)
  }

  /**
   * Extrait le code département depuis le titre de la ressource
   */
  private extractDepartmentFromTitle(title: string): string {
    // Format: "Export Départemental XX" ou "Export Départemental 971"
    const match = title.match(/Départemental\s+(\d{2,3})/)
    return match ? match[1] : ''
  }

  /**
   * Vérifie la disponibilité des données RNB pour un département
   */
  async isAvailable(department: string): Promise<boolean> {
    const resource = await this.getDepartmentResource(department)
    return resource !== null
  }

  /**
   * Récupère les métadonnées d'une ressource RNB
   */
  async getResourceMetadata(resourceId: string): Promise<RNBResource | null> {
    try {
      const response = await fetch(`${this.baseUrl}/datasets/r/${resourceId}`, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return null
      }

      const resource = await response.json()
      const department = this.extractDepartmentFromTitle(resource.title || '')

      return {
        id: resource.id,
        title: resource.title,
        description: resource.description || '',
        url: resource.url || '',
        format: resource.format || '',
        filesize: resource.filesize || 0,
        lastModified: resource.last_modified || '',
        department,
      }
    } catch (error) {
      console.error('[RNBService] Erreur récupération métadonnées:', error)
      return null
    }
  }
}

