/**
 * Service pour l'API Adresse (data.gouv.fr)
 * https://geo.api.gouv.fr/adresse
 */

import { ApiClient } from '../data-enrichment/api-client'
import type { AddressData } from './types'

interface ApiAdresseResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number] // [lng, lat]
    }
    properties: {
      label: string
      housenumber?: string
      street?: string
      postcode: string
      city: string
      context: string // Département
    }
  }>
}

export class AddressService {
  private client: ApiClient

  constructor() {
    this.client = new ApiClient({
      baseUrl: 'https://api-adresse.data.gouv.fr',
      timeout: 5000,
      retries: 2,
    })
  }

  /**
   * Recherche d'adresse depuis API Adresse
   * Essaie d'abord l'index local BAN, puis fallback sur API Adresse
   */
  async searchAddress(query: string): Promise<AddressData[]> {
    try {
      // 1. Essayer d'abord l'index local BAN
      try {
        const { BANIndexer } = await import('./ban-indexer')
        const indexer = new BANIndexer()
        const localResults = await indexer.searchAddress(query, 5)
        
        if (localResults.length > 0) {
          console.log('[AddressService] Données récupérées depuis l\'index BAN local')
          return localResults
        }
      } catch (error) {
        // Si l'index BAN n'est pas disponible, continuer avec l'API
        console.warn('[AddressService] Index BAN non disponible, utilisation API Adresse')
      }

      // 2. Fallback sur l'API Adresse
      const response = await this.client.get<ApiAdresseResponse>('/search', {
        q: query,
        limit: '5',
      })

      return response.features.map((feature) => {
        const props = feature.properties
        const [lng, lat] = feature.geometry.coordinates

        // Extraire la région du context
        const contextParts = props.context.split(',')
        const region = contextParts[contextParts.length - 1]?.trim() || ''

        return {
          formatted: props.label,
          street: props.street || props.label.split(/\d/)[0]?.trim() || '',
          postalCode: props.postcode,
          city: props.city,
          region,
          department: contextParts[0]?.trim() || '',
          coordinates: {
            lat,
            lng,
          },
          completeness: this.calculateCompleteness(props),
        }
      })
    } catch (error) {
      console.error('[AddressService] Erreur recherche adresse:', error)
      return []
    }
  }

  /**
   * Géocodage inverse (coordonnées → adresse)
   * Essaie d'abord l'index local BAN, puis fallback sur API Adresse
   */
  async reverseGeocode(lat: number, lng: number): Promise<AddressData | null> {
    try {
      // 1. Essayer d'abord l'index local BAN
      try {
        const { BANIndexer } = await import('./ban-indexer')
        const indexer = new BANIndexer()
        const localResult = await indexer.reverseGeocode(lat, lng, 100)
        
        if (localResult) {
          console.log('[AddressService] Géocodage inverse depuis l\'index BAN local')
          return localResult
        }
      } catch (error) {
        // Si l'index BAN n'est pas disponible, continuer avec l'API
        console.warn('[AddressService] Index BAN non disponible pour géocodage inverse')
      }

      // 2. Fallback sur l'API Adresse
      const response = await this.client.get<ApiAdresseResponse>('/reverse', {
        lat: lat.toString(),
        lon: lng.toString(),
      })

      if (response.features.length === 0) return null

      const feature = response.features[0]
      const props = feature.properties
      const [featureLng, featureLat] = feature.geometry.coordinates

      const contextParts = props.context.split(',')
      const region = contextParts[contextParts.length - 1]?.trim() || ''

      return {
        formatted: props.label,
        street: props.street || props.label.split(/\d/)[0]?.trim() || '',
        postalCode: props.postcode,
        city: props.city,
        region,
        department: contextParts[0]?.trim() || '',
        coordinates: {
          lat: featureLat,
          lng: featureLng,
        },
        completeness: this.calculateCompleteness(props),
      }
    } catch (error) {
      console.error('[AddressService] Erreur géocodage inverse:', error)
      return null
    }
  }

  /**
   * Calcule un score de complétude des données d'adresse
   */
  private calculateCompleteness(props: ApiAdresseResponse['features'][0]['properties']): number {
    let score = 0
    if (props.label) score += 30
    if (props.street || props.housenumber) score += 20
    if (props.postcode) score += 20
    if (props.city) score += 20
    if (props.context) score += 10
    return score
  }

  /**
   * Normalise une adresse pour les recherches
   */
  normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .trim()
  }
}

