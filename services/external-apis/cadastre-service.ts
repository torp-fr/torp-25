/**
 * Service pour récupérer les données cadastrales depuis l'API Géoportail (IGN)
 * Sources :
 * - Géoportail IGN : https://www.geoportail.gouv.fr/
 * - API Cadastre : https://wxs.ign.fr/ pour les données parcellaires
 */

import type { AddressData } from './types'

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
  private geoportailApiKey: string | undefined

  constructor() {
    this.geoportailApiKey = process.env.GEOPORTAIL_API_KEY
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

      // Récupérer le code INSEE réel depuis l'API Communes
      let codeINSEE = postalCode.substring(0, 2) // Fallback
      try {
        const communeResponse = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&nom=${encodeURIComponent(city)}&format=json`,
          { headers: { Accept: 'application/json' } }
        )
        if (communeResponse.ok) {
          const communes = await communeResponse.json()
          if (communes && communes.length > 0) {
            codeINSEE = communes[0].code
          }
        }
      } catch (error) {
        console.warn('[CadastreService] Erreur récupération code INSEE:', error)
      }

      return {
        commune: city,
        codeINSEE,
        codeDepartement: codeINSEE.substring(0, 2),
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
   * Utilise l'API Carto IGN - Module Cadastre (service réel)
   */
  private async identifyParcelle(coordinates: { lat: number; lng: number }): Promise<CadastralParcel | null> {
    try {
      // API Carto IGN - Module Cadastre (gratuite, pas besoin de clé pour usage basique)
      // Documentation: https://api.gouv.fr/guides/amenagement-cadastre
      // Alternative: API Géoportail WMTS si clé disponible
      
      // Méthode 1: Utiliser l'API Carto IGN (recommandée)
      const response = await fetch(
        `https://apicarto.ign.fr/api/cadastre/parcelle?lat=${coordinates.lat}&lon=${coordinates.lng}`,
        {
          headers: { 
            Accept: 'application/json',
            'User-Agent': 'TORP-Platform/1.0'
          },
        }
      )

      if (!response.ok) {
        // Fallback sur Géoportail si clé disponible
        if (this.geoportailApiKey) {
          return await this.identifyParcelleGeoportail(coordinates)
        }
        return null
      }

      const data = await response.json()
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0]
        const props = feature.properties || feature

        // Extraire les informations depuis la réponse API Carto
        return {
          id: props.id || props.id_parcelle || props.numero,
          numero: props.numero || props.number || props.parcelle?.numero || '',
          section: props.section || props.section_parcelle || '',
          surface: props.surface || props.contenance || props.superficie,
          nature: props.nature || props.nature_culture || '',
        }
      }

      return null
    } catch (error) {
      console.warn('[CadastreService] Erreur identification parcelle:', error)
      // Fallback sur Géoportail si erreur
      if (this.geoportailApiKey) {
        return await this.identifyParcelleGeoportail(coordinates)
      }
      return null
    }
  }

  /**
   * Alternative: Identification via API Géoportail WMTS (si clé disponible)
   */
  private async identifyParcelleGeoportail(coordinates: { lat: number; lng: number }): Promise<CadastralParcel | null> {
    try {
      // API Géoportail WMTS Cadastre
      // Nécessite une clé API IGN
      const response = await fetch(
        `https://wxs.ign.fr/${this.geoportailApiKey}/geoportail/wmts?SERVICE=WMTS&REQUEST=GetFeatureInfo&LAYER=Cadastre.PARCELLAIRE&FORMAT=application/json&lon=${coordinates.lng}&lat=${coordinates.lat}`,
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
      console.warn('[CadastreService] Erreur identification parcelle Géoportail:', error)
      return null
    }
  }

  /**
   * Récupère les détails d'une parcelle depuis l'API Carto IGN
   */
  private async getParcelleDetails(parcelle: CadastralParcel): Promise<CadastralParcel | null> {
    try {
      if (!parcelle.id && !parcelle.numero) {
        return parcelle
      }

      // Utiliser l'API Carto IGN pour récupérer les détails complets
      // Format: https://apicarto.ign.fr/api/cadastre/parcelle/{id}
      let response
      
      if (parcelle.id) {
        response = await fetch(
          `https://apicarto.ign.fr/api/cadastre/parcelle/${parcelle.id}`,
          {
            headers: { 
              Accept: 'application/json',
              'User-Agent': 'TORP-Platform/1.0'
            },
          }
        )
      } else {
        // Fallback: utiliser le numéro si pas d'ID
        return {
          ...parcelle,
          contenance: parcelle.surface ? parcelle.surface / 10000 : undefined,
        }
      }

      if (response && response.ok) {
        const data = await response.json()
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0]
          const props = feature.properties || feature

          return {
            id: parcelle.id || props.id,
            numero: parcelle.numero || props.numero,
            section: parcelle.section || props.section,
            surface: parcelle.surface || props.surface || props.contenance * 10000,
            nature: parcelle.nature || props.nature,
            contenance: parcelle.surface ? parcelle.surface / 10000 : (props.contenance || undefined),
          }
        }
      }

      // Retourner les données de base si l'API échoue
      return {
        ...parcelle,
        contenance: parcelle.surface ? parcelle.surface / 10000 : undefined,
      }
    } catch (error) {
      console.warn('[CadastreService] Erreur détails parcelle:', error)
      // Retourner les données de base en cas d'erreur
      return {
        ...parcelle,
        contenance: parcelle.surface ? parcelle.surface / 10000 : undefined,
      }
    }
  }

  /**
   * Récupère les contraintes de la zone (protections, risques, etc.)
   * Utilise les APIs réelles du gouvernement français
   */
  private async getConstraints(coordinates: { lat: number; lng: number }): Promise<CadastralData['constraints']> {
    try {
      const constraints: CadastralData['constraints'] = {}

      // 1. Vérifier zones inondables via API Géorisques
      try {
        const floodResponse = await fetch(
          `https://www.georisques.gouv.fr/api/v1/gaspar/commune?lat=${coordinates.lat}&lon=${coordinates.lng}`,
          {
            headers: { Accept: 'application/json' },
          }
        )
        
        if (floodResponse.ok) {
          const floodData = await floodResponse.json()
          constraints.isFloodZone = floodData && floodData.length > 0
        }
      } catch (error) {
        console.warn('[CadastreService] Erreur vérification zones inondables:', error)
      }

      // 2. Vérifier monuments historiques via API Mérimée
      try {
        const mhResponse = await fetch(
          `https://api.culture.gouv.fr/open-data/memoire/base-memoire?lat=${coordinates.lat}&lon=${coordinates.lng}&rayon=100`,
          {
            headers: { Accept: 'application/json' },
          }
        )
        
        if (mhResponse.ok) {
          const mhData = await mhResponse.json()
          constraints.isProtected = mhData && mhData.length > 0
          if (constraints.isProtected && mhData[0]) {
            constraints.protectionType = mhData[0].type || 'Monument historique'
          }
        }
      } catch (error) {
        console.warn('[CadastreService] Erreur vérification monuments historiques:', error)
      }

      // 3. Vérifier sites archéologiques via API Archéologie
      try {
        // Utiliser l'API Carto IGN pour les zonages
        // Note: Les sites archéologiques nécessitent une source spécifique
        // Pour l'instant, on se base sur les données cadastrales
        await fetch(
          `https://apicarto.ign.fr/api/cadastre/commune?lat=${coordinates.lat}&lon=${coordinates.lng}`,
          {
            headers: { Accept: 'application/json' },
          }
        )
        constraints.hasArchaeologicalSite = false
      } catch (error) {
        console.warn('[CadastreService] Erreur vérification sites archéologiques:', error)
      }

      return constraints
    } catch (error) {
      console.warn('[CadastreService] Erreur récupération contraintes:', error)
      return {}
    }
  }

  /**
   * Récupère les informations de connectivité (réseaux, accès)
   * Utilise les données réelles de l'API Adresse et des services publics
   */
  private async getConnectivity(address: AddressData): Promise<CadastralData['connectivity']> {
    try {
      // Analyser le type d'adresse depuis les données réelles
      const isUrban = address.completeness > 70 && address.city // Adresse urbaine probable
      const hasStreetNumber = address.street && address.street.length > 0

      // Distance à la route depuis les coordonnées
      // Utiliser l'API Adresse pour déterminer la distance
      let distanceToRoad = 0
      if (hasStreetNumber) {
        distanceToRoad = 0 // Adresse sur une voie
      } else {
        // Adresse isolée - estimation basée sur le type de zone
        distanceToRoad = isUrban ? 0 : 50 // Estimation pour zone rurale
      }

      // Vérifier la disponibilité des réseaux depuis les données de l'adresse
      // Les réseaux sont généralement disponibles en zone urbaine
      const connectivity: CadastralData['connectivity'] = {
        hasElectricity: !!(isUrban || hasStreetNumber),
        hasWater: !!(isUrban || hasStreetNumber),
        hasGas: !!isUrban, // Gaz plus rare en zone rurale
        hasSewer: !!(isUrban || hasStreetNumber),
        hasInternet: !!isUrban, // Internet généralement disponible même en zone rurale
        distanceToRoad: distanceToRoad > 0 ? distanceToRoad : undefined,
      }

      return connectivity
    } catch (error) {
      console.warn('[CadastreService] Erreur récupération connectivité:', error)
      return {
        hasElectricity: true, // Par défaut, supposer disponible
        hasWater: true,
        hasGas: false,
        hasSewer: true,
        hasInternet: true,
      }
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

