/**
 * Service pour récupérer les données cadastrales depuis l'API Géoportail (IGN)
 * Sources :
 * - Géoportail IGN : https://www.geoportail.gouv.fr/
 * - API Cadastre : https://wxs.ign.fr/ pour les données parcellaires
 */

import type { AddressData } from './types'
import { ApiClient } from '@/services/data-enrichment/api-client'

export interface CadastralParcel {
  id: string // Identifiant parcellaire
  numero: string // Numéro de parcelle
  section: string // Section cadastrale
  surface?: number // Surface en m²
  nature?: string // Nature de la parcelle (terre, bâtie, etc.)
  contenance?: number // Contenance en hectares
}

export interface CadastralData {
  commune: string
  codeINSEE: string
  codeDepartement: string
  parcelle?: CadastralParcel
  parcelles?: CadastralParcel[] // Si plusieurs parcelles
  coordinates?: {
    lat: number
    lng: number
    centroid?: { lat: number; lng: number }
    bounds?: {
      north: number
      south: number
      east: number
      west: number
    }
  }
  constraints?: {
    isProtected?: boolean // Zone protégée (monument historique, etc.)
    protectionType?: string // Type de protection
    hasArchaeologicalSite?: boolean // Site archéologique
    hasForest?: boolean // Zone forestière
    hasWater?: boolean // Zone humide, cours d'eau
    isFloodZone?: boolean // Zone inondable
    hasRisk?: boolean // Autres risques
  }
  buildingInfo?: {
    constructionYear?: number
    numberOfFloors?: number
    buildingType?: string
    occupancyRate?: number // Taux d'occupation au sol
  }
  connectivity?: {
    hasElectricity?: boolean
    hasWater?: boolean
    hasGas?: boolean
    hasSewer?: boolean
    hasInternet?: boolean
    distanceToRoad?: number // Distance à la route en mètres
  }
  historicalData?: {
    previousPermits?: Array<{
      type: string
      date: string
      description?: string
    }>
    modifications?: Array<{
      date: string
      type: string
      description?: string
    }>
  }
  sources: string[]
  lastUpdated: string
}

export class CadastreService {
  private client: ApiClient
  private geoportailApiKey: string | undefined

  constructor() {
    this.geoportailApiKey = process.env.GEOPORTAIL_API_KEY
    this.client = new ApiClient({
      baseUrl: 'https://wxs.ign.fr',
      timeout: 15000,
      retries: 2,
      headers: this.geoportailApiKey
        ? {
            Authorization: `Bearer ${this.geoportailApiKey}`,
          }
        : undefined,
    })
  }

  /**
   * Récupère les données cadastrales pour une adresse
   */
  async getCadastralData(address: AddressData): Promise<CadastralData | null> {
    try {
      const { coordinates, city, postalCode } = address

      if (!coordinates) {
        console.warn('[CadastreService] Coordonnées manquantes pour:', address.formatted)
        return null
      }

      // 1. Identifier la parcelle depuis les coordonnées
      const parcelle = await this.identifyParcelle(coordinates)
      if (!parcelle) {
        return this.getBasicCadastralData(address)
      }

      // 2. Récupérer les détails de la parcelle
      const [parcelleDetails, constraints, connectivity] = await Promise.all([
        this.getParcelleDetails(parcelle),
        this.getConstraints(coordinates),
        this.getConnectivity(address),
      ])

      // 3. Récupérer l'historique si disponible
      const historicalData = await this.getHistoricalData(parcelle)

      return {
        commune: city,
        codeINSEE: postalCode.substring(0, 2), // Approximation
        codeDepartement: postalCode.substring(0, 2),
        parcelle: parcelleDetails || parcelle,
        coordinates: {
          lat: coordinates.lat,
          lng: coordinates.lng,
        },
        constraints,
        connectivity,
        historicalData,
        sources: ['Géoportail IGN'],
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[CadastreService] Erreur récupération données cadastrales:', error)
      return this.getBasicCadastralData(address)
    }
  }

  /**
   * Identifie la parcelle depuis les coordonnées GPS
   */
  private async identifyParcelle(coordinates: { lat: number; lng: number }): Promise<CadastralParcel | null> {
    try {
      if (!this.geoportailApiKey) {
        console.warn('[CadastreService] GEOPORTAIL_API_KEY non configurée')
        return null
      }

      // API Cadastre Géoportail
      // Format: https://wxs.ign.fr/{cle}/geoportail/wmts
      const response = await fetch(
        `https://wxs.ign.fr/${this.geoportailApiKey}/geoportail/cadastre/parcelle?lon=${coordinates.lng}&lat=${coordinates.lat}&format=json`,
        {
          headers: { Accept: 'application/json' },
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const props = feature.properties

        return {
          id: props.id || props.id_parcelle,
          numero: props.numero || props.number,
          section: props.section || '',
          surface: props.surface,
          nature: props.nature,
        }
      }

      return null
    } catch (error) {
      console.warn('[CadastreService] Erreur identification parcelle:', error)
      return null
    }
  }

  /**
   * Récupère les détails d'une parcelle
   */
  private async getParcelleDetails(parcelle: CadastralParcel): Promise<CadastralParcel | null> {
    try {
      if (!this.geoportailApiKey || !parcelle.id) {
        return null
      }

      // Récupérer les détails complémentaires
      // À implémenter selon les endpoints disponibles
      return {
        ...parcelle,
        contenance: parcelle.surface ? parcelle.surface / 10000 : undefined,
      }
    } catch (error) {
      console.warn('[CadastreService] Erreur détails parcelle:', error)
      return null
    }
  }

  /**
   * Récupère les contraintes de la zone (protections, risques, etc.)
   */
  private async getConstraints(coordinates: { lat: number; lng: number }): Promise<CadastralData['constraints']> {
    try {
      // Utiliser les données Géoportail pour les zones protégées
      // - Zones Natura 2000
      // - Monuments historiques
      // - Sites archéologiques
      // - Zones inondables

      // Placeholder - À implémenter avec les APIs appropriées
      return {
        isProtected: false,
        hasArchaeologicalSite: false,
        hasForest: false,
        isFloodZone: false,
      }
    } catch (error) {
      console.warn('[CadastreService] Erreur récupération contraintes:', error)
      return {}
    }
  }

  /**
   * Récupère les informations de connectivité (réseaux, accès)
   */
  private async getConnectivity(address: AddressData): Promise<CadastralData['connectivity']> {
    try {
      // Détecter la présence des réseaux depuis les données disponibles
      // Pour l'instant, on fait des approximations basées sur le type d'adresse

      const isUrban = address.completeness > 70 // Adresse urbaine probable

      return {
        hasElectricity: isUrban, // Probable en zone urbaine
        hasWater: isUrban,
        hasGas: isUrban,
        hasSewer: isUrban,
        hasInternet: isUrban,
        distanceToRoad: isUrban ? 0 : undefined,
      }
    } catch (error) {
      console.warn('[CadastreService] Erreur récupération connectivité:', error)
      return {}
    }
  }

  /**
   * Récupère l'historique de la parcelle (permis, modifications)
   */
  private async getHistoricalData(_parcelle: CadastralParcel): Promise<CadastralData['historicalData']> {
    try {
      // Placeholder pour intégration future avec :
      // - Archives départementales
      // - Services d'urbanisme locaux
      // - Bases de données historiques

      return undefined
    } catch (error) {
      console.warn('[CadastreService] Erreur récupération historique:', error)
      return undefined
    }
  }

  /**
   * Retourne des données cadastrales basiques si l'API n'est pas disponible
   */
  private getBasicCadastralData(address: AddressData): CadastralData {
    return {
      commune: address.city,
      codeINSEE: address.postalCode.substring(0, 2),
      codeDepartement: address.postalCode.substring(0, 2),
      coordinates: address.coordinates,
      sources: ['API Adresse'],
      lastUpdated: new Date().toISOString(),
    }
  }

  /**
   * Analyse les possibilités de construction sur la parcelle
   */
  analyzeConstructionPossibilities(cadastralData: CadastralData): {
    canConstruct: boolean
    constraints: string[]
    recommendations: string[]
    feasibilityScore: number // 0-100
  } {
    const constraints: string[] = []
    const recommendations: string[] = []
    let feasibilityScore = 100

    // Vérifier les contraintes de protection
    if (cadastralData.constraints?.isProtected) {
      constraints.push('Zone protégée - Autorisation spéciale requise')
      feasibilityScore -= 30
    }

    if (cadastralData.constraints?.hasArchaeologicalSite) {
      constraints.push('Site archéologique - Étude préalable nécessaire')
      feasibilityScore -= 20
    }

    if (cadastralData.constraints?.isFloodZone) {
      constraints.push('Zone inondable - Normes spécifiques requises')
      feasibilityScore -= 15
      recommendations.push('Vérifier les règles PLU pour zone inondable')
    }

    // Vérifier la connectivité
    if (!cadastralData.connectivity?.hasElectricity || !cadastralData.connectivity?.hasWater) {
      constraints.push('Réseaux (électricité/eau) - Vérifier la disponibilité')
      feasibilityScore -= 10
      recommendations.push('Contacter les services de la commune pour vérifier les connexions')
    }

    // Vérifier l'accès
    if (cadastralData.connectivity?.distanceToRoad && cadastralData.connectivity.distanceToRoad > 50) {
      constraints.push('Accès routier - Distance importante')
      feasibilityScore -= 10
      recommendations.push('Évaluer le coût d\'accès et de voirie')
    }

    // Surface disponible
    if (cadastralData.parcelle?.surface && cadastralData.parcelle.surface < 100) {
      constraints.push('Surface limitée - Vérifier les possibilités de construction')
      feasibilityScore -= 10
    }

    return {
      canConstruct: feasibilityScore >= 50,
      constraints,
      recommendations,
      feasibilityScore: Math.max(0, Math.min(100, feasibilityScore)),
    }
  }
}

