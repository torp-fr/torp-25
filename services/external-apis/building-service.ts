/**
 * Service pour agréger les données du bâti depuis plusieurs sources
 * - ONTB (Observatoire National du Bâti)
 * - PLU (Plan Local d'Urbanisme)
 * - DPE (Diagnostic de Performance Energétique)
 * - Cadastre
 */

import type { BuildingData, EnergyData, UrbanismData, AggregatedBuildingData, AddressData } from './types'
import { AddressService } from './address-service'
import { PLUService } from './plu-service'
import { CadastreService } from './cadastre-service'
import { GeorisquesService } from './georisques-service'
import { RNBService } from './rnb-service'
import { DPEService } from './dpe-service'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export class BuildingService {
  private addressService: AddressService
  private pluService: PLUService
  private cadastreService: CadastreService
  private rnbService: RNBService
  private dpeService: DPEService
  private georisquesService: GeorisquesService

  constructor() {
    this.addressService = new AddressService()
    this.pluService = new PLUService()
    this.cadastreService = new CadastreService()
    this.rnbService = new RNBService()
    this.dpeService = new DPEService()
    this.georisquesService = new GeorisquesService()
  }

  /**
   * Agrége les données du bâti depuis toutes les sources disponibles
   */
  async getAggregatedData(address: string): Promise<AggregatedBuildingData | null> {
    const sources: string[] = []
    let addressData

    try {
      // 1. Géocodage de l'adresse
      const addresses = await this.addressService.searchAddress(address)
      if (addresses.length === 0) {
        log.warn({ address }, 'Adresse non trouvée')
        return null
      }
      addressData = addresses[0]
      sources.push('API Adresse')

      // 2. Récupération des données depuis différentes sources
      // Utiliser Promise.allSettled pour ne pas échouer si une API échoue
      const [
        urbanismResult,
        buildingResult,
        energyResult,
        pluResult,
        cadastreResult,
        rnbResult,
        dpeResult,
        georisquesResult,
      ] = await Promise.allSettled([
        this.getUrbanismData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getUrbanismData')
          return null
        }),
        this.getBuildingData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getBuildingData')
          return null
        }),
        this.getEnergyData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getEnergyData')
          return null
        }),
        this.pluService.getPLUData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getPLUData')
          return null
        }),
        this.cadastreService.getCadastralData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getCadastralData')
          return null
        }),
        this.rnbService.getBuildingData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getRNBData')
          return null
        }),
        this.dpeService.getDPEData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getDPEData')
          return null
        }),
        this.georisquesService.getRiskData(addressData).catch(err => {
          log.warn({ err, address: addressData.formatted }, 'Erreur getRiskData')
          return null
        }),
      ])

      // Extraire les valeurs des résultats
      const urbanism = urbanismResult.status === 'fulfilled' ? urbanismResult.value : null
      const building = buildingResult.status === 'fulfilled' ? buildingResult.value : null
      const energy = energyResult.status === 'fulfilled' ? energyResult.value : null
      const plu = pluResult.status === 'fulfilled' ? pluResult.value : null
      const cadastre = cadastreResult.status === 'fulfilled' ? cadastreResult.value : null
      const rnb = rnbResult.status === 'fulfilled' ? rnbResult.value : null
      const dpe = dpeResult.status === 'fulfilled' ? dpeResult.value : null
      const georisques = georisquesResult.status === 'fulfilled' ? georisquesResult.value : null

      log.debug({
        urbanism: !!urbanism,
        building: !!building,
        energy: !!energy,
        plu: !!plu,
        cadastre: !!cadastre,
        rnb: !!rnb,
        dpe: !!dpe,
        georisques: !!georisques,
      }, 'Résultats récupération données')

      if (urbanism) sources.push('APU Urbanisme')
      if (building) sources.push('ONTB')
      if (plu) sources.push('PLU')
      if (cadastre) sources.push('Cadastre Géoportail')
      if (rnb) sources.push('RNB')
      if (dpe) sources.push('DPE certifié data.gouv.fr')
      if (georisques && (georisques as any).sources && Array.isArray((georisques as any).sources)) {
        sources.push(...(georisques as any).sources)
      } else if (georisques) {
        // Si géorisques existe mais n'a pas de sources, ajouter le nom générique
        sources.push('Géorisques')
      }
      
      // Enrichir energyData avec les données DPE certifiées (priorité) ou RNB (fallback)
      let enrichedEnergy = energy
      if (dpe) {
        // Données DPE certifiées ont la priorité
        enrichedEnergy = this.dpeService.convertToEnergyData(dpe)
      } else if (rnb) {
        // Fallback sur RNB si DPE non disponible
        enrichedEnergy = {
          ...enrichedEnergy,
          dpeDate: enrichedEnergy?.dpeDate || rnb.dpeDate,
          dpeClass: (enrichedEnergy?.dpeClass || (rnb.dpeClass && rnb.dpeClass !== 'N/A' ? rnb.dpeClass : undefined)) as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | undefined,
          energyConsumption: enrichedEnergy?.energyConsumption || rnb.energyConsumption,
          ghgEmissions: enrichedEnergy?.ghgEmissions || rnb.ghgEmissions,
        }
      }
      
      if (enrichedEnergy) {
        sources.push('DPE')
      }

      // Enrichir buildingData avec les données RNB et PLU
      let enrichedBuilding = building
      if (rnb) {
        enrichedBuilding = {
          ...enrichedBuilding,
          constructionYear: enrichedBuilding?.constructionYear || rnb.constructionYear,
          buildingType: enrichedBuilding?.buildingType || rnb.buildingType,
          surface: enrichedBuilding?.surface || rnb.surface,
          energyClass: (enrichedBuilding?.energyClass || (rnb.dpeClass && rnb.dpeClass !== 'N/A' ? rnb.dpeClass : undefined)) as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | undefined,
          energyConsumption: enrichedBuilding?.energyConsumption || rnb.energyConsumption,
        }
      }


      // Enrichir buildingData avec les données PLU
      if (plu && enrichedBuilding) {
        enrichedBuilding = {
          ...enrichedBuilding,
          pluZone: plu.zone || plu.zonage?.type,
          pluConstraints: plu.contraintes?.map((c) => c.description) || [],
        }
      }

      const result: AggregatedBuildingData = {
        address: addressData,
        urbanism: urbanism || undefined,
        building: enrichedBuilding || undefined,
        energy: enrichedEnergy || undefined,
        plu: plu || undefined,
        cadastre: cadastre || undefined,
        georisques: georisques || undefined,
        rnb: rnb || undefined,
        dpe: dpe || undefined,
        sources,
        lastUpdated: new Date().toISOString(),
      }

      log.info({
        hasAddress: !!result.address,
        hasPLU: !!result.plu,
        hasRNB: !!result.rnb,
        hasEnergy: !!result.energy,
        hasDPE: !!result.dpe,
        hasGeorisques: !!result.georisques,
        hasCadastre: !!result.cadastre,
        sources: result.sources,
      }, 'Données agrégées finales')

      return result
    } catch (error) {
      log.error({ err: error, address }, 'Erreur agrégation données')
      return addressData
        ? {
            address: addressData,
            sources: ['API Adresse'],
            lastUpdated: new Date().toISOString(),
          }
        : null
    }
  }

  /**
   * Récupère les données d'urbanisme (APU, autorisations)
   * TODO: Implémenter l'intégration avec l'API réelle quand disponible
   */
  private async getUrbanismData(_address: AddressData): Promise<UrbanismData | null> {
    try {
      // Placeholder - À remplacer par l'API réelle
      // Pour l'instant, on simule une vérification basique
      
      // TODO: Intégrer avec l'API d'urbanisme officielle
      // const response = await fetch(`https://api-urbanisme.example.fr/permits?address=${encodeURIComponent(address.formatted)}`)
      
      // Données simulées pour le développement
      return {
        hasPermit: false,
        permitType: 'none',
        status: 'active',
        constraints: [],
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération données urbanisme')
      return null
    }
  }

  /**
   * Récupère les données ONTB et PLU
   * TODO: Implémenter l'intégration avec l'API réelle quand disponible
   */
  private async getBuildingData(_address: AddressData): Promise<BuildingData | null> {
    try {
      // Placeholder - À remplacer par l'API réelle
      // TODO: Intégrer avec ONTB et données PLU

      return {
        buildingType: 'unknown',
        pluZone: 'unknown',
        pluConstraints: [],
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération données bâti')
      return null
    }
  }

  /**
   * Récupère les données DPE via le service DPE dédié
   * Utilise maintenant le service DPE certifié depuis data.gouv.fr
   */
  private async getEnergyData(address: AddressData): Promise<EnergyData | null> {
    try {
      // Utiliser le service DPE certifié (priorité)
      const dpeData = await this.dpeService.getDPEData(address)
      if (dpeData) {
        return this.dpeService.convertToEnergyData(dpeData)
      }
      
      // Fallback : utiliser les données RNB si DPE non disponible
      const rnbData = await this.rnbService.getBuildingData(address)
      if (rnbData && rnbData.dpeClass && rnbData.dpeClass !== 'N/A') {
        return {
          dpeDate: rnbData.dpeDate,
          dpeClass: rnbData.dpeClass as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G',
          energyConsumption: rnbData.energyConsumption,
          ghgEmissions: rnbData.ghgEmissions,
        }
      }


      return null
    } catch (error) {
      log.error({ err: error, address: address.formatted }, 'Erreur récupération données DPE')
      return null
    }
  }
}

