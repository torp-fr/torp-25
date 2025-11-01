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
        
        // Charger les insights si le score existe
        if (scoreData.data) {
          fetchInsights()
        }
      }

      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur inconnue'
      )
    } finally {
      setLoading(false)
    }
  }, [devisId])

  const fetchInsights = async () => {
    try {
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
          <p className="text-muted-foreground">Chargement de l&apos;analyse...</p>
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

  const extractedDataAny = devis.extractedData as any
  const enrichedCompanyData = extractedDataAny?.enrichedData?.company || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Analyse TORP</h1>
              <p className="text-muted-foreground text-lg">
                {devis.extractedData.company.name} • {devis.extractedData.project.title}
              </p>
            </div>
            {score && (
              <div className={`rounded-2xl border-4 p-6 ${getGradeColor(score.scoreGrade)}`}>
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">{score.scoreGrade}</div>
                  <div className="text-2xl font-semibold">
                    {Math.round(Number(score.scoreValue))}/1000
                  </div>
                  <div className="text-sm mt-1 opacity-75">
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
              <p className="text-lg leading-relaxed">{insights.executiveSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Company Verification - New Section */}
        {insights?.companyVerification && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <CardTitle>Vérification Entreprise</CardTitle>
                </div>
                <Badge variant={insights.companyVerification.verified ? "default" : "secondary"}>
                  {insights.companyVerification.verified ? 'Vérifié' : 'Non vérifié'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Confiance</p>
                  <p className="text-lg font-semibold">{insights.companyVerification.confidence}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sources</p>
                  <p className="text-sm font-medium">
                    {insights.companyVerification.dataSources.length > 0
                      ? insights.companyVerification.dataSources.join(', ')
                      : 'Aucune'}
                  </p>
                </div>
              </div>
              
              {enrichedCompanyData.financialData && (
                <div className="rounded-lg border bg-gray-50 p-4">
                  <p className="text-sm font-semibold mb-2">Données Financières</p>
                  {enrichedCompanyData.financialData.capital && (
                    <p className="text-xs text-muted-foreground">
                      Capital: {formatCurrency(enrichedCompanyData.financialData.capital)}
                    </p>
                  )}
                </div>
              )}

              {insights.companyVerification.notes.length > 0 && (
                <div className="space-y-1">
                  {insights.companyVerification.notes.map((note, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">• {note}</p>
                  ))}
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
                        <div key={idx} className="rounded-lg border border-green-200 bg-white p-3">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-sm">{strength.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {strength.impact}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{strength.description}</p>
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
                        Points d&apos;Attention ({insights.keyWeaknesses.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {insights.keyWeaknesses.map((weakness, idx) => (
                        <div key={idx} className="rounded-lg border border-red-200 bg-white p-3">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-sm">{weakness.title}</p>
                            <Badge variant="destructive" className="text-xs">
                              {weakness.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{weakness.description}</p>
                          {weakness.recommendation && (
                            <p className="text-xs text-blue-600 italic">
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
                      <div
                        key={idx}
                        className="rounded-lg border bg-white p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold flex-1">{action.action}</p>
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
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Impact: </span>
                            <span className="font-medium">{action.expectedImpact}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Délai: </span>
                            <span className="font-medium">{action.timeframe}</span>
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
                        Recommandations Améliorées ({insights.enhancedRecommendations.length})
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
                        className="rounded-lg border-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base mb-1">{rec.title}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
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
                              <span className="font-medium">{rec.estimatedSavings}</span>
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
            ) : score && score.recommendations && score.recommendations.length > 0 ? (
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
                          actionable: rec.priority === 'high' || rec.priority === 'medium',
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
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
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
                    {['prix', 'qualite', 'delais', 'conformite'].map((category) => {
                      const data = score.breakdown[category]
                      if (!data) return null
                      const percentage = (data.score / (category === 'prix' || category === 'qualite' ? 300 : 200)) * 100
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">{category}</span>
                            <span className="text-sm font-semibold">
                              {Math.round(data.score)}/{category === 'prix' || category === 'qualite' ? 300 : 200} ({Math.round(percentage)}%)
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
                    })}
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
                      recommendations={score?.recommendations || insights?.enhancedRecommendations || []}
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
                <CardTitle className="text-base">Informations du Devis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Montant Total</p>
                  <p className="text-lg font-bold">{formatCurrency(Number(devis.totalAmount))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entreprise</p>
                  <p className="font-medium">{devis.extractedData.company.name}</p>
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
                  <CardTitle className="text-base">Benchmark Régional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Région</p>
                    <p className="font-medium">{score.regionalBenchmark.region}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Position</p>
                    <p className="font-medium">
                      {Math.round(score.regionalBenchmark.percentilePosition)}e percentile
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Prix Moyen Régional</p>
                    <p className="font-medium">
                      {formatCurrency(score.regionalBenchmark.comparisonData.averagePrice)}
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
