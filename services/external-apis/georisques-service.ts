/**
 * Service pour récupérer les données de risques depuis l'API Géorisques
 * Base URL: https://www.georisques.gouv.fr/api/v1
 * Documentation: https://www.georisques.gouv.fr/api
 * 
 * Cette API fournit des informations sur les risques naturels et technologiques :
 * - Risques d'inondation (TRI, AZI, PAPI)
 * - Mouvements de terrain (MVT)
 * - Retrait gonflement des argiles (RGA)
 * - Sites et sols pollués (SSP)
 * - Radon
 * - Installations classées
 * - Zonage sismique
 * - Etc.
 */

import type { AddressData } from './types'

export interface GeorisquesRiskData {
  // Risques d'inondation
  tri?: Array<{
    code: string
    nom: string
    departement: string
    type: string
  }>
  azi?: Array<{
    code: string
    nom: string
    date_approbation?: string
    type?: string
  }>
  papi?: Array<{
    code: string
    nom: string
    etat: string
    date_signature?: string
  }>
  
  // Mouvements de terrain
  mvt?: Array<{
    code: string
    nom: string
    type: string
    departement: string
  }>
  
  // Retrait gonflement des argiles
  rga?: {
    code_commune: string
    nom_commune: string
    potentiel: 'faible' | 'moyen' | 'fort' | 'très fort'
    classe: string
  }
  
  // Sites et sols pollués
  ssp?: {
    casias?: number
    basol?: number
    sis?: number
    sup?: number
  }
  
  // Radon
  radon?: {
    code_commune: string
    nom_commune: string
    potentiel: 1 | 2 | 3 // 1=faible, 2=moyen, 3=élevé
    classe: string
  }
  
  // Zonage sismique
  sismique?: {
    code_commune: string
    nom_commune: string
    zone: '1' | '2' | '3' | '4' | '5'
    niveau: string
  }
  
  // Installations classées
  installations_classees?: Array<{
    code_insee: string
    nom_installation: string
    activite: string
    statut: string
    distance?: number // Distance en mètres depuis l'adresse
  }>
  
  // Risques généraux
  risques?: Array<{
    code: string
    libelle: string
    type: string
  }>
  
  // Catastrophes naturelles
  catnat?: Array<{
    code: string
    date_debut: string
    date_fin: string
    type: string
    libelle: string
  }>
  
  sources: string[]
  lastUpdated: string
}

export class GeorisquesService {
  private readonly baseUrl = 'https://www.georisques.gouv.fr/api/v1'

  constructor() {
    // Le service utilise directement fetch() car l'API Géorisques ne nécessite pas d'authentification
  }

  /**
   * Récupère les données de risques pour une adresse
   */
  async getRiskData(address: AddressData): Promise<GeorisquesRiskData | null> {
    try {
      const { coordinates, city, postalCode } = address

      console.log('[GeorisquesService] 🔄 Récupération données risques pour:', {
        formatted: address.formatted,
        city,
        postalCode,
        hasCoordinates: !!coordinates,
      })

      if (!postalCode) {
        console.warn('[GeorisquesService] ⚠️ Code postal manquant pour:', address.formatted)
        return null
      }

      // Récupérer le code INSEE depuis le code postal
      let codeInsee: string | null = null
      try {
        const communeResponse = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&nom=${encodeURIComponent(city)}&format=json`,
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
        console.warn('[GeorisquesService] ⚠️ Erreur récupération code INSEE:', error)
      }

      if (!codeInsee) {
        console.warn('[GeorisquesService] ⚠️ Code INSEE non trouvé pour:', address.formatted)
        return null
      }

      // Récupérer les données en parallèle
      const [
        tri,
        azi,
        papi,
        mvt,
        rga,
        ssp,
        radon,
        sismique,
        installations,
        risques,
        catnat,
      ] = await Promise.all([
        this.getTRI(codeInsee, coordinates),
        this.getAZI(codeInsee),
        this.getPAPI(codeInsee),
        this.getMVT(codeInsee),
        this.getRGA(codeInsee),
        this.getSSP(codeInsee, coordinates),
        this.getRadon(codeInsee),
        this.getZonageSismique(codeInsee),
        this.getInstallationsClassees(codeInsee, coordinates),
        this.getRisques(codeInsee),
        this.getCatNat(codeInsee),
      ])

      const sources: string[] = ['API Géorisques']
      if (tri && tri.length > 0) sources.push('TRI')
      if (azi && azi.length > 0) sources.push('AZI')
      if (rga) sources.push('RGA')
      if (radon) sources.push('Radon')
      if (sismique) sources.push('Zonage Sismique')

      const result = {
        tri,
        azi,
        papi,
        mvt,
        rga: rga ?? undefined,
        ssp: ssp ?? undefined,
        radon: radon ?? undefined,
        sismique: sismique ?? undefined,
        installations_classees: installations,
        risques,
        catnat,
        sources,
        lastUpdated: new Date().toISOString(),
      }

      console.log('[GeorisquesService] ✅ Données risques récupérées:', {
        hasTri: !!(tri && tri.length > 0),
        hasAzi: !!(azi && azi.length > 0),
        hasRga: !!rga,
        hasRadon: !!radon,
        hasSismique: !!sismique,
        hasMvt: !!(mvt && mvt.length > 0),
        hasSSP: !!ssp,
        hasInstallations: !!(installations && installations.length > 0),
        sources,
      })

      return result
    } catch (error) {
      console.error('[GeorisquesService] ❌ Erreur récupération données risques:', error)
      return null
    }
  }

  /**
   * Récupère les Territoires à Risques Importants d'Inondation (TRI)
   */
  async getTRI(codeInsee?: string, coordinates?: { lat: number; lng: number }): Promise<GeorisquesRiskData['tri']> {
    try {
      let url = `${this.baseUrl}/gaspar/tri`
      const params: string[] = []
      
      if (codeInsee) {
        params.push(`code_insee=${codeInsee}`)
      }
      
      if (coordinates) {
        params.push(`lat=${coordinates.lat}&lon=${coordinates.lng}`)
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          code: item.code || item.id || '',
          nom: item.nom || item.libelle || '',
          departement: item.departement || item.code_departement || '',
          type: item.type || 'TRI',
        }))
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération TRI:', error)
      return undefined
    }
  }

  /**
   * Récupère les Atlas des Zones Inondables (AZI)
   */
  async getAZI(codeInsee?: string): Promise<GeorisquesRiskData['azi']> {
    try {
      let url = `${this.baseUrl}/gaspar/azi`
      
      if (codeInsee) {
        url += `?code_insee=${codeInsee}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          code: item.code || item.id || '',
          nom: item.nom || item.libelle || '',
          date_approbation: item.date_approbation || item.date,
          type: item.type || 'AZI',
        }))
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération AZI:', error)
      return undefined
    }
  }

  /**
   * Récupère les Programmes d'Actions de Prévention des Inondations (PAPI)
   */
  async getPAPI(codeInsee?: string): Promise<GeorisquesRiskData['papi']> {
    try {
      let url = `${this.baseUrl}/gaspar/papi`
      
      if (codeInsee) {
        url += `?code_insee=${codeInsee}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          code: item.code || item.id || '',
          nom: item.nom || item.libelle || '',
          etat: item.etat || item.statut || '',
          date_signature: item.date_signature || item.date,
        }))
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération PAPI:', error)
      return undefined
    }
  }

  /**
   * Récupère les Mouvements de Terrain (MVT)
   */
  async getMVT(codeInsee?: string): Promise<GeorisquesRiskData['mvt']> {
    try {
      let url = `${this.baseUrl}/mvt`
      
      if (codeInsee) {
        url += `?code_insee=${codeInsee}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          code: item.code || item.id || '',
          nom: item.nom || item.libelle || '',
          type: item.type || item.nature || '',
          departement: item.departement || item.code_departement || '',
        }))
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération MVT:', error)
      return undefined
    }
  }

  /**
   * Récupère le Retrait Gonflement des Argiles (RGA)
   */
  async getRGA(codeInsee: string): Promise<GeorisquesRiskData['rga'] | undefined> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rga?code_insee=${codeInsee}`,
        {
          headers: { Accept: 'application/json' },
        }
      )

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        const item = data[0]
        return {
          code_commune: item.code_commune || codeInsee,
          nom_commune: item.nom_commune || '',
          potentiel: item.potentiel || item.classe_potentiel || 'faible',
          classe: item.classe || item.libelle || '',
        }
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération RGA:', error)
      return undefined
    }
  }

  /**
   * Récupère les Sites et Sols Pollués (SSP)
   */
  async getSSP(codeInsee?: string, coordinates?: { lat: number; lng: number }): Promise<GeorisquesRiskData['ssp'] | undefined> {
    try {
      let url = `${this.baseUrl}/ssp`
      const params: string[] = []
      
      if (codeInsee) {
        params.push(`code_insee=${codeInsee}`)
      }
      
      if (coordinates) {
        params.push(`lat=${coordinates.lat}&lon=${coordinates.lng}`)
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      // Compter les différents types de sites
      let casias = 0
      let basol = 0
      let sis = 0
      let sup = 0

      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.type === 'CASIAS' || item.origine === 'CASIAS') casias++
          if (item.type === 'BASOL' || item.origine === 'BASOL') basol++
          if (item.type === 'SIS' || item.origine === 'SIS') sis++
          if (item.type === 'SUP' || item.origine === 'SUP') sup++
        })
      }

      return {
        casias,
        basol,
        sis,
        sup,
      }
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération SSP:', error)
      return undefined
    }
  }

  /**
   * Récupère le potentiel Radon
   */
  async getRadon(codeInsee: string): Promise<GeorisquesRiskData['radon'] | undefined> {
    try {
      const response = await fetch(
        `${this.baseUrl}/radon?code_insee=${codeInsee}`,
        {
          headers: { Accept: 'application/json' },
        }
      )

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        const item = data[0]
        return {
          code_commune: item.code_commune || codeInsee,
          nom_commune: item.nom_commune || '',
          potentiel: item.potentiel || item.classe_potentiel || 1,
          classe: item.classe || item.libelle || '',
        }
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération Radon:', error)
      return undefined
    }
  }

  /**
   * Récupère le zonage sismique
   */
  async getZonageSismique(codeInsee: string): Promise<GeorisquesRiskData['sismique'] | undefined> {
    try {
      const response = await fetch(
        `${this.baseUrl}/zonage_sismique?code_insee=${codeInsee}`,
        {
          headers: { Accept: 'application/json' },
        }
      )

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        const item = data[0]
        return {
          code_commune: item.code_commune || codeInsee,
          nom_commune: item.nom_commune || '',
          zone: item.zone || item.classe_zone || '1',
          niveau: item.niveau || item.libelle || '',
        }
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération zonage sismique:', error)
      return undefined
    }
  }

  /**
   * Récupère les installations classées
   */
  async getInstallationsClassees(
    codeInsee?: string,
    coordinates?: { lat: number; lng: number }
  ): Promise<GeorisquesRiskData['installations_classees']> {
    try {
      let url = `${this.baseUrl}/installations_classees`
      const params: string[] = []
      
      if (codeInsee) {
        params.push(`code_insee=${codeInsee}`)
      }
      
      if (coordinates) {
        params.push(`lat=${coordinates.lat}&lon=${coordinates.lng}`)
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          code_insee: item.code_insee || codeInsee || '',
          nom_installation: item.nom || item.raison_sociale || item.libelle || '',
          activite: item.activite || item.rubrique || '',
          statut: item.statut || item.etat || '',
          distance: item.distance,
        }))
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération installations classées:', error)
      return undefined
    }
  }

  /**
   * Récupère les types de risques
   */
  async getRisques(codeInsee?: string): Promise<GeorisquesRiskData['risques']> {
    try {
      let url = `${this.baseUrl}/gaspar/risques`
      
      if (codeInsee) {
        url += `?code_insee=${codeInsee}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          code: item.code || item.id || '',
          libelle: item.libelle || item.nom || '',
          type: item.type || '',
        }))
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération risques:', error)
      return undefined
    }
  }

  /**
   * Récupère les arrêtés de catastrophe naturelle
   */
  async getCatNat(codeInsee?: string): Promise<GeorisquesRiskData['catnat']> {
    try {
      let url = `${this.baseUrl}/gaspar/catnat`
      
      if (codeInsee) {
        url += `?code_insee=${codeInsee}`
      }

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        return undefined
      }

      const data = await response.json()
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          code: item.code || item.id || '',
          date_debut: item.date_debut || item.date || '',
          date_fin: item.date_fin || item.date || '',
          type: item.type || item.nature || '',
          libelle: item.libelle || item.nom || '',
        }))
      }

      return undefined
    } catch (error) {
      console.warn('[GeorisquesService] ⚠️ Erreur récupération CatNat:', error)
      return undefined
    }
  }
}

