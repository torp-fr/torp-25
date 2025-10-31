'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Database,
  MapPin,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'

interface CertificationStats {
  total: number
  valid: number
  expired: number
  byDepartment: Record<string, number>
}

interface ImportJob {
  id: string
  resourceId?: string
  resourceUrl: string
  resourceTitle?: string
  resourceFormat?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress: number
  totalRows?: number
  processedRows: number
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<CertificationStats | null>(null)
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/rge/import?allJobs=true')
      const data = await response.json()

      if (data.success) {
        setStats(data.data.stats)
        setJobs(data.data.jobs || data.data.activeJobs || [])
      } else {
        setError(data.error || 'Erreur lors du chargement des statistiques')
      }
    } catch (err: any) {
      console.error('[Admin] Erreur chargement données:', err)
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }, [])

  // Charger au montage et actualiser périodiquement
  useEffect(() => {
    loadData()
    
    // Actualiser toutes les 30 secondes pour mettre à jour les stats
    const interval = setInterval(() => {
      loadData()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadData])

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('fr-FR')
  }

  // Status badge
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
      COMPLETED: 'success',
      IN_PROGRESS: 'warning',
      PENDING: 'secondary',
      FAILED: 'destructive',
      CANCELLED: 'secondary',
    }

    const icons: Record<string, React.ReactNode> = {
      COMPLETED: <CheckCircle2 className="h-3 w-3" />,
      IN_PROGRESS: <Clock className="h-3 w-3" />,
      PENDING: <Clock className="h-3 w-3" />,
      FAILED: <XCircle className="h-3 w-3" />,
      CANCELLED: <XCircle className="h-3 w-3" />,
    }

    return (
      <Badge variant={variants[status] || 'secondary'} className="gap-1">
        {icons[status]}
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  // Top departments
  const topDepartments = stats?.byDepartment
    ? Object.entries(stats.byDepartment)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ⚙️ Administration TORP
            </h1>
            <p className="text-gray-600 mt-1">
              Tableau de bord et monitoring de la plateforme
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">ℹ️ Indexation automatique</CardTitle>
            <CardDescription className="text-blue-700">
              Les données sont indexées automatiquement lors de l&apos;analyse de devis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
              <li>Chaque SIRET analysé dans un devis déclenche une recherche de certification</li>
              <li>Les données trouvées sont <strong>automatiquement indexées</strong> dans la base locale</li>
              <li>L&apos;index grandit progressivement avec chaque nouvelle analyse</li>
              <li>Les recherches futures utilisent l&apos;index local (plus rapide que l&apos;API)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-900">❌ Erreur</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Certifications</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats?.total.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Certifications indexées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Certifications Valides</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? '...' : stats?.valid.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats
                  ? `${Math.round((stats.valid / stats.total) * 100)}% du total`
                  : '0%'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Certifications Expirées</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {loading ? '...' : stats?.expired.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats
                  ? `${Math.round((stats.expired / stats.total) * 100)}% du total`
                  : '0%'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Départements</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : Object.keys(stats?.byDepartment || {}).length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Départements couverts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Empty State */}
        {stats && stats.total === 0 && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-900">📝 Index vide</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-800 text-sm">
                L&apos;index est actuellement vide. Il se remplira automatiquement lors des prochaines analyses de devis contenant des SIRET d&apos;entreprises.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Jobs List (historique uniquement) */}
        {jobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📋 Historique des Imports</CardTitle>
              <CardDescription>
                Liste des imports effectués (système automatique)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(job.status)}
                        <div>
                          <p className="font-semibold">
                            {job.resourceTitle || 'Import automatique'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {job.resourceFormat?.toUpperCase() || 'AUTO'} •{' '}
                            {job.totalRows
                              ? `${job.totalRows.toLocaleString()} lignes`
                              : 'Taille inconnue'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Créé: {formatDate(job.createdAt)}</p>
                        {job.completedAt && (
                          <p>Terminé: {formatDate(job.completedAt)}</p>
                        )}
                      </div>
                    </div>

                    {(job.status === 'IN_PROGRESS' ||
                      job.status === 'PENDING') && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>
                            {job.processedRows.toLocaleString()} /{' '}
                            {job.totalRows?.toLocaleString() || '?'} lignes
                          </span>
                          <span>{job.progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={job.progress} />
                      </div>
                    )}

                    {job.status === 'COMPLETED' && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          {job.processedRows.toLocaleString()} certifications
                          indexées
                        </span>
                      </div>
                    )}

                    {job.status === 'FAILED' && job.errorMessage && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        <strong>Erreur:</strong> {job.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Departments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top 10 Départements
                </CardTitle>
                <CardDescription>
                  Répartition des certifications par département
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topDepartments.map(([dept, count]) => (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">
                          Département {dept}
                        </span>
                        <span className="text-gray-600">
                          {count.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={(count / (stats.total || 1)) * 100}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Validity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition Validité
                </CardTitle>
                <CardDescription>
                  Certifications valides vs expirées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Certifications Valides
                      </span>
                      <span className="font-semibold">
                        {stats.valid.toLocaleString()} (
                        {Math.round((stats.valid / stats.total) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={(stats.valid / stats.total) * 100}
                      className="h-3"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Certifications Expirées
                      </span>
                      <span className="font-semibold">
                        {stats.expired.toLocaleString()} (
                        {Math.round((stats.expired / stats.total) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={(stats.expired / stats.total) * 100}
                      className="h-3"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Taux de validité</span>
                      <span className="text-lg font-bold text-green-600">
                        {Math.round((stats.valid / stats.total) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

