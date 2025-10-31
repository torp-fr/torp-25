/**
 * Types pour le système d'enrichissement de données
 */

// Informations enrichies d'une entreprise
export interface CompanyEnrichment {
  siret: string
  siren?: string
  name: string
  legalStatus?: string
  address?: {
    street: string
    city: string
    postalCode: string
    region: string
  }
  activities?: Array<{
    code: string
    label: string
  }>
  insurances?: {
    hasDecennale?: boolean
    hasRC?: boolean
    decennaleAmount?: number
    rcAmount?: number
    expirationDate?: string
  }
  financialHealth?: {
    status?: string
    score?: number
    lastUpdate?: string
  }
  certifications?: Array<{
    name: string
    type: string
    validUntil?: string
  }>
}

// Prix de référence pour les matériaux/prestations
export interface PriceReference {
  item: string
  category: string
  unit: string
  prices: {
    min: number
    max: number
    average: number
    median: number
  }
  region: string
  source: string
  lastUpdate: string
}

// Données régionales pour benchmark
export interface RegionalData {
  region: string
  department?: string
  averagePriceSqm: number
  priceRange: {
    min: number
    max: number
    percentile25: number
    percentile75: number
  }
  marketTrend: 'up' | 'down' | 'stable'
  seasonalityFactor?: number
  weatherImpact?: {
    region: string
    averageDaysLost: number
    seasonalAdjustment: number
  }
}

// Données de conformité et normes
export interface ComplianceData {
  applicableNorms: Array<{
    code: string
    name: string
    mandatory: boolean
    category: 'safety' | 'energy' | 'accessibility' | 'environmental'
  }>
  regulations: Array<{
    type: string
    name: string
    complianceRequired: boolean
  }>
  certifications: Array<{
    name: string
    required: boolean
    standard?: string
  }>
}

// Données météorologiques pour évaluation des délais
export interface WeatherData {
  region: string
  averageWeatherDays: number
  seasonalDelays: {
    winter: number
    spring: number
    summer: number
    autumn: number
  }
  riskFactors: Array<{
    type: string
    impact: 'low' | 'medium' | 'high'
    description: string
  }>
}

// Enrichissement complet pour un devis
export interface DevisEnrichment {
  company: CompanyEnrichment | null
  priceReferences: PriceReference[]
  regionalData: RegionalData | null
  complianceData: ComplianceData | null
  weatherData: WeatherData | null
  metadata: {
    enrichmentDate: string
    sources: string[]
    confidence: number
  }
}

