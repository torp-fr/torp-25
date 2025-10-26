'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ArrowLeft,
  Download,
  Share2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Minus,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'

interface TORPScore {
  id: string
  scoreValue: number
  scoreGrade: string
  confidenceLevel: number
  breakdown: {
    prix: { score: number; weight: number }
    qualite: { score: number; weight: number }
    delais: { score: number; weight: number }
    conformite: { score: number; weight: number }
  }
  alerts: Array<{
    type: string
    severity: string
    message: string
  }>
  recommendations: Array<{
    category: string
    priority: string
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
  createdAt: string
}

export default function AnalysisPage() {
  const params = useParams()
  const devisId = params.id as string

  const [devis, setDevis] = useState<Devis | null>(null)
  const [score, setScore] = useState<TORPScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calculatingScore, setCalculatingScore] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Fetch devis
      const devisResponse = await fetch(`/api/devis?userId=demo-user-id`)
      if (!devisResponse.ok) {
        throw new Error('Erreur lors du chargement du devis')
      }

      const devisData = await devisResponse.json()
      const foundDevis = devisData.data.find((d: Devis) => d.id === devisId)

      if (!foundDevis) {
        throw new Error('Devis non trouvé')
      }

      setDevis(foundDevis)

      // Fetch score
      const scoreResponse = await fetch(`/api/score?devisId=${devisId}`)
      if (scoreResponse.ok) {
        const scoreData = await scoreResponse.json()
        setScore(scoreData.data)
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

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const calculateScore = async () => {
    try {
      setCalculatingScore(true)
      setError(null)

      const response = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devisId,
          region: 'ILE_DE_FRANCE',
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors du calcul du score')
      }

      const data = await response.json()
      setScore(data.data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur inconnue'
      )
    } finally {
      setCalculatingScore(false)
    }
  }

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
        return <Minus className="h-5 w-5 text-yellow-600" />
      default:
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-600'
      case 'medium':
        return 'bg-yellow-100 text-yellow-600'
      default:
        return 'bg-blue-100 text-blue-600'
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
          <p className="text-muted-foreground">Chargement...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analyse TORP</h1>
          <p className="text-muted-foreground">
            {devis.extractedData.company.name} •{' '}
            {devis.extractedData.project.title}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Score Card */}
            <Card>
              <CardHeader>
                <CardTitle>Score TORP</CardTitle>
                <CardDescription>
                  Évaluation globale sur 80 critères
                </CardDescription>
              </CardHeader>
              <CardContent>
                {score ? (
                  <div className="space-y-6">
                    {/* Score Display */}
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-center">
                        <div
                          className={`mb-4 inline-flex h-32 w-32 items-center justify-center rounded-full border-8 ${getGradeColor(
                            score.scoreGrade
                          )}`}
                        >
                          <span className="text-4xl font-bold">
                            {score.scoreGrade}
                          </span>
                        </div>
                        <p className="text-2xl font-bold">
                          {Math.round(Number(score.scoreValue))}/1000
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Confiance: {Math.round(Number(score.confidenceLevel))}%
                        </p>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Détail par Catégorie</h4>
                      {Object.entries(score.breakdown).map(
                        ([category, data]) => {
                          const scoreValue = Math.round(Number(data.score))
                          const percentage = (scoreValue / 1000) * 100

                          return (
                            <div key={category} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium capitalize">
                                  {category} ({data.weight * 100}%)
                                </span>
                                <span className="font-semibold">
                                  {scoreValue}/1000
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
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <TrendingUp className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">
                      Score non calculé
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                      Lancez l&apos;analyse TORP pour évaluer ce devis
                    </p>
                    <Button
                      onClick={calculateScore}
                      disabled={calculatingScore}
                    >
                      {calculatingScore ? 'Calcul en cours...' : 'Calculer le Score'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alerts */}
            {score && score.alerts && score.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Alertes ({score.alerts.length})
                  </CardTitle>
                  <CardDescription>
                    Points d&apos;attention identifiés
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {score.alerts.map((alert, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-lg border p-4"
                      >
                        {getSeverityIcon(alert.severity)}
                        <div>
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

            {/* Recommendations */}
            {score &&
              score.recommendations &&
              score.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      Recommandations ({score.recommendations.length})
                    </CardTitle>
                    <CardDescription>
                      Suggestions d&apos;amélioration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {score.recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className="rounded-lg border p-4"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityBadge(
                                rec.priority
                              )}`}
                            >
                              {rec.priority}
                            </span>
                            <span className="text-xs capitalize text-muted-foreground">
                              {rec.category}
                            </span>
                          </div>
                          <p className="mb-2 font-medium">{rec.suggestion}</p>
                          {rec.potentialImpact && (
                            <p className="text-sm text-muted-foreground">
                              💡 {rec.potentialImpact}
                            </p>
                          )}
                        </div>
                      ))}
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
                      {Math.round(
                        score.regionalBenchmark.percentilePosition
                      )}
                      e percentile
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
