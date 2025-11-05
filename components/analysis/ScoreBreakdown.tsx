/**
 * Composant de visualisation du breakdown du score TORP
 * Affiche un graphique radar des 4 catégories
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Badge } from '@/components/ui/badge'

interface ScoreBreakdownData {
  prix: number // 0-100
  qualite: number // 0-100
  delais: number // 0-100
  conformite: number // 0-100
}

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownData
  totalScore: number // 0-1000
  grade: string // A, B, C, D, E
}

export function ScoreBreakdown({
  breakdown,
  totalScore,
  grade,
}: ScoreBreakdownProps) {
  // Préparer les données pour le radar
  const radarData = [
    {
      category: 'Prix',
      value: breakdown.prix,
      fullMark: 100,
    },
    {
      category: 'Qualité',
      value: breakdown.qualite,
      fullMark: 100,
    },
    {
      category: 'Délais',
      value: breakdown.delais,
      fullMark: 100,
    },
    {
      category: 'Conformité',
      value: breakdown.conformite,
      fullMark: 100,
    },
  ]

  // Déterminer la couleur selon le grade
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'B':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'C':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'D':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'E':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 850) return '#10b981' // Green
    if (score >= 700) return '#3b82f6' // Blue
    if (score >= 550) return '#eab308' // Yellow
    if (score >= 400) return '#f97316' // Orange
    return '#ef4444' // Red
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-semibold">{payload[0].payload.category}</p>
          <p className="text-sm text-blue-600">
            Score: {payload[0].value.toFixed(0)}/100
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Breakdown du Score TORP</CardTitle>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`border-2 px-4 py-1 text-2xl font-bold ${getGradeColor(grade)}`}
            >
              {grade}
            </Badge>
            <div className="text-right">
              <p
                className="text-3xl font-bold"
                style={{ color: getScoreColor(totalScore) }}
              >
                {totalScore}
              </p>
              <p className="text-xs text-muted-foreground">/1000</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Graphique Radar */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Détails des scores */}
          <div className="space-y-4">
            <div className="space-y-3">
              {radarData.map((item) => {
                const percentage = (item.value / 100) * 100
                const color =
                  item.value >= 80
                    ? 'bg-green-500'
                    : item.value >= 60
                      ? 'bg-blue-500'
                      : item.value >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'

                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground">
                        {item.value.toFixed(0)}/100
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full transition-all duration-500 ${color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Interprétation */}
            <div className="mt-6 rounded-lg border bg-blue-50 p-4">
              <p className="mb-2 text-sm font-semibold text-blue-900">
                💡 Interprétation
              </p>
              <ul className="space-y-1 text-xs text-blue-800">
                {breakdown.prix >= 80 && (
                  <li>✓ Prix très compétitif</li>
                )}
                {breakdown.qualite >= 80 && (
                  <li>✓ Qualité entreprise excellente</li>
                )}
                {breakdown.delais >= 80 && (
                  <li>✓ Délais réalistes et fiables</li>
                )}
                {breakdown.conformite >= 80 && (
                  <li>✓ Conformité réglementaire optimale</li>
                )}

                {breakdown.prix < 60 && (
                  <li>⚠️ Prix à vérifier (trop élevé ou trop bas)</li>
                )}
                {breakdown.qualite < 60 && (
                  <li>⚠️ Qualité entreprise à approfondir</li>
                )}
                {breakdown.delais < 60 && (
                  <li>⚠️ Délais potentiellement irréalistes</li>
                )}
                {breakdown.conformite < 60 && (
                  <li>⚠️ Points de conformité à clarifier</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
