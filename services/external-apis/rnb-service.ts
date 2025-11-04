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
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

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
      log.debug( {
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
        log.info({
          hasConstructionYear: !!indexedData.constructionYear,
          hasBuildingType: !!indexedData.buildingType,
          hasSurface: !!indexedData.surface,
          hasDPEClass: !!indexedData.dpeClass,
          hasEnergyConsumption: !!indexedData.energyConsumption,
          dpeClass: indexedData.dpeClass,
        }, 'Données récupérées depuis l\'index local')
        return indexedData
      }

      // 2. Si pas dans l'index, récupérer les métadonnées et proposer l'indexation
      const department = this.extractDepartment(address.postalCode)
      if (!department) {
        log.warn({ address: address.postalCode }, ' Impossible d\'extraire le département depuis:', address.postalCode)
        return null
      }

      const resource = await this.getDepartmentResource(department)
      if (!resource) {
        log.warn({ address: address.postalCode }, ' Aucune ressource RNB trouvée pour le département:', department)
        return null
      }

      log.warn( Données RNB non indexées pour ce département, métadonnées uniquement')
      // 3. Retourner les métadonnées avec indication que l'indexation est nécessaire
      return {
        id: `rnb-${department}-metadata`,
        commune: address.city,
        codeINSEE: address.postalCode,
        sources: ['RNB data.gouv.fr (métadonnées)'],
        lastUpdated: resource.lastModified,
      }
    } catch (error) {
      log.error({ err: error }, ' Erreur récupération données RNB:', error)
      return null
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
      log.error({ err: error }, ' Erreur démarrage indexation:', error)
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
        log.warn({ status: response.status, statusText: response.statusText }, 'Erreur récupération dataset')
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
      log.error({ err: error }, ' Erreur récupération ressources:', error)
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
      log.error({ err: error }, ' Erreur récupération ressource département:', error)
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
      log.error({ err: error }, ' Erreur récupération métadonnées:', error)
      return null
    }
  }
}

