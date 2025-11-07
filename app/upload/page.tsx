'use client'

/**
 * Page d'upload avec Wizard de Cohérence Demande/Devis
 * Optimisé pour capturer le besoin réel du client et analyser la cohérence avec le devis
 *
 * Flow:
 * 1. Wizard de cohérence (4 étapes) - Capture besoin + demande + contexte
 * 2. Upload du devis PDF
 * 3. Analyse complète avec LLM
 */

import { useState, useCallback } from 'react'
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
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  CheckCircle,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'
import { CoherenceWizard, CoherenceCCFData } from '@/components/wizard/coherence-wizard'

type PageStep = 'wizard' | 'upload' | 'processing'

type UploadStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error'

interface CertificationStep {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  details?: string
}

export const dynamic = 'force-dynamic'

export default function UploadPage() {
  const router = useRouter()

  // États principaux
  const [pageStep, setPageStep] = useState<PageStep>('wizard')
  const [ccfData, setCcfData] = useState<CoherenceCCFData | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [certificationSteps, setCertificationSteps] = useState<CertificationStep[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Wizard terminé - passer à l'upload
  const handleWizardComplete = (data: CoherenceCCFData) => {
    console.log('[UploadPage] ✅ Wizard terminé:', data)
    setCcfData(data)
    setPageStep('upload')
  }

  // Annuler et retourner au wizard
  const handleBackToWizard = () => {
    setPageStep('wizard')
    setFile(null)
    setError(null)
    setStatus('idle')
  }

  // Gestion fichier
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

  const handleFile = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!validTypes.includes(selectedFile.type)) {
      setError('Type de fichier non supporté. Utilisez PDF, JPG ou PNG.')
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (selectedFile.size > maxSize) {
      setError('Le fichier est trop volumineux. Maximum 10MB.')
      return
    }

    setFile(selectedFile)
    setError(null)
  }

  const removeFile = () => {
    setFile(null)
    setError(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Initialiser étapes certification
  const initializeCertificationSteps = () => {
    setCertificationSteps([
      { id: 'upload', label: 'Upload du document', status: 'completed' },
      { id: 'llm_analysis', label: 'Analyse LLM et extraction', status: 'in_progress' },
      { id: 'coherence', label: 'Analyse de cohérence demande/devis', status: 'pending' },
      { id: 'enrichment', label: 'Enrichissement via APIs', status: 'pending' },
      { id: 'scoring', label: 'Calcul du score TORP', status: 'pending' },
    ])
  }

  const updateCertificationStep = (
    id: string,
    status: CertificationStep['status'],
    details?: string
  ) => {
    setCertificationSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status, details } : step))
    )
  }

  // Upload et analyse
  const uploadAndAnalyze = async () => {
    if (!file || !ccfData) return

    try {
      setPageStep('processing')
      setStatus('uploading')
      setError(null)
      setProgress(0)
      initializeCertificationSteps()

      // Étape 1: Upload
      setProgress(10)
      updateCertificationStep('upload', 'completed')

      // Étape 2: Préparation données
      setStatus('analyzing')
      setProgress(20)

      const formData = new FormData()
      formData.append('file', file)

      // Envoyer les données CCF de cohérence au LLM
      formData.append('ccfData', JSON.stringify(ccfData))

      // Étape 3: Analyse LLM
      setProgress(30)
      updateCertificationStep('llm_analysis', 'in_progress', 'Extraction des données du devis...')

      const response = await fetch('/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || "Erreur lors de l'analyse du document")
      }

      updateCertificationStep('llm_analysis', 'completed', 'Données extraites')
      setProgress(50)

      // Étape 4: Analyse de cohérence
      updateCertificationStep('coherence', 'in_progress', 'Comparaison demande vs devis...')
      setProgress(60)

      // Simulation pour UX (l'analyse est faite côté serveur)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      updateCertificationStep('coherence', 'completed', 'Cohérence analysée')
      setProgress(70)

      // Étape 5: Enrichissement
      updateCertificationStep('enrichment', 'in_progress', 'Récupération données entreprise...')
      setProgress(80)

      await new Promise((resolve) => setTimeout(resolve, 800))
      updateCertificationStep('enrichment', 'completed', 'Données enrichies')
      setProgress(90)

      // Étape 6: Scoring
      updateCertificationStep('scoring', 'in_progress', 'Calcul du score TORP...')
      setProgress(95)

      const data = await response.json()
      const devisId = data.data.devisId

      await new Promise((resolve) => setTimeout(resolve, 500))
      updateCertificationStep('scoring', 'completed', 'Score calculé')
      setProgress(100)
      setStatus('success')

      // Redirection après 2 secondes
      setTimeout(() => {
        router.push(`/analysis/${devisId}`)
      }, 2000)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      updateCertificationStep('llm_analysis', 'failed', "Erreur lors de l'analyse")
    }
  }

  // Rendu selon l'étape
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* Wizard de cohérence */}
        {pageStep === 'wizard' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Analyse de Devis TORP</h1>
              <p className="text-muted-foreground">
                Décrivez votre besoin pour que nous puissions vérifier la cohérence avec le devis
                reçu
              </p>
            </div>

            <CoherenceWizard
              onComplete={handleWizardComplete}
              onCancel={() => router.push('/')}
            />
          </>
        )}

        {/* Upload du devis */}
        {pageStep === 'upload' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Uploadez votre devis</h1>
              <p className="text-muted-foreground">
                Déposez le devis que vous avez reçu pour l'analyser
              </p>
            </div>

            {/* Zone d'upload */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Document à analyser</CardTitle>
                <CardDescription>
                  Glissez-déposez votre devis PDF ou sélectionnez un fichier
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
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">Glissez votre devis ici</h3>
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
                    <p className="mt-4 text-xs text-gray-500">
                      Formats acceptés: PDF, JPG, PNG (max 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                      <Button variant="ghost" size="sm" onClick={removeFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Récapitulatif CCF */}
                    {ccfData && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-base">📋 Votre projet</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div>
                            <p className="font-semibold text-blue-900">Besoin initial:</p>
                            <p className="text-blue-800">{ccfData.clientNeed}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-blue-900">Demande précise:</p>
                            <p className="text-blue-800">{ccfData.clientRequest}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="font-semibold text-blue-900">Ville:</p>
                              <p className="text-blue-800">{ccfData.location.city}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-blue-900">Type de bien:</p>
                              <p className="text-blue-800">{ccfData.propertyType}</p>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600">
                            ✓ Ces informations seront utilisées pour analyser la cohérence du devis
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleBackToWizard}>
                Retour au wizard
              </Button>
              <Button onClick={uploadAndAnalyze} disabled={!file || status !== 'idle'}>
                {status === 'uploading' || status === 'analyzing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Lancer l'Analyse Complète
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Processing */}
        {pageStep === 'processing' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Analyse en cours...</h1>
              <p className="text-muted-foreground">
                Votre devis est en cours d'analyse. Veuillez patienter.
              </p>
            </div>

            {/* Progress */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Processus d'Analyse Certifiée
                </CardTitle>
                <CardDescription>
                  Analyse LLM, vérification cohérence et enrichissement via APIs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {certificationSteps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div className="mt-1">
                      {step.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {step.status === 'in_progress' && (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      )}
                      {step.status === 'pending' && (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      {step.status === 'failed' && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          step.status === 'completed'
                            ? 'text-green-700'
                            : step.status === 'in_progress'
                              ? 'text-blue-700'
                              : step.status === 'failed'
                                ? 'text-red-700'
                                : 'text-gray-600'
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.details && (
                        <p className="mt-1 text-xs text-muted-foreground">{step.details}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Progress Bar */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progression globale</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Success */}
            {status === 'success' && (
              <Card className="mt-6 border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Analyse terminée avec succès !</p>
                      <p className="text-sm text-green-700">Redirection vers les résultats...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error */}
            {status === 'error' && error && (
              <Card className="mt-6 border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <div>
                      <p className="font-medium text-red-900">Erreur</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4" onClick={handleBackToWizard}>
                    Retour
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
