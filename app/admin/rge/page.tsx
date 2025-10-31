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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Play,
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

interface RGEStats {
  total: number
  valid: number
  expired: number
  byDepartment: Record<string, number>
}

interface RGEImportJob {
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

interface DatasetResource {
  id: string
  title: string
  format: string
  url: string
  filesize: number
  last_modified: string
}

export default function RGEAdminPage() {
  const [stats, setStats] = useState<RGEStats | null>(null)
  const [jobs, setJobs] = useState<RGEImportJob[]>([])
  const [resources, setResources] = useState<DatasetResource[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedResourceUrl, setSelectedResourceUrl] = useState<string>('')
  const [maxRows, setMaxRows] = useState<string>('')
  const [batchSize, setBatchSize] = useState<string>('1000')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rge/import?allJobs=true')
      const data = await response.json()

      if (data.success) {
        setStats(data.data.stats)
        // Utiliser jobs au lieu de activeJobs pour avoir tous les jobs
        setJobs(data.data.jobs || data.data.activeJobs || [])
      }

      // Charger les ressources disponibles
      const rgeResponse = await fetch('/api/rge?resources=true')
      if (rgeResponse.ok) {
        const rgeData = await rgeResponse.json()
        if (rgeData.resources) {
          setResources(rgeData.resources)
          if (rgeData.resources.length > 0 && !selectedResourceUrl) {
            setSelectedResourceUrl(rgeData.resources[0].url)
          }
        }
      }
    } catch (err: any) {
      console.error('Erreur chargement données:', err)
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [selectedResourceUrl])

  // Charger au montage et toutes les 5 secondes si des jobs sont actifs
  useEffect(() => {
    loadData()
    
    const interval = setInterval(() => {
      const hasActiveJobs = jobs.some(
        (job) => job.status === 'PENDING' || job.status === 'IN_PROGRESS'
      )
      if (hasActiveJobs || jobs.length === 0) {
        loadData()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [loadData, jobs.length])

  // Lancer un import
  const handleImport = async () => {
    setImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const body: any = {
        autoDetect: !selectedResourceUrl,
      }

      if (selectedResourceUrl) {
        body.resourceUrl = selectedResourceUrl
      }

      if (maxRows) {
        body.maxRows = parseInt(maxRows)
      }

      if (batchSize) {
        body.batchSize = parseInt(batchSize)
      }

      const response = await fetch('/api/rge/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Import démarré avec succès!')
        setTimeout(() => {
          loadData()
        }, 2000)
      } else {
        setError(data.error || 'Erreur lors du démarrage de l\'import')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setImporting(false)
    }
  }

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

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
              🏅 Administration RGE
            </h1>
            <p className="text-gray-600 mt-1">
              Gestion de l'indexation des certifications RGE
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

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

        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Lancer un Import</CardTitle>
            <CardDescription>
              Télécharge et indexe les certifications RGE depuis data.gouv.fr
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resource">Ressource</Label>
                <select
                  id="resource"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedResourceUrl}
                  onChange={(e) => setSelectedResourceUrl(e.target.value)}
                >
                  <option value="">Auto-détection (recommandé)</option>
                  {resources.map((res) => (
                    <option key={res.id} value={res.url}>
                      {res.title} ({res.format.toUpperCase()},{' '}
                      {formatBytes(res.filesize)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxRows">Lignes max (optionnel)</Label>
                <Input
                  id="maxRows"
                  type="number"
                  placeholder="Laisser vide pour import complet"
                  value={maxRows}
                  onChange={(e) => setMaxRows(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchSize">Taille batch</Label>
                <Input
                  id="batchSize"
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 font-semibold">❌ Erreur</p>
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-semibold">✅ Succès</p>
                <p className="text-green-600">{success}</p>
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={importing || loading}
              className="w-full"
              size="lg"
            >
              {importing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Lancer l'Import
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Jobs List */}
        {jobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>📋 Jobs d'Import</CardTitle>
              <CardDescription>
                Liste des imports en cours et terminés
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
                            {job.resourceTitle || 'Import RGE'}
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
        {stats && (
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

