'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react'

interface HealthStatus {
  success: boolean
  status: string
  timestamp: string
  version?: string
  service?: string
  environment?: {
    DATABASE_URL: boolean
    NODE_ENV: string
    AWS_CONFIGURED: boolean
    AUTH0_CONFIGURED: boolean
  }
  database?: {
    connected: boolean
    counts: {
      users: number
      documents: number
      devis: number
      torpScores: number
    }
  }
  error?: string
}

export default function DiagnosticPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      setHealth({
        success: false,
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const testSeedAPI = async () => {
    setLoading(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/test/seed?userId=demo-user-id', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.success) {
        setTestResult('✅ Génération réussie! Devis ID: ' + data.data.devis.id)
        // Refresh health to see new counts
        await checkHealth()
      } else {
        setTestResult('❌ Erreur: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      setTestResult(
        '❌ Erreur réseau: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      )
    } finally {
      setLoading(false)
    }
  }

  const testDevisAPI = async () => {
    setLoading(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/devis?userId=demo-user-id')
      const data = await response.json()

      if (data.success) {
        setTestResult(
          `✅ API Devis OK! ${data.data?.length || 0} devis trouvés`
        )
      } else {
        setTestResult('❌ Erreur API Devis: ' + (data.error || 'Unknown'))
      }
    } catch (error) {
      setTestResult(
        '❌ Erreur réseau: ' +
          (error instanceof Error ? error.message : 'Unknown')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Diagnostic TORP Platform</h1>
          <p className="text-muted-foreground">
            Vérifiez l&apos;état du système et testez les APIs
          </p>
        </div>

        {/* Health Status */}
        <Card>
          <CardHeader>
            <CardTitle>État du Système</CardTitle>
            <CardDescription>
              Vérification de la connectivité et de la configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkHealth} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Vérifier l&apos;État
                </>
              )}
            </Button>

            {health && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  {health.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    Status: {health.status}
                  </span>
                </div>

                {health.environment && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Environnement:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        DATABASE_URL:{' '}
                        {health.environment.DATABASE_URL ? '✅' : '❌'}
                      </li>
                      <li>NODE_ENV: {health.environment.NODE_ENV}</li>
                      <li>
                        AWS S3:{' '}
                        {health.environment.AWS_CONFIGURED
                          ? '✅ Configuré'
                          : '⚠️ Non configuré (mode dev)'}
                      </li>
                      <li>
                        Auth0:{' '}
                        {health.environment.AUTH0_CONFIGURED
                          ? '✅ Configuré'
                          : '⚠️ Non configuré (mode dev)'}
                      </li>
                    </ul>
                  </div>
                )}

                {health.database && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Base de Données:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        Connexion:{' '}
                        {health.database.connected ? '✅ OK' : '❌ Erreur'}
                      </li>
                      <li>Users: {health.database.counts.users}</li>
                      <li>Documents: {health.database.counts.documents}</li>
                      <li>Devis: {health.database.counts.devis}</li>
                      <li>Scores TORP: {health.database.counts.torpScores}</li>
                    </ul>
                  </div>
                )}

                {health.error && (
                  <div className="rounded bg-red-50 p-3 text-sm text-red-600">
                    <strong>Erreur:</strong> {health.error}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Dernière vérification: {new Date(health.timestamp).toLocaleString('fr-FR')}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Tests des APIs</CardTitle>
            <CardDescription>
              Testez les différentes APIs du système
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={testDevisAPI} disabled={loading} variant="outline">
                Tester API Devis
              </Button>
              <Button onClick={testSeedAPI} disabled={loading} variant="outline">
                Tester Génération Test
              </Button>
            </div>

            {testResult && (
              <div className="rounded-lg border p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {testResult}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Liens Rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a href="/">Accueil</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard">Dashboard</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href="/upload">Upload</a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href="/api/health" target="_blank">
                  API Health (JSON)
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
