'use client'

/**
 * Wizard Simplifié - Cohérence Demande/Devis
 * Objectif: Capturer le besoin réel du client pour analyser la cohérence avec le devis reçu
 *
 * 4 Étapes essentielles:
 * 1. Besoin Initial (problème/motivation)
 * 2. Demande Précise (ce qui a été demandé à l'entreprise)
 * 3. Contexte Projet (localisation, budget)
 * 4. Upload Devis
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
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Lightbulb,
  MapPin,
  FileText,
  CheckCircle2,
  Upload,
} from 'lucide-react'

export interface CoherenceCCFData {
  // Étape 1: Besoin Initial
  clientNeed: string // Texte libre: "Pourquoi avez-vous contacté une entreprise ?"
  needType: 'urgence' | 'renovation' | 'amelioration' | 'construction' | 'maintenance' | 'autre'

  // Étape 2: Demande Précise
  clientRequest: string // Texte libre: "Qu'avez-vous demandé exactement ?"
  requestedWorks: string[] // Auto-détecté depuis le texte
  constraints: {
    maxBudget?: number
    desiredDeadline?: string
    other?: string
  }

  // Étape 3: Contexte Projet
  location: {
    city: string
    postalCode: string
    region?: string
  }
  propertyType: 'maison' | 'appartement' | 'immeuble' | 'local_commercial' | 'autre'
  budgetRange: 'less_5k' | '5k_15k' | '15k_30k' | '30k_50k' | 'more_50k'

  // Métadonnées
  profile: 'B2C' // B2B sera ajouté plus tard
  createdAt: string
}

interface CoherenceWizardProps {
  onComplete: (data: CoherenceCCFData) => void
  onCancel?: () => void
}

const NEED_TYPE_LABELS = {
  urgence: 'Panne / Urgence',
  renovation: 'Rénovation',
  amelioration: 'Amélioration / Optimisation',
  construction: 'Construction neuve',
  maintenance: 'Maintenance / Entretien',
  autre: 'Autre',
}

const PROPERTY_TYPE_LABELS = {
  maison: 'Maison individuelle',
  appartement: 'Appartement',
  immeuble: 'Immeuble',
  local_commercial: 'Local commercial',
  autre: 'Autre',
}

const BUDGET_RANGE_LABELS = {
  less_5k: 'Moins de 5 000 €',
  '5k_15k': '5 000 € - 15 000 €',
  '15k_30k': '15 000 € - 30 000 €',
  '30k_50k': '30 000 € - 50 000 €',
  more_50k: 'Plus de 50 000 €',
}

const NEED_EXAMPLES = [
  'Ma chaudière est en panne depuis 3 jours',
  'Je veux rénover ma salle de bain vétuste',
  "J'ai des infiltrations d'eau dans le mur de la chambre",
  'Je souhaite améliorer mon isolation thermique',
  'Ma toiture fuit et nécessite une réfection',
]

const REQUEST_EXAMPLES = [
  "Remplacement de ma chaudière gaz par une pompe à chaleur",
  "Installation d'une douche à l'italienne avec carrelage mural complet",
  "Réfection complète de la toiture avec isolation renforcée",
  "Remplacement des fenêtres simple vitrage par du double vitrage",
]

export function CoherenceWizard({ onComplete, onCancel }: CoherenceWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [showExamples, setShowExamples] = useState({ need: false, request: false })

  const [formData, setFormData] = useState<CoherenceCCFData>({
    clientNeed: '',
    needType: 'renovation',
    clientRequest: '',
    requestedWorks: [],
    constraints: {},
    location: {
      city: '',
      postalCode: '',
    },
    propertyType: 'maison',
    budgetRange: '5k_15k',
    profile: 'B2C',
    createdAt: new Date().toISOString(),
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const steps = [
    { id: 1, title: 'Votre Besoin', icon: AlertCircle },
    { id: 2, title: 'Votre Demande', icon: FileText },
    { id: 3, title: 'Contexte', icon: MapPin },
    { id: 4, title: 'Validation', icon: CheckCircle2 },
  ]

  // Validation par étape
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.clientNeed || formData.clientNeed.length < 20) {
        newErrors.clientNeed = 'Veuillez décrire votre besoin (minimum 20 caractères)'
      }
    }

    if (step === 2) {
      if (!formData.clientRequest || formData.clientRequest.length < 20) {
        newErrors.clientRequest = 'Veuillez décrire votre demande (minimum 20 caractères)'
      }
    }

    if (step === 3) {
      if (!formData.location.city) {
        newErrors.city = 'Veuillez renseigner la ville'
      }
      if (!formData.location.postalCode || formData.location.postalCode.length !== 5) {
        newErrors.postalCode = 'Veuillez renseigner un code postal valide (5 chiffres)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 4) {
        onComplete(formData)
      } else {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = () => {
    setCurrentStep(Math.max(1, currentStep - 1))
  }

  const updateFormData = (updates: Partial<CoherenceCCFData>) => {
    setFormData({ ...formData, ...updates })
    // Clear errors for updated fields
    const updatedKeys = Object.keys(updates)
    const newErrors = { ...errors }
    updatedKeys.forEach((key) => delete newErrors[key])
    setErrors(newErrors)
  }

  const fillExample = (type: 'need' | 'request', example: string) => {
    if (type === 'need') {
      updateFormData({ clientNeed: example })
      setShowExamples({ ...showExamples, need: false })
    } else {
      updateFormData({ clientRequest: example })
      setShowExamples({ ...showExamples, request: false })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 ${isActive ? 'font-semibold text-blue-600' : 'text-gray-500'}`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && '🎯 Quel est votre besoin initial ?'}
            {currentStep === 2 && "📋 Qu'avez-vous demandé à l'entreprise ?"}
            {currentStep === 3 && '🏠 Contexte de votre projet'}
            {currentStep === 4 && '✅ Validation'}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 &&
              "Expliquez pourquoi vous avez contacté une entreprise. Quel problème voulez-vous résoudre ?"}
            {currentStep === 2 &&
              "Décrivez précisément ce que vous avez demandé à l'entreprise."}
            {currentStep === 3 && 'Quelques informations pour contextualiser votre projet.'}
            {currentStep === 4 && 'Vérifiez vos informations avant de continuer.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ÉTAPE 1: Besoin Initial */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="clientNeed">
                  Pourquoi avez-vous contacté une entreprise ? *
                </Label>
                <Textarea
                  id="clientNeed"
                  placeholder="Ex: Ma chaudière est en panne depuis 3 jours et il fait très froid dans la maison..."
                  value={formData.clientNeed}
                  onChange={(e) => updateFormData({ clientNeed: e.target.value })}
                  className={errors.clientNeed ? 'border-red-500' : ''}
                  rows={4}
                />
                {errors.clientNeed && (
                  <p className="text-sm text-red-500">{errors.clientNeed}</p>
                )}
                <p className="text-xs text-gray-500">
                  {formData.clientNeed.length}/500 caractères
                </p>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExamples({ ...showExamples, need: !showExamples.need })}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showExamples.need ? 'Masquer les exemples' : 'Voir des exemples'}
                </Button>

                {showExamples.need && (
                  <div className="mt-3 space-y-2">
                    {NEED_EXAMPLES.map((example, i) => (
                      <div
                        key={i}
                        className="p-3 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => fillExample('need', example)}
                      >
                        <p className="text-sm text-blue-900">"{example}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="needType">Type de besoin</Label>
                <Select
                  value={formData.needType}
                  onValueChange={(value: any) => updateFormData({ needType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NEED_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* ÉTAPE 2: Demande Précise */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="clientRequest">
                  Qu'avez-vous demandé exactement à l'entreprise ? *
                </Label>
                <Textarea
                  id="clientRequest"
                  placeholder="Ex: J'ai demandé le remplacement de ma chaudière gaz par une pompe à chaleur air-eau..."
                  value={formData.clientRequest}
                  onChange={(e) => updateFormData({ clientRequest: e.target.value })}
                  className={errors.clientRequest ? 'border-red-500' : ''}
                  rows={4}
                />
                {errors.clientRequest && (
                  <p className="text-sm text-red-500">{errors.clientRequest}</p>
                )}
                <p className="text-xs text-gray-500">
                  {formData.clientRequest.length}/500 caractères
                </p>
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setShowExamples({ ...showExamples, request: !showExamples.request })
                  }
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {showExamples.request ? 'Masquer les exemples' : 'Voir des exemples'}
                </Button>

                {showExamples.request && (
                  <div className="mt-3 space-y-2">
                    {REQUEST_EXAMPLES.map((example, i) => (
                      <div
                        key={i}
                        className="p-3 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => fillExample('request', example)}
                      >
                        <p className="text-sm text-blue-900">"{example}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 p-4 bg-gray-50 rounded">
                <Label className="text-sm font-semibold">Contraintes mentionnées (optionnel)</Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxBudget" className="text-sm">
                      Budget maximum (€)
                    </Label>
                    <Input
                      id="maxBudget"
                      type="number"
                      placeholder="15000"
                      value={formData.constraints.maxBudget || ''}
                      onChange={(e) =>
                        updateFormData({
                          constraints: {
                            ...formData.constraints,
                            maxBudget: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-sm">
                      Délai souhaité
                    </Label>
                    <Input
                      id="deadline"
                      type="text"
                      placeholder="Ex: 2 semaines"
                      value={formData.constraints.desiredDeadline || ''}
                      onChange={(e) =>
                        updateFormData({
                          constraints: {
                            ...formData.constraints,
                            desiredDeadline: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otherConstraints" className="text-sm">
                    Autres contraintes
                  </Label>
                  <Textarea
                    id="otherConstraints"
                    placeholder="Ex: Accès difficile, travaux uniquement le week-end..."
                    value={formData.constraints.other || ''}
                    onChange={(e) =>
                      updateFormData({
                        constraints: {
                          ...formData.constraints,
                          other: e.target.value,
                        },
                      })
                    }
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}

          {/* ÉTAPE 3: Contexte Projet */}
          {currentStep === 3 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville *</Label>
                  <Input
                    id="city"
                    placeholder="Paris"
                    value={formData.location.city}
                    onChange={(e) =>
                      updateFormData({
                        location: { ...formData.location, city: e.target.value },
                      })
                    }
                    className={errors.city ? 'border-red-500' : ''}
                  />
                  {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Code postal *</Label>
                  <Input
                    id="postalCode"
                    placeholder="75001"
                    maxLength={5}
                    value={formData.location.postalCode}
                    onChange={(e) =>
                      updateFormData({
                        location: { ...formData.location, postalCode: e.target.value },
                      })
                    }
                    className={errors.postalCode ? 'border-red-500' : ''}
                  />
                  {errors.postalCode && (
                    <p className="text-sm text-red-500">{errors.postalCode}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="propertyType">Type de bien</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value: any) => updateFormData({ propertyType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetRange">Budget envisagé initialement</Label>
                <Select
                  value={formData.budgetRange}
                  onValueChange={(value: any) => updateFormData({ budgetRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUDGET_RANGE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* ÉTAPE 4: Récapitulatif */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">🎯 Votre besoin initial</h4>
                <p className="text-sm text-blue-800">{formData.clientNeed}</p>
                <Badge variant="outline" className="mt-2">
                  {NEED_TYPE_LABELS[formData.needType]}
                </Badge>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">📋 Votre demande précise</h4>
                <p className="text-sm text-green-800">{formData.clientRequest}</p>

                {(formData.constraints.maxBudget ||
                  formData.constraints.desiredDeadline ||
                  formData.constraints.other) && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold text-green-900">Contraintes:</p>
                    {formData.constraints.maxBudget && (
                      <p className="text-xs text-green-700">
                        • Budget max: {formData.constraints.maxBudget} €
                      </p>
                    )}
                    {formData.constraints.desiredDeadline && (
                      <p className="text-xs text-green-700">
                        • Délai: {formData.constraints.desiredDeadline}
                      </p>
                    )}
                    {formData.constraints.other && (
                      <p className="text-xs text-green-700">• {formData.constraints.other}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">🏠 Contexte</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Localisation:</span>
                    <p className="font-medium">
                      {formData.location.city} ({formData.location.postalCode})
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type de bien:</span>
                    <p className="font-medium">{PROPERTY_TYPE_LABELS[formData.propertyType]}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Budget envisagé:</span>
                    <p className="font-medium">{BUDGET_RANGE_LABELS[formData.budgetRange]}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">
                      Prochaine étape: Upload du devis
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Nous allons analyser la cohérence entre votre demande et le devis reçu pour
                      vous donner un avis objectif.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 1 && onCancel ? onCancel : handleBack}
          disabled={currentStep === 1 && !onCancel}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 1 ? 'Annuler' : 'Retour'}
        </Button>

        <Button onClick={handleNext}>
          {currentStep === 4 ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Continuer vers l'upload
            </>
          ) : (
            <>
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
