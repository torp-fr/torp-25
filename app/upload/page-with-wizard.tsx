'use client'

/**
 * Page d'upload avec wizard CCF intégré
 * Remplace progressivement l'ancienne page d'upload
 */

import { clientLoggers } from '@/lib/client-logger'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadWizard } from '@/components/wizard/upload-wizard'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { AppHeader } from '@/components/app-header'

const log = clientLoggers.page
type UploadStep = 'wizard' | 'upload' | 'processing'

export const dynamic = 'force-dynamic'

export default function UploadPageWithWizard() {
  const router = useRouter()
  const [step, setStep] = useState<UploadStep>('wizard')
  const [ccfData, setCcfData] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleCCFComplete = async (data: any) => {
    // Sauvegarder le CCF
    try {
      const response = await fetch('/api/ccf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setCcfData(data)
        setStep('upload')
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur sauvegarde CCF')
      // Continuer quand même vers l'upload
      setCcfData(data)
      setStep('upload')
    }
  }

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file || !ccfData) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ccfData', JSON.stringify(ccfData))

      const response = await fetch('/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/analysis/${data.devisId}`)
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur upload')
      setUploading(false)
    }
  }

  if (step === 'wizard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Définir votre Projet</h1>
            <p className="text-muted-foreground">
              Renseignez les informations de votre projet pour une analyse optimisée
            </p>
          </div>
          <UploadWizard onComplete={handleCCFComplete} onCancel={() => router.push('/upload')} />
        </main>
      </div>
    )
  }

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Uploader votre Devis</h1>
            <p className="text-muted-foreground">
              Téléchargez le devis à analyser en utilisant les informations du projet renseignées
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Document à Analyser</CardTitle>
              <CardDescription>Formats acceptés: PDF, JPG, PNG (max 10MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!file ? (
                <div
                  className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 transition-colors hover:border-primary"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">Glissez votre fichier ici</h3>
                  <p className="mb-4 text-sm text-muted-foreground">ou cliquez pour parcourir</p>
                  <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Choisir un Fichier
                  </Button>
                  <input
                    id="fileInput"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0])
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Projet:</strong> {ccfData.projectTitle || ccfData.projectType}
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Adresse:</strong> {ccfData.address || 'Non renseignée'}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Analyser le Devis
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return null
}

