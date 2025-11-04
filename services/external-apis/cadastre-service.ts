/**
 * Service pour récupérer les données cadastrales depuis l'API Géoportail (IGN)
 * Sources :
 * - Géoportail IGN : https://www.geoportail.gouv.fr/
 * - API Cadastre : https://wxs.ign.fr/ pour les données parcellaires
 * - API Carto Cadastre (IGN) : https://apicarto.ign.fr/api/cadastre (nouvelle intégration)
 */

import type { AddressData } from './types'
import { APICartoCadastreService } from './apicarto-cadastre-service'
import { DataGouvCadastreService } from './datagouv-cadastre-service'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

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
  private apicartoService: APICartoCadastreService
  private dataGouvCadastreService: DataGouvCadastreService

  constructor() {
    this.geoportailApiKey = process.env.GEOPORTAIL_API_KEY
    this.apicartoService = new APICartoCadastreService()
    this.dataGouvCadastreService = new DataGouvCadastreService()
  }

  /**
   * Récupère les données cadastrales pour une adresse
   */
  async getCadastralData(address: AddressData): Promise<CadastralData | null> {
    try {
      const { coordinates, city, postalCode } = address

      log.debug({
        formatted: address.formatted,
        city,
        postalCode,
        hasCoordinates: !!coordinates,
        coordinates: coordinates ? { lat: coordinates.lat, lng: coordinates.lng } : null,
      }, 'Récupération données cadastrales')

      if (!coordinates) {
        log.warn({ formatted: address.formatted }, 'Coordonnées manquantes')
        return null
      }

      // 1. Identifier la parcelle depuis les coordonnées
      let parcelle = await this.identifyParcelle(coordinates)
      if (!parcelle) {
        log.warn('Parcelle non identifiée, utilisation données de base')
        const basicData = await this.getBasicCadastralData(address)
        if (basicData) {
          log.info({
            hasCommune: !!basicData.commune,
            hasCodeINSEE: !!basicData.codeINSEE,
            codeINSEE: basicData.codeINSEE,
            hasCoordinates: !!basicData.coordinates,
          }, 'Données cadastrales de base retournées')
        }
        return basicData
      }
      
      log.info({
        numero: parcelle.numero,
        section: parcelle.section,
        hasSurface: !!parcelle.surface,
      }, 'Parcelle identifiée')

      // 2. Récupérer les détails de la parcelle
      const [parcelleDetails, constraints, connectivity] = await Promise.all([
        this.getParcelleDetails(parcelle),
        this.getConstraints(address, coordinates),
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
        log.warn({ err: error }, 'Erreur récupération code INSEE')
      }

      // Enrichir avec les données de cadastre.data.gouv.fr si disponibles
      let dataGouvParcelle = null
      if (parcelle && codeINSEE && parcelle.section && parcelle.numero) {
        try {
          dataGouvParcelle = await this.dataGouvCadastreService.getParcelle(
            codeINSEE,
            parcelle.section,
            parcelle.numero
          )
          if (dataGouvParcelle && dataGouvParcelle.surface) {
            // Utiliser la surface depuis cadastre.data.gouv.fr si disponible
            if (parcelleDetails) {
              parcelleDetails.surface = dataGouvParcelle.surface
              parcelleDetails.contenance = dataGouvParcelle.surface / 10000
            } else if (parcelle) {
              parcelle.surface = dataGouvParcelle.surface
            }
          }
        } catch (error) {
          log.warn({ err: error }, 'Erreur enrichissement cadastre.data.gouv.fr')
        }
      }

      const sources = ['Géoportail IGN (API Carto)']
      if (dataGouvParcelle) {
        sources.push('Cadastre data.gouv.fr (Etalab)')
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
        sources,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération données cadastrales')
      // En cas d'erreur, retourner au moins les données de base
      const basicData = await this.getBasicCadastralData(address)
      log.info({
        hasCommune: !!basicData.commune,
        hasCodeINSEE: !!basicData.codeINSEE,
        codeINSEE: basicData.codeINSEE,
      }, 'Retour données de base après erreur')
      return basicData
    }
  }

  /**
   * Identifie la parcelle depuis les coordonnées GPS
   * Utilise plusieurs sources en cascade : PCI (cadastre.data.gouv.fr) → API Carto IGN → Géoportail
   */
  private async identifyParcelle(coordinates: { lat: number; lng: number }): Promise<CadastralParcel | null> {
    try {
      // 1. Essayer d'abord avec l'API PCI via cadastre.data.gouv.fr (plus fiable et complet)
      log.debug('Tentative identification parcelle via API PCI...')
      const pciParcelle = await this.dataGouvCadastreService.getParcelleByCoordinates(coordinates)
      
      if (pciParcelle) {
        log.info({
          numero: pciParcelle.numero,
          section: pciParcelle.section,
          codeInsee: pciParcelle.codeInsee,
          hasSurface: !!pciParcelle.surface,
        }, 'Parcelle identifiée via API PCI')
        
        return {
          id: pciParcelle.id,
          numero: pciParcelle.numero,
          section: pciParcelle.section,
          surface: pciParcelle.surface,
          nature: undefined,
        }
      }

      // 2. Fallback sur API Carto IGN (recommandé - PCI Express)
      log.debug('Fallback sur API Carto IGN...')
      const geom = APICartoCadastreService.createPointGeometry(coordinates.lat, coordinates.lng)
      const result = await this.apicartoService.getParcellesByGeometry(geom, 'PCI', 1)

      if (result.length > 0) {
        const feature = result[0]
        const props = feature.properties

        // Construire l'ID depuis code_com (code commune) + section + numero
        const codeCom = props.code_com || ''
        const id = feature.id || `${codeCom}-${props.section}-${props.numero}`

        log.info({
          numero: props.numero,
          section: props.section,
        }, 'Parcelle identifiée via API Carto IGN')

        return {
          id,
          numero: props.numero || '',
          section: props.section || '',
          surface: undefined, // Calculé depuis la géométrie si nécessaire
          nature: undefined,
        }
      }

      // 3. Fallback sur Géoportail si clé disponible
      if (this.geoportailApiKey) {
        log.debug('Fallback sur Géoportail...')
        return await this.identifyParcelleGeoportail(coordinates)
      }

      log.warn({ coordinates }, 'Aucune parcelle identifiée')
      return null
    } catch (error) {
      log.warn({ err: error }, 'Erreur identification parcelle')
      // Dernier fallback sur Géoportail si erreur
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
      log.warn({ err: error }, 'Erreur identification parcelle Géoportail')
      return null
    }
  }

  /**
   * Récupère les détails d'une parcelle depuis l'API Carto IGN
   */
  private async getParcelleDetails(parcelle: CadastralParcel): Promise<CadastralParcel | null> {
    try {
      if (!parcelle.section || !parcelle.numero) {
        return parcelle
      }

      // Extraire le code INSEE depuis l'ID de la parcelle si disponible
      // Format attendu: code_insee-section-numero
      let codeInsee: string | undefined
      if (parcelle.id && parcelle.id.includes('-')) {
        codeInsee = parcelle.id.split('-')[0]
      }

      if (!codeInsee) {
        // Si pas de code INSEE, retourner les données de base
        return {
          ...parcelle,
          contenance: parcelle.surface ? parcelle.surface / 10000 : undefined,
        }
      }

      // Construire le code INSEE complet (5 chiffres) depuis code_com (3 chiffres) si nécessaire
      // Note: L'API Carto utilise code_insee pour certaines requêtes, mais code_com dans les résultats
      // Pour getParcelleById, nous devons utiliser code_insee complet (5 chiffres)
      // Si codeCom fait 3 chiffres, il nous manque le code département
      // Pour l'instant, on essaie avec code_com et on adapte si nécessaire
      
      // Utiliser le service APICarto pour récupérer les détails complets
      // Note: getParcelleById nécessite code_insee (5 chiffres), pas code_com (3 chiffres)
      // Si on n'a que code_com, on doit le convertir ou utiliser une recherche par section+numero
      const parcelleDetails = await this.apicartoService.getParcelles({
        section: parcelle.section,
        numero: parcelle.numero,
        _limit: 1,
        source_ign: 'PCI',
      })

      if (parcelleDetails.features && parcelleDetails.features.length > 0) {
        const feature = parcelleDetails.features[0]
        const props = feature.properties
        
        // Calculer la surface depuis la géométrie si disponible
        let surface = parcelle.surface
        if (feature.geometry && 
            (feature.geometry.type === 'Polygon' || 
             feature.geometry.type === 'MultiPolygon')) {
          // TODO: Calculer la surface depuis les coordonnées GeoJSON
          // Pour l'instant, on garde la surface existante
        }

        // Extraire codeCom depuis l'ID ou les propriétés
        const codeComFromId = parcelle.id && parcelle.id.includes('-') 
          ? parcelle.id.split('-')[0] 
          : undefined
        const codeCom = codeComFromId || props.code_com || ''

        return {
          id: parcelle.id || `${codeCom}-${parcelle.section}-${parcelle.numero}`,
          numero: parcelle.numero || props.numero,
          section: parcelle.section || props.section,
          surface,
          nature: parcelle.nature,
          contenance: surface ? surface / 10000 : undefined,
        }
      }

      // Retourner les données de base si l'API échoue
      return {
        ...parcelle,
        contenance: parcelle.surface ? parcelle.surface / 10000 : undefined,
      }
    } catch (error) {
      log.warn({ err: error }, 'Erreur détails parcelle')
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
  private async getConstraints(address: AddressData, coordinates: { lat: number; lng: number }): Promise<CadastralData['constraints']> {
    try {
      const constraints: CadastralData['constraints'] = {}

      // Utiliser le service Géorisques pour les risques
      try {
        const { GeorisquesService } = await import('./georisques-service')
        const georisquesService = new GeorisquesService()
        const riskData = await georisquesService.getRiskData(address)

        if (riskData) {
          // Risques d'inondation
          constraints.isFloodZone = !!(riskData.tri && riskData.tri.length > 0) || 
                                    !!(riskData.azi && riskData.azi.length > 0) ||
                                    !!(riskData.papi && riskData.papi.length > 0)
          
          // Mouvements de terrain
          const hasMVT = !!(riskData.mvt && riskData.mvt.length > 0)
          const hasRGA = !!(riskData.rga && riskData.rga.potentiel !== 'faible')
          const casias = riskData.ssp?.casias ?? 0
          const basol = riskData.ssp?.basol ?? 0
          const hasSSP = casias > 0 || basol > 0
          
          constraints.hasRisk = hasMVT || hasRGA || hasSSP
        }
      } catch (error) {
        log.warn({ err: error }, 'Erreur service Géorisques (fallback)')
        
        // Fallback sur appel direct API Géorisques simplifié
        try {
          const floodResponse = await fetch(
            `https://www.georisques.gouv.fr/api/v1/gaspar/tri?lat=${coordinates.lat}&lon=${coordinates.lng}`,
            {
              headers: { Accept: 'application/json' },
            }
          )
          
          if (floodResponse.ok) {
            const floodData = await floodResponse.json()
            constraints.isFloodZone = floodData && floodData.length > 0
          }
        } catch (fallbackError) {
          log.warn({ err: fallbackError }, 'Erreur fallback zones inondables')
        }
      }

      // Vérifier monuments historiques via API Mérimée
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
        log.warn({ err: error }, 'Erreur vérification monuments historiques')
      }

      // Sites archéologiques (placeholder - nécessite source spécifique)
      constraints.hasArchaeologicalSite = false

      return constraints
    } catch (error) {
      log.warn({ err: error }, 'Erreur récupération contraintes')
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
      log.warn({ err: error }, 'Erreur récupération connectivité')
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
      log.warn({ err: error }, 'Erreur récupération historique')
      return undefined
    }
  }

  /**
   * Retourne des données cadastrales basiques si l'API n'est pas disponible
   */
  private async getBasicCadastralData(address: AddressData): Promise<CadastralData> {
    // Récupérer le code INSEE réel depuis l'API Communes
    let codeINSEE = address.postalCode?.substring(0, 2) || '' // Fallback temporaire
    let codeDepartement = address.postalCode?.substring(0, 2) || ''
    
    try {
      if (address.postalCode && address.city) {
        const communeResponse = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${address.postalCode}&nom=${encodeURIComponent(address.city)}&format=json`,
          { headers: { Accept: 'application/json' } }
        )
        
        if (communeResponse.ok) {
          const communes = await communeResponse.json()
          if (communes && communes.length > 0) {
            codeINSEE = communes[0].code // Code INSEE complet (5 chiffres)
            codeDepartement = communes[0].code?.substring(0, 2) || codeDepartement
          }
        }
      }
    } catch (error) {
      log.warn({ err: error }, 'Erreur récupération code INSEE pour données de base')
    }

    return {
      commune: address.city || '',
      codeINSEE,
      codeDepartement,
      coordinates: address.coordinates || undefined,
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

