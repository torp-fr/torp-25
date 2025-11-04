'use client'

/**
 * Page d'upload refondue avec wizard intégré
 * Les données du wizard sont directement envoyées au LLM pour analyse
 * Les branches sont connectées au workflow pour les requêtes API
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clientLoggers } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  MapPin,
  DollarSign,
  Info,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'

type UploadStatus =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'analyzing'
  | 'certifying'
  | 'success'
  | 'error'

interface CCFData {
  // Étape 1: Type de projet
  projectType: 'construction' | 'renovation' | 'extension' | 'maintenance'
  projectTitle: string
  projectDescription: string
  tradeType: string

  // Étape 2: Localisation
  address: string
  postalCode: string
  city: string
  region: string
  coordinates?: { lat: number; lng: number }

  // Étape 3: Contraintes et besoins
  constraints: string[]
  requirements: string[]
  rooms: string[]
  accessConditions: string[]
  budgetRange: {
    min: number
    max: number
    preferred?: number
  }

  // Données enrichies (auto-remplies)
  buildingData?: any
  urbanismData?: any
  energyData?: any
  pluData?: any
  cadastreData?: any
}

interface CertificationStep {
  id: string
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  details?: string
}

export const dynamic = 'force-dynamic'

const log = clientLoggers.page

export default function UploadPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1) // Étape du wizard (1-4)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [certificationSteps, setCertificationSteps] = useState<
    CertificationStep[]
  >([])

  // Données du wizard CCF
  const [ccfData, setCcfData] = useState<CCFData>({
    projectType: 'renovation',
    projectTitle: '',
    projectDescription: '',
    tradeType: 'general',
    address: '',
    postalCode: '',
    city: '',
    region: 'ILE_DE_FRANCE',
    constraints: [],
    requirements: [],
    rooms: [],
    accessConditions: [],
    budgetRange: { min: 0, max: 0 },
  })

  const [addressSearchQuery, setAddressSearchQuery] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])

  const availableRooms = [
    'Salle de bain',
    'Cuisine',
    'Chambre',
    'Salon',
    'Salle à manger',
    'Bureau',
    'WC',
    'Entrée',
    'Cave',
    'Grenier',
    'Garage',
    'Terrasse',
    'Balcon',
  ]

  const wizardSteps = [
    { id: 1, title: 'Informations du Projet', icon: Building },
    { id: 2, title: 'Localisation', icon: MapPin },
    { id: 3, title: 'Contraintes & Budget', icon: DollarSign },
    { id: 4, title: 'Document à Analyser', icon: FileText },
  ]

  // Recherche d'adresse
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([])
      return
    }

    try {
      const response = await fetch('/api/external/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      if (response.ok) {
        const data = await response.json()
        setAddressSuggestions(data.data || [])
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur recherche adresse')
    }
  }

  // Récupération des données bâti
  const fetchBuildingData = async (address: string) => {
    try {
      const response = await fetch('/api/external/building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })

      if (response.ok) {
        const data = await response.json()
        setCcfData((prev) => ({
          ...prev,
          buildingData: data.data.building,
          urbanismData: data.data.urbanism,
          energyData: data.data.energy,
          pluData: data.data.plu,
          cadastreData: data.data.cadastre,
        }))
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération données bâti')
    }
  }

  const handleAddressSelect = (address: any) => {
    setAddressSearchQuery(address.formatted)
    setAddressSuggestions([])
    setCcfData((prev) => ({
      ...prev,
      address: address.formatted,
      postalCode: address.postalCode,
      city: address.city,
      region: address.region || 'ILE_DE_FRANCE',
      coordinates: address.coordinates,
    }))

    if (address.formatted) {
      fetchBuildingData(address.formatted)
    }
  }

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
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]
    if (!validTypes.includes(file.type)) {
      setError('Type de fichier non supporté. Utilisez PDF, JPG ou PNG.')
      return
    }

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

  // Initialiser les étapes de certification
  const initializeCertificationSteps = () => {
    setCertificationSteps([
      { id: 'upload', label: 'Upload du document', status: 'completed' },
      {
        id: 'llm_analysis',
        label: 'Analyse LLM et décryptage',
        status: 'in_progress',
      },
      { id: 'enrichment', label: 'Enrichissement via APIs', status: 'pending' },
      { id: 'scoring', label: 'Calcul du score TORP', status: 'pending' },
      {
        id: 'certification',
        label: 'Certification des recommandations',
        status: 'pending',
      },
    ])
  }

  // Mettre à jour une étape de certification
  const updateCertificationStep = (
    id: string,
    status: CertificationStep['status'],
    details?: string
  ) => {
    setCertificationSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, status, details } : step))
    )
  }

  const uploadFile = async () => {
    if (!file) return

    try {
      setStatus('uploading')
      setError(null)
      setProgress(0)
      initializeCertificationSteps()

      // Étape 1: Upload
      setProgress(10)
      updateCertificationStep('upload', 'completed')

      // Étape 2: Préparation données
      setStatus('processing')
      setProgress(20)

      const formData = new FormData()
      formData.append('file', file)

      // Envoyer TOUTES les données du wizard au LLM
      formData.append(
        'ccfData',
        JSON.stringify({
          ...ccfData,
          // Ajouter les métadonnées pour le workflow
          metadata: {
            wizardCompleted: true,
            stepsCompleted: currentStep,
            enrichmentRequested: true,
            certificationRequested: true,
          },
        })
      )

      // Étape 3: Analyse LLM
      setStatus('analyzing')
      setProgress(30)
      updateCertificationStep(
        'llm_analysis',
        'in_progress',
        'Analyse du document en cours...'
      )

      const response = await fetch('/api/llm/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.details || "Erreur lors de l'analyse du document"
        )
      }

      updateCertificationStep('llm_analysis', 'completed', 'Analyse terminée')
      setProgress(60)

      // Étape 4: Enrichissement (simulation car asynchrone)
      setStatus('certifying')
      updateCertificationStep(
        'enrichment',
        'in_progress',
        'Enrichissement via APIs...'
      )
      setProgress(70)

      // L'enrichissement est fait en arrière-plan dans l'API
      // On simule ici pour l'UX
      setTimeout(() => {
        updateCertificationStep(
          'enrichment',
          'completed',
          'Données enrichies depuis APIs externes'
        )
      }, 500)

      // Étape 5: Scoring
      updateCertificationStep(
        'scoring',
        'in_progress',
        'Calcul du score TORP...'
      )
      setProgress(85)

      setTimeout(() => {
        updateCertificationStep(
          'scoring',
          'completed',
          'Score calculé avec succès'
        )
      }, 300)

      // Étape 6: Certification
      updateCertificationStep(
        'certification',
        'in_progress',
        'Certification des recommandations...'
      )
      setProgress(95)

      const data = await response.json()
      const devisId = data.data.devisId

      setTimeout(() => {
        updateCertificationStep(
          'certification',
          'completed',
          'Recommandations certifiées'
        )
        setProgress(100)
        setStatus('success')

        // Redirection après 2 secondes
        setTimeout(() => {
          router.push(`/analysis/${devisId}`)
        }, 2000)
      }, 500)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      updateCertificationStep(
        'llm_analysis',
        'failed',
        "Erreur lors de l'analyse"
      )
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const nextStep = () => {
    if (currentStep < wizardSteps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="projectType">Type de projet *</Label>
              <Select
                value={ccfData.projectType}
                onValueChange={(value: any) =>
                  setCcfData((prev) => ({ ...prev, projectType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="construction">
                    Construction neuve
                  </SelectItem>
                  <SelectItem value="renovation">Rénovation</SelectItem>
                  <SelectItem value="extension">Extension</SelectItem>
                  <SelectItem value="maintenance">
                    Maintenance / Entretien
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tradeType">Corps de Métier</Label>
              <Select
                value={ccfData.tradeType}
                onValueChange={(value) =>
                  setCcfData((prev) => ({ ...prev, tradeType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    Tous Corps d&apos;État
                  </SelectItem>
                  <SelectItem value="plomberie">Plomberie</SelectItem>
                  <SelectItem value="electricite">Électricité</SelectItem>
                  <SelectItem value="maconnerie">Maçonnerie</SelectItem>
                  <SelectItem value="menuiserie">Menuiserie</SelectItem>
                  <SelectItem value="peinture">Peinture</SelectItem>
                  <SelectItem value="chauffage">Chauffage</SelectItem>
                  <SelectItem value="couverture">Couverture</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="projectTitle">Titre du projet</Label>
              <Input
                id="projectTitle"
                value={ccfData.projectTitle}
                onChange={(e) =>
                  setCcfData((prev) => ({
                    ...prev,
                    projectTitle: e.target.value,
                  }))
                }
                placeholder="Ex: Rénovation appartement 3 pièces"
              />
            </div>

            <div>
              <Label htmlFor="projectDescription">Description du projet</Label>
              <Textarea
                id="projectDescription"
                value={ccfData.projectDescription}
                onChange={(e) =>
                  setCcfData((prev) => ({
                    ...prev,
                    projectDescription: e.target.value,
                  }))
                }
                placeholder="Décrivez votre projet en détail..."
                rows={5}
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="address">Adresse du projet *</Label>
              <div className="relative">
                <Input
                  id="address"
                  value={addressSearchQuery}
                  onChange={(e) => {
                    setAddressSearchQuery(e.target.value)
                    searchAddress(e.target.value)
                  }}
                  placeholder="Tapez une adresse..."
                />
                {addressSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
                    {addressSuggestions.map((addr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => handleAddressSelect(addr)}
                      >
                        {addr.formatted}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {ccfData.address && (
              <div className="rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  ✓ Adresse validée: {ccfData.address}
                </p>
                {ccfData.buildingData && (
                  <p className="mt-2 text-xs text-green-600">
                    Données bâti récupérées automatiquement
                  </p>
                )}
              </div>
            )}

            {ccfData.pluData && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 text-sm font-semibold">
                  Données PLU récupérées
                </h4>
                {ccfData.pluData.zone && (
                  <p className="text-sm">
                    <strong>Zone:</strong> {ccfData.pluData.zone}
                  </p>
                )}
                <p className="mt-2 text-xs text-blue-600">
                  ✓ Utilisées pour l&apos;analyse de conformité
                </p>
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            {/* Pièces concernées */}
            <div>
              <Label>Pièces concernées (choix multiple)</Label>
              <div className="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2 md:grid-cols-3">
                {availableRooms.map((room) => {
                  const isSelected = ccfData.rooms.includes(room)
                  return (
                    <button
                      key={room}
                      type="button"
                      onClick={() => {
                        setCcfData((prev) => ({
                          ...prev,
                          rooms: isSelected
                            ? prev.rooms.filter((r) => r !== room)
                            : [...prev.rooms, room],
                        }))
                      }}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {room}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Contraintes */}
            <div>
              <Label htmlFor="constraints">Contraintes particulières</Label>
              <Textarea
                id="constraints"
                placeholder="Ajoutez des contraintes techniques, réglementaires, accès, etc. (une par ligne)"
                rows={4}
                value={ccfData.constraints.join('\n')}
                onChange={(e) =>
                  setCcfData((prev) => ({
                    ...prev,
                    constraints: e.target.value.split('\n').filter(Boolean),
                  }))
                }
              />
            </div>

            {/* Besoins fonctionnels */}
            <div>
              <Label htmlFor="requirements">Besoins fonctionnels</Label>
              <Textarea
                id="requirements"
                placeholder="Vos besoins, préférences, exigences..."
                rows={4}
                value={ccfData.requirements.join('\n')}
                onChange={(e) =>
                  setCcfData((prev) => ({
                    ...prev,
                    requirements: e.target.value.split('\n').filter(Boolean),
                  }))
                }
              />
            </div>

            {/* Budget */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="budgetMin">Budget min (€)</Label>
                <Input
                  id="budgetMin"
                  type="number"
                  onChange={(e) =>
                    setCcfData((prev) => ({
                      ...prev,
                      budgetRange: {
                        ...prev.budgetRange,
                        min: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="budgetMax">Budget max (€)</Label>
                <Input
                  id="budgetMax"
                  type="number"
                  onChange={(e) =>
                    setCcfData((prev) => ({
                      ...prev,
                      budgetRange: {
                        ...prev.budgetRange,
                        max: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="budgetPreferred">Budget idéal (€)</Label>
                <Input
                  id="budgetPreferred"
                  type="number"
                  onChange={(e) =>
                    setCcfData((prev) => ({
                      ...prev,
                      budgetRange: {
                        ...prev.budgetRange,
                        preferred: parseFloat(e.target.value) || undefined,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
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

                {/* Récapitulatif */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Info className="h-4 w-4" />
                      Récapitulatif de l&apos;analyse
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Type de projet:
                      </span>
                      <span className="font-medium">{ccfData.projectType}</span>
                    </div>
                    {ccfData.address && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adresse:</span>
                        <span className="font-medium">{ccfData.address}</span>
                      </div>
                    )}
                    {ccfData.budgetRange.max > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Budget:</span>
                        <span className="font-medium">
                          {ccfData.budgetRange.min}€ - {ccfData.budgetRange.max}
                          €
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <p className="text-xs text-blue-600">
                        ✓ Toutes les données seront analysées par le LLM et
                        enrichies via les APIs
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Analyse de Devis TORP</h1>
          <p className="text-muted-foreground">
            Renseignez votre projet et uploadez votre devis pour une analyse
            complète
          </p>
        </div>

        {/* Wizard Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {wizardSteps.map((step, idx) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-1 flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isCompleted
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`mt-2 text-center text-xs ${
                        isActive
                          ? 'font-semibold text-primary'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {idx < wizardSteps.length - 1 && (
                    <div
                      className={`mx-2 h-1 flex-1 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Wizard Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Étape {currentStep} sur {wizardSteps.length}
            </CardTitle>
            <CardDescription>
              {wizardSteps[currentStep - 1].title}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderWizardStep()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="mb-8 flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Précédent
          </Button>
          {currentStep < wizardSteps.length ? (
            <Button onClick={nextStep} disabled={currentStep === 4 && !file}>
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={uploadFile} disabled={!file || status !== 'idle'}>
              {status === 'uploading' ||
              status === 'processing' ||
              status === 'analyzing' ||
              status === 'certifying' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Lancer l&apos;Analyse Complète
                </>
              )}
            </Button>
          )}
        </div>

        {/* Certification Progress */}
        {(status === 'analyzing' ||
          status === 'certifying' ||
          status === 'processing') && (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Processus de Certification
              </CardTitle>
              <CardDescription>
                Analyse LLM, enrichissement via APIs et certification des
                recommandations
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
                      <p className="mt-1 text-xs text-muted-foreground">
                        {step.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Progress Bar */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progression globale
                  </span>
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
        )}

        {/* Success Message */}
        {status === 'success' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    Analyse terminée avec succès !
                  </p>
                  <p className="text-sm text-green-700">
                    Redirection vers les résultats...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {status === 'error' && error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">Erreur</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
