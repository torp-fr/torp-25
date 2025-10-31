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
  private readonly datasetId = '59b0020ec751df07d5f13bcf'
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
      console.log(`[DataGouvCadastreService] 🔍 Récupération dataset Cadastre: ${this.datasetId}`)
      
      const response = await this.client.get<any>(
        `/datasets/${this.datasetId}/`
      )
      
      console.log('[DataGouvCadastreService] 📦 Réponse API data.gouv.fr:', {
        hasResponse: !!response,
        hasResources: !!(response?.resources),
        resourcesCount: response?.resources?.length || 0,
      })

      if (!response) {
        console.error('[DataGouvCadastreService] ❌ Réponse vide de l\'API')
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

      console.log(`[DataGouvCadastreService] ✅ Dataset mappé: ${dataset.resources.length} ressource(s) trouvée(s)`)
      
      return dataset
    } catch (error) {
      console.error('[DataGouvCadastreService] ❌ Erreur récupération métadonnées dataset:', error)
      if (error instanceof Error) {
        console.error('[DataGouvCadastreService] ❌ Détails erreur:', error.message)
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
      console.log(`[DataGouvCadastreService] 🔍 Récupération parcelles pour commune: ${codeInsee}`)
      
      const response = await fetch(
        `${this.cadastreApiBase}/communes/${codeInsee}/parcelles`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.warn(`[DataGouvCadastreService] ⚠️ Erreur HTTP ${response.status} pour commune ${codeInsee}`)
        return []
      }

      const data = await response.json()
      
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

        console.log(`[DataGouvCadastreService] ✅ ${parcelles.length} parcelle(s) trouvée(s) pour ${codeInsee}`)
        return parcelles
      }

      return []
    } catch (error) {
      console.error('[DataGouvCadastreService] ❌ Erreur récupération parcelles:', error)
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
      console.log(`[DataGouvCadastreService] 🔍 Récupération parcelle ${section}-${numero} pour commune: ${codeInsee}`)
      
      const response = await fetch(
        `${this.cadastreApiBase}/communes/${codeInsee}/parcelles/${section}/${numero}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        console.warn(`[DataGouvCadastreService] ⚠️ Parcelle non trouvée: ${codeInsee}/${section}/${numero}`)
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
          console.warn('[DataGouvCadastreService] ⚠️ Erreur récupération bâtiments:', error)
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

        console.log(`[DataGouvCadastreService] ✅ Parcelle trouvée: ${parcelle.id}`)
        return parcelle
      }

      return null
    } catch (error) {
      console.error('[DataGouvCadastreService] ❌ Erreur récupération parcelle:', error)
      return null
    }
  }

  /**
   * Récupère les parcelles depuis une adresse
   */
  async getParcellesByAddress(address: AddressData): Promise<CadastreDataGouvParcelle[]> {
    try {
      if (!address.postalCode) {
        console.warn('[DataGouvCadastreService] ⚠️ Code postal manquant')
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
        console.warn('[DataGouvCadastreService] ⚠️ Erreur récupération code INSEE:', error)
      }

      if (!codeInsee) {
        console.warn('[DataGouvCadastreService] ⚠️ Code INSEE non trouvé pour:', address.formatted)
        return []
      }

      return await this.getParcellesByCommune(codeInsee)
    } catch (error) {
      console.error('[DataGouvCadastreService] ❌ Erreur récupération parcelles par adresse:', error)
      return []
    }
  }
}

