'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const { userId, user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Form data
  const [projectType, setProjectType] = useState('renovation')
  const [tradeType, setTradeType] = useState('general')

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    // Validate file type
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]
    if (!validTypes.includes(file.type)) {
      setError(
        'Type de fichier non supporté. Utilisez PDF, JPG ou PNG.'
      )
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Le fichier est trop volumineux. Maximum 10MB.')
      return
    }

    setFile(file)
    setError(null)
  }

  const removeFile = () => {
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setError(null)
  }

  const uploadFile = async () => {
    if (!file) return

    try {
      setStatus('uploading')
      setError(null)
      setProgress(0)

      // Create FormData
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('userEmail', user?.email || '')

      // Upload file
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Erreur lors de l\'upload du fichier')
      }

      const uploadData = await uploadResponse.json()
      const documentId = uploadData.data.documentId

      setProgress(30)
      setStatus('processing')

      // Process OCR to extract data from the document
      const ocrResponse = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      })

      if (!ocrResponse.ok) {
        throw new Error('Erreur lors de l\'extraction des données')
      }

      const ocrData = await ocrResponse.json()
      const extractedData = ocrData.data.extractedData

      setProgress(70)

      // Create devis with extracted data
      const devisResponse = await fetch('/api/devis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          userId,
          projectType,
          tradeType,
          extractedData,
        }),
      })

      if (!devisResponse.ok) {
        throw new Error('Erreur lors de la création du devis')
      }

      const devisData = await devisResponse.json()
      const devisId = devisData.data.id

      setProgress(85)

      // Calculate TORP Score
      const scoreResponse = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devisId,
          region: 'ILE_DE_FRANCE', // TODO: Géolocalisation ou choix utilisateur
        }),
      })

      if (!scoreResponse.ok) {
        console.warn('Erreur lors du calcul du score, mais on continue')
      }

      setProgress(100)
      setStatus('success')

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(`/analysis/${devisId}`)
      }, 2000)
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error ? err.message : 'Erreur inconnue'
      )
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Uploader un Devis</h1>
          <p className="text-muted-foreground">
            Analysez automatiquement votre devis BTP avec l&apos;algorithme TORP
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Document à Analyser</CardTitle>
                <CardDescription>
                  Formats acceptés: PDF, JPG, PNG (max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!file ? (
                  <div
                    className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                      dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 hover:border-primary'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() =>
                      document.getElementById('fileInput')?.click()
                    }
                  >
                    <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">
                      Glissez votre fichier ici
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      ou cliquez pour parcourir vos fichiers
                    </p>
                    <Button variant="outline">
                      <FileText className="mr-2 h-4 w-4" />
                      Choisir un Fichier
                    </Button>
                    <input
                      id="fileInput"
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleChange}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* File Preview */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      {status === 'idle' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {(status === 'uploading' || status === 'processing') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {status === 'uploading'
                              ? 'Upload en cours...'
                              : 'Analyse en cours...'}
                          </span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Success Message */}
                    {status === 'success' && (
                      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Upload réussi !</p>
                          <p className="text-sm">
                            Redirection vers l&apos;analyse...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {status === 'error' && error && (
                      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Erreur</p>
                          <p className="text-sm">{error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configuration Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informations du Projet</CardTitle>
                <CardDescription>
                  Aidez-nous à mieux analyser votre devis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectType">Type de Projet</Label>
                  <select
                    id="projectType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    disabled={status !== 'idle'}
                  >
                    <option value="renovation">Rénovation</option>
                    <option value="construction">Construction Neuve</option>
                    <option value="extension">Extension</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tradeType">Corps de Métier</Label>
                  <select
                    id="tradeType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={tradeType}
                    onChange={(e) => setTradeType(e.target.value)}
                    disabled={status !== 'idle'}
                  >
                    <option value="general">Tous Corps d&apos;État</option>
                    <option value="plomberie">Plomberie</option>
                    <option value="électricité">Électricité</option>
                    <option value="maçonnerie">Maçonnerie</option>
                    <option value="menuiserie">Menuiserie</option>
                    <option value="peinture">Peinture</option>
                  </select>
                </div>

                <Button
                  className="w-full"
                  onClick={uploadFile}
                  disabled={!file || status !== 'idle'}
                >
                  {status === 'uploading' || status === 'processing' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Analyser le Devis
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Comment ça marche ?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    1
                  </span>
                  <p>Uploadez votre devis (PDF ou image)</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    2
                  </span>
                  <p>Notre IA extrait automatiquement les données</p>
                </div>
                <div className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    3
                  </span>
                  <p>
                    Le TORP-Score est calculé sur 80 critères
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    4
                  </span>
                  <p>
                    Recevez des recommandations personnalisées
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
