/**
 * Types pour les APIs externes (Urbanisme, Bâti, Adresse, etc.)
 */

export interface AddressData {
  // Données depuis API Adresse (data.gouv.fr)
  formatted: string
  street: string
  postalCode: string
  city: string
  region: string
  department: string
  coordinates?: {
    lat: number
    lng: number
  }
  completeness: number // Score de complétude 0-100
}

export interface UrbanismData {
  // Données depuis APU (Autorisation d'Urbanisme)
  hasPermit: boolean
  permitType?: 'declaration' | 'permit' | 'demolition' | 'none'
  permitNumber?: string
  permitDate?: string
  status?: 'active' | 'expired' | 'revoked'
  constraints?: string[]
}

export interface BuildingData {
  // Données ONTB (Observatoire National du Bâti)
  constructionYear?: number
  buildingType?: string
  surface?: number
  energyClass?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  energyConsumption?: number // kWh/m²/an
  
  // PLU (Plan Local d'Urbanisme)
  pluZone?: string
  pluConstraints?: string[]
  heightRestriction?: number
  setbackRestriction?: number
  
  // Urbanisme
  cadastralReference?: string
  cadastralParcels?: string[]
}

export interface EnergyData {
  // DPE (Diagnostic de Performance Energétique)
  dpeDate?: string
  dpeClass?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
  energyConsumption?: number // kWh/m²/an
  ghgEmissions?: number // kg CO2/m²/an
  recommendations?: string[]
}

export interface AggregatedBuildingData {
  address: AddressData
  urbanism?: UrbanismData
  building?: BuildingData
  energy?: EnergyData
  plu?: any // PLUData from plu-service
  cadastre?: any // CadastralData from cadastre-service
  rnb?: any // RNBBuildingData from rnb-service
  dpe?: any // DPEData from dpe-service
  sources: string[]
  lastUpdated: string
}

export interface ExternalApiConfig {
  apiAddressUrl: string
  apiUrbanismUrl?: string
  apiONTBUrl?: string
  apiDPEUrl?: string
  inseeApiKey?: string // Clé API INSEE Sirene
  cacheEnabled: boolean
  cacheTTL: number // en secondes
}

// Réexport des types Sirene pour usage dans d'autres services
export type { SireneCompany, SireneSearchResult, SireneVerificationResult } from './sirene-service'

