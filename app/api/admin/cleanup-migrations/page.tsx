/**
 * Page simple pour déclencher le nettoyage via l'interface
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CleanupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCleanup = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/cleanup-migrations')
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
      } else {
        setError(data.message || 'Erreur lors du nettoyage')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🧹 Nettoyage Automatique Railway</CardTitle>
          <CardDescription>
            Ce script nettoie automatiquement les migrations RNB échouées dans Railway
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCleanup}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Nettoyage en cours...' : '🚀 Lancer le Nettoyage Automatique'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-semibold">❌ Erreur</p>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className={`p-4 border rounded-md ${result.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-yellow-800'}`}>
                {result.success ? '✅ Succès' : '⚠️  Résultat partiel'}
              </p>
              <p className={`mt-2 ${result.success ? 'text-green-700' : 'text-yellow-700'}`}>
                {result.message}
              </p>
              
              {result.results && (
                <div className="mt-4 space-y-2 text-sm">
                  <div>
                    <strong>Migrations:</strong> {result.results.migrations.deleted} supprimée(s), {result.results.migrations.remaining} restante(s)
                  </div>
                  <div>
                    <strong>Tables:</strong> {result.results.tables.dropped} supprimée(s), {result.results.tables.remaining} restante(s)
                  </div>
                  <div>
                    <strong>Enum:</strong> {result.results.enum.dropped ? 'Supprimé' : 'Non supprimé'}, {result.results.enum.remaining} restant(s)
                  </div>
                </div>
              )}

              {result.nextStep && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-blue-800 text-sm">
                    <strong>💡 Prochaine étape:</strong> {result.nextStep}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-md text-sm text-gray-600">
            <p><strong>Ce script va :</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Supprimer toutes les migrations RNB échouées</li>
              <li>Supprimer les tables rnb_buildings et rnb_import_jobs si elles existent</li>
              <li>Supprimer l'enum rnb_import_status s'il existe</li>
              <li>Vérifier que tout est propre et prêt pour la nouvelle migration</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

