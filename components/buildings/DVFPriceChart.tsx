/**
 * Composant de visualisation des prix immobiliers DVF
 * Affiche l'évolution des prix et comparaison avec la zone
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
import { TrendingUp, Home, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DVFData {
  estimation?: {
    valeur_estimee?: number
    prix_m2_estime?: number
    confiance?: number
  }
  statistics?: {
    prix_m2_moyen?: number
    prix_m2_median?: number
    nombre_transactions?: number
  }
  comparables?: Array<{
    date_mutation?: string
    prix?: number
    surface?: number
    distance?: number
    type_local?: string
  }>
}

interface DVFPriceChartProps {
  data: DVFData
  address?: string
  surface?: number
}

export function DVFPriceChart({ data, address, surface }: DVFPriceChartProps) {
  if (!data.estimation && !data.statistics && !data.comparables) {
    return null
  }

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`
    }
    return `${(value / 1000).toFixed(0)}k€`
  }

  const formatPricePerM2 = (value: number) => {
    return `${value.toLocaleString('fr-FR')}€/m²`
  }

  // Préparer données de comparaison
  const comparisonData = []

  if (data.estimation?.prix_m2_estime) {
    comparisonData.push({
      name: 'Ce bien',
      prix_m2: data.estimation.prix_m2_estime,
      type: 'estimation',
    })
  }

  if (data.statistics?.prix_m2_moyen) {
    comparisonData.push({
      name: 'Moyenne zone',
      prix_m2: data.statistics.prix_m2_moyen,
      type: 'zone',
    })
  }

  if (data.statistics?.prix_m2_median) {
    comparisonData.push({
      name: 'Médiane zone',
      prix_m2: data.statistics.prix_m2_median,
      type: 'zone',
    })
  }

  // Préparer données transactions comparables
  const comparablesData =
    data.comparables?.slice(0, 10).map((comp) => ({
      date: comp.date_mutation
        ? new Date(comp.date_mutation).toLocaleDateString('fr-FR', {
            month: 'short',
            year: '2-digit',
          })
        : 'N/A',
      prix: comp.prix || 0,
      surface: comp.surface || 0,
      prix_m2: comp.prix && comp.surface ? comp.prix / comp.surface : 0,
      distance: comp.distance || 0,
      type: comp.type_local || 'Maison',
    })) || []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-1 font-semibold">{label || payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatPricePerM2(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Estimation principale */}
      {data.estimation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-5 w-5" />
              Estimation Immobilière
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Valeur estimée</p>
                <p className="text-2xl font-bold text-blue-600">
                  {data.estimation.valeur_estimee
                    ? formatPrice(data.estimation.valeur_estimee)
                    : 'N/A'}
                </p>
                {data.estimation.confiance && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    Confiance: {data.estimation.confiance}%
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Prix au m²</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.estimation.prix_m2_estime
                    ? formatPricePerM2(data.estimation.prix_m2_estime)
                    : 'N/A'}
                </p>
              </div>

              {surface && data.estimation.prix_m2_estime && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Surface habitable
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {surface} m²
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparaison zone */}
      {comparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5" />
              Comparaison avec la Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={formatPricePerM2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="prix_m2"
                  name="Prix/m²"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {data.statistics?.nombre_transactions && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Basé sur {data.statistics.nombre_transactions} transaction(s)
                récente(s)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transactions comparables */}
      {comparablesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Transactions Comparables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  dataKey="surface"
                  name="Surface"
                  unit=" m²"
                  stroke="#888888"
                  fontSize={12}
                />
                <YAxis
                  type="number"
                  dataKey="prix"
                  name="Prix"
                  stroke="#888888"
                  fontSize={12}
                  tickFormatter={formatPrice}
                />
                <ZAxis type="number" dataKey="distance" range={[50, 200]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-white p-3 shadow-lg">
                          <p className="mb-1 font-semibold">{data.type}</p>
                          <p className="text-sm">Prix: {formatPrice(data.prix)}</p>
                          <p className="text-sm">Surface: {data.surface} m²</p>
                          <p className="text-sm">
                            Prix/m²: {formatPricePerM2(data.prix_m2)}
                          </p>
                          <p className="text-sm">
                            Distance: {data.distance.toFixed(0)}m
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {data.date}
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter
                  name="Transactions"
                  data={comparablesData}
                  fill="#8b5cf6"
                />
              </ScatterChart>
            </ResponsiveContainer>

            <div className="mt-4 rounded-lg bg-purple-50 p-3">
              <p className="text-xs text-purple-800">
                💡 Chaque point représente une transaction comparable. La taille
                du point indique la distance par rapport au bien.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
