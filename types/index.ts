/**
 * TORP Platform Type Definitions
 * Central type definitions for the entire application
 */

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'consumer' | 'professional' | 'admin'

export interface User {
  id: string
  email: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

export interface UserProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  phone?: string
  address?: Address
  preferences?: Record<string, unknown>
}

export interface CompanyProfile {
  id: string
  userId: string
  companyName: string
  siret: string
  activitySectors: string[]
  certifications: string[]
  torpCertificationLevel?: CertificationLevel
  insurancePolicy?: InsurancePolicy
}

export type CertificationLevel = 'bronze' | 'silver' | 'gold' | 'platinum'

export interface Address {
  street: string
  city: string
  postalCode: string
  region: string
  country?: string
}

export interface InsurancePolicy {
  provider: string
  policyNumber: string
  expiryDate: Date
  coverageAmount: number
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type FileType = 'pdf' | 'jpg' | 'png' | 'docx'

export interface Document {
  id: string
  userId: string
  fileName: string
  fileType: FileType
  fileSize: number
  fileUrl: string
  uploadStatus: DocumentStatus
  ocrStatus: DocumentStatus
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Devis (Quote) Types
// ============================================================================

export type ProjectType = 'renovation' | 'construction' | 'extension'
export type TradeType = 'plomberie' | 'électricité' | 'maçonnerie' | 'menuiserie' | 'peinture' | 'autres'

export interface Devis {
  id: string
  documentId: string
  userId: string
  extractedData: ExtractedData
  parsedData?: ParsedData
  validationStatus: DocumentStatus
  validationErrors?: ValidationError[]
  projectType?: ProjectType
  tradeType?: TradeType
  totalAmount: number
  createdAt: Date
  updatedAt: Date
}

export interface ExtractedData {
  company: CompanyInfo
  client: ClientInfo
  project: ProjectInfo
  items: DevisItem[]
  totals: DevisTotals
  dates: DevisDates
}

export interface CompanyInfo {
  name: string
  siret?: string
  address?: string
  phone?: string
  email?: string
}

export interface ClientInfo {
  name: string
  address?: string
  phone?: string
  email?: string
}

export interface ProjectInfo {
  title: string
  description?: string
  location?: string
}

export interface DevisItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  category?: string
}

export interface DevisTotals {
  subtotal: number
  tva: number
  tvaRate: number
  total: number
  deposit?: number
}

export interface DevisDates {
  issueDate?: Date
  validUntil?: Date
  startDate?: Date
  endDate?: Date
}

export interface ParsedData extends ExtractedData {
  normalized: boolean
  confidence: number
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

// ============================================================================
// TORP Score Types
// ============================================================================

export type ScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E'

export interface TORPScore {
  id: string
  devisId: string
  scoreValue: number // 0-1000
  scoreGrade: ScoreGrade
  confidenceLevel: number // 0-100%
  breakdown: ScoreBreakdown
  alerts: Alert[]
  recommendations: Recommendation[]
  regionalBenchmark?: RegionalBenchmark
  algorithmVersion: string
  createdAt: Date
  updatedAt: Date
}

export interface ScoreBreakdown {
  prix: CriteriaScore
  qualite: CriteriaScore
  delais: CriteriaScore
  conformite: CriteriaScore
}

export interface CriteriaScore {
  score: number
  weight: number
  details?: Record<string, unknown>
}

export interface Alert {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  criteriaId?: string
}

export interface Recommendation {
  category: string
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  potentialImpact?: string
}

export interface RegionalBenchmark {
  region: string
  averagePriceSqm: number
  percentilePosition: number
  comparisonData?: Record<string, unknown>
}

// ============================================================================
// Comparison Types
// ============================================================================

export interface Comparison {
  id: string
  userId: string
  devisIds: string[]
  comparisonData: ComparisonData
  aiRecommendation?: AIRecommendation
  createdAt: Date
  updatedAt: Date
}

export interface ComparisonData {
  devis: DevisComparison[]
  differences: Difference[]
  negotiationPoints: NegotiationPoint[]
}

export interface DevisComparison {
  devisId: string
  score: TORPScore
  highlights: string[]
  weaknesses: string[]
}

export interface Difference {
  field: string
  values: Record<string, unknown>
  significance: 'high' | 'medium' | 'low'
}

export interface NegotiationPoint {
  devisId: string
  item: string
  suggestion: string
  potentialSavings?: number
}

export interface AIRecommendation {
  recommendedDevisId: string
  reasoning: string
  confidence: number
}

// ============================================================================
// Subscription & Payment Types
// ============================================================================

export type PlanType = 'free' | 'premium_consumer' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing'

export interface Subscription {
  id: string
  userId: string
  planType: PlanType
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  createdAt: Date
  updatedAt: Date
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface Payment {
  id: string
  userId: string
  subscriptionId?: string
  amount: number
  currency: string
  status: PaymentStatus
  stripePaymentIntentId?: string
  paymentMethod?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Analytics Types
// ============================================================================

export type EventCategory = 'engagement' | 'conversion' | 'feature_usage'

export interface AnalyticsEvent {
  id: string
  userId?: string
  eventType: string
  eventCategory: EventCategory
  properties: Record<string, unknown>
  sessionId?: string
  createdAt: Date
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
  metadata?: Record<string, unknown>
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
