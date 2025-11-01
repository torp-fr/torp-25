'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

/**
 * Page de test complète pour Sentry
 * Teste toutes les fonctionnalités et affiche les résultats
 */
export default function TestSentryCompletePage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    success: boolean
    message?: string
    tests?: string[]
    sentry?: any
    error?: string
  } | null>(null)

  const handleCompleteTest = async () => {
    setLoading(true)
    setResults(null)

    try {
      const response = await fetch('/api/test-sentry-complete')
      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClientError = () => {
    throw new Error('Test Sentry - Client Error from Complete Test Page')
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Test Complet de Configuration Sentry</CardTitle>
          <CardDescription>
            Tests complets de toutes les fonctionnalités Sentry avec contexte,
            tags, et exceptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Sentry */}
          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="mb-2 text-sm font-semibold">Statut Sentry:</p>
            <div className="space-y-1 text-sm">
              <p>
                DSN:{' '}
                {process.env.NEXT_PUBLIC_SENTRY_DSN ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✅ Configuré
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    ⚠️ Utilise DSN par défaut
                  </span>
                )}
              </p>
              <p>
                Window.Sentry:{' '}
                {typeof window !== 'undefined' && (window as any).Sentry ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✅ Disponible
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    ❌ Non disponible
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Tests */}
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Test Complet (API Route)</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Teste toutes les fonctionnalités Sentry : messages, contexte,
                tags, user, exceptions
              </p>
              <Button
                onClick={handleCompleteTest}
                disabled={loading}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  'Lancer Test Complet'
                )}
              </Button>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Test Erreur Client</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Génère une erreur côté client pour tester la capture automatique
              </p>
              <Button onClick={handleClientError} variant="destructive">
                Générer Erreur Client
              </Button>
            </div>
          </div>

          {/* Résultats */}
          {results && (
            <div className="mt-6 rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2">
                {results.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-semibold">
                  {results.success ? 'Tests Réussis' : 'Erreur'}
                </h3>
              </div>

              {results.message && (
                <p className="mb-3 text-sm">{results.message}</p>
              )}

              {results.tests && (
                <div className="mb-3">
                  <p className="mb-2 text-sm font-semibold">Tests effectués:</p>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {results.tests.map((test, index) => (
                      <li key={index} className="text-green-600">
                        ✅ {test}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.sentry && (
                <div className="mb-3 rounded bg-muted p-3 text-sm">
                  <p className="mb-1 font-semibold">Configuration Sentry:</p>
                  <pre className="text-xs">
                    {JSON.stringify(results.sentry, null, 2)}
                  </pre>
                </div>
              )}

              {results.error && (
                <div className="rounded bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20">
                  <p className="font-semibold">Erreur:</p>
                  <p>{results.error}</p>
                </div>
              )}

              <div className="mt-4 rounded bg-blue-50 p-3 text-sm dark:bg-blue-900/20">
                <p className="mb-1 font-semibold">📊 Prochaines étapes:</p>
                <ol className="list-inside list-decimal space-y-1 text-xs">
                  <li>
                    Ouvrez le{' '}
                    <a
                      href="https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      dashboard Sentry
                    </a>
                  </li>
                  <li>
                    Vérifiez que les erreurs apparaissent dans
                    &quot;Issues&quot;
                  </li>
                  <li>
                    Vérifiez les détails : contexte, tags, user, stack traces
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="mb-2 text-sm font-semibold">💡 Instructions:</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>
                Cliquez sur &quot;Lancer Test Complet&quot; pour tester toutes
                les fonctionnalités
              </li>
              <li>
                Vérifiez le{' '}
                <a
                  href="https://sentry.io/organizations/o4510290746146816/projects/torp-platform/issues/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  dashboard Sentry
                </a>{' '}
                dans les 30 secondes
              </li>
              <li>
                Les erreurs devraient apparaître avec tout le contexte (tags,
                user, stack trace)
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
