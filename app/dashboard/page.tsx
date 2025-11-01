'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  AlertCircle,
  Home,
  Plus,
  ChevronRight,
  BarChart3,
  Building2,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
export const dynamic = 'force-dynamic'

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

export default function DashboardPage() {
  const router = useRouter()
  const [devisList, setDevisList] = useState<Devis[]>([])
  const [buildingsCount, setBuildingsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Récupérer les devis récents
      const devisResponse = await fetch(`/api/devis`)
      if (devisResponse.ok) {
        const devisData = await devisResponse.json()
        const devis = devisData.data || []
        // Garder seulement les 3 derniers devis
        setDevisList(devis.slice(0, 3))
      }

      // Récupérer le nombre de logements
      const buildingsResponse = await fetch(`/api/building-profiles?userId=demo-user`)
      if (buildingsResponse.ok) {
        const buildingsData = await buildingsResponse.json()
        if (buildingsData.success && buildingsData.data) {
          setBuildingsCount(buildingsData.data.length || 0)
        }
      }

      setError(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors du chargement'
      )
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">
            Accédez rapidement à tous vos services et projets
          </p>
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

        {/* Services Principaux */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Analyser un devis */}
          <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => router.push('/upload')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Upload className="h-6 w-6 text-blue-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">Analyser un devis</CardTitle>
              <CardDescription>
                Uploadez et analysez vos devis BTP avec l&apos;IA TORP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={(e) => { e.stopPropagation(); router.push('/upload') }}>
                Analyser un devis
              </Button>
            </CardContent>
          </Card>

          {/* Mes logements */}
          <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => router.push('/buildings')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <Home className="h-6 w-6 text-green-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">Mes logements</CardTitle>
              <CardDescription>
                Gérez vos logements et consultez leurs cartes d&apos;identité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold">{buildingsCount}</span>
                <span className="text-sm text-muted-foreground">logement{buildingsCount > 1 ? 's' : ''}</span>
              </div>
              <Button className="w-full" variant="outline" onClick={(e) => { e.stopPropagation(); router.push('/buildings') }}>
                Voir mes logements
              </Button>
              <Button 
                className="mt-2 w-full" 
                variant="ghost" 
                size="sm"
                onClick={(e) => { e.stopPropagation(); router.push('/buildings/new') }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un logement
              </Button>
            </CardContent>
          </Card>

          {/* Mes analyses */}
          <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => router.push('/upload')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">Mes analyses</CardTitle>
              <CardDescription>
                Consultez l&apos;historique de vos analyses de devis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-2xl font-bold">{devisList.length}</span>
                <span className="text-sm text-muted-foreground">devis récent{devisList.length > 1 ? 's' : ''}</span>
              </div>
              <Button className="w-full" variant="outline" onClick={(e) => { e.stopPropagation(); router.push('/upload') }}>
                Voir toutes les analyses
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Aperçu récent */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Derniers devis */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Devis récents</CardTitle>
                  <CardDescription>
                    Vos derniers devis analysés
                  </CardDescription>
                </div>
                <Link href="/upload">
                  <Button variant="ghost" size="sm">
                    Voir tout <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {devisList.length === 0 ? (
                <div className="py-8 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="mb-2 text-sm font-medium">Aucun devis pour le moment</p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Commencez par analyser votre premier devis
                  </p>
                  <Link href="/upload">
                    <Button size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Analyser un devis
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {devisList.map((devis) => {
                    const latestScore =
                      devis.torpScores && devis.torpScores.length > 0
                        ? devis.torpScores[0]
                        : null

                    return (
                      <Link
                        key={devis.id}
                        href={`/analysis/${devis.id}`}
                        className="block rounded-lg border p-4 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                Devis du {formatDate(devis.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {devis.projectType ? `${devis.projectType} • ` : ''}
                              {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'EUR',
                              }).format(Number(devis.totalAmount))}
                            </p>
                          </div>
                          {latestScore && (
                            <div className="ml-4 flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                latestScore.scoreGrade === 'A' ? 'bg-green-100 text-green-700' :
                                latestScore.scoreGrade === 'B' ? 'bg-blue-100 text-blue-700' :
                                latestScore.scoreGrade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                                latestScore.scoreGrade === 'D' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {latestScore.scoreGrade}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logements récents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mes logements</CardTitle>
                  <CardDescription>
                    Gérez vos cartes d&apos;identité de logement
                  </CardDescription>
                </div>
                <Link href="/buildings">
                  <Button variant="ghost" size="sm">
                    Voir tout <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {buildingsCount === 0 ? (
                <div className="py-8 text-center">
                  <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="mb-2 text-sm font-medium">Aucun logement enregistré</p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Créez votre première carte d&apos;identité de logement
                  </p>
                  <Link href="/buildings/new">
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un logement
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {buildingsCount} logement{buildingsCount > 1 ? 's' : ''} enregistré{buildingsCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Consultez et enrichissez les données de vos logements
                    </p>
                  </div>
                  <Link href="/buildings/new">
                    <Button className="w-full" variant="outline" size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un nouveau logement
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  )
}
