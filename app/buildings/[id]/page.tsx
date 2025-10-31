'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  FileText,
  Upload,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Building2,
  Leaf,
  Zap,
  FileCheck,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'

export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

interface BuildingProfile {
  id: string
  name?: string
  address: any
  coordinates?: any
  cadastralData?: any
  enrichedData?: any
  pluData?: any
  rnbData?: any
  dpeData?: any
  urbanismData?: any
  enrichmentStatus: string
  enrichmentSources: string[]
  enrichmentErrors?: any
  lastEnrichedAt?: string
  customFields?: any
  notes?: string
  parcelleNumber?: string | null
  sectionCadastrale?: string | null
  codeINSEE?: string | null
  buildingDocuments: BuildingDocument[]
  createdAt: string
  updatedAt: string
}

interface BuildingDocument {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  fileUrl: string
  documentType: string
  documentCategory?: string
  description?: string
  documentDate?: string
  expirationDate?: string
  tags: string[]
  isValidated: boolean
  createdAt: string
}

const DOCUMENT_TYPES = [
  { value: 'TITLE_DEED', label: 'Titre de propriété' },
  { value: 'INSURANCE_HOME', label: 'Assurance habitation' },
  { value: 'INSURANCE_LIFE', label: 'Assurance vie' },
  { value: 'PROPERTY_TAX', label: 'Taxe foncière' },
  { value: 'NOTARY_ACT', label: 'Acte notarié' },
  { value: 'CONSTRUCTION_PERMIT', label: 'Permis de construire' },
  { value: 'DPE_CERTIFICATE', label: 'Certificat DPE' },
  { value: 'TECHNICAL_REPORT', label: 'Rapport technique' },
  { value: 'WARRANTY', label: 'Garantie' },
  { value: 'MAINTENANCE_LOG', label: 'Carnet d\'entretien' },
  { value: 'ENERGY_CERTIFICATE', label: 'Certificat énergétique' },
  { value: 'RGE_CERTIFICATE', label: 'Certificat RGE' },
  { value: 'OTHER', label: 'Autre' },
]

export default function BuildingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id

  const [profile, setProfile] = useState<BuildingProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [documentCategory, setDocumentCategory] = useState('')
  const [description, setDescription] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [profileId])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/building-profiles/${profileId}?userId=${DEMO_USER_ID}`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du profil')
      }

      const data = await response.json()
      setProfile(data.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshEnrichment = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/building-profiles/${profileId}/enrich?userId=${DEMO_USER_ID}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enrichissement')
      }

      // Attendre un peu puis recharger
      setTimeout(() => {
        fetchProfile()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enrichissement')
    } finally {
      setRefreshing(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !documentType) {
      setError('Fichier et type de document requis')
      return
    }

    try {
      setUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      if (documentCategory) formData.append('documentCategory', documentCategory)
      if (description) formData.append('description', description)
      if (documentDate) formData.append('documentDate', documentDate)
      if (expirationDate) formData.append('expirationDate', expirationDate)

      const response = await fetch(`/api/building-profiles/${profileId}/documents?userId=${DEMO_USER_ID}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'upload')
      }

      // Réinitialiser le formulaire et recharger
      setFile(null)
      setDocumentType('')
      setDocumentCategory('')
      setDescription('')
      setDocumentDate('')
      setExpirationDate('')
      setShowUploadForm(false)
      await fetchProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return
    }

    try {
      setDeleting(documentId)
      const response = await fetch(`/api/building-profiles/${profileId}/documents/${documentId}?userId=${DEMO_USER_ID}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h3 className="mb-2 text-lg font-semibold">Profil non trouvé</h3>
              <Button onClick={() => router.push('/buildings')}>
                Retour à la liste
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{profile.name || 'Logement sans nom'}</h1>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {profile.address?.formatted || 'Adresse non définie'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefreshEnrichment}
                disabled={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Actualiser
              </Button>
              <Button variant="outline" onClick={() => router.push('/buildings')}>
                Retour
              </Button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Erreur
              </CardTitle>
              <CardDescription className="text-red-600">{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enrichment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Statut d&apos;Enrichissement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <div className="flex items-center gap-2">
                      {profile.enrichmentStatus === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {profile.enrichmentStatus === 'in_progress' && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      )}
                      {profile.enrichmentStatus === 'failed' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      {profile.enrichmentStatus === 'pending' && (
                        <Clock className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="capitalize">
                        {profile.enrichmentStatus.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {profile.enrichmentSources.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Sources enrichies</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile.enrichmentSources.map((source, idx) => (
                          <span
                            key={idx}
                            className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                          >
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.lastEnrichedAt && (
                    <div className="text-xs text-muted-foreground">
                      Dernière mise à jour : {formatDate(profile.lastEnrichedAt)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cadastral Data */}
            {profile.cadastralData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Données Cadastrales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {profile.parcelleNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcelle</span>
                        <span className="font-medium">{profile.parcelleNumber}</span>
                      </div>
                    )}
                    {profile.sectionCadastrale && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Section</span>
                        <span className="font-medium">{profile.sectionCadastrale}</span>
                      </div>
                    )}
                    {profile.codeINSEE && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Code INSEE</span>
                        <span className="font-medium">{profile.codeINSEE}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* DPE Data */}
            {profile.dpeData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5" />
                    Diagnostic de Performance Energétique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.dpeData.dpeClass && (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600">
                        {profile.dpeData.dpeClass}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Classe énergétique</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents ({profile.buildingDocuments.length})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadForm(!showUploadForm)}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {showUploadForm ? 'Annuler' : 'Ajouter'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Upload Form */}
                {showUploadForm && (
                  <form onSubmit={handleFileUpload} className="mb-6 space-y-4 rounded-lg border bg-gray-50 p-4">
                    <div>
                      <Label htmlFor="file">Fichier *</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        required
                        className="mt-1"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </div>
                    <div>
                      <Label htmlFor="documentType">Type de document *</Label>
                      <Select value={documentType} onValueChange={setDocumentType} required>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="documentDate">Date du document</Label>
                        <Input
                          id="documentDate"
                          type="date"
                          value={documentDate}
                          onChange={(e) => setDocumentDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="expirationDate">Date d&apos;expiration</Label>
                        <Input
                          id="expirationDate"
                          type="date"
                          value={expirationDate}
                          onChange={(e) => setExpirationDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description du document..."
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" disabled={uploading || !file || !documentType}>
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Upload en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Uploader
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* Documents List */}
                {profile.buildingDocuments.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-2 h-8 w-8" />
                    <p>Aucun document pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {profile.buildingDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between rounded-lg border bg-white p-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.fileName}</span>
                            {doc.isValidated && (
                              <FileCheck className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label}
                            </span>
                            <span>•</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                            {doc.expirationDate && (
                              <>
                                <span>•</span>
                                <span>Expire le {formatDate(doc.expirationDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Voir
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={deleting === doc.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deleting === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span>{formatDate(profile.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modifié le</span>
                  <span>{formatDate(profile.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {profile.notes || 'Aucune note'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

