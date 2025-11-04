'use client'

import { clientLoggers } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const log = clientLoggers.page

/**
 * Page de test pour Sentry
 * Permet de tester la configuration Sentry en générant des erreurs
 */
export default function TestSentryPage() {
  const handleClientError = () => {
    throw new Error('Test Sentry Error - Client Side')
  }

  const handleAsyncError = async () => {
    throw new Error('Test Sentry Error - Async Client Side')
  }

  const handleServerError = async () => {
    try {
      const response = await fetch('/api/test-sentry')
      if (!response.ok) {
        throw new Error('Server error occurred')
      }
      const data = await response.json()
      log.debug({ data }, 'Test Sentry data')
    } catch (error) {
      log.error({ err: error }, 'Test Sentry error')
    }
  }

  const handleMessage = () => {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      ;(window as any).Sentry.captureMessage('Test Sentry Message', 'info')
      alert('Message envoyé à Sentry!')
    } else {
      alert('Sentry n&apos;est pas configuré. Vérifiez NEXT_PUBLIC_SENTRY_DSN')
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Test de Configuration Sentry</CardTitle>
          <CardDescription>
            Cette page permet de tester la configuration Sentry en générant
            différentes erreurs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Tests Client Side</h3>
            <div className="flex flex-col gap-2">
              <Button onClick={handleClientError} variant="destructive">
                Générer une erreur client synchronisée
              </Button>
              <Button onClick={handleAsyncError} variant="destructive">
                Générer une erreur client asynchrone
              </Button>
              <Button onClick={handleMessage} variant="outline">
                Envoyer un message Sentry
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Tests Server Side</h3>
            <Button onClick={handleServerError} variant="destructive">
              Générer une erreur serveur (API Route)
            </Button>
          </div>

          <div className="mt-6 rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Après avoir cliqué sur un bouton, vérifiez
              le dashboard Sentry pour voir si l&apos;erreur a été capturée. Les
              erreurs peuvent prendre quelques secondes à apparaître.
            </p>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <p className="text-sm">
              <strong>Configuration Sentry:</strong>{' '}
              {typeof window !== 'undefined' && (window as any).Sentry ? (
                <span className="text-green-600 dark:text-green-400">
                  ✅ Activé
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  ❌ Non configuré - Ajoutez NEXT_PUBLIC_SENTRY_DSN
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
