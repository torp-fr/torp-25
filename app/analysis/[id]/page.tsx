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
import { CoherenceCard } from '@/components/analysis/coherence-card'
import { CompanyAuditCard } from '@/components/analysis/company-audit-card'

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
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const DEMO_USER_ID = 'demo-user-id'

  // Fonction pour charger les données du devis
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch devis
      const devisResponse = await fetch(`/api/devis/${devisId}`)
      if (!devisResponse.ok) {
        throw new Error('Erreur lors du chargement du devis')
      }

      const devisData = await devisResponse.json()
      const loadedDevis = devisData.data as Devis
      setDevis(loadedDevis)

      // Vérifier si un SIRET existe et si les données sont enrichies
      const hasSiret = loadedDevis?.extractedData?.company?.siret
      const hasEnrichedData = (loadedDevis as any)?.enrichedData?.company?.siret

      console.log('[AnalysisPage] 📋 Devis chargé:', {
        hasSiret: !!hasSiret,
        hasEnrichedData: !!hasEnrichedData,
        siret: hasSiret,
      })

      // Si SIRET existe mais pas de données enrichies, forcer l'enrichissement
      if (hasSiret && !hasEnrichedData) {
        console.log(
          '[AnalysisPage] 🔄 Enrichissement nécessaire, déclenchement...'
        )
        setEnriching(true)
        try {
          const enrichResponse = await fetch(
            `/api/analysis/${devisId}/enrich-company`
          )
          if (enrichResponse.ok) {
            const enrichData = await enrichResponse.json()
            console.log('[AnalysisPage] ✅ Enrichissement réussi:', {
              hasCompany: !!enrichData.data,
              siret: enrichData.data?.siret,
              hasFinancialData: !!enrichData.data?.financialData,
              hasReputation: !!enrichData.data?.reputation,
            })

            // Recharger le devis avec les données enrichies
            const devisResponse2 = await fetch(`/api/devis/${devisId}`)
            if (devisResponse2.ok) {
              const devisData2 = await devisResponse2.json()
              setDevis(devisData2.data)
              console.log(
                '[AnalysisPage] ✅ Devis rechargé avec données enrichies'
              )
            }
          } else {
            const errorData = await enrichResponse.json().catch(() => ({}))
            console.warn('[AnalysisPage] ⚠️ Enrichissement échoué:', errorData)
          }
        } catch (enrichErr) {
          console.error('[AnalysisPage] ❌ Erreur enrichissement:', enrichErr)
        } finally {
          setEnriching(false)
        }
      } else if (hasEnrichedData) {
        console.log('[AnalysisPage] ℹ️ Données enrichies déjà disponibles')
      }

      // Fetch score
      const scoreResponse = await fetch(`/api/score?devisId=${devisId}`)
      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json()
        setScore(scoreData.data)
      }
    } catch (err) {
      console.error('[AnalysisPage] ❌ Erreur chargement:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [devisId])

  // Fonction pour charger les insights (appelée après que les données soient prêtes)
  const fetchInsights = useCallback(async () => {
    if (!devis) {
      console.log('[AnalysisPage] ⏳ Pas de devis, attente...')
      return
    }

    try {
      console.log('[AnalysisPage] 🔄 Chargement des insights...')

      // Recharger le devis pour être sûr d'avoir les dernières données
      const devisResponse = await fetch(`/api/devis/${devisId}`)
      if (devisResponse.ok) {
        const devisData = await devisResponse.json()
        const currentDevis = devisData.data as Devis
        setDevis(currentDevis)

        console.log('[AnalysisPage] 📋 Devis pour insights:', {
          hasEnrichedData: !!(currentDevis as any)?.enrichedData?.company,
          enrichedCompanySiret: (currentDevis as any)?.enrichedData?.company
            ?.siret,
        })
      }

      // Charger les insights (qui utiliseront les données enrichies si disponibles)
      const response = await fetch(`/api/analysis/${devisId}/insights`)
      if (response.ok) {
        const data = await response.json()
        setInsights(data.data)
        console.log('[AnalysisPage] ✅ Insights chargés avec succès')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.warn('[AnalysisPage] ⚠️ Erreur chargement insights:', errorData)
      }
    } catch (err) {
      console.error('[AnalysisPage] ❌ Erreur chargement insights:', err)
    }
  }, [devisId, devis])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Charger les insights une fois que le devis et le score sont chargés
  useEffect(() => {
    if (devis && score && !loading && !enriching) {
      // Attendre un peu pour que l'enrichissement se termine si en cours
      const timer = setTimeout(() => {
        fetchInsights()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [devis, score, loading, enriching, fetchInsights])

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
                    {Math.round(Number(score.scoreValue))}/1350
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

        {/* Coherence Analysis - Axe 9 */}
        <CoherenceCard
          coherenceData={(devis as any).enrichedData?.ccfData}
          coherenceAnalysis={
            score?.breakdown?.axisScores?.find((axis: any) => axis.axisId === 'coherence')
              ? {
                  score:
                    score.breakdown.axisScores.find((axis: any) => axis.axisId === 'coherence')
                      ?.score || 0,
                  maxPoints:
                    score.breakdown.axisScores.find((axis: any) => axis.axisId === 'coherence')
                      ?.maxPoints || 150,
                  percentage:
                    score.breakdown.axisScores.find((axis: any) => axis.axisId === 'coherence')
                      ?.percentage || 0,
                  matchingElements: [],
                  missingElements: [],
                  extraElements: [],
                  alerts:
                    score.breakdown.axisScores
                      .find((axis: any) => axis.axisId === 'coherence')
                      ?.alerts.map((alert: any) => ({
                        type: alert.type,
                        message: alert.message,
                      })) || [],
                }
              : undefined
          }
          devisAmount={devis.totalAmount}
        />

        {/* Company Audit - Phase 4 */}
        <CompanyAuditCard
          companyData={(devis as any).enrichedData?.company}
          projectType={devis.projectType}
        />


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
