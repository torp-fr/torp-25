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
  Home,
  Plus,
  MapPin,
  RefreshCw,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'

export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

interface BuildingProfile {
  id: string
  name?: string
  address: {
    formatted: string
    city: string
    postalCode: string
  }
  enrichmentStatus: string
  enrichmentSources: string[]
  lastEnrichedAt?: string
  buildingDocuments: Array<{
    id: string
    documentType: string
    fileName: string
  }>
  createdAt: string
  updatedAt: string
}

export default function BuildingsPage() {
  const [profiles, setProfiles] = useState<BuildingProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/building-profiles?userId=${DEMO_USER_ID}`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des profils')
      }

      const data = await response.json()
      setProfiles(data.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (profileId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce profil ? Cette action est irréversible.')) {
      return
    }

    try {
      setDeleting(profileId)
      const response = await fetch(`/api/building-profiles/${profileId}?userId=${DEMO_USER_ID}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const handleRefreshEnrichment = async (profileId: string) => {
    try {
      setRefreshing(profileId)
      const response = await fetch(`/api/building-profiles/${profileId}/enrich?userId=${DEMO_USER_ID}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enrichissement')
      }

      // Attendre un peu puis recharger
      setTimeout(() => {
        fetchProfiles()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enrichissement')
    } finally {
      setRefreshing(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
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
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Mes Logements</h1>
            <p className="text-muted-foreground">
              Gérez vos cartes d'identité de logements et leurs documents
            </p>
          </div>
          <Link href="/buildings/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Logement
            </Button>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Erreur
              </CardTitle>
              <CardDescription className="text-red-600">{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Profiles List */}
        {profiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Home className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Aucun logement enregistré</h3>
              <p className="mb-4 text-muted-foreground">
                Créez votre première carte d'identité de logement pour commencer
              </p>
              <Link href="/buildings/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un Profil
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        {profile.name || 'Logement sans nom'}
                      </CardTitle>
                      <CardDescription className="mt-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {profile.address.formatted}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Enrichment Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Statut enrichissement</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(profile.enrichmentStatus)}
                        <span className="text-sm capitalize">
                          {profile.enrichmentStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Sources */}
                    {profile.enrichmentSources.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          {profile.enrichmentSources.length} source{profile.enrichmentSources.length > 1 ? 's' : ''} enrichie{profile.enrichmentSources.length > 1 ? 's' : ''}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {profile.enrichmentSources.slice(0, 3).map((source, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Documents */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Documents</span>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {profile.buildingDocuments.length}
                        </span>
                      </div>
                    </div>

                    {/* Last Updated */}
                    {profile.lastEnrichedAt && (
                      <div className="text-xs text-muted-foreground">
                        Enrichi le {formatDate(profile.lastEnrichedAt)}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Link href={`/buildings/${profile.id}`} className="flex-1">
                        <Button variant="default" className="w-full" size="sm">
                          Voir Détails
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshEnrichment(profile.id)}
                        disabled={refreshing === profile.id}
                        title="Relancer l'enrichissement"
                      >
                        {refreshing === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(profile.id)}
                        disabled={deleting === profile.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

