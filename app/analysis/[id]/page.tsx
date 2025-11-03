'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Shield,
  Euro,
  AlertCircle,
  Target,
  Sparkles,
  Award,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { DevisChat } from '@/components/chat/devis-chat'
import { RecommendationCard } from '@/components/recommendations/recommendation-card'

// ... existing code ...

interface AnalysisInsights {
  executiveSummary: string
  keyStrengths: Array<{
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
  }>
  keyWeaknesses: Array<{
    title: string
    description: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    recommendation?: string
  }>
  priorityActions: Array<{
    action: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
    expectedImpact: string
    timeframe: string
  }>
  companyVerification: {
    verified: boolean
    confidence: number
    dataSources: string[]
    notes: string[]
  }
  enhancedRecommendations: Array<{
    title: string
    description: string
    category: string
    priority: 'high' | 'medium' | 'low'
    actionable: boolean
    estimatedSavings?: string
    complexity: 'simple' | 'moderate' | 'complex'
  }>
}

interface TORPScore {
  id: string
  scoreValue: number
  scoreGrade: string
  confidenceLevel: number
  breakdown: any
  alerts: Array<{
    type: string
    severity: string
    message: string
  }>
  recommendations: Array<{
    category: string
    priority: 'high' | 'medium' | 'low'
    suggestion: string
    potentialImpact?: string
  }>
  regionalBenchmark?: {
    region: string
    averagePriceSqm: number
    percentilePosition: number
    comparisonData: {
      devisPrice: number
      averagePrice: number
      priceRange: { min: number; max: number }
    }
  }
  createdAt: string
}

interface Devis {
  id: string
  totalAmount: number
  projectType?: string
  tradeType?: string
  extractedData: {
    company: {
      name: string
      siret?: string
    }
    project: {
      title: string
    }
    totals: {
      subtotal: number
      tva: number
      total: number
    }
  }
  enrichedData?: any
  createdAt: string
}

export default function AnalysisPage() {
  const params = useParams()
  const devisId = params.id as string

  const [devis, setDevis] = useState<Devis | null>(null)
  const [score, setScore] = useState<TORPScore | null>(null)
  const [insights, setInsights] = useState<AnalysisInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const DEMO_USER_ID = 'demo-user-id'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch devis
      const devisResponse = await fetch(`/api/devis/${devisId}`)
      if (!devisResponse.ok) {
        throw new Error('Erreur lors du chargement du devis')
      }

      const devisData = await devisResponse.json()
      setDevis(devisData.data)

      // Fetch score
      const scoreResponse = await fetch(`/api/score?devisId=${devisId}`)
      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json()
        setScore(scoreData.data)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [devisId])

  const fetchInsights = async () => {
    try {
      // D'abord, enrichir les données d'entreprise si nécessaire
      if (devis?.extractedData?.company?.siret) {
        const enrichResponse = await fetch(
          `/api/analysis/${devisId}/enrich-company`
        )
        if (enrichResponse.ok) {
          // Les données enrichies sont maintenant sauvegardées, recharger le devis
          const devisResponse = await fetch(`/api/devis/${devisId}`)
          if (devisResponse.ok) {
            const devisData = await devisResponse.json()
            setDevis(devisData.data)
          }
        }
      }

      // Ensuite, charger les insights
      const response = await fetch(`/api/analysis/${devisId}/insights`)
      if (response.ok) {
        const data = await response.json()
        setInsights(data.data)
      }
    } catch (err) {
      console.error('Erreur chargement insights:', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Charger les insights une fois que le devis et le score sont disponibles
  useEffect(() => {
    if (devis && score && !insights) {
      fetchInsights()
    }
  }, [devis, score, insights, fetchInsights])

  // ... existing helper functions (getGradeColor, getSeverityIcon, formatCurrency, formatDate) ...

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'B':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'C':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'D':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'E':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">
            Chargement de l&apos;analyse...
          </p>
        </div>
      </div>
    )
  }

  if (error || !devis) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
            <CardDescription>{error || 'Devis non trouvé'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button>Retour au Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const enrichedCompanyData = (devis as any).enrichedData?.company || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">Analyse TORP</h1>
              <p className="text-lg text-muted-foreground">
                {devis.extractedData.company.name} •{' '}
                {devis.extractedData.project.title}
              </p>
            </div>
            {score && (
              <div
                className={`rounded-2xl border-4 p-6 ${getGradeColor(score.scoreGrade)}`}
              >
                <div className="text-center">
                  <div className="mb-2 text-6xl font-bold">
                    {score.scoreGrade}
                  </div>
                  <div className="text-2xl font-semibold">
                    {Math.round(Number(score.scoreValue))}/1000
                  </div>
                  <div className="mt-1 text-sm opacity-75">
                    Confiance: {Math.round(Number(score.confidenceLevel))}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Executive Summary - New LLM Section */}
        {insights && insights.executiveSummary && (
          <Card className="mb-6 border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Résumé Exécutif</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg leading-relaxed">
                {insights.executiveSummary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Company Verification - Enriched Section */}
        {(insights?.companyVerification ||
          enrichedCompanyData ||
          devis.extractedData.company.siret) && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield
                    className={`h-5 w-5 ${insights?.companyVerification?.verified ? 'text-green-600' : 'text-gray-400'}`}
                  />
                  <CardTitle>Vérification Entreprise</CardTitle>
                </div>
                <Badge
                  variant={
                    insights?.companyVerification?.verified
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {insights?.companyVerification?.verified
                    ? 'Vérifié'
                    : 'Non vérifié'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company Identity - Nom et identifiants */}
              <div className="space-y-3 rounded-lg border bg-blue-50 p-4">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Nom de l&apos;entreprise
                  </p>
                  <p className="text-base font-semibold text-blue-900">
                    {enrichedCompanyData?.name ||
                      devis.extractedData.company.name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {devis.extractedData.company.siret && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        SIRET
                      </p>
                      <Badge variant="outline" className="font-mono text-xs">
                        {devis.extractedData.company.siret}
                      </Badge>
                    </div>
                  )}
                  {enrichedCompanyData?.siren && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        SIREN
                      </p>
                      <Badge variant="outline" className="font-mono text-xs">
                        {enrichedCompanyData.siren}
                      </Badge>
                    </div>
                  )}
                </div>

                {enrichedCompanyData?.legalStatus && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">
                      Forme juridique
                    </p>
                    <p className="text-sm font-medium">
                      {enrichedCompanyData.legalStatus}
                    </p>
                  </div>
                )}
              </div>

              {/* Verification Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Confiance</p>
                  <p className="text-lg font-semibold">
                    {insights?.companyVerification?.confidence || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sources</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {insights?.companyVerification?.dataSources &&
                    insights.companyVerification.dataSources.length > 0
                      ? insights.companyVerification.dataSources.map(
                          (source, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {source}
                            </Badge>
                          )
                        )
                      : enrichedCompanyData?.siret && (
                          <Badge variant="outline" className="text-xs">
                            Sirene
                          </Badge>
                        )}
                    {!insights?.companyVerification?.dataSources?.length &&
                      !enrichedCompanyData?.siret && (
                        <span className="text-xs text-muted-foreground">
                          Aucune
                        </span>
                      )}
                  </div>
                </div>
              </div>

              {/* Financial Data */}
              {enrichedCompanyData.financialData && (
                <div className="space-y-3 rounded-lg border bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-800">
                    Données Financières (Infogreffe)
                  </p>
                  {enrichedCompanyData.financialData.ca &&
                    enrichedCompanyData.financialData.ca.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Chiffre d&apos;affaires
                        </p>
                        <div className="space-y-1">
                          {enrichedCompanyData.financialData.ca
                            .slice(0, 3)
                            .map((ca: number, i: number) => (
                              <p key={i} className="text-sm font-medium">
                                {new Date().getFullYear() - i}:{' '}
                                {formatCurrency(ca)}
                              </p>
                            ))}
                        </div>
                      </div>
                    )}
                  {enrichedCompanyData.financialData.result &&
                    enrichedCompanyData.financialData.result.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">
                          Résultat net
                        </p>
                        <div className="space-y-1">
                          {enrichedCompanyData.financialData.result
                            .slice(0, 3)
                            .map((result: number, i: number) => (
                              <p
                                key={i}
                                className={`text-sm font-medium ${result < 0 ? 'text-red-600' : 'text-green-600'}`}
                              >
                                {new Date().getFullYear() - i}:{' '}
                                {formatCurrency(result)}
                              </p>
                            ))}
                        </div>
                      </div>
                    )}
                  {enrichedCompanyData.financialData.debt && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        Dettes
                      </p>
                      <p className="text-sm font-medium">
                        {formatCurrency(enrichedCompanyData.financialData.debt)}
                      </p>
                    </div>
                  )}
                  {enrichedCompanyData.financialData.lastUpdate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Dernière mise à jour:{' '}
                      {new Date(
                        enrichedCompanyData.financialData.lastUpdate
                      ).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              {/* Legal Status */}
              {enrichedCompanyData.legalStatusDetails && (
                <div
                  className={`rounded-lg border p-4 ${
                    enrichedCompanyData.legalStatusDetails
                      .hasCollectiveProcedure
                      ? 'border-red-200 bg-red-50'
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {enrichedCompanyData.legalStatusDetails
                      .hasCollectiveProcedure ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <p className="text-sm font-semibold">Statut Juridique</p>
                  </div>
                  {enrichedCompanyData.legalStatusDetails
                    .hasCollectiveProcedure ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-red-800">
                        ⚠️ Procédure collective en cours
                      </p>
                      {enrichedCompanyData.legalStatusDetails.procedureType && (
                        <p className="text-xs text-muted-foreground">
                          Type:{' '}
                          {enrichedCompanyData.legalStatusDetails.procedureType}
                        </p>
                      )}
                      {enrichedCompanyData.legalStatusDetails.procedureDate && (
                        <p className="text-xs text-muted-foreground">
                          Date:{' '}
                          {new Date(
                            enrichedCompanyData.legalStatusDetails.procedureDate
                          ).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-green-800">
                      ✅ Aucune procédure collective en cours
                    </p>
                  )}
                </div>
              )}

              {/* Address - Enhanced */}
              {enrichedCompanyData.address && (
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-semibold">Adresse légale</p>
                  </div>
                  <div className="space-y-1">
                    {enrichedCompanyData.address.street && (
                      <p className="text-sm font-medium">
                        {enrichedCompanyData.address.street}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {enrichedCompanyData.address.postalCode}{' '}
                      {enrichedCompanyData.address.city}
                    </p>
                    {enrichedCompanyData.address.region && (
                      <p className="text-xs text-muted-foreground">
                        Région: {enrichedCompanyData.address.region}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Activities - Enhanced */}
              {enrichedCompanyData.activities &&
                enrichedCompanyData.activities.length > 0 && (
                  <div className="rounded-lg border bg-purple-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-purple-900">
                      Activités principales
                    </p>
                    <div className="space-y-2">
                      {enrichedCompanyData.activities.map(
                        (activity: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-2 rounded border bg-white p-2"
                          >
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {activity.code}
                                </Badge>
                                {idx === 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Principale
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {activity.label}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Insurances */}
              {enrichedCompanyData.insurances && (
                <div className="space-y-3 rounded-lg border bg-indigo-50 p-4">
                  <p className="text-sm font-semibold text-indigo-900">
                    Assurances
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {enrichedCompanyData.insurances.hasDecennale !==
                      undefined && (
                      <div className="rounded border bg-white p-2">
                        <div className="mb-1 flex items-center gap-2">
                          {enrichedCompanyData.insurances.hasDecennale ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <p className="text-xs font-semibold">
                            Assurance Décennale
                          </p>
                        </div>
                        {enrichedCompanyData.insurances.hasDecennale ? (
                          <div className="space-y-1">
                            {enrichedCompanyData.insurances.decennaleAmount && (
                              <p className="text-xs text-muted-foreground">
                                Montant:{' '}
                                {formatCurrency(
                                  enrichedCompanyData.insurances.decennaleAmount
                                )}
                              </p>
                            )}
                            {enrichedCompanyData.insurances.expirationDate && (
                              <p className="text-xs text-muted-foreground">
                                Expire:{' '}
                                {new Date(
                                  enrichedCompanyData.insurances.expirationDate
                                ).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-red-600">
                            ⚠️ Non détectée
                          </p>
                        )}
                      </div>
                    )}

                    {enrichedCompanyData.insurances.hasRC !== undefined && (
                      <div className="rounded border bg-white p-2">
                        <div className="mb-1 flex items-center gap-2">
                          {enrichedCompanyData.insurances.hasRC ? (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                          <p className="text-xs font-semibold">
                            Responsabilité Civile
                          </p>
                        </div>
                        {enrichedCompanyData.insurances.hasRC ? (
                          <div className="space-y-1">
                            {enrichedCompanyData.insurances.rcAmount && (
                              <p className="text-xs text-muted-foreground">
                                Montant:{' '}
                                {formatCurrency(
                                  enrichedCompanyData.insurances.rcAmount
                                )}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-red-600">
                            ⚠️ Non détectée
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {enrichedCompanyData.certifications &&
                enrichedCompanyData.certifications.length > 0 && (
                  <div className="rounded-lg border bg-amber-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <p className="text-sm font-semibold text-amber-900">
                        Certifications & Qualifications
                      </p>
                    </div>
                    <div className="space-y-2">
                      {enrichedCompanyData.certifications.map(
                        (cert: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded border bg-white p-3"
                          >
                            <div className="mb-1 flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold">
                                  {cert.name}
                                </p>
                                {cert.type && (
                                  <p className="text-xs text-muted-foreground">
                                    Type: {cert.type}
                                  </p>
                                )}
                              </div>
                              {cert.validUntil && (
                                <Badge
                                  variant={
                                    new Date(cert.validUntil) > new Date()
                                      ? 'default'
                                      : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {new Date(cert.validUntil) > new Date()
                                    ? 'Valide'
                                    : 'Expirée'}
                                </Badge>
                              )}
                            </div>
                            {cert.validUntil && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Valide jusqu&apos;au:{' '}
                                {new Date(cert.validUntil).toLocaleDateString(
                                  'fr-FR'
                                )}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Reputation */}
              {enrichedCompanyData.reputation && (
                <div className="rounded-lg border bg-orange-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    <p className="text-sm font-semibold text-orange-900">
                      Réputation & Avis Clients
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {enrichedCompanyData.reputation.averageRating !==
                      undefined && (
                      <div className="rounded border bg-white p-3">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Note moyenne
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold">
                            {enrichedCompanyData.reputation.averageRating.toFixed(
                              1
                            )}
                          </p>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                              <span key={i}>
                                {i <
                                Math.floor(
                                  enrichedCompanyData.reputation.averageRating
                                )
                                  ? '★'
                                  : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            / 5
                          </span>
                        </div>
                      </div>
                    )}

                    {enrichedCompanyData.reputation.numberOfReviews !==
                      undefined && (
                      <div className="rounded border bg-white p-3">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Nombre d&apos;avis
                        </p>
                        <p className="text-2xl font-bold">
                          {enrichedCompanyData.reputation.numberOfReviews}
                        </p>
                      </div>
                    )}
                  </div>

                  {enrichedCompanyData.reputation.nps !== undefined && (
                    <div className="mt-3 rounded border bg-white p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          NPS (Net Promoter Score)
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            enrichedCompanyData.reputation.nps >= 50
                              ? 'text-green-600'
                              : enrichedCompanyData.reputation.nps >= 30
                                ? 'text-yellow-600'
                                : enrichedCompanyData.reputation.nps >= 10
                                  ? 'text-orange-600'
                                  : 'text-red-600'
                          }`}
                        >
                          {enrichedCompanyData.reputation.nps > 0 ? '+' : ''}
                          {enrichedCompanyData.reputation.nps}
                        </p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className={`h-full ${
                            enrichedCompanyData.reputation.nps >= 50
                              ? 'bg-green-500'
                              : enrichedCompanyData.reputation.nps >= 30
                                ? 'bg-yellow-500'
                                : enrichedCompanyData.reputation.nps >= 10
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                          }`}
                          style={{
                            width: `${Math.max(0, Math.min(100, (enrichedCompanyData.reputation.nps + 100) / 2))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {enrichedCompanyData.reputation.nps >= 50
                          ? 'Excellent'
                          : enrichedCompanyData.reputation.nps >= 30
                            ? 'Bon'
                            : enrichedCompanyData.reputation.nps >= 10
                              ? 'Moyen'
                              : 'Faible'}{' '}
                        NPS
                      </p>
                    </div>
                  )}

                  {enrichedCompanyData.reputation.sources &&
                    enrichedCompanyData.reputation.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {enrichedCompanyData.reputation.sources.map(
                          (source: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {source}
                            </Badge>
                          )
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Qualifications (distinctes des certifications) */}
              {enrichedCompanyData.qualifications &&
                enrichedCompanyData.qualifications.length > 0 && (
                  <div className="rounded-lg border bg-cyan-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4 text-cyan-600" />
                      <p className="text-sm font-semibold text-cyan-900">
                        Qualifications Professionnelles
                      </p>
                    </div>
                    <div className="space-y-2">
                      {enrichedCompanyData.qualifications.map(
                        (qual: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded border bg-white p-3"
                          >
                            <div className="mb-1 flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold">
                                  {qual.type}
                                </p>
                                {qual.level && (
                                  <p className="text-xs text-muted-foreground">
                                    Niveau: {qual.level}
                                  </p>
                                )}
                                {qual.scope && qual.scope.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {qual.scope
                                      .slice(0, 3)
                                      .map((scope: string, sIdx: number) => (
                                        <Badge
                                          key={sIdx}
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {scope}
                                        </Badge>
                                      ))}
                                  </div>
                                )}
                              </div>
                              {qual.validUntil && (
                                <Badge
                                  variant={
                                    new Date(qual.validUntil) > new Date()
                                      ? 'default'
                                      : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {new Date(qual.validUntil) > new Date()
                                    ? 'Valide'
                                    : 'Expirée'}
                                </Badge>
                              )}
                            </div>
                            {qual.validUntil && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Valide jusqu&apos;au:{' '}
                                {new Date(qual.validUntil).toLocaleDateString(
                                  'fr-FR'
                                )}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Financial Score (Banque de France, TORP Prediction) */}
              {enrichedCompanyData.financialScore && (
                <div className="rounded-lg border bg-emerald-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-emerald-900">
                    Score Financier Avancé
                  </p>
                  <div className="space-y-3">
                    {enrichedCompanyData.financialScore.banqueDeFrance && (
                      <div className="rounded border bg-white p-3">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Banque de France
                        </p>
                        <Badge variant="outline" className="font-medium">
                          {enrichedCompanyData.financialScore.banqueDeFrance}
                        </Badge>
                      </div>
                    )}
                    {enrichedCompanyData.financialScore.torpPrediction !==
                      undefined && (
                      <div className="rounded border bg-white p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Prédiction TORP (risque défaillance)
                          </p>
                          <p
                            className={`text-sm font-semibold ${
                              enrichedCompanyData.financialScore
                                .torpPrediction < 30
                                ? 'text-green-600'
                                : enrichedCompanyData.financialScore
                                      .torpPrediction < 60
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {enrichedCompanyData.financialScore.torpPrediction}%
                          </p>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full ${
                              enrichedCompanyData.financialScore
                                .torpPrediction < 30
                                ? 'bg-green-500'
                                : enrichedCompanyData.financialScore
                                      .torpPrediction < 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{
                              width: `${100 - enrichedCompanyData.financialScore.torpPrediction}%`,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {enrichedCompanyData.financialScore.torpPrediction <
                          30
                            ? 'Risque faible'
                            : enrichedCompanyData.financialScore
                                  .torpPrediction < 60
                              ? 'Risque modéré'
                              : 'Risque élevé'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Portfolio & Références */}
              {enrichedCompanyData.portfolio && (
                <div className="rounded-lg border bg-violet-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-violet-900">
                    Portfolio & Références
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {enrichedCompanyData.portfolio.similarProjects !==
                      undefined && (
                      <div className="rounded border bg-white p-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Projets similaires
                        </p>
                        <p className="text-lg font-semibold">
                          {enrichedCompanyData.portfolio.similarProjects}
                        </p>
                      </div>
                    )}
                    {enrichedCompanyData.portfolio.averageProjectAmount && (
                      <div className="rounded border bg-white p-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Projet moyen
                        </p>
                        <p className="text-sm font-semibold">
                          {formatCurrency(
                            enrichedCompanyData.portfolio.averageProjectAmount
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                  {enrichedCompanyData.portfolio.regions &&
                    enrichedCompanyData.portfolio.regions.length > 0 && (
                      <div className="mt-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Régions d&apos;activité
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {enrichedCompanyData.portfolio.regions.map(
                            (region: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {region}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Human Resources */}
              {enrichedCompanyData.humanResources && (
                <div className="rounded-lg border bg-pink-50 p-4">
                  <p className="mb-3 text-sm font-semibold text-pink-900">
                    Capital Humain
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {enrichedCompanyData.humanResources.employees !==
                      undefined && (
                      <div className="rounded border bg-white p-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Employés
                        </p>
                        <p className="text-lg font-semibold">
                          {enrichedCompanyData.humanResources.employees}
                        </p>
                      </div>
                    )}
                    {enrichedCompanyData.humanResources.linkedInEmployees !==
                      undefined && (
                      <div className="rounded border bg-white p-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          LinkedIn
                        </p>
                        <p className="text-lg font-semibold">
                          {enrichedCompanyData.humanResources.linkedInEmployees}
                        </p>
                      </div>
                    )}
                  </div>
                  {enrichedCompanyData.humanResources.certifications &&
                    enrichedCompanyData.humanResources.certifications.length >
                      0 && (
                      <div className="mt-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          Certifications RH
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {enrichedCompanyData.humanResources.certifications.map(
                            (cert: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {cert}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Financial Health Score */}
              {enrichedCompanyData.financialHealth && (
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-900">
                    Santé Financière
                  </p>
                  <div className="space-y-2">
                    {enrichedCompanyData.financialHealth.score !==
                      undefined && (
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p
                            className={`text-sm font-semibold ${
                              enrichedCompanyData.financialHealth.score >= 70
                                ? 'text-green-600'
                                : enrichedCompanyData.financialHealth.score >=
                                    50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {enrichedCompanyData.financialHealth.score}/100
                          </p>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full ${
                              enrichedCompanyData.financialHealth.score >= 70
                                ? 'bg-green-500'
                                : enrichedCompanyData.financialHealth.score >=
                                    50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{
                              width: `${enrichedCompanyData.financialHealth.score}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {enrichedCompanyData.financialHealth.status && (
                      <p className="text-xs text-muted-foreground">
                        Statut: {enrichedCompanyData.financialHealth.status}
                      </p>
                    )}
                    {enrichedCompanyData.financialHealth.lastUpdate && (
                      <p className="text-xs text-muted-foreground">
                        Mise à jour:{' '}
                        {new Date(
                          enrichedCompanyData.financialHealth.lastUpdate
                        ).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes from LLM */}
              {insights?.companyVerification?.notes &&
                insights.companyVerification.notes.length > 0 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <p className="mb-2 text-sm font-semibold text-yellow-800">
                      Notes d&apos;analyse
                    </p>
                    <div className="space-y-1">
                      {insights.companyVerification.notes.map((note, idx) => (
                        <p key={idx} className="text-xs text-yellow-900">
                          • {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

              {/* Fallback if no data */}
              {!enrichedCompanyData?.siret &&
                !insights?.companyVerification?.verified && (
                  <div className="rounded-lg border border-dashed bg-gray-50 p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Données d&apos;entreprise non disponibles.
                      {devis.extractedData.company.siret &&
                        ' Enrichissement en cours...'}
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Key Strengths & Weaknesses - New Priority Section */}
            {insights && (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Strengths */}
                {insights.keyStrengths.length > 0 && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        Points Forts ({insights.keyStrengths.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.keyStrengths.map((strength, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-green-200 bg-white p-3"
                        >
                          <div className="mb-1 flex items-start justify-between">
                            <p className="text-sm font-semibold">
                              {strength.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {strength.impact}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {strength.description}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Weaknesses */}
                {insights.keyWeaknesses.length > 0 && (
                  <Card className="border-red-200 bg-red-50/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                        Points d&apos;Attention ({insights.keyWeaknesses.length}
                        )
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.keyWeaknesses.map((weakness, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-red-200 bg-white p-3"
                        >
                          <div className="mb-1 flex items-start justify-between">
                            <p className="text-sm font-semibold">
                              {weakness.title}
                            </p>
                            <Badge variant="destructive" className="text-xs">
                              {weakness.severity}
                            </Badge>
                          </div>
                          <p className="mb-2 text-xs text-muted-foreground">
                            {weakness.description}
                          </p>
                          {weakness.recommendation && (
                            <p className="text-xs italic text-blue-600">
                              💡 {weakness.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Priority Actions - New Section */}
            {insights && insights.priorityActions.length > 0 && (
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Target className="h-5 w-5" />
                    Actions Prioritaires
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.priorityActions.map((action, idx) => (
                      <div key={idx} className="rounded-lg border bg-white p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <p className="flex-1 font-semibold">
                            {action.action}
                          </p>
                          <Badge
                            variant={
                              action.priority === 'urgent'
                                ? 'destructive'
                                : action.priority === 'high'
                                  ? 'default'
                                  : 'secondary'
                            }
                            className="ml-2"
                          >
                            {action.priority}
                          </Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Impact:{' '}
                            </span>
                            <span className="font-medium">
                              {action.expectedImpact}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Délai:{' '}
                            </span>
                            <span className="font-medium">
                              {action.timeframe}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Recommendations - LLM Improved */}
            {insights && insights.enhancedRecommendations.length > 0 ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                        Recommandations Améliorées (
                        {insights.enhancedRecommendations.length})
                      </CardTitle>
                      <CardDescription>
                        Suggestions optimisées par intelligence artificielle
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChat(!showChat)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {insights.enhancedRecommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="rounded-lg border-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="mb-1 text-base font-semibold">
                              {rec.title}
                            </h4>
                            <p className="mb-3 text-sm text-muted-foreground">
                              {rec.description}
                            </p>
                          </div>
                          <Badge
                            variant={
                              rec.priority === 'high'
                                ? 'default'
                                : rec.priority === 'medium'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="ml-2"
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          {rec.estimatedSavings && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Euro className="h-3 w-3" />
                              <span className="font-medium">
                                {rec.estimatedSavings}
                              </span>
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {rec.complexity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rec.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : score &&
              score.recommendations &&
              score.recommendations.length > 0 ? (
              // Fallback to original recommendations
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                        Recommandations ({score.recommendations.length})
                      </CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChat(!showChat)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {score.recommendations.map((rec, index) => (
                      <RecommendationCard
                        key={index}
                        recommendation={{
                          id: `rec-${index}`,
                          category: rec.category,
                          priority: rec.priority,
                          message: rec.suggestion,
                          actionable:
                            rec.priority === 'high' ||
                            rec.priority === 'medium',
                        }}
                        devisId={devisId}
                        userId={DEMO_USER_ID}
                        index={index}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Alerts */}
            {score && score.alerts && score.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Alertes ({score.alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {score.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border p-4"
                      >
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <p className="font-medium">{alert.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Score Breakdown - Simplified */}
            {score && (
              <Card>
                <CardHeader>
                  <CardTitle>Détail du Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['prix', 'qualite', 'delais', 'conformite'].map(
                      (category) => {
                        const data = score.breakdown[category]
                        if (!data) return null
                        const percentage =
                          (data.score /
                            (category === 'prix' || category === 'qualite'
                              ? 300
                              : 200)) *
                          100
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">
                                {category}
                              </span>
                              <span className="text-sm font-semibold">
                                {Math.round(data.score)}/
                                {category === 'prix' || category === 'qualite'
                                  ? 300
                                  : 200}{' '}
                                ({Math.round(percentage)}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={`h-full transition-all ${
                                  percentage >= 70
                                    ? 'bg-green-500'
                                    : percentage >= 50
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      }
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Panel */}
            {showChat && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Chat Assistant</CardTitle>
                  <CardDescription>
                    Posez des questions sur votre devis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px]">
                    <DevisChat
                      devisId={devisId}
                      userId={DEMO_USER_ID}
                      recommendations={
                        score?.recommendations ||
                        insights?.enhancedRecommendations ||
                        []
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Devis Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Informations du Devis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Montant Total</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(Number(devis.totalAmount))}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entreprise</p>
                  <p className="font-medium">
                    {devis.extractedData.company.name}
                  </p>
                  {devis.extractedData.company.siret && (
                    <p className="text-xs text-muted-foreground">
                      SIRET: {devis.extractedData.company.siret}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Type de Projet</p>
                  <p className="font-medium capitalize">
                    {devis.projectType || 'Non spécifié'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date d&apos;Analyse</p>
                  <p className="font-medium">{formatDate(devis.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Benchmark */}
            {score?.regionalBenchmark && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Benchmark Régional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Région</p>
                    <p className="font-medium">
                      {score.regionalBenchmark.region}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Position</p>
                    <p className="font-medium">
                      {Math.round(score.regionalBenchmark.percentilePosition)}e
                      percentile
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prix Moyen Régional</p>
                    <p className="font-medium">
                      {formatCurrency(
                        score.regionalBenchmark.comparisonData.averagePrice
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
