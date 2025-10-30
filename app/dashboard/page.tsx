'use client'

import { useState, useEffect } from 'react'
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
  Upload,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { useUser } from '@auth0/nextjs-auth0/client'

interface Devis {
  id: string
  createdAt: string
  totalAmount: number
  projectType?: string
  validationStatus: string
  torpScores?: Array<{
    scoreValue: number
    scoreGrade: string
    createdAt: string
  }>
}

interface DashboardStats {
  totalDevis: number
  avgScore: number
  pendingDevis: number
  completedDevis: number
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useUser()
  const [devisList, setDevisList] = useState<Devis[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalDevis: 0,
    avgScore: 0,
    pendingDevis: 0,
    completedDevis: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (user) fetchDevis()
  }, [user])

  const fetchDevis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/devis`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des devis')
      }

      const data = await response.json()
      const devis = data.data || []

      setDevisList(devis)

      // Calculer les stats
      const completed = devis.filter(
        (d: Devis) => d.validationStatus === 'COMPLETED'
      ).length
      const pending = devis.filter(
        (d: Devis) => d.validationStatus === 'PENDING'
      ).length

      const scoresWithValues = devis
        .filter((d: Devis) => d.torpScores && d.torpScores.length > 0)
        .map((d: Devis) => d.torpScores![0].scoreValue)

      const avgScore =
        scoresWithValues.length > 0
          ? scoresWithValues.reduce((a: number, b: number) => a + b, 0) /
            scoresWithValues.length
          : 0

      setStats({
        totalDevis: devis.length,
        avgScore: Math.round(avgScore),
        pendingDevis: pending,
        completedDevis: completed,
      })

      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur inconnue'
      )
    } finally {
      setLoading(false)
    }
  }

  const generateTestData = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch(`/api/test/seed?userId=${userId}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération des données de test')
      }

      const data = await response.json()

      if (data.success) {
        // Recharger les devis après génération
        await fetchDevis()
      } else {
        throw new Error(data.error || 'Erreur lors de la génération')
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur inconnue'
      )
    } finally {
      setGenerating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'PROCESSING':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'FAILED':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-600 bg-green-50'
      case 'B':
        return 'text-blue-600 bg-blue-50'
      case 'C':
        return 'text-yellow-600 bg-yellow-50'
      case 'D':
        return 'text-orange-600 bg-orange-50'
      case 'E':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mes Devis BTP</h1>
          <p className="text-muted-foreground">
            Gérez et analysez tous vos devis de construction
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Devis
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDevis}</div>
              <p className="text-xs text-muted-foreground">
                Devis analysés
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Score Moyen
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}/1000</div>
              <p className="text-xs text-muted-foreground">
                Qualité moyenne
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                En Cours
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDevis}</div>
              <p className="text-xs text-muted-foreground">
                En analyse
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Complétés
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.completedDevis}
              </div>
              <p className="text-xs text-muted-foreground">
                Analyses terminées
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Erreur
              </CardTitle>
              <CardDescription className="text-red-600">
                {error}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Devis List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des Devis</CardTitle>
            <CardDescription>
              Consultez l&apos;historique complet de vos devis analysés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {devisList.length === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  Aucun devis pour le moment
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Uploadez votre premier devis pour commencer l&apos;analyse ou
                  générez des données de test
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Link href="/upload">
                    <Button>
                      <Upload className="mr-2 h-4 w-4" />
                      Uploader un Devis
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={generateTestData}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Générer Données de Test
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Type Projet
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Montant
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Score TORP
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {devisList.map((devis) => {
                      const latestScore =
                        devis.torpScores && devis.torpScores.length > 0
                          ? devis.torpScores[0]
                          : null

                      return (
                        <tr key={devis.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm">
                            {formatDate(devis.createdAt)}
                          </td>
                          <td className="px-4 py-4 text-sm capitalize">
                            {devis.projectType || 'Non spécifié'}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">
                            {formatCurrency(Number(devis.totalAmount))}
                          </td>
                          <td className="px-4 py-4">
                            {latestScore ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getGradeColor(
                                    latestScore.scoreGrade
                                  )}`}
                                >
                                  {latestScore.scoreGrade}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {Math.round(Number(latestScore.scoreValue))}
                                  /1000
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Non calculé
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(devis.validationStatus)}
                              <span className="text-sm capitalize">
                                {devis.validationStatus.toLowerCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/analysis/${devis.id}`}>
                              <Button variant="outline" size="sm">
                                Voir Détails
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
