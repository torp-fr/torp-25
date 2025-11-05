'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function BuildingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Building profile error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md border-red-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-600">Erreur lors du chargement</CardTitle>
          </div>
          <CardDescription>
            Une erreur est survenue lors du chargement du profil du logement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">
              {error.message || 'Une erreur inconnue est survenue'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Réessayer
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/buildings'}
              className="flex-1"
            >
              Retour à la liste
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si le problème persiste, l&apos;enrichissement automatique peut être en cours.
            Attendez quelques instants puis rechargez la page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
