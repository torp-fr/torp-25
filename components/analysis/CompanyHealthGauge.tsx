/**
 * Composant Jauge de Santé Financière de l'Entreprise
 * Calcule et affiche un score de santé basé sur plusieurs indicateurs
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

interface CompanyHealthData {
  financialData?: {
    ca?: number[]
    result?: number[]
    debt?: number
  }
  legalStatusDetails?: {
    hasCollectiveProcedure: boolean
    procedureType?: string
  }
  certifications?: any[]
  reputation?: {
    averageRating?: number
    numberOfReviews?: number
    nps?: number
  }
}

interface CompanyHealthGaugeProps {
  data: CompanyHealthData
}

export function CompanyHealthGauge({
  data,
}: CompanyHealthGaugeProps) {
  // Calculer le score de santé (0-100)
  const calculateHealthScore = (): number => {
    let score = 0
    let factors = 0

    // 1. CA en croissance (0-25 points)
    if (data.financialData?.ca && data.financialData.ca.length >= 2) {
      const caGrowth =
        ((data.financialData.ca[data.financialData.ca.length - 1] -
          data.financialData.ca[data.financialData.ca.length - 2]) /
          data.financialData.ca[data.financialData.ca.length - 2]) *
        100

      if (caGrowth > 10) score += 25
      else if (caGrowth > 0) score += 15
      else if (caGrowth > -10) score += 5
      factors++
    }

    // 2. Résultat positif (0-25 points)
    if (data.financialData?.result && data.financialData.result.length > 0) {
      const lastResult =
        data.financialData.result[data.financialData.result.length - 1]
      if (lastResult > 0) score += 25
      else if (lastResult > -100000) score += 10
      factors++
    }

    // 3. Pas de procédure collective (0-30 points)
    if (data.legalStatusDetails) {
      if (!data.legalStatusDetails.hasCollectiveProcedure) score += 30
      factors++
    }

    // 4. Certifications (0-10 points)
    if (data.certifications && data.certifications.length > 0) {
      score += Math.min(data.certifications.length * 2, 10)
      factors++
    }

    // 5. Réputation (0-10 points)
    if (data.reputation?.averageRating) {
      score += (data.reputation.averageRating / 5) * 10
      factors++
    }

    // Normaliser sur 100
    return factors > 0 ? Math.round((score / (factors * 20)) * 100) : 50
  }

  const healthScore = calculateHealthScore()

  // Déterminer le niveau de santé
  const getHealthLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellente', color: '#10b981', icon: CheckCircle2 }
    if (score >= 60) return { label: 'Bonne', color: '#3b82f6', icon: CheckCircle2 }
    if (score >= 40) return { label: 'Moyenne', color: '#eab308', icon: AlertTriangle }
    if (score >= 20) return { label: 'Faible', color: '#f97316', icon: AlertTriangle }
    return { label: 'Critique', color: '#ef4444', icon: XCircle }
  }

  const health = getHealthLevel(healthScore)
  const HealthIcon = health.icon

  // Données pour le graphique en forme de jauge
  const gaugeData = [
    { name: 'Score', value: healthScore },
    { name: 'Reste', value: 100 - healthScore },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm" style={{ color: payload[0].payload.fill }}>
            {payload[0].value}%
          </p>
        </div>
      )
    }
    return null
  }

  // Indicateurs détaillés
  const indicators = []

  // CA
  if (data.financialData?.ca && data.financialData.ca.length >= 2) {
    const caGrowth =
      ((data.financialData.ca[data.financialData.ca.length - 1] -
        data.financialData.ca[data.financialData.ca.length - 2]) /
        data.financialData.ca[data.financialData.ca.length - 2]) *
      100
    indicators.push({
      label: 'Croissance CA',
      value: `${caGrowth > 0 ? '+' : ''}${caGrowth.toFixed(1)}%`,
      status: caGrowth > 0 ? 'positive' : 'negative',
      icon: caGrowth > 0 ? TrendingUp : TrendingDown,
    })
  }

  // Résultat
  if (data.financialData?.result && data.financialData.result.length > 0) {
    const lastResult =
      data.financialData.result[data.financialData.result.length - 1]
    indicators.push({
      label: 'Résultat',
      value: lastResult > 0 ? 'Positif' : 'Négatif',
      status: lastResult > 0 ? 'positive' : 'negative',
      icon: lastResult > 0 ? CheckCircle2 : XCircle,
    })
  }

  // Procédure collective
  if (data.legalStatusDetails) {
    indicators.push({
      label: 'Situation juridique',
      value: data.legalStatusDetails.hasCollectiveProcedure
        ? 'Procédure en cours'
        : 'Saine',
      status: data.legalStatusDetails.hasCollectiveProcedure
        ? 'critical'
        : 'positive',
      icon: data.legalStatusDetails.hasCollectiveProcedure
        ? AlertTriangle
        : CheckCircle2,
    })
  }

  // Certifications
  if (data.certifications) {
    indicators.push({
      label: 'Certifications',
      value: `${data.certifications.length} certification(s)`,
      status: data.certifications.length > 0 ? 'positive' : 'neutral',
      icon: data.certifications.length > 0 ? CheckCircle2 : AlertTriangle,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Santé Financière Entreprise</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Jauge principale */}
          <div className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                >
                  <Cell fill={health.color} />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <HealthIcon className="h-6 w-6" style={{ color: health.color }} />
                <span
                  className="text-4xl font-bold"
                  style={{ color: health.color }}
                >
                  {healthScore}
                </span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <Badge
                variant="outline"
                className="mt-2"
                style={{
                  borderColor: health.color,
                  color: health.color,
                }}
              >
                {health.label}
              </Badge>
            </div>
          </div>

          {/* Indicateurs détaillés */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground">
              Indicateurs Clés
            </p>
            {indicators.map((indicator, index) => {
              const Icon = indicator.icon
              const statusColor =
                indicator.status === 'positive'
                  ? 'text-green-600'
                  : indicator.status === 'negative'
                    ? 'text-orange-600'
                    : indicator.status === 'critical'
                      ? 'text-red-600'
                      : 'text-gray-600'

              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${statusColor}`} />
                    <span className="text-sm font-medium">
                      {indicator.label}
                    </span>
                  </div>
                  <span className={`text-sm font-semibold ${statusColor}`}>
                    {indicator.value}
                  </span>
                </div>
              )
            })}

            {indicators.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Données insuffisantes pour évaluer la santé financière
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
