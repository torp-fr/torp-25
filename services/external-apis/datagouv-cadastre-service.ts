/**
 * Service pour récupérer les données cadastrales depuis cadastre.data.gouv.fr (Etalab)
 * Dataset data.gouv.fr: https://www.data.gouv.fr/fr/datasets/59b0020ec751df07d5f13bcf/
 * API Cadastre Etalab: https://cadastre.data.gouv.fr/
 *
 * Cette API fournit des données cadastrales au format GeoJSON et permet de :
 * - Récupérer les parcelles par commune
 * - Récupérer les bâtiments par parcelle
 * - Récupérer les sections et feuilles cadastrales
 */

import type { AddressData } from './types'
import { ApiClient } from '../data-enrichment/api-client'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export interface DataGouvCadastreDataset {
  id: string
  title: string
  description?: string
  resources: Array<{
    id: string
    title: string
    url: string
    format: string
    filesize: number
    last_modified: string
  }>
}

export interface CadastreDataGouvParcelle {
  id: string
  commune: string
  codeInsee: string
  section: string
  numero: string
  surface?: number
  geometry?: any // GeoJSON Geometry
  batiments?: Array<{
    id: string
    geometry: any // GeoJSON Geometry
    usage?: string
    type?: string
  }>
}

export class DataGouvCadastreService {
  private readonly datasetId = '59b0020ec751df07d5f13bcf' // Dataset Cadastre Etalab
  private readonly pciDatasetId = '58e5924b88ee3802ca255566' // Dataset PCI (Plan cadastral informatisé)
  private readonly baseUrl = 'https://www.data.gouv.fr/api/1'
  private readonly cadastreApiBase = 'https://cadastre.data.gouv.fr/api'
  private client: ApiClient

  constructor() {
    this.client = new ApiClient({
      baseUrl: this.baseUrl,
      timeout: 10000,
      retries: 2,
    })
  }

  /**
   * Récupère les informations du dataset depuis data.gouv.fr
   */
  async getDatasetInfo(): Promise<DataGouvCadastreDataset | null> {
    try {
      log.debug({ datasetId: this.datasetId }, "Récupération dataset Cadastre")
      
      const response = await this.client.get<any>(
        `/datasets/${this.datasetId}/`
      )

      log.debug({
        hasResponse: !!response,
        hasResources: !!(response?.resources),
        resourcesCount: response?.resources?.length || 0,
      })

      if (!response) {
        log.error('Réponse vide de l\'API')
        return null
      }

      const dataset: DataGouvCadastreDataset = {
        id: response.id || this.datasetId,
        title: response.title || response.name || 'Dataset Cadastre',
        description: response.description || response.description_short,
        resources: (response.resources || []).map((r: any) => {
          let format = (r.format || r.mime_type || r.filetype || 'unknown').toLowerCase()
          format = format.replace(/^application\//, '').replace(/^text\//, '')

          return {
            id: r.id || r.uuid,
            title: r.title || r.name || 'Ressource Cadastre',
            url: r.url || r.file || '',
            format,
            filesize: r.filesize || r.size || 0,
            last_modified: r.last_modified || r.modified || r.created_at || new Date().toISOString(),
          }
        }),
      }

      log.info({ resourcesCount: dataset.resources.length }, "Dataset mappé")
      
      return dataset
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération métadonnées dataset')
      if (error instanceof Error) {
        log.error({ message: error.message }, 'Détails erreur')
      }
      return null
    }
  }

  /**
   * Récupère les parcelles d'une commune depuis l'API cadastre.data.gouv.fr
   * Format: GET /communes/{codeInsee}/parcelles
   */
  async getParcellesByCommune(codeInsee: string): Promise<CadastreDataGouvParcelle[]> {
    try {
      const url = `${this.cadastreApiBase}/communes/${codeInsee}/parcelles`
      log.debug({ codeInsee, url }, 'Récupération parcelles pour commune')

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      log.debug({ status: response.status, statusText: response.statusText }, 'Réponse HTTP')

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        log.warn({ status: response.status, codeInsee, error: errorText.substring(0, 200) }, 'Erreur HTTP')
        return []
      }

      const data = await response.json()

      log.debug({
        hasFeatures: !!(data.features),
        featuresType: Array.isArray(data.features) ? 'array' : typeof data.features,
        featuresLength: Array.isArray(data.features) ? data.features.length : 'N/A',
      }, 'Données reçues')

      if (data.features && Array.isArray(data.features)) {
        const parcelles = data.features.map((feature: any) => {
          const props = feature.properties || {}

          return {
            id: feature.id || `${codeInsee}-${props.section}-${props.numero}`,
            commune: props.commune || '',
            codeInsee,
            section: props.section || '',
            numero: props.numero || '',
            surface: props.surface,
            geometry: feature.geometry,
          }
        })

        log.info({ count: parcelles.length, codeInsee }, 'Parcelles trouvées')
        if (parcelles.length > 0) {
          log.debug({
            id: parcelles[0].id,
            section: parcelles[0].section,
            numero: parcelles[0].numero,
            hasSurface: !!parcelles[0].surface,
          }, 'Exemple parcelle')
        }
        return parcelles
      }

      log.warn({ codeInsee }, 'Pas de features dans la réponse')
      return []
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération parcelles')
      if (error instanceof Error) {
        log.error({ message: error.message, stack: error.stack }, 'Détails erreur')
      }
      return []
    }
  }

  /**
   * Récupère une parcelle spécifique depuis l'API cadastre.data.gouv.fr
   * Format: GET /communes/{codeInsee}/parcelles/{section}/{numero}
   */
  async getParcelle(
    codeInsee: string,
    section: string,
    numero: string
  ): Promise<CadastreDataGouvParcelle | null> {
    try {
      log.debug({ codeInsee, section, numero }, 'Récupération parcelle')
      
      const response = await fetch(
        `${this.cadastreApiBase}/communes/${codeInsee}/parcelles/${section}/${numero}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        log.warn({ codeInsee, section, numero }, 'Parcelle non trouvée')
        return null
      }

      const feature = await response.json()
      
      if (feature && feature.properties) {
        const props = feature.properties
        
        // Récupérer les bâtiments de la parcelle si disponibles
        let batiments: CadastreDataGouvParcelle['batiments'] = []
        try {
          const batimentsResponse = await fetch(
            `${this.cadastreApiBase}/communes/${codeInsee}/parcelles/${section}/${numero}/batiments`,
            {
              headers: {
                'Accept': 'application/json',
              },
            }
          )
          
          if (batimentsResponse.ok) {
            const batimentsData = await batimentsResponse.json()
            if (batimentsData.features) {
              batiments = batimentsData.features.map((b: any) => ({
                id: b.id || '',
                geometry: b.geometry,
                usage: b.properties?.usage,
                type: b.properties?.type,
              }))
            }
          }
        } catch (error) {
          log.warn({ err: error }, 'Erreur récupération bâtiments')
        }

        const parcelle: CadastreDataGouvParcelle = {
          id: feature.id || `${codeInsee}-${section}-${numero}`,
          commune: props.commune || '',
          codeInsee,
          section: props.section || section,
          numero: props.numero || numero,
          surface: props.surface,
          geometry: feature.geometry,
          batiments,
        }

        log.info({ parcelleId: parcelle.id }, 'Parcelle trouvée')
        return parcelle
      }

      return null
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération parcelle')
      return null
    }
  }

  /**
   * Récupère les parcelles depuis une adresse
   */
  async getParcellesByAddress(address: AddressData): Promise<CadastreDataGouvParcelle[]> {
    try {
      if (!address.postalCode) {
        log.warn('Code postal manquant')
        return []
      }

      // Récupérer le code INSEE depuis le code postal
      let codeInsee: string | null = null
      try {
        const communeResponse = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${address.postalCode}&nom=${encodeURIComponent(address.city)}&format=json`,
          {
            headers: { Accept: 'application/json' },
          }
        )
        
        if (communeResponse.ok) {
          const communes = await communeResponse.json()
          if (communes && communes.length > 0) {
            codeInsee = communes[0].code
          }
        }
      } catch (error) {
        log.warn({ err: error }, 'Erreur récupération code INSEE')
      }

      if (!codeInsee) {
        log.warn({ address: address.formatted }, 'Code INSEE non trouvé')
        return []
      }

      return await this.getParcellesByCommune(codeInsee)
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération parcelles par adresse')
      return []
    }
  }

  /**
   * Récupère une parcelle depuis des coordonnées GPS via l'API PCI
   * Utilise l'API cadastre.data.gouv.fr avec recherche géographique
   * Format: GET /cadastre/parcelles?lat={lat}&lon={lon}
   * 
   * Note: L'API cadastre.data.gouv.fr utilise différents endpoints selon la version
   * - /cadastre/parcelles pour recherche par coordonnées (si disponible)
   * - /communes/{codeInsee}/parcelles pour recherche par commune
   */
  async getParcelleByCoordinates(coordinates: { lat: number; lng: number }): Promise<CadastreDataGouvParcelle | null> {
    try {
      log.debug({ lat: coordinates.lat, lng: coordinates.lng }, 'Recherche parcelle par coordonnées')

      // L'API cadastre.data.gouv.fr ne supporte pas directement la recherche par coordonnées
      // Il faut d'abord identifier la commune depuis les coordonnées, puis récupérer les parcelles
      // Pour l'instant, on utilise l'API inversée de geo.api.gouv.fr pour obtenir le code INSEE
      let codeInsee: string | null = null

      try {
        log.debug({ lat: coordinates.lat, lng: coordinates.lng }, 'Reverse geocoding')
        const reverseGeoResponse = await fetch(
          `https://api-adresse.data.gouv.fr/reverse/?lat=${coordinates.lat}&lon=${coordinates.lng}`,
          {
            headers: { Accept: 'application/json' },
          }
        )

        log.debug({ status: reverseGeoResponse.status, statusText: reverseGeoResponse.statusText }, 'Reverse geocoding réponse')

        if (reverseGeoResponse.ok) {
          const reverseData = await reverseGeoResponse.json()
          log.debug({
            hasFeatures: !!(reverseData.features),
            featuresLength: Array.isArray(reverseData.features) ? reverseData.features.length : 0,
          }, 'Reverse geocoding données')

          if (reverseData.features && reverseData.features.length > 0) {
            const feature = reverseData.features[0]
            const props = feature.properties || {}
            // Le code INSEE est dans citycode
            codeInsee = props.citycode || null

            log.debug({
              hasCitycode: !!props.citycode,
              citycode: props.citycode,
              city: props.city,
              postcode: props.postcode,
            }, 'Reverse geocoding résultat')

            if (codeInsee) {
              log.info({ codeInsee }, 'Commune identifiée depuis coordonnées')

              // Maintenant récupérer toutes les parcelles de la commune
              const parcelles = await this.getParcellesByCommune(codeInsee)

              // Trouver la parcelle la plus proche des coordonnées
              // Pour l'instant, on retourne la première (on pourrait améliorer avec un calcul de distance)
              if (parcelles.length > 0) {
                log.info({ count: parcelles.length }, 'Parcelles trouvées, retour de la première')
                return parcelles[0]
              } else {
                log.warn({ codeInsee }, 'Aucune parcelle trouvée pour la commune')
              }
            } else {
              log.warn('Code INSEE non trouvé dans reverse geocoding')
            }
          } else {
            log.warn('Aucune feature dans reverse geocoding')
          }
        } else {
          const errorText = await reverseGeoResponse.text().catch(() => '')
          log.warn({ status: reverseGeoResponse.status, error: errorText.substring(0, 200) }, 'Reverse geocoding échoué')
        }
      } catch (error) {
        log.error({ err: error }, 'Erreur reverse geocoding')
        if (error instanceof Error) {
          log.error({ message: error.message }, 'Détails erreur')
        }
      }

      // Si on n'a pas pu identifier via reverse geocoding, retourner null
      log.warn('Impossible d\'identifier la commune depuis les coordonnées')
      return null
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération parcelle par coordonnées')
      return null
    }
  }

  /**
   * Récupère les informations du dataset PCI depuis data.gouv.fr
   * Dataset: https://www.data.gouv.fr/fr/datasets/58e5924b88ee3802ca255566/
   */
  async getPCIDatasetInfo(): Promise<DataGouvCadastreDataset | null> {
    try {
      log.debug({ datasetId: this.pciDatasetId }, "Récupération dataset PCI")
      
      const response = await this.client.get<any>(
        `/datasets/${this.pciDatasetId}/`
      )

      log.debug({
        hasResponse: !!response,
        hasResources: !!(response?.resources),
        resourcesCount: response?.resources?.length || 0,
      })

      if (!response) {
        log.error('Réponse vide de l\'API PCI')
        return null
      }

      const dataset: DataGouvCadastreDataset = {
        id: response.id || this.pciDatasetId,
        title: response.title || response.name || 'Dataset PCI',
        description: response.description || response.description_short,
        resources: (response.resources || []).map((r: any) => {
          let format = (r.format || r.mime_type || r.filetype || 'unknown').toLowerCase()
          format = format.replace(/^application\//, '').replace(/^text\//, '')

          return {
            id: r.id || r.uuid,
            title: r.title || r.name || 'Ressource PCI',
            url: r.url || r.file || '',
            format,
            filesize: r.filesize || r.size || 0,
            last_modified: r.last_modified || r.modified || r.created_at || new Date().toISOString(),
          }
        }),
      }

      log.info({ resourcesCount: dataset.resources.length }, "Dataset PCI mappé")
      
      return dataset
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération métadonnées dataset PCI')
      if (error instanceof Error) {
        log.error({ message: error.message }, 'Détails erreur')
      }
      return null
    }
  }
}

