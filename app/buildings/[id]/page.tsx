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
  AlertCircle,
  Loader2,
  Leaf,
  Zap,
  FileCheck,
  Bell,
  Lightbulb,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Ruler,
  Battery,
  Euro,
  TrendingUp,
  Calendar,
  Home,
  DoorOpen,
  Layers,
  Factory,
  Bug,
  Shield,
  FileCheck as FileCheckIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

interface Recommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  actionable: boolean
  estimatedCost?: number
  estimatedImpact?: 'high' | 'medium' | 'low'
  deadline?: string
}

interface Notification {
  id: string
  type: 'info' | 'warning' | 'alert' | 'success'
  category: string
  title: string
  message: string
  actionUrl?: string
  createdAt: string
  read: boolean
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [characteristics, setCharacteristics] = useState<any[]>([])
  const [groupedCharacteristics, setGroupedCharacteristics] = useState<Record<string, any[]>>({})
  const [loadingCharacteristics, setLoadingCharacteristics] = useState(false)
  const [editingChar, setEditingChar] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState('')
  const [documentCategory, setDocumentCategory] = useState('')
  const [description, setDescription] = useState('')
  const [documentDate, setDocumentDate] = useState('')
  const [expirationDate, setExpirationDate] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [profileId])

  useEffect(() => {
    if (profile) {
      console.log('[Building Detail] 📋 Profil chargé, lancement récupération données:', {
        id: profile.id,
        enrichmentStatus: profile.enrichmentStatus,
        hasEnrichedData: !!profile.enrichedData,
      })
      
      // TOUJOURS charger les caractéristiques, même si pas encore enrichi
      fetchCharacteristics()
      fetchRecommendations()
      
      // Si l'enrichissement est en cours, poller régulièrement
      if (profile.enrichmentStatus === 'in_progress') {
        console.log('[Building Detail] 🔄 Enrichissement en cours, activation polling...')
        const interval = setInterval(() => {
          console.log('[Building Detail] 🔄 Polling: rechargement données...')
          fetchProfile()
          fetchCharacteristics()
        }, 3000) // Toutes les 3 secondes
        
        return () => {
          console.log('[Building Detail] 🛑 Arrêt polling')
          clearInterval(interval)
        }
      }
    }
  }, [profile])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      console.log('[Building Detail] 🔄 Chargement profil:', profileId)
      
      const response = await fetch(`/api/building-profiles/${profileId}?userId=${DEMO_USER_ID}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors du chargement du profil')
      }

      const data = await response.json()
      
      if (!data.success || !data.data) {
        throw new Error('Données du profil invalides')
      }
      
      console.log('[Building Detail] ✅ Profil chargé:', {
        id: data.data.id,
        enrichmentStatus: data.data.enrichmentStatus,
        hasEnrichedData: !!data.data.enrichedData,
        hasCadastralData: !!data.data.cadastralData,
        hasDPEData: !!data.data.dpeData,
        enrichedDataKeys: data.data.enrichedData ? Object.keys(data.data.enrichedData) : [],
      })
      
      setProfile(data.data)
      setError(null)
    } catch (err) {
      console.error('[Building Detail] ❌ Erreur chargement profil:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async () => {
    try {
      setLoadingRecommendations(true)
      const response = await fetch(`/api/building-profiles/${profileId}/recommendations?userId=${DEMO_USER_ID}`)

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des recommandations')
      }

      const data = await response.json()
      setRecommendations(data.data.recommendations || [])
      setNotifications(data.data.notifications || [])
    } catch (err) {
      console.error('Erreur chargement recommandations:', err)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const fetchCharacteristics = async () => {
    try {
      setLoadingCharacteristics(true)
      console.log('[Frontend] 🔄 Chargement caractéristiques pour:', profileId)
      
      const response = await fetch(`/api/building-profiles/${profileId}/characteristics?userId=${DEMO_USER_ID}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Frontend] ❌ Erreur API:', errorData)
        throw new Error(errorData.error || 'Erreur lors du chargement des caractéristiques')
      }

      const data = await response.json()
      
      console.log('[Frontend] 📦 Données brutes reçues:', {
        success: data.success,
        hasData: !!data.data,
        hasCharacteristics: !!data.data?.characteristics,
        characteristicsLength: data.data?.characteristics?.length || 0,
        hasGrouped: !!data.data?.grouped,
        groupedKeys: data.data?.grouped ? Object.keys(data.data.grouped) : [],
      })
      
      if (!data.success) {
        console.warn('[Frontend] ⚠️ API retourne success=false:', data.error)
        // Générer des caractéristiques de base même en cas d'erreur
        const baseCharacteristics = [
          {
            id: 'structure-property-type',
            category: 'structure',
            label: 'Type de bien',
            value: null,
            valueDisplay: 'Non renseigné',
            status: 'unknown',
            editable: true,
            priority: 'high',
            icon: 'Home',
            description: 'Type de bien (Maison, Appartement, etc.)',
          },
          {
            id: 'structure-rooms',
            category: 'structure',
            label: 'Nombre de pièces',
            value: null,
            valueDisplay: 'Non renseigné',
            status: 'unknown',
            editable: true,
            priority: 'high',
            icon: 'DoorOpen',
            description: 'Nombre de pièces principales',
          },
        ]
        setCharacteristics(baseCharacteristics)
        setGroupedCharacteristics({ structure: baseCharacteristics })
        return
      }
      
      const characteristics = data.data?.characteristics || []
      const grouped = data.data?.grouped || {}
      
      console.log('[Frontend] ✅ Caractéristiques traitées:', {
        total: characteristics.length,
        grouped: Object.keys(grouped).length,
        known: data.data?.counts?.known || 0,
        unknown: data.data?.counts?.unknown || 0,
        groupedKeys: Object.keys(grouped),
      })
      
      // GARANTIE : Si aucune caractéristique, créer des caractéristiques de base
      if (characteristics.length === 0) {
        console.warn('[Frontend] ⚠️ Aucune caractéristique, génération de base')
        const baseCharacteristics = [
          {
            id: 'structure-property-type',
            category: 'structure',
            label: 'Type de bien',
            value: null,
            valueDisplay: 'Non renseigné',
            status: 'unknown',
            editable: true,
            priority: 'high',
            icon: 'Home',
            description: 'Type de bien (Maison, Appartement, etc.)',
          },
          {
            id: 'structure-rooms',
            category: 'structure',
            label: 'Nombre de pièces',
            value: null,
            valueDisplay: 'Non renseigné',
            status: 'unknown',
            editable: true,
            priority: 'high',
            icon: 'DoorOpen',
            description: 'Nombre de pièces principales',
          },
        ]
        setCharacteristics(baseCharacteristics)
        setGroupedCharacteristics({ structure: baseCharacteristics })
      } else {
        setCharacteristics(characteristics)
        setGroupedCharacteristics(grouped)
      }
    } catch (err) {
      console.error('[Frontend] ❌ Erreur chargement caractéristiques:', err)
      // Générer des caractéristiques de base même en cas d'erreur
      const baseCharacteristics = [
        {
          id: 'structure-property-type',
          category: 'structure',
          label: 'Type de bien',
          value: null,
          valueDisplay: 'Non renseigné',
          status: 'unknown',
          editable: true,
          priority: 'high',
          icon: 'Home',
          description: 'Type de bien (Maison, Appartement, etc.)',
        },
        {
          id: 'structure-rooms',
          category: 'structure',
          label: 'Nombre de pièces',
          value: null,
          valueDisplay: 'Non renseigné',
          status: 'unknown',
          editable: true,
          priority: 'high',
          icon: 'DoorOpen',
          description: 'Nombre de pièces principales',
        },
      ]
      setCharacteristics(baseCharacteristics)
      setGroupedCharacteristics({ structure: baseCharacteristics })
    } finally {
      setLoadingCharacteristics(false)
    }
  }

  const handleEditCharacteristic = (charId: string, currentValue: any) => {
    setEditingChar(charId)
    setEditValue(currentValue?.toString() || '')
  }

  const handleSaveCharacteristic = async (charId: string) => {
    try {
      const response = await fetch(`/api/building-profiles/${profileId}/characteristics?userId=${DEMO_USER_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          characteristicId: charId,
          value: editValue,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour')
      }

      // Recharger les caractéristiques
      await fetchCharacteristics()
      setEditingChar(null)
      setEditValue('')
    } catch (err) {
      console.error('Erreur sauvegarde caractéristique:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
  }

  const handleRefreshEnrichment = async () => {
    try {
      setRefreshing(true)
      setError(null)
      
      const response = await fetch(`/api/building-profiles/${profileId}/enrich?userId=${DEMO_USER_ID}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'enrichissement')
      }

      const data = await response.json()
      console.log('✅ Enrichissement terminé:', data.data)

      // Polling pour vérifier le statut toutes les 2 secondes
      let attempts = 0
      const maxAttempts = 30 // 60 secondes max
      
      const checkStatus = async () => {
        attempts++
        await fetchProfile()
        await fetchCharacteristics()
        
        // Re-vérifier le statut après fetchProfile
        const currentProfileResponse = await fetch(`/api/building-profiles/${profileId}?userId=${DEMO_USER_ID}`)
        if (currentProfileResponse.ok) {
          const currentProfileData = await currentProfileResponse.json()
          const currentStatus = currentProfileData.data?.enrichmentStatus
          
          if (currentStatus === 'completed' || currentStatus === 'failed' || attempts >= maxAttempts) {
            setRefreshing(false)
            // Recharger une dernière fois
            await fetchProfile()
            await fetchCharacteristics()
          } else {
            setTimeout(checkStatus, 2000)
          }
        } else {
          setRefreshing(false)
        }
      }
      
      // Démarrer le polling après un court délai
      setTimeout(checkStatus, 2000)
    } catch (err) {
      console.error('❌ Erreur enrichissement:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enrichissement')
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

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications ({notifications.filter(n => !n.read).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      notif.type === 'alert' ? 'border-red-200 bg-red-50' :
                      notif.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                      notif.type === 'success' ? 'border-green-200 bg-green-50' :
                      'border-blue-200 bg-blue-50'
                    } ${notif.read ? 'opacity-60' : ''}`}
                  >
                    <div className="mt-0.5">
                      {notif.type === 'alert' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      {notif.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                      {notif.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {notif.type === 'info' && <Info className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{notif.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{notif.message}</div>
                    </div>
                    {!notif.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                {notifications.length > 5 && (
                  <div className="text-center text-sm text-muted-foreground pt-2">
                    + {notifications.length - 5} notification(s) supplémentaire(s)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recommendations */}
            {!loadingRecommendations && recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Recommandations ({recommendations.length})
                  </CardTitle>
                  <CardDescription>
                    Suggestions personnalisées basées sur les données de votre logement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className={`rounded-lg border p-4 ${
                          rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                          rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                          'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}>
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline">{rec.category}</Badge>
                              {rec.estimatedImpact && (
                                <Badge variant="outline">
                                  Impact: {rec.estimatedImpact}
                                </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold mb-1">{rec.title}</h4>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            {rec.estimatedCost && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Coût estimé: {rec.estimatedCost.toLocaleString('fr-FR')} €
                              </p>
                            )}
                            {rec.deadline && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Échéance: {formatDate(rec.deadline)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Carte d'Identité - Caractéristiques */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Carte d&apos;Identité du Logement
                </CardTitle>
                <CardDescription>
                  Informations complètes de votre logement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCharacteristics ? (
                  <div className="py-12 text-center">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Chargement des caractéristiques...</p>
                  </div>
                ) : characteristics.length === 0 && Object.keys(groupedCharacteristics).length === 0 ? (
                      <div className="py-8 space-y-4">
                        <div className="text-center text-muted-foreground">
                          <FileText className="mx-auto mb-2 h-8 w-8" />
                          <p className="mb-2">Aucune caractéristique disponible</p>
                          <p className="text-xs">L&apos;enrichissement peut être en cours. Rechargez la page dans quelques instants.</p>
                        </div>
                        <div className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              fetchCharacteristics()
                              fetchProfile()
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Recharger
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(groupedCharacteristics).length > 0 ? (
                          Object.entries(groupedCharacteristics).map(([category, chars]) => (
                            <div key={category} className="space-y-3">
                              <h3 className="text-lg font-semibold border-b pb-2">
                                {category === 'risques' && '🛡️ Risques et Sécurité'}
                                {category === 'energie' && '⚡ Performance Énergétique'}
                                {category === 'cadastre' && '📋 Informations Cadastrales'}
                                {category === 'valorisation' && '💰 Valorisation Immobilière'}
                                {category === 'urbanisme' && '🏛️ Urbanisme'}
                                {category === 'structure' && '🏠 Caractéristiques du Bâti'}
                                {category === 'environnement' && '🌱 Environnement'}
                                {category === 'documentation' && '📄 Documents'}
                                {!['risques', 'energie', 'cadastre', 'valorisation', 'urbanisme', 'structure', 'environnement', 'documentation'].includes(category) && category}
                              </h3>
                              <div className="grid gap-3 md:grid-cols-2">
                                {chars.map((char: any) => {
                              const iconMap: Record<string, any> = {
                                AlertTriangle,
                                Battery,
                                Zap,
                                Leaf,
                                Ruler,
                                MapPin,
                                Euro,
                                TrendingUp,
                                Calendar,
                                Home,
                                DoorOpen,
                                Layers,
                                Factory,
                                Bug,
                                Shield,
                                FileCheck: FileCheckIcon,
                              }
                              const IconComponent = char.icon ? iconMap[char.icon] || FileText : FileText
                              const isEditing = editingChar === char.id
                              
                              return (
                                <div
                                  key={char.id}
                                  className={`rounded-lg border p-4 ${
                                    char.status === 'known' ? 'border-green-200 bg-green-50' :
                                    char.status === 'partial' ? 'border-yellow-200 bg-yellow-50' :
                                    'border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-sm">{char.label}</span>
                                        {char.status === 'known' && (
                                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                                        )}
                                        {char.status === 'unknown' && (
                                          <AlertCircle className="h-3 w-3 text-gray-400" />
                                        )}
                                      </div>
                                      
                                      {isEditing ? (
                                        <div className="space-y-2">
                                          <Input
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="text-sm"
                                            placeholder="Valeur..."
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() => handleSaveCharacteristic(char.id)}
                                              className="h-6 text-xs"
                                            >
                                              Enregistrer
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditingChar(null)
                                                setEditValue('')
                                              }}
                                              className="h-6 text-xs"
                                            >
                                              Annuler
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="text-lg font-semibold">
                                            {char.valueDisplay}
                                            {char.unit && <span className="text-sm text-muted-foreground ml-1">{char.unit}</span>}
                                          </div>
                                          {char.description && (
                                            <p className="text-xs text-muted-foreground mt-1">{char.description}</p>
                                          )}
                                          {char.editable && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleEditCharacteristic(char.id, char.value)}
                                              className="mt-2 h-6 text-xs"
                                            >
                                              {char.status === 'unknown' ? 'Ajouter' : 'Modifier'}
                                            </Button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            <p>Aucune catégorie disponible. Total caractéristiques: {characteristics.length}</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => {
                                console.log('[Frontend] 🔍 Debug:', {
                                  characteristics,
                                  groupedCharacteristics,
                                  characteristicsLength: characteristics.length,
                                  groupedKeys: Object.keys(groupedCharacteristics),
                                })
                                fetchCharacteristics()
                              }}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Recharger
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
              </CardContent>
            </Card>

            {/* Statut enrichissement */}
            {(profile.enrichmentStatus === 'pending' || profile.enrichmentStatus === 'in_progress' || profile.enrichmentStatus === 'failed') && (
              <Card className={`${
                profile.enrichmentStatus === 'failed' ? 'border-red-200 bg-red-50' :
                profile.enrichmentStatus === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                'border-yellow-200 bg-yellow-50'
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      {profile.enrichmentStatus === 'in_progress' && (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      )}
                      {profile.enrichmentStatus === 'failed' && (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      {profile.enrichmentStatus === 'pending' && (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          {profile.enrichmentStatus === 'in_progress' && 'Enrichissement en cours...'}
                          {profile.enrichmentStatus === 'pending' && 'Enrichissement en attente'}
                          {profile.enrichmentStatus === 'failed' && 'Enrichissement échoué'}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {profile.enrichmentStatus === 'in_progress' && 'Vos informations sont en cours d\'actualisation depuis les sources externes.'}
                          {profile.enrichmentStatus === 'pending' && 'Cliquez sur "Enrichir" pour récupérer toutes les données disponibles.'}
                          {profile.enrichmentStatus === 'failed' && (
                            <span>
                              {profile.enrichmentErrors && Array.isArray(profile.enrichmentErrors) && profile.enrichmentErrors.length > 0
                                ? `Erreurs: ${profile.enrichmentErrors.join(', ')}`
                                : 'Certaines données n\'ont pas pu être récupérées. Vous pouvez réessayer.'}
                            </span>
                          )}
                        </div>
                        {profile.enrichmentSources && profile.enrichmentSources.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Sources disponibles: {profile.enrichmentSources.length}
                          </div>
                        )}
                      </div>
                    </div>
                    {(profile.enrichmentStatus === 'pending' || profile.enrichmentStatus === 'failed') && (
                      <Button
                        onClick={handleRefreshEnrichment}
                        disabled={refreshing}
                        variant={profile.enrichmentStatus === 'failed' ? 'default' : 'outline'}
                        size="sm"
                      >
                        {refreshing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            En cours...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Enrichir
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enrichment Status - MASQUÉ */}
            {/* <Card>
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


                  {profile.lastEnrichedAt && (
                    <div className="text-xs text-muted-foreground">
                      Dernière mise à jour : {formatDate(profile.lastEnrichedAt)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sections techniques masquées - Données intégrées dans la Carte d'Identité */}

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

