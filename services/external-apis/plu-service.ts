/**
 * Service pour récupérer les données PLU (Plan Local d'Urbanisme) depuis les APIs publiques
 * Sources :
 * - data.gouv.fr : Données PLU mises à disposition par les collectivités
 * - API Adresse : Géocodage pour identifier la commune
 * - Cadastre : Informations parcellaires
 */

import type { AddressData } from './types'

export interface PLUData {
  commune: string
  codeINSEE: string
  pluVersion?: string
  zone?: string
  zonage?: {
    type: string // U, AU, N, etc.
    denomination?: string
    reglement?: string
  }
  contraintes?: Array<{
    type: string // 'hauteur', 'retrait', 'densite', 'espaces_verts', etc.
    description: string
    valeur?: string | number
  }>
  documents?: Array<{
    type: string // 'reglement', 'zonage', 'padd', etc.
    url?: string
    date?: string
  }>
  sources: string[]
  lastUpdated?: string
}

export class PLUService {
  constructor() {
    // Service PLU - Utilise fetch directement pour data.gouv.fr
  }

  /**
   * Récupère les données PLU pour une adresse donnée
   * @param address - Adresse complète avec code postal et ville
   */
  async getPLUData(address: AddressData): Promise<PLUData | null> {
    try {
      const { city, postalCode, coordinates } = address

      console.log('[PLUService] 🔄 Récupération données PLU pour:', {
        formatted: address.formatted,
        city,
        postalCode,
        hasCoordinates: !!coordinates,
      })

      // 1. Identifier la commune depuis le code postal
      const communeData = await this.identifyCommune(city, postalCode)
      if (!communeData) {
        console.warn('[PLUService] ⚠️ Commune non identifiée pour:', city, postalCode)
        return null
      }

      console.log('[PLUService] ✅ Commune identifiée:', communeData)

      // 2. Récupérer les données PLU depuis data.gouv.fr
      const pluData = await this.fetchPLUFromDataGouv(communeData.codeINSEE)

      // 3. Si pas de données PLU centralisées, tenter d'autres sources
      if (!pluData && coordinates) {
        const altData = await this.fetchPLUFromAlternativeSources(communeData, coordinates)
        if (altData) {
          console.log('[PLUService] ✅ Données PLU récupérées (source alternative):', {
            hasZone: !!altData.zone,
            hasZonage: !!altData.zonage,
            hasContraintes: !!(altData.contraintes && altData.contraintes.length > 0),
          })
          return altData
        }
      }

      if (pluData) {
        console.log('[PLUService] ✅ Données PLU récupérées:', {
          hasZone: !!pluData.zone,
          hasZonage: !!pluData.zonage,
          hasContraintes: !!(pluData.contraintes && pluData.contraintes.length > 0),
        })
      } else {
        console.warn('[PLUService] ⚠️ Aucune donnée PLU trouvée pour:', address.formatted)
      }

      return pluData
    } catch (error) {
      console.error('[PLUService] ❌ Erreur récupération PLU:', error)
      return null
    }
  }

  /**
   * Identifie la commune depuis le code postal
   */
  private async identifyCommune(city: string, postalCode: string): Promise<{ codeINSEE: string; nom: string } | null> {
    try {
      // Utiliser l'API Communes via data.gouv.fr ou API Adresse
      // Pour l'instant, on utilise une approximation basée sur le code postal
      // En production, utiliser l'API officielle : https://api.gouv.fr/guides/api-geo
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&nom=${encodeURIComponent(city)}&format=json`,
        { headers: { 'Accept': 'application/json' } }
      )

      if (!response.ok) {
        return null
      }

      const communes = await response.json()
      if (communes && communes.length > 0) {
        const commune = communes[0]
        return {
          codeINSEE: commune.code,
          nom: commune.nom,
        }
      }

      return null
    } catch (error) {
      console.error('[PLUService] Erreur identification commune:', error)
      return null
    }
  }

  /**
   * Récupère les données PLU depuis data.gouv.fr
   */
  private async fetchPLUFromDataGouv(codeINSEE: string): Promise<PLUData | null> {
    try {
      // Rechercher les datasets PLU pour cette commune
      // Format : https://www.data.gouv.fr/api/1/datasets/?q=PLU+{commune}
      const response = await fetch(
        `https://www.data.gouv.fr/api/1/datasets/?q=PLU+${codeINSEE}&page_size=5`,
        { headers: { Accept: 'application/json' } }
      )

      if (!response.ok) {
        return null
      }

      const searchResponse = await response.json() as {
        data: Array<{
          id: string
          title: string
          resources: Array<{
            url: string
            format: string
            title: string
          }>
        }>
      }

      if (!searchResponse || !searchResponse.data || searchResponse.data.length === 0) {
        return null
      }

      // Prendre le premier résultat pertinent
      const dataset = searchResponse.data[0]

      // Pour l'instant, on retourne une structure basique
      // En production, il faudra parser les fichiers PLU (GeoJSON, Shapefile, etc.)
      return {
        commune: dataset.title,
        codeINSEE,
        pluVersion: 'latest',
        sources: ['data.gouv.fr'],
        lastUpdated: new Date().toISOString(),
        documents: dataset.resources
          .filter((r) => ['geojson', 'json', 'shp', 'pdf'].includes(r.format?.toLowerCase() || ''))
          .map((r) => ({
            type: 'reglement',
            url: r.url,
          })),
      }
    } catch (error) {
      console.warn('[PLUService] Pas de données PLU disponibles sur data.gouv.fr:', error)
      return null
    }
  }

  /**
   * Récupère les données PLU depuis des sources alternatives
   */
  private async fetchPLUFromAlternativeSources(
    communeData: { codeINSEE: string; nom: string },
    _coordinates: { lat: number; lng: number }
  ): Promise<PLUData | null> {
    // Placeholder pour intégration future avec :
    // - API Cadastre (pour identifier la parcelle)
    // - APIs locales des collectivités
    // - Services privés spécialisés
    
    return {
      commune: communeData.nom,
      codeINSEE: communeData.codeINSEE,
      sources: ['API Communes'],
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Extrait les contraintes PLU pertinentes pour un type de projet
   */
  extractConstraintsForProject(pluData: PLUData, projectType: string): string[] {
    const constraints: string[] = []

    if (!pluData.contraintes) {
      return constraints
    }

    // Filtrer les contraintes selon le type de projet
    const relevantConstraintTypes: string[] = []

    if (projectType === 'construction' || projectType === 'extension') {
      relevantConstraintTypes.push('hauteur', 'retrait', 'densite', 'emprise_au_sol')
    }

    if (projectType === 'renovation') {
      relevantConstraintTypes.push('aspect_exterieur', 'isolation', 'fenetres')
    }

    pluData.contraintes.forEach((contrainte) => {
      if (relevantConstraintTypes.includes(contrainte.type)) {
        constraints.push(contrainte.description)
      }
    })

    return constraints
  }
}

