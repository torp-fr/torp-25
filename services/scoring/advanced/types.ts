/**
 * Types pour le système de scoring avancé TORP
 * Architecture multi-niveaux : 8 axes, 45 sous-critères, 250+ points de contrôle
 */

// Profil utilisateur
export type UserProfile = 'B2C' | 'B2B'
export type ProjectType = 'construction' | 'renovation' | 'extension' | 'maintenance'
export type ProjectAmount = 'low' | 'medium' | 'high' // <10k, 10-50k, >50k

// Grades finaux
export type ScoreGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'E'

// Structure hiérarchique
export interface ScoringAxis {
  id: string
  name: string
  weight: number // Poids standard (0-1)
  weightB2C: number // Poids adapté B2C
  weightB2B: number // Poids adapté B2B
  maxPoints: number
  subCriteria: SubCriteria[]
}

export interface SubCriteria {
  id: string
  name: string
  maxPoints: number
  controlPoints: ControlPoint[]
}

export interface ControlPoint {
  id: string
  name: string
  description: string
  maxPoints: number
  dataRequired: string[] // Types de données nécessaires
  dataSources: string[] // Sources de données possibles
  algorithm: string // Description de l'algorithme
}

// Résultats de scoring
export interface AxisScore {
  axisId: string
  score: number
  maxPoints: number
  percentage: number
  subCriteriaScores: SubCriteriaScore[]
  alerts: Alert[]
  recommendations: Recommendation[]
}

export interface SubCriteriaScore {
  subCriteriaId: string
  score: number
  maxPoints: number
  controlPointScores: ControlPointScore[]
}

export interface ControlPointScore {
  controlPointId: string
  score: number
  maxPoints: number
  justification: string
  confidence: number // 0-100%
}

export interface Alert {
  type: 'critical' | 'major' | 'minor'
  axisId: string
  subCriteriaId?: string
  controlPointId?: string
  message: string
  impact: string // Impact sur le score
  recommendation?: string
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  suggestion: string
  potentialImpact: string
  actionable: boolean
}

// Score final
export interface FinalScore {
  totalScore: number // 0-1200
  grade: ScoreGrade
  percentage: number
  axisScores: AxisScore[]
  overallAlerts: Alert[]
  overallRecommendations: Recommendation[]
  confidenceLevel: number // 0-100%
  metadata: {
    profile: UserProfile
    projectType: ProjectType
    projectAmount: ProjectAmount
    scoringVersion: string
    enrichedDataSources: string[]
    enrichmentDate: string
  }
}

// Données enrichies complètes
export interface EnrichedCompanyData {
  // Données de base (Sirene)
  siret: string
  siren: string
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

  // Données financières (Infogreffe, Pappers)
  financialData?: {
    ca: number[]
    result: number[]
    ebitda?: number
    debt?: number
    lastUpdate: string
  }
  financialScore?: {
    banqueDeFrance?: string
    torpPrediction?: number // 0-100 probabilité défaillance
  }

  // Procédures (Infogreffe, BODACC)
  legalStatusDetails?: {
    hasCollectiveProcedure?: boolean
    procedureType?: string
    procedureDate?: string
  }

  // Qualifications (Qualibat, RGE, etc.)
  qualifications?: Array<{
    type: string
    level: string
    validUntil?: string
    scope: string[]
  }>

  // Réputation (Avis, NPS)
  reputation?: {
    averageRating: number // 0-5
    numberOfReviews: number
    nps?: number // -100 à +100
    sources: string[]
  }

  // Références & portfolio
  portfolio?: {
    similarProjects: number
    averageProjectAmount?: number
    regions?: string[]
  }

  // Capital humain
  humanResources?: {
    employees?: number
    linkedInEmployees?: number
    certifications?: string[]
  }
}

// Données enrichies pour scoring
export interface ScoringEnrichmentData {
  company: EnrichedCompanyData
  priceReferences: any[]
  regionalData: any
  complianceData: any
  weatherData: any
  dtus: Array<{
    code: string
    name: string
    applicable: boolean
    complianceScore?: number
  }>
  certifications: Array<{
    type: string
    name: string
    valid: boolean
  }>
}

