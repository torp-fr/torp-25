/**
 * Carte d'Audit Entreprise
 * Affiche les vérifications administratives, financières et les certifications
 * + Date de création, avis clients, mots-clés activité, score complétude
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Info,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  ThumbsUp,
  Tag,
  Database,
  Clock,
  Award,
} from 'lucide-react'

interface CompanyEnrichment {
  siret: string
  siren?: string
  name: string
  legalStatus?: string
  address?: {
    street: string
    city: string
    postalCode: string
    region: string
  }
  activities?: Array<{
    code: string
    label: string
  }>
  insurances?: {
    hasDecennale?: boolean
    hasRC?: boolean
    decennaleAmount?: number
    rcAmount?: number
    expirationDate?: string
  }
  financialHealth?: {
    status?: string
    score?: number
    lastUpdate?: string
  }
  certifications?: Array<{
    name: string
    type: string
    validUntil?: string
    valid?: boolean
  }>
  financialData?: {
    ca: number[] // Chiffre d'affaires par année
    result: number[] // Résultat net par année
    ebitda?: number
    debt?: number
    lastUpdate: string
  }
  legalStatusDetails?: {
    hasCollectiveProcedure?: boolean
    procedureType?: string
    procedureDate?: string
  }
  // Nouvelles propriétés d'enrichissement intelligent
  creationDate?: string
  companyAge?: number
  isRecent?: boolean
  dataSources?: string[]
  dataCompleteness?: number
  confidenceScore?: number
  activityKeywords?: string[]
  lastEnrichmentDate?: string
  verificationStatus?: {
    siretVerified: boolean
    addressVerified: boolean
    activityVerified: boolean
  }
  reviews?: {
    overallRating: number
    totalReviews: number
    bySource: {
      google: { count: number; averageRating: number; url?: string }
      trustpilot: { count: number; averageRating: number; url?: string }
      eldo: { count: number; averageRating: number; url?: string }
    }
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number }
    insights: {
      recommendationRate: number
      responseRate: number
      recentTrend: 'improving' | 'stable' | 'declining'
    }
    recentReviews?: Array<{
      source: string
      rating: number
      date: string
      author: string
      text: string
    }>
    keywords: {
      positive: string[]
      negative: string[]
    }
  }
}

interface CompanyAuditCardProps {
  companyData: CompanyEnrichment | null | undefined
  projectType?: string
}

export function CompanyAuditCard({ companyData, projectType }: CompanyAuditCardProps) {
  // Fallback si aucune donnée entreprise
  if (!companyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Audit Entreprise
          </CardTitle>
          <CardDescription>
            Vérifications administratives et financières
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Données entreprise non disponibles
                </p>
                <p className="text-sm text-blue-700">
                  L'enrichissement des données entreprise nécessite un SIRET valide dans le devis.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Vérifier si les données sont partielles (juste SIRET sans enrichissement)
  const isPartialData = !companyData.address && !companyData.activities && !companyData.financialData

  // Calculer les alertes
  const alerts: Array<{ type: 'error' | 'warning' | 'info'; message: string }> = []

  // Ajouter alerte si données partielles
  if (isPartialData) {
    alerts.push({
      type: 'info',
      message: 'Données enrichies non disponibles. Seules les informations de base (SIRET) sont affichées.',
    })
  }

  // Vérifier assurances
  if (!companyData.insurances?.hasDecennale) {
    alerts.push({
      type: 'error',
      message: 'Assurance Décennale non vérifiée - Obligatoire pour travaux de construction',
    })
  }
  if (!companyData.insurances?.hasRC) {
    alerts.push({
      type: 'warning',
      message: 'Assurance RC (Responsabilité Civile) non vérifiée',
    })
  }

  // Vérifier expiration assurances
  if (companyData.insurances?.expirationDate) {
    const expirationDate = new Date(companyData.insurances.expirationDate)
    const today = new Date()
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilExpiration < 0) {
      alerts.push({
        type: 'error',
        message: `Assurance expirée depuis ${Math.abs(daysUntilExpiration)} jours`,
      })
    } else if (daysUntilExpiration < 30) {
      alerts.push({
        type: 'warning',
        message: `Assurance expire dans ${daysUntilExpiration} jours`,
      })
    }
  }

  // Vérifier procédures collectives
  if (companyData.legalStatusDetails?.hasCollectiveProcedure) {
    alerts.push({
      type: 'error',
      message: `Procédure collective en cours : ${companyData.legalStatusDetails.procedureType || 'type inconnu'}`,
    })
  }

  // Vérifier santé financière
  if (companyData.financialHealth?.status === 'at_risk' || companyData.financialHealth?.score && companyData.financialHealth.score < 50) {
    alerts.push({
      type: 'warning',
      message: 'Santé financière fragile détectée',
    })
  }

  // Vérifier certifications expirées
  if (companyData.certifications) {
    const today = new Date()
    companyData.certifications.forEach((cert) => {
      if (cert.validUntil) {
        const validUntil = new Date(cert.validUntil)
        if (validUntil < today) {
          alerts.push({
            type: 'warning',
            message: `Certification ${cert.name} expirée`,
          })
        }
      }
    })
  }

  // Calculer tendance CA
  let caTrend: 'up' | 'down' | 'stable' | null = null
  if (companyData.financialData?.ca && companyData.financialData.ca.length >= 2) {
    const [latest, previous] = companyData.financialData.ca
    if (latest > previous * 1.05) caTrend = 'up'
    else if (latest < previous * 0.95) caTrend = 'down'
    else caTrend = 'stable'
  }

  // Formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Audit Entreprise
        </CardTitle>
        <CardDescription>
          Vérifications administratives, financières et certifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Message d'information si données partielles */}
        {isPartialData && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-orange-600" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-900">
                  Données d'enrichissement limitées
                </p>
                <p className="text-sm text-orange-800">
                  L'enrichissement automatique des données entreprise n'a pas pu récupérer toutes les informations.
                  Cela peut être dû à :
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-orange-800">
                  <li>SIRET invalide ou mal formaté (doit contenir 14 chiffres)</li>
                  <li>Entreprise non trouvée dans les bases de données publiques</li>
                  <li>APIs externes temporairement indisponibles (Sirene, Infogreffe)</li>
                  <li>Délai d'attente dépassé lors de la récupération des données</li>
                </ul>
                <p className="text-sm text-orange-800">
                  Seules les informations de base extraites du devis sont affichées ci-dessous.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Informations Administratives */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck className="h-4 w-4" />
            Informations Administratives
          </h3>
          <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-medium">{companyData.name}</p>
                {companyData.legalStatus && (
                  <p className="text-sm text-slate-600">{companyData.legalStatus}</p>
                )}
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">SIRET:</span>
                <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">
                  {companyData.siret}
                </code>
                <Badge variant="outline" className="border-green-600 text-green-700">
                  Vérifié
                </Badge>
              </div>
              {companyData.siren && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">SIREN:</span>
                  <code className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">
                    {companyData.siren}
                  </code>
                </div>
              )}
            </div>

            {companyData.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p>{companyData.address.street}</p>
                  <p>
                    {companyData.address.postalCode} {companyData.address.city}
                  </p>
                  {companyData.address.region && <p>{companyData.address.region}</p>}
                </div>
              </div>
            )}

            {companyData.activities && companyData.activities.length > 0 && (
              <div className="space-y-1 pt-2">
                <p className="text-xs font-medium text-slate-700">Activités:</p>
                <div className="flex flex-wrap gap-1">
                  {companyData.activities.map((activity, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {activity.label || activity.code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Date de création et âge */}
            {companyData.creationDate && (
              <div className="flex items-center gap-2 border-t pt-3 text-sm">
                <Calendar className="h-4 w-4 text-slate-600" />
                <div className="flex flex-1 items-center justify-between">
                  <span className="text-slate-700">
                    Créée: <span className="font-medium">{companyData.creationDate}</span>
                    {companyData.companyAge !== undefined && (
                      <span className="text-slate-600">
                        {' '}
                        ({companyData.companyAge} an{companyData.companyAge > 1 ? 's' : ''})
                      </span>
                    )}
                  </span>
                  {companyData.isRecent ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                      🆕 Récente
                    </Badge>
                  ) : companyData.companyAge && companyData.companyAge >= 10 ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">
                      ⭐ Établie
                    </Badge>
                  ) : null}
                </div>
              </div>
            )}

            {/* Message informatif pour entreprise récente */}
            {companyData.isRecent && (
              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 shrink-0 text-blue-600" />
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">Entreprise récente :</span> Les données
                    financières et certifications seront disponibles après dépôt du premier bilan
                    (12-18 mois).
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mots-clés d'activité */}
        {companyData.activityKeywords && companyData.activityKeywords.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Tag className="h-4 w-4" />
              Domaines d'activité
            </h3>
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                {companyData.activityKeywords.map((keyword, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="border-indigo-300 bg-indigo-50 text-indigo-700"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Avis Clients */}
        {companyData.reviews && companyData.reviews.totalReviews > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Star className="h-4 w-4" />
              Avis Clients
            </h3>
            <div className="space-y-4 rounded-lg border bg-slate-50 p-4">
              {/* Note globale */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < Math.round(companyData.reviews!.overallRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {companyData.reviews.overallRating.toFixed(1)}/5
                    </p>
                    <p className="text-xs text-slate-600">
                      {companyData.reviews.totalReviews} avis
                    </p>
                  </div>
                </div>

                {/* Tendance */}
                {companyData.reviews.insights.recentTrend === 'improving' && (
                  <Badge className="bg-green-100 text-green-800">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    En progression
                  </Badge>
                )}
                {companyData.reviews.insights.recentTrend === 'declining' && (
                  <Badge className="bg-orange-100 text-orange-800">
                    <TrendingDown className="mr-1 h-3 w-3" />
                    En baisse
                  </Badge>
                )}
              </div>

              {/* Répartition par source */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Sources :</p>
                <div className="grid grid-cols-3 gap-2">
                  {companyData.reviews.bySource.google.count > 0 && (
                    <div className="rounded border bg-white p-2 text-center">
                      <p className="text-xs font-medium text-slate-600">Google</p>
                      <p className="text-sm font-bold">
                        {companyData.reviews.bySource.google.averageRating.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {companyData.reviews.bySource.google.count} avis
                      </p>
                    </div>
                  )}
                  {companyData.reviews.bySource.trustpilot.count > 0 && (
                    <div className="rounded border bg-white p-2 text-center">
                      <p className="text-xs font-medium text-slate-600">Trustpilot</p>
                      <p className="text-sm font-bold">
                        {companyData.reviews.bySource.trustpilot.averageRating.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {companyData.reviews.bySource.trustpilot.count} avis
                      </p>
                    </div>
                  )}
                  {companyData.reviews.bySource.eldo.count > 0 && (
                    <div className="rounded border bg-white p-2 text-center">
                      <p className="text-xs font-medium text-slate-600">Eldo</p>
                      <p className="text-sm font-bold">
                        {companyData.reviews.bySource.eldo.averageRating.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {companyData.reviews.bySource.eldo.count} avis
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-slate-600">Recommandation</span>
                  </div>
                  <p className="text-lg font-bold text-green-700">
                    {Math.round(companyData.reviews.insights.recommendationRate)}%
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-slate-600">Réponse pro</span>
                  </div>
                  <p className="text-lg font-bold text-blue-700">
                    {Math.round(companyData.reviews.insights.responseRate)}%
                  </p>
                </div>
              </div>

              {/* Mots-clés positifs/négatifs */}
              {(companyData.reviews.keywords.positive.length > 0 ||
                companyData.reviews.keywords.negative.length > 0) && (
                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium text-slate-700">Retours clients :</p>
                  {companyData.reviews.keywords.positive.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-slate-600">+</span>
                      {companyData.reviews.keywords.positive.map((kw, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="border-green-300 bg-green-50 text-green-700"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {companyData.reviews.keywords.negative.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-slate-600">-</span>
                      {companyData.reviews.keywords.negative.map((kw, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="border-orange-300 bg-orange-50 text-orange-700"
                        >
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Score de complétude des données */}
        {companyData.dataCompleteness !== undefined && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4" />
              Complétude des données
            </h3>
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Données disponibles</span>
                  <span className="text-lg font-bold text-indigo-700">
                    {Math.round(companyData.dataCompleteness)}%
                  </span>
                </div>
                <Progress value={companyData.dataCompleteness} className="h-2" />

                {/* Sources utilisées */}
                {companyData.dataSources && companyData.dataSources.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <p className="text-xs font-medium text-slate-700">Sources utilisées :</p>
                    <div className="flex flex-wrap gap-1">
                      {companyData.dataSources.map((source, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dernière mise à jour */}
                {companyData.lastEnrichmentDate && (
                  <div className="flex items-center gap-2 border-t pt-2 text-xs text-slate-600">
                    <Clock className="h-3 w-3" />
                    <span>
                      Dernière mise à jour :{' '}
                      {new Date(companyData.lastEnrichmentDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Assurances */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="h-4 w-4" />
            Assurances Professionnelles
          </h3>
          <div className="space-y-2">
            {/* Décennale */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                {companyData.insurances?.hasDecennale ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium">Assurance Décennale</p>
                  {companyData.insurances?.decennaleAmount && (
                    <p className="text-xs text-slate-600">
                      Montant: {formatCurrency(companyData.insurances.decennaleAmount)}
                    </p>
                  )}
                </div>
              </div>
              {companyData.insurances?.hasDecennale ? (
                <Badge variant="outline" className="border-green-600 text-green-700">
                  Vérifiée
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-600 text-red-700">
                  Non vérifiée
                </Badge>
              )}
            </div>

            {/* RC */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                {companyData.insurances?.hasRC ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-orange-600" />
                )}
                <div>
                  <p className="text-sm font-medium">Responsabilité Civile</p>
                  {companyData.insurances?.rcAmount && (
                    <p className="text-xs text-slate-600">
                      Montant: {formatCurrency(companyData.insurances.rcAmount)}
                    </p>
                  )}
                </div>
              </div>
              {companyData.insurances?.hasRC ? (
                <Badge variant="outline" className="border-green-600 text-green-700">
                  Vérifiée
                </Badge>
              ) : (
                <Badge variant="outline" className="border-orange-600 text-orange-700">
                  Non vérifiée
                </Badge>
              )}
            </div>

            {companyData.insurances?.expirationDate && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Validité:{' '}
                  {new Date(companyData.insurances.expirationDate).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Certifications */}
        {companyData.certifications && companyData.certifications.length > 0 && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FileCheck className="h-4 w-4" />
              Certifications Professionnelles
            </h3>
            <div className="space-y-2">
              {companyData.certifications.map((cert, idx) => {
                const isExpired = cert.validUntil ? new Date(cert.validUntil) < new Date() : false
                const isRGE = cert.type === 'RGE' || cert.name.toUpperCase().includes('RGE')

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {isExpired ? (
                        <XCircle className="h-5 w-5 text-orange-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {cert.name}
                          {isRGE && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              RGE
                            </Badge>
                          )}
                        </p>
                        {cert.validUntil && (
                          <p className="text-xs text-slate-600">
                            Valide jusqu'au:{' '}
                            {new Date(cert.validUntil).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    {isExpired ? (
                      <Badge variant="outline" className="border-orange-600 text-orange-700">
                        Expirée
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-600 text-green-700">
                        Valide
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Santé Financière */}
        {(companyData.financialData || companyData.financialHealth) && (
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4" />
              Santé Financière
            </h3>
            <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
              {companyData.financialData?.ca && companyData.financialData.ca.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Chiffre d'affaires</p>
                    {caTrend && (
                      <div className="flex items-center gap-1">
                        {caTrend === 'up' && (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-xs text-green-600">En hausse</span>
                          </>
                        )}
                        {caTrend === 'down' && (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-xs text-red-600">En baisse</span>
                          </>
                        )}
                        {caTrend === 'stable' && (
                          <span className="text-xs text-slate-600">Stable</span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {formatCurrency(companyData.financialData.ca[0])}
                  </p>
                  {companyData.financialData.ca.length >= 2 && (
                    <p className="text-xs text-slate-600">
                      Année précédente: {formatCurrency(companyData.financialData.ca[1])}
                    </p>
                  )}
                </div>
              )}

              {companyData.financialData?.result &&
                companyData.financialData.result.length > 0 && (
                  <div>
                    <p className="text-sm font-medium">Résultat net</p>
                    <p
                      className={`mt-1 text-lg font-semibold ${
                        companyData.financialData.result[0] >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(companyData.financialData.result[0])}
                    </p>
                  </div>
                )}

              {companyData.financialData?.debt && (
                <div>
                  <p className="text-sm font-medium">Endettement</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {formatCurrency(companyData.financialData.debt)}
                  </p>
                </div>
              )}

              {companyData.financialHealth?.score && (
                <div>
                  <p className="text-sm font-medium">Score de solvabilité</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full ${
                          companyData.financialHealth.score >= 70
                            ? 'bg-green-600'
                            : companyData.financialHealth.score >= 50
                              ? 'bg-orange-600'
                              : 'bg-red-600'
                        }`}
                        style={{ width: `${companyData.financialHealth.score}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {companyData.financialHealth.score}/100
                    </span>
                  </div>
                </div>
              )}

              {(companyData.financialData?.lastUpdate ||
                companyData.financialHealth?.lastUpdate) && (
                <p className="text-xs text-slate-500">
                  Dernière mise à jour:{' '}
                  {new Date(
                    companyData.financialData?.lastUpdate ||
                      companyData.financialHealth?.lastUpdate ||
                      ''
                  ).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Alertes */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Alertes & Points d'attention
            </h3>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    alert.type === 'error'
                      ? 'border-red-200 bg-red-50'
                      : alert.type === 'warning'
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      alert.type === 'error'
                        ? 'text-red-600'
                        : alert.type === 'warning'
                          ? 'text-orange-600'
                          : 'text-blue-600'
                    }`}
                  />
                  <p
                    className={`text-sm ${
                      alert.type === 'error'
                        ? 'text-red-800'
                        : alert.type === 'warning'
                          ? 'text-orange-800'
                          : 'text-blue-800'
                    }`}
                  >
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommandations */}
        {alerts.length > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900">Recommandations</p>
                <ul className="space-y-1 text-sm text-blue-800">
                  {alerts.some((a) => a.type === 'error') && (
                    <li>
                      • Demandez une attestation d'assurance à jour avant de signer le contrat
                    </li>
                  )}
                  {companyData.legalStatusDetails?.hasCollectiveProcedure && (
                    <li>
                      • Vérifiez la solvabilité de l'entreprise avant tout engagement financier
                    </li>
                  )}
                  {!companyData.certifications?.some(
                    (c) => c.type === 'RGE' || c.name.toUpperCase().includes('RGE')
                  ) &&
                    projectType &&
                    (projectType.includes('isolation') ||
                      projectType.includes('chauffage') ||
                      projectType.includes('energie')) && (
                      <li>
                        • Pour bénéficier des aides (MaPrimeRénov'), vérifiez la certification RGE
                      </li>
                    )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
