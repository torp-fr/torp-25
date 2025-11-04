/**
 * Service pour récupérer les données de la Base Adresse Nationale (BAN)
 * Source : https://www.data.gouv.fr/fr/datasets/base-adresse-nationale/
 * Dataset ID: 5530fbacc751df5ff937dddb
 *
 * La BAN contient :
 * - Toutes les adresses françaises géocodées
 * - Coordonnées GPS précises
 * - Codes INSEE, communes, départements
 * - Permet recherche locale ultra-rapide
 */

import type { AddressData } from './types'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export interface BANAddressData {
  banId?: string // Identifiant BAN
  formatted: string // Adresse complète formatée
  housenumber?: string
  street?: string
  postalCode: string
  city: string
  codeINSEE?: string
  department?: string
  region?: string
  coordinates?: { lat: number; lng: number }
  sources: string[]
  lastUpdated: string
}

export interface BANResource {
  id: string
  title: string
  description: string
  url: string
  format: string
  filesize: number
  lastModified: string
  department: string
}

export class BANService {
  private readonly datasetId = '5530fbacc751df5ff937dddb'
  private readonly baseUrl = 'https://www.data.gouv.fr/api/1'

  /**
   * Récupère les données BAN pour une adresse donnée
   * Essaie d'abord l'index local, sinon utilise l'API Adresse
   */
  async getAddressData(query: string): Promise<BANAddressData | null> {
    try {
      // 1. Essayer de récupérer depuis l'index local
      const { BANIndexer } = await import('./ban-indexer')
      const indexer = new BANIndexer()
      
      const indexedData = await indexer.searchAddress(query)
      if (indexedData && indexedData.length > 0) {
        log.debug('Données récupérées depuis l\'index local')
        return this.mapAddressDataToBAN(indexedData[0])
      }

      // 2. Si pas dans l'index, utiliser l'API Adresse comme fallback
      // L'API Adresse est déjà intégrée dans AddressService
      return null
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération données BAN')
      return null
    }
  }

  /**
   * Récupère toutes les ressources BAN disponibles par département
   */
  async getAllResources(): Promise<BANResource[]> {
    try {
      const response = await fetch(`${this.baseUrl}/datasets/${this.datasetId}/`, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        log.warn({ statusText: response.statusText }, 'Erreur récupération dataset')
        return []
      }

      const dataset = await response.json()
      const resources: BANResource[] = []

      if (dataset.resources && Array.isArray(dataset.resources)) {
        for (const resource of dataset.resources) {
          // Filtrer les exports départementaux ou complets
          if (resource.title && (resource.title.includes('Export') || resource.title.includes('BAN'))) {
            const department = this.extractDepartmentFromTitle(resource.title)
            resources.push({
              id: resource.id,
              title: resource.title,
              description: resource.description || '',
              url: resource.url || '',
              format: resource.format || 'csv',
              filesize: resource.filesize || 0,
              lastModified: resource.last_modified || '',
              department: department || 'ALL',
            })
          }
        }
      }

      return resources
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération ressources')
      return []
    }
  }

  /**
   * Récupère la ressource BAN pour un département spécifique
   */
  public async getDepartmentResource(department: string): Promise<BANResource | null> {
    try {
      const resources = await this.getAllResources()
      return resources.find((r) => r.department === department || r.department === 'ALL') || null
    } catch (error) {
      log.error({ err: error, department }, 'Erreur récupération ressource département')
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

      const { BANIndexer } = await import('./ban-indexer')
      const indexer = new BANIndexer()
      
      // Créer un job d'import (l'import réel sera géré par BANImporter)
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
      log.error({ err: error, department }, 'Erreur démarrage indexation')
      return { success: false }
    }
  }

  /**
   * Extrait le code département depuis le titre de la ressource
   */
  private extractDepartmentFromTitle(title: string): string {
    // Format: "BAN XX" ou "Export Départemental XX" ou "BAN-XX.csv"
    const match = title.match(/(?:BAN|Départemental)[\s-]+(\d{2,3})/i)
    if (match) {
      return match[1]
    }
    
    // Si pas de département spécifique, retourner 'ALL'
    if (title.toLowerCase().includes('complet') || title.toLowerCase().includes('france')) {
      return 'ALL'
    }
    
    return ''
  }

  /**
   * Mappe AddressData vers BANAddressData
   */
  private mapAddressDataToBAN(address: AddressData): BANAddressData {
    return {
      formatted: address.formatted,
      street: address.street,
      postalCode: address.postalCode,
      city: address.city,
      department: address.department,
      region: address.region,
      coordinates: address.coordinates,
      sources: ['BAN Index Local'],
      lastUpdated: new Date().toISOString(),
    }
  }
}

