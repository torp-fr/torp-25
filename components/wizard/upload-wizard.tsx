'use client'

/**
 * Wizard d'upload avec CCF (Cahier des Charges Fonctionnel)
 * Guide l'utilisateur pour renseigner les éléments du projet avant l'upload
 */

import { useState } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Building,
  DollarSign,
  CheckCircle2,
} from 'lucide-react'

interface CCFData {
  // Étape 1: Type de projet
  projectType: 'construction' | 'renovation' | 'extension' | 'maintenance'
  projectTitle: string
  projectDescription: string

  // Étape 2: Localisation
  address: string
  postalCode: string
  city: string
  region: string
  coordinates?: { lat: number; lng: number }

  // Étape 3: Données bâti (enrichies depuis APIs)
  buildingData?: any
  urbanismData?: any
  energyData?: any

  // Étape 4: Contraintes et besoins
  constraints: string[]
  requirements: string[]
  rooms?: string[] // Pièces concernées (SDB, cuisine, etc.)
  autoDetectedConstraints?: string[] // Contraintes détectées automatiquement
  accessConditions?: string[] // Conditions d'accès
  budgetRange: {
    min: number
    max: number
    preferred?: number
  }
}

interface UploadWizardProps {
  onComplete: (ccfData: CCFData) => void
  onCancel?: () => void
}

export function UploadWizard({ onComplete, onCancel }: UploadWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [ccfData, setCcfData] = useState<CCFData>({
    projectType: 'renovation',
    projectTitle: '',
    projectDescription: '',
    address: '',
    postalCode: '',
    city: '',
    region: '',
    constraints: [],
    requirements: [],
    rooms: [],
    autoDetectedConstraints: [],
    accessConditions: [],
    budgetRange: { min: 0, max: 0 },
  })

  const [addressSearchQuery, setAddressSearchQuery] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [selectedAddress, setSelectedAddress] = useState<any>(null)

  // Options pour les pièces
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

  const steps = [
    { id: 1, title: 'Type de projet', icon: Building },
    { id: 2, title: 'Localisation', icon: MapPin },
    { id: 3, title: 'Données bâti', icon: Building },
    { id: 4, title: 'Contraintes & Budget', icon: DollarSign },
    { id: 5, title: 'Récapitulatif', icon: CheckCircle2 },
  ]

  // Recherche d'adresse
  const searchAddress = async (query: string) => {
    if (query.length < 3) return

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
      console.error('Erreur recherche adresse:', error)
    }
  }

  // Récupération des données bâti
  const fetchBuildingData = async (address: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/external/building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Détecter automatiquement les contraintes depuis les données bâti
        const autoConstraints = detectConstraintsFromBuildingData(data.data)
        
        setCcfData((prev) => ({
          ...prev,
          buildingData: data.data.building,
          urbanismData: data.data.urbanism,
          energyData: data.data.energy,
          pluData: data.data.plu,
          autoDetectedConstraints: autoConstraints,
        }))
      }
    } catch (error) {
      console.error('Erreur récupération données bâti:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddressSelect = (address: any) => {
    setSelectedAddress(address)
    setAddressSearchQuery(address.formatted)
    setAddressSuggestions([])
    setCcfData((prev) => ({
      ...prev,
      address: address.formatted,
      postalCode: address.postalCode,
      city: address.city,
      region: address.region,
      coordinates: address.coordinates,
    }))

    // Charger les données bâti automatiquement
    if (address.formatted) {
      fetchBuildingData(address.formatted)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    onComplete(ccfData)
  }

  // Fonction pour détecter automatiquement les contraintes depuis les données bâti
  const detectConstraintsFromBuildingData = (buildingData: any): string[] => {
    const constraints: string[] = []

    if (!buildingData) return constraints

    // Contraintes PLU
    if (buildingData.plu?.contraintes) {
      buildingData.plu.contraintes.forEach((c: any) => {
        if (c.description) constraints.push(c.description)
      })
    }

    if (buildingData.plu?.zonage?.type) {
      constraints.push(`Zone PLU: ${buildingData.plu.zonage.type}`)
    }

    // Contraintes de hauteur
    if (buildingData.building?.heightRestriction) {
      constraints.push(`Limitation de hauteur: ${buildingData.building.heightRestriction}m`)
    }

    // Contraintes de retrait
    if (buildingData.building?.setbackRestriction) {
      constraints.push(`Retrait obligatoire: ${buildingData.building.setbackRestriction}m`)
    }

    // Contraintes PLU depuis buildingData
    if (buildingData.building?.pluConstraints && buildingData.building.pluConstraints.length > 0) {
      constraints.push(...buildingData.building.pluConstraints)
    }

    // Contraintes d'urbanisme
    if (buildingData.urbanism?.constraints && buildingData.urbanism.constraints.length > 0) {
      constraints.push(...buildingData.urbanism.constraints)
    }

    return [...new Set(constraints)] // Supprimer les doublons
  }

  const renderStepContent = () => {
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
                  <SelectItem value="construction">Construction neuve</SelectItem>
                  <SelectItem value="renovation">Rénovation</SelectItem>
                  <SelectItem value="extension">Extension</SelectItem>
                  <SelectItem value="maintenance">Maintenance / Entretien</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="projectTitle">Titre du projet</Label>
              <Input
                id="projectTitle"
                value={ccfData.projectTitle}
                onChange={(e) =>
                  setCcfData((prev) => ({ ...prev, projectTitle: e.target.value }))
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
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                    {addressSuggestions.map((addr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-gray-100"
                        onClick={() => handleAddressSelect(addr)}
                      >
                        {addr.formatted}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedAddress && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  ✓ Adresse validée: {selectedAddress.formatted}
                </p>
                {ccfData.buildingData && (
                  <p className="text-xs text-green-600 mt-2">
                    Données bâti récupérées automatiquement
                  </p>
                )}
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8">
                <p>Chargement des données du bâti...</p>
              </div>
            ) : (
              <>
                {ccfData.energyData && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="font-semibold mb-2">Données énergétiques</h4>
                    <p className="text-sm">
                      Classe DPE: {ccfData.energyData.dpeClass || 'Non disponible'}
                    </p>
                  </div>
                )}
                {ccfData.pluData && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="font-semibold mb-2">Données PLU récupérées</h4>
                    {ccfData.pluData.zone && (
                      <p className="text-sm mb-1">
                        <strong>Zone:</strong> {ccfData.pluData.zone}
                      </p>
                    )}
                    {ccfData.pluData.commune && (
                      <p className="text-sm mb-1">
                        <strong>Commune:</strong> {ccfData.pluData.commune}
                      </p>
                    )}
                    {ccfData.pluData.contraintes && ccfData.pluData.contraintes.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Contraintes identifiées:</p>
                        <ul className="text-xs space-y-1">
                          {ccfData.pluData.contraintes.slice(0, 3).map((c: any, idx: number) => (
                            <li key={idx}>• {c.description || c}</li>
                          ))}
                          {ccfData.pluData.contraintes.length > 3 && (
                            <li className="text-gray-500">+ {ccfData.pluData.contraintes.length - 3} autres...</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Les contraintes PLU seront utilisées dans l'analyse
                    </p>
                  </div>
                )}
                {ccfData.urbanismData && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <h4 className="font-semibold mb-2">Données d'urbanisme</h4>
                    <p className="text-sm">
                      Autorisation: {ccfData.urbanismData.hasPermit ? 'Oui' : 'Non'}
                    </p>
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  Ces données seront utilisées pour enrichir l'analyse du devis et
                  vérifier la cohérence avec les contraintes réglementaires.
                </div>
              </>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            {/* Contraintes détectées automatiquement */}
            {ccfData.autoDetectedConstraints && ccfData.autoDetectedConstraints.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <Label className="font-semibold mb-2 block">Contraintes détectées automatiquement</Label>
                <ul className="space-y-1 text-sm">
                  {ccfData.autoDetectedConstraints.map((constraint, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                      <span>{constraint}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setCcfData((prev) => ({
                      ...prev,
                      constraints: [...prev.constraints, ...(prev.autoDetectedConstraints || [])],
                    }))
                  }}
                >
                  Ajouter toutes les contraintes détectées
                </Button>
              </div>
            )}

            {/* Identification des pièces */}
            <div>
              <Label>Pièces concernées (choix multiple)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Sélectionnez les pièces concernées par votre projet. Laissez vide si vous ne connaissez pas précisément votre besoin.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {availableRooms.map((room) => {
                  const isSelected = ccfData.rooms?.includes(room)
                  return (
                    <button
                      key={room}
                      type="button"
                      onClick={() => {
                        setCcfData((prev) => ({
                          ...prev,
                          rooms: isSelected
                            ? prev.rooms?.filter((r) => r !== room) || []
                            : [...(prev.rooms || []), room],
                        }))
                      }}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      {room}
                    </button>
                  )
                })}
              </div>
              {ccfData.rooms && ccfData.rooms.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {ccfData.rooms.length} pièce(s) sélectionnée(s)
                </p>
              )}
            </div>

            {/* Contraintes particulières (manuelles) */}
            <div>
              <Label htmlFor="constraints">Contraintes particulières supplémentaires</Label>
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

            {/* Conditions d'accès */}
            <div>
              <Label htmlFor="accessConditions">Conditions d'accès (optionnel)</Label>
              <div className="space-y-2 mt-2">
                {[
                  'Accès difficile',
                  'Étage élevé',
                  'Escalier étroit',
                  'Parking disponible',
                  'Accès engin nécessaire',
                  'Horaires restreints',
                ].map((condition) => {
                  const isSelected = ccfData.accessConditions?.includes(condition)
                  return (
                    <label key={condition} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setCcfData((prev) => ({
                            ...prev,
                            accessConditions: e.target.checked
                              ? [...(prev.accessConditions || []), condition]
                              : prev.accessConditions?.filter((c) => c !== condition) || [],
                          }))
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{condition}</span>
                    </label>
                  )
                })}
              </div>
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

      case 5:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Récapitulatif du CCF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <strong>Type:</strong> {ccfData.projectType}
                </div>
                <div>
                  <strong>Titre:</strong> {ccfData.projectTitle || 'Non renseigné'}
                </div>
                <div>
                  <strong>Adresse:</strong> {ccfData.address || 'Non renseigné'}
                </div>
                <div>
                  <strong>Budget:</strong> {ccfData.budgetRange.min}€ - {ccfData.budgetRange.max}€
                </div>
                {ccfData.buildingData && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <strong>Données bâti:</strong> Disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`mt-2 text-xs ${
                      isActive ? 'font-semibold text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>Étape {currentStep} sur {steps.length}</CardTitle>
          <CardDescription>{steps[currentStep - 1].title}</CardDescription>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>
        <div className="flex gap-4">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}
          {currentStep < steps.length ? (
            <Button onClick={nextStep}>
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Compléter et continuer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

