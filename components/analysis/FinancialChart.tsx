/**
 * Composant de visualisation des données financières
 * Affiche l'évolution du CA et des résultats sur 3 ans
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface FinancialData {
  ca?: number[] // Chiffre d'affaires sur 3 ans
  result?: number[] // Résultats sur 3 ans
  debt?: number // Dette actuelle
  lastUpdate?: string
}

interface FinancialChartProps {
  data: FinancialData
}

export function FinancialChart({ data }: FinancialChartProps) {
  if (!data.ca || data.ca.length === 0) {
    return null
  }

  const currentYear = new Date().getFullYear()

  // Préparer les données pour les graphiques
  const chartData = data.ca.map((ca, index) => ({
    year: (currentYear - data.ca!.length + index + 1).toString(),
    ca: ca / 1000000, // Convertir en millions
    result: data.result?.[index] ? data.result[index] / 1000000 : 0,
  }))

  // Calculer les tendances
  const caTrend =
    data.ca.length >= 2
      ? ((data.ca[data.ca.length - 1] - data.ca[data.ca.length - 2]) /
          data.ca[data.ca.length - 2]) *
        100
      : 0

  const resultTrend =
    data.result && data.result.length >= 2
      ? ((data.result[data.result.length - 1] -
          data.result[data.result.length - 2]) /
          Math.abs(data.result[data.result.length - 2])) *
        100
      : 0

  const formatCurrency = (value: number) => {
    return `${value.toFixed(1)}M€`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-2 font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Résumé des tendances */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Évolution CA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(chartData[chartData.length - 1].ca)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentYear}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 rounded-lg px-2 py-1 ${
                  caTrend >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {caTrend >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">
                  {Math.abs(caTrend).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Évolution Résultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(chartData[chartData.length - 1].result)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentYear}
                </p>
              </div>
              {data.result && data.result.length >= 2 && (
                <div
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 ${
                    resultTrend >= 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {resultTrend >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {Math.abs(resultTrend).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique CA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Chiffre d&apos;Affaires (en millions €)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="year"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="ca"
                name="Chiffre d'Affaires"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphique Résultats */}
      {data.result && data.result.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Résultat Net (en millions €)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="year"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="result"
                  name="Résultat Net"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Dette */}
      {data.debt && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Endettement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(data.debt / 1000000).toFixed(1)}M€
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dette totale au{' '}
              {data.lastUpdate
                ? new Date(data.lastUpdate).toLocaleDateString('fr-FR')
                : currentYear}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
