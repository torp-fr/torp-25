'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2, Loader2, Upload } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function ImportDPEPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Sélectionne un fichier SQL')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setResult(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/import-dpe-sql', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Erreur lors de l\'import')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Import DPE SQL
            </CardTitle>
            <CardDescription>
              Upload le fichier dpe_logement_202103.sql pour l'importer dans la base de données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input */}
            <div>
              <Input
                type="file"
                accept=".sql"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {file && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Fichier sélectionné: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import en cours... (peut prendre plusieurs minutes)
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer
                </>
              )}
            </Button>

            {/* Success Result */}
            {result && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900">Import réussi!</h3>
                      <p className="mt-1 text-sm text-green-700">
                        <strong>Table:</strong> {result.tableName}
                      </p>
                      <p className="mt-1 text-sm text-green-700">
                        <strong>Lignes traitées:</strong> {result.stats?.totalLines || result.stats?.processed}
                      </p>
                      <p className="mt-1 text-sm text-green-700">{result.message}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Result */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900">Erreur</h3>
                      <p className="mt-1 text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">ℹ️ Information</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-blue-700">
                    <li>L'import peut prendre 5-10 minutes</li>
                    <li>Ne fermez pas cette page pendant l'import</li>
                    <li>Le fichier sera importé dans Railway PostgreSQL</li>
                    <li>Les données DPE deviendront immédiatement disponibles</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
