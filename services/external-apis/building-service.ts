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
import { RNBService } from './rnb-service'

export class BuildingService {
  private addressService: AddressService
  private pluService: PLUService
  private cadastreService: CadastreService
  private rnbService: RNBService

  constructor() {
    this.addressService = new AddressService()
    this.pluService = new PLUService()
    this.cadastreService = new CadastreService()
    this.rnbService = new RNBService()
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
        console.warn('[BuildingService] Adresse non trouvée:', address)
        return null
      }
      addressData = addresses[0]
      sources.push('API Adresse')

      // 2. Récupération des données depuis différentes sources
      const [urbanism, building, energy, plu, cadastre, rnb] = await Promise.all([
        this.getUrbanismData(addressData),
        this.getBuildingData(addressData),
        this.getEnergyData(addressData),
        this.pluService.getPLUData(addressData),
        this.cadastreService.getCadastralData(addressData),
        this.rnbService.getBuildingData(addressData),
      ])

      if (urbanism) sources.push('APU Urbanisme')
      if (building) sources.push('ONTB')
      if (plu) sources.push('PLU')
      if (energy) sources.push('DPE')
      if (cadastre) sources.push('Cadastre Géoportail')
      if (rnb) sources.push('RNB')

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

      // Enrichir energyData avec les données RNB
      let enrichedEnergy = energy
      if (rnb) {
        enrichedEnergy = {
          ...enrichedEnergy,
          dpeDate: enrichedEnergy?.dpeDate || rnb.dpeDate,
          dpeClass: (enrichedEnergy?.dpeClass || (rnb.dpeClass && rnb.dpeClass !== 'N/A' ? rnb.dpeClass : undefined)) as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | undefined,
          energyConsumption: enrichedEnergy?.energyConsumption || rnb.energyConsumption,
          ghgEmissions: enrichedEnergy?.ghgEmissions || rnb.ghgEmissions,
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

      return {
        address: addressData,
        urbanism: urbanism || undefined,
        building: enrichedBuilding || undefined,
        energy: enrichedEnergy || undefined,
        plu: plu || undefined,
        cadastre: cadastre || undefined,
        rnb: rnb || undefined,
        sources,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[BuildingService] Erreur agrégation données:', error)
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
      console.error('[BuildingService] Erreur récupération données urbanisme:', error)
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
      console.error('[BuildingService] Erreur récupération données bâti:', error)
      return null
    }
  }

  /**
   * Récupère les données DPE
   * TODO: Implémenter l'intégration avec l'API DPE officielle
   */
  private async getEnergyData(_address: AddressData): Promise<EnergyData | null> {
    try {
      // Placeholder - À remplacer par l'API réelle
      // TODO: Intégrer avec l'API DPE quand disponible
      // L'API DPE est accessible via data.gouv.fr mais nécessite une clé API
      
      return null
    } catch (error) {
      console.error('[BuildingService] Erreur récupération données DPE:', error)
      return null
    }
  }
}

