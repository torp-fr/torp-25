/**
 * Service pour l'API Carto Cadastre (IGN)
 * Documentation: https://apicarto.ign.fr/api/doc/cadastre
 * Version API: 2.9.1
 * 
 * Endpoints disponibles:
 * - /api/cadastre/commune - Limites géométriques des communes
 * - /api/cadastre/parcelle - Parcelles cadastrales détaillées
 * - /api/cadastre/feuille - Feuilles parcellaires (PCI Express)
 * - /api/cadastre/division - Divisions parcellaires (BD Parcellaire)
 * - /api/cadastre/localisant - Centroïdes des parcelles
 * 
 * Sources IGN:
 * - PCI (Parcellaire Express) - Recommandé (mise à jour semestrielle)
 * - BDP (BD Parcellaire) - Historique (non mis à jour)
 * - Par défaut: PCI si source_ign non spécifié
 */

import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export type APICartoSource = 'PCI' | 'BDP'

export interface APICartoGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon'
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export interface APICartoCommuneFeature {
  type: 'Feature'
  id?: string
  geometry: APICartoGeometry
  properties: {
    nom_commune: string
    code_dep: string
    code_insee: string
  }
}

export interface APICartoParcelleFeature {
  type: 'Feature'
  id?: string
  geometry: APICartoGeometry
  properties: {
    numero: string
    feuille?: number
    section: string
    code_dep: string
    code_com: string
    com_abs?: string
    echelle?: string
    code_arr?: string
  }
}

export interface APICartoFeuilleFeature {
  type: 'Feature'
  id?: string
  geometry: APICartoGeometry
  properties: {
    feuille: number
    section: string
    code_dep: string
    nom_comm?: string
    code_com: string
    com_abs?: string
    echelle?: string
    code_arr?: string
    code_insee: string
  }
}

export interface APICartoDivisionFeature {
  type: 'Feature'
  id?: string
  geometry: APICartoGeometry
  properties: {
    feuille?: number
    section: string
    code_dep: string
    code_com: string
    com_abs?: string
    echelle?: string
    code_arr?: string
  }
}

export interface APICartoLocalisantFeature {
  type: 'Feature'
  id?: string
  geometry: APICartoGeometry
  properties: {
    numero: string
    feuille?: number
    section: string
    code_dep: string
    code_com: string
    com_abs?: string
    echelle?: string
    code_arr?: string
  }
}

export interface APICartoFeatureCollection<T = any> {
  type: 'FeatureCollection'
  features: T[]
}

export interface APICartoCommuneParams {
  code_insee?: string
  code_dep?: string
  geom?: APICartoGeometry | string
  _limit?: number // 1-500
  _start?: number
  source_ign?: APICartoSource
}

export interface APICartoParcelleParams {
  code_insee?: string
  section?: string
  numero?: string
  code_arr?: string
  com_abs?: string
  geom?: APICartoGeometry | string
  _limit?: number // 1-1000
  _start?: number
  source_ign?: APICartoSource
}

export interface APICartoFeuilleParams {
  code_insee?: string
  code_dep?: string
  code_com?: string
  section?: string
  code_arr?: string
  geom?: APICartoGeometry | string
  _limit?: number // 1-1000
  _start?: number
}

export interface APICartoDivisionParams {
  code_insee?: string
  code_dep?: string
  code_com?: string
  section?: string
  code_arr?: string
  geom?: APICartoGeometry | string
  _limit?: number // 1-1000
  _start?: number
}

export interface APICartoLocalisantParams {
  code_insee?: string
  section?: string
  numero?: string
  code_arr?: string
  geom?: APICartoGeometry | string
  _limit?: number // 1-1000
  _start?: number
  source_ign?: APICartoSource
}

export class APICartoCadastreService {
  private readonly baseUrl = 'https://apicarto.ign.fr'

  /**
   * Récupère les limites géométriques d'une commune
   */
  async getCommune(params: APICartoCommuneParams): Promise<APICartoFeatureCollection<APICartoCommuneFeature>> {
    return this.fetchEndpoint<APICartoCommuneFeature>('/api/cadastre/commune', params)
  }

  /**
   * Récupère les parcelles cadastrales d'une commune
   */
  async getParcelles(params: APICartoParcelleParams): Promise<APICartoFeatureCollection<APICartoParcelleFeature>> {
    return this.fetchEndpoint<APICartoParcelleFeature>('/api/cadastre/parcelle', params)
  }

  /**
   * Récupère les feuilles parcellaires (PCI Express)
   */
  async getFeuilles(params: APICartoFeuilleParams): Promise<APICartoFeatureCollection<APICartoFeuilleFeature>> {
    return this.fetchEndpoint<APICartoFeuilleFeature>('/api/cadastre/feuille', params)
  }

  /**
   * Récupère les divisions parcellaires (BD Parcellaire)
   */
  async getDivisions(params: APICartoDivisionParams): Promise<APICartoFeatureCollection<APICartoDivisionFeature>> {
    return this.fetchEndpoint<APICartoDivisionFeature>('/api/cadastre/division', params)
  }

  /**
   * Récupère les centroïdes (localisants) des parcelles
   */
  async getLocalisants(params: APICartoLocalisantParams): Promise<APICartoFeatureCollection<APICartoLocalisantFeature>> {
    return this.fetchEndpoint<APICartoLocalisantFeature>('/api/cadastre/localisant', params)
  }

  /**
   * Récupère une parcelle spécifique par son identifiant complet
   */
  async getParcelleById(
    codeInsee: string,
    section: string,
    numero: string,
    source: APICartoSource = 'PCI'
  ): Promise<APICartoParcelleFeature | null> {
    try {
      const result = await this.getParcelles({
        code_insee: codeInsee,
        section,
        numero,
        source_ign: source,
        _limit: 1,
      })

      return result.features.length > 0 ? result.features[0] : null
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération parcelle')
      return null
    }
  }

  /**
   * Récupère toutes les parcelles d'une commune
   */
  async getAllParcellesCommune(
    codeInsee: string,
    source: APICartoSource = 'PCI',
    limit = 1000
  ): Promise<APICartoParcelleFeature[]> {
    try {
      const allParcelles: APICartoParcelleFeature[] = []
      let start = 0
      const pageSize = Math.min(limit, 1000)

      while (true) {
        const result = await this.getParcelles({
          code_insee: codeInsee,
          source_ign: source,
          _limit: pageSize,
          _start: start,
        })

        if (result.features.length === 0) {
          break
        }

        allParcelles.push(...result.features)

        if (result.features.length < pageSize || allParcelles.length >= limit) {
          break
        }

        start += pageSize
      }

      return allParcelles.slice(0, limit)
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération toutes parcelles')
      return []
    }
  }

  /**
   * Récupère les parcelles par géométrie (Point, Polygon, etc.)
   */
  async getParcellesByGeometry(
    geometry: APICartoGeometry,
    source: APICartoSource = 'PCI',
    limit = 1000
  ): Promise<APICartoParcelleFeature[]> {
    try {
      const result = await this.getParcelles({
        geom: geometry,
        source_ign: source,
        _limit: limit,
      })

      return result.features
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération parcelles par géométrie')
      return []
    }
  }

  /**
   * Récupère le centroïde d'une parcelle spécifique
   */
  async getParcelleCentroid(
    codeInsee: string,
    section: string,
    numero: string,
    source: APICartoSource = 'PCI'
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      const result = await this.getLocalisants({
        code_insee: codeInsee,
        section,
        numero,
        source_ign: source,
        _limit: 1,
      })

      if (result.features.length === 0 || !result.features[0].geometry) {
        return null
      }

      const geom = result.features[0].geometry
      if (geom.type === 'Point' || geom.type === 'MultiPoint') {
        const coords = Array.isArray(geom.coordinates[0])
          ? (geom.coordinates as number[][])[0]
          : (geom.coordinates as number[])
        return {
          lng: coords[0],
          lat: coords[1],
        }
      }

      return null
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération centroïde')
      return null
    }
  }

  /**
   * Méthode générique pour appeler les endpoints
   */
  private async fetchEndpoint<T>(
    endpoint: string,
    params: Record<string, any>
  ): Promise<APICartoFeatureCollection<T>> {
    try {
      // Convertir les objets GeoJSON en string pour les paramètres GET
      const queryParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return
        }

        if (key === 'geom' && typeof value === 'object') {
          // Convertir la géométrie GeoJSON en string JSON
          queryParams.append(key, JSON.stringify(value))
        } else {
          queryParams.append(key, String(value))
        }
      })

      const url = `${this.baseUrl}${endpoint}?${queryParams.toString()}`
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API Carto error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // L'API peut retourner un array de FeatureCollection ou directement un FeatureCollection
      if (Array.isArray(data)) {
        return data[0] as APICartoFeatureCollection<T>
      }

      return data as APICartoFeatureCollection<T>
    } catch (error) {
      console.error(`[APICartoCadastreService] Erreur fetch ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * Crée une géométrie Point depuis des coordonnées
   */
  static createPointGeometry(lat: number, lng: number): APICartoGeometry {
    return {
      type: 'Point',
      coordinates: [lng, lat], // GeoJSON format: [lng, lat]
    }
  }

  /**
   * Crée une géométrie Polygon depuis des bounds
   */
  static createPolygonGeometry(bounds: {
    north: number
    south: number
    east: number
    west: number
  }): APICartoGeometry {
    return {
      type: 'Polygon',
      coordinates: [[
        [bounds.west, bounds.south],
        [bounds.east, bounds.south],
        [bounds.east, bounds.north],
        [bounds.west, bounds.north],
        [bounds.west, bounds.south],
      ]],
    }
  }
}

