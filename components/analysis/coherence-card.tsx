'use client'

/**
 * Carte d'Analyse de Cohérence Demande/Devis
 * Affiche les résultats de l'Axe 9 du scoring
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

interface CoherenceData {
  clientNeed: string
  clientRequest: string
  needType: string
  constraints?: {
    maxBudget?: number
    desiredDeadline?: string
    other?: string
  }
  location?: {
    city: string
    postalCode: string
  }
  propertyType?: string
  budgetRange?: string
}

interface CoherenceAnalysis {
  score: number
  maxPoints: number
  percentage: number
  matchingElements: string[]
  missingElements: string[]
  extraElements: Array<{
    description: string
    justified: boolean
  }>
  alerts: Array<{
    type: string
    message: string
  }>
}

interface CoherenceCardProps {
  coherenceData?: CoherenceData
  coherenceAnalysis?: CoherenceAnalysis
  devisAmount?: number
}

const NEED_TYPE_LABELS: Record<string, string> = {
  urgence: 'Panne / Urgence',
  renovation: 'Rénovation',
  amelioration: 'Amélioration',
  construction: 'Construction',
  maintenance: 'Maintenance',
  autre: 'Autre',
}

export function CoherenceCard({
  coherenceData,
  coherenceAnalysis,
  devisAmount,
}: CoherenceCardProps) {
  // Si pas de données de cohérence
  if (!coherenceData) {
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Cohérence Demande / Devis
            <Badge variant="outline" className="ml-auto">
              Non disponible
            </Badge>
          </CardTitle>
          <CardDescription>
            Analyse de la cohérence entre votre demande et le devis reçu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-md border border-blue-200 bg-blue-50 p-4">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Analyse de cohérence non disponible
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Pour bénéficier de cette analyse, utilisez le wizard de cohérence lors de votre
                prochain upload de devis. Vous gagnerez jusqu'à 150 points supplémentaires sur le
                score TORP.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculer le score et le grade
  const score = coherenceAnalysis?.score ?? 0
  const maxPoints = coherenceAnalysis?.maxPoints ?? 150
  const percentage = coherenceAnalysis?.percentage ?? 0

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600'
    if (pct >= 60) return 'text-blue-600'
    if (pct >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-50 border-green-200'
    if (pct >= 60) return 'bg-blue-50 border-blue-200'
    if (pct >= 40) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  const matchingElements = coherenceAnalysis?.matchingElements ?? []
  const missingElements = coherenceAnalysis?.missingElements ?? []
  const extraElements = coherenceAnalysis?.extraElements ?? []
  const alerts = coherenceAnalysis?.alerts ?? []

  // Vérifier contrainte budget
  const budgetExceeded =
    coherenceData.constraints?.maxBudget &&
    devisAmount &&
    devisAmount > coherenceData.constraints.maxBudget

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              🎯 Cohérence Demande / Devis
            </CardTitle>
            <CardDescription>
              Analyse de la correspondance entre votre demande et le devis proposé
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getScoreColor(percentage)}`}>
              {score}/{maxPoints}
            </div>
            <div className="text-sm text-muted-foreground">{percentage.toFixed(0)}%</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Votre demande initiale */}
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="text-lg">💭</div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 text-sm">Votre besoin initial</h4>
                <p className="text-sm text-blue-800 mt-1">{coherenceData.clientNeed}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {NEED_TYPE_LABELS[coherenceData.needType] || coherenceData.needType}
                </Badge>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <div className="text-lg">📋</div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 text-sm">Ce que vous avez demandé</h4>
                <p className="text-sm text-green-800 mt-1">{coherenceData.clientRequest}</p>

                {/* Contraintes */}
                {coherenceData.constraints &&
                  (coherenceData.constraints.maxBudget ||
                    coherenceData.constraints.desiredDeadline ||
                    coherenceData.constraints.other) && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-green-900">Contraintes:</p>
                      {coherenceData.constraints.maxBudget && (
                        <div className="flex items-center gap-2 text-xs text-green-700">
                          <span>• Budget max: {coherenceData.constraints.maxBudget} €</span>
                          {budgetExceeded && (
                            <Badge variant="destructive" className="text-xs">
                              Dépassé
                            </Badge>
                          )}
                        </div>
                      )}
                      {coherenceData.constraints.desiredDeadline && (
                        <p className="text-xs text-green-700">
                          • Délai: {coherenceData.constraints.desiredDeadline}
                        </p>
                      )}
                      {coherenceData.constraints.other && (
                        <p className="text-xs text-green-700">
                          • {coherenceData.constraints.other}
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Analyse de cohérence */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Résultat de l'analyse</h4>

          {/* Score global */}
          <div className={`rounded-lg border p-4 ${getScoreBgColor(percentage)}`}>
            <div className="flex items-center gap-2">
              {percentage >= 80 && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {percentage >= 60 && percentage < 80 && (
                <Info className="h-5 w-5 text-blue-600" />
              )}
              {percentage >= 40 && percentage < 60 && (
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              )}
              {percentage < 40 && <XCircle className="h-5 w-5 text-red-600" />}
              <div>
                <p className="text-sm font-semibold">
                  {percentage >= 80 && 'Excellente cohérence'}
                  {percentage >= 60 && percentage < 80 && 'Bonne cohérence'}
                  {percentage >= 40 && percentage < 60 && 'Cohérence partielle'}
                  {percentage < 40 && 'Incohérences détectées'}
                </p>
                <p className="text-xs mt-1">
                  {percentage >= 80 &&
                    'Le devis correspond très bien à votre demande initiale.'}
                  {percentage >= 60 &&
                    percentage < 80 &&
                    'Le devis répond globalement à votre demande avec quelques différences.'}
                  {percentage >= 40 &&
                    percentage < 60 &&
                    'Le devis diffère partiellement de votre demande.'}
                  {percentage < 40 &&
                    'Le devis présente des incohérences importantes avec votre demande.'}
                </p>
              </div>
            </div>
          </div>

          {/* Éléments conformes */}
          {matchingElements.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Éléments conformes à votre demande ({matchingElements.length})
              </h5>
              <ul className="space-y-1">
                {matchingElements.map((element, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded px-3 py-2"
                  >
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{element}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Éléments manquants */}
          {missingElements.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Éléments manquants (que vous aviez demandés) ({missingElements.length})
              </h5>
              <ul className="space-y-1">
                {missingElements.map((element, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 rounded px-3 py-2"
                  >
                    <span className="text-orange-600 mt-0.5">⚠</span>
                    <span>{element}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-orange-600 mt-2">
                💡 Conseil: Contactez l'entreprise pour clarifier ces points ou demander un devis
                complémentaire.
              </p>
            </div>
          )}

          {/* Éléments supplémentaires */}
          {extraElements.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Éléments supplémentaires (non demandés) ({extraElements.length})
              </h5>
              <ul className="space-y-1">
                {extraElements.map((element, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded px-3 py-2"
                  >
                    <span className="text-blue-600 mt-0.5">ℹ</span>
                    <div className="flex-1">
                      <span>{element.description}</span>
                      {element.justified && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Justifié
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                💡 Conseil: Vérifiez si ces éléments sont nécessaires ou si vous pouvez négocier
                leur retrait pour réduire le coût.
              </p>
            </div>
          )}

          {/* Alertes */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Alertes de cohérence ({alerts.length})
              </h5>
              <ul className="space-y-2">
                {alerts.map((alert, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded px-3 py-2"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">{alert.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aucun problème détecté */}
          {matchingElements.length > 0 &&
            missingElements.length === 0 &&
            extraElements.length === 0 &&
            alerts.length === 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      Aucun problème de cohérence détecté
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Le devis correspond parfaitement à votre demande initiale.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Contexte projet */}
        {coherenceData.location && (
          <div className="pt-4 border-t">
            <h5 className="text-xs font-semibold text-gray-600 mb-2">Contexte du projet</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Localisation:</span>
                <p className="font-medium">
                  {coherenceData.location.city} ({coherenceData.location.postalCode})
                </p>
              </div>
              {coherenceData.propertyType && (
                <div>
                  <span className="text-gray-500">Type de bien:</span>
                  <p className="font-medium capitalize">{coherenceData.propertyType}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
