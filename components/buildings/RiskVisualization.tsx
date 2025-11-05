/**
 * Composant de visualisation des risques Géorisques
 * Affiche les risques naturels et technologiques
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip as InfoTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts'
import {
  AlertTriangle,
  Droplet,
  Mountain,
  Zap,
  Wind,
  Factory,
  Shield,
  Info,
} from 'lucide-react'

interface GeorisquesData {
  tri?: any[] // Zones inondables
  azi?: any[] // Atlas zones inondables
  papi?: any[] // Programme actions prévention inondations
  mvt?: any[] // Mouvements de terrain
  rga?: {
    // Retrait-gonflement argiles
    potentiel?: string
  }
  radon?: {
    // Radon
    classe?: number
  }
  zonage_sismique?: Array<{
    zone?: number
  }>
  installations_classees?: any[] // ICPE
}

interface RiskVisualizationProps {
  data: GeorisquesData
  address?: string
}

export function RiskVisualization({ data, address }: RiskVisualizationProps) {
  // Calculer les niveaux de risque (0-5)
  const calculateRiskLevel = (): {
    flood: number
    seismic: number
    clay: number
    radon: number
    ground: number
    industrial: number
  } => {
    const risks = {
      flood: 0,
      seismic: 0,
      clay: 0,
      radon: 0,
      ground: 0,
      industrial: 0,
    }

    // Inondations
    if (data.tri && data.tri.length > 0) risks.flood = 4
    else if (data.azi && data.azi.length > 0) risks.flood = 3
    else if (data.papi && data.papi.length > 0) risks.flood = 2

    // Sismique
    if (data.zonage_sismique && data.zonage_sismique.length > 0) {
      const zone = data.zonage_sismique[0].zone || 1
      risks.seismic = zone
    }

    // Argiles
    if (data.rga?.potentiel) {
      const potentials: Record<string, number> = {
        faible: 1,
        moyen: 3,
        fort: 4,
        'très fort': 5,
      }
      risks.clay = potentials[data.rga.potentiel.toLowerCase()] || 0
    }

    // Radon
    if (data.radon?.classe) {
      risks.radon = data.radon.classe
    }

    // Mouvements de terrain
    if (data.mvt && data.mvt.length > 0) {
      risks.ground = Math.min(data.mvt.length, 5)
    }

    // Installations classées
    if (data.installations_classees && data.installations_classees.length > 0) {
      risks.industrial = Math.min(data.installations_classees.length, 5)
    }

    return risks
  }

  const risks = calculateRiskLevel()

  // Calcul du risque global
  const globalRisk = Math.round(
    (Object.values(risks).reduce((a, b) => a + b, 0) /
      (Object.keys(risks).length * 5)) *
      100
  )

  // Préparer données pour le radar
  const radarData = [
    { risk: 'Inondation', level: risks.flood, fullMark: 5 },
    { risk: 'Sismique', level: risks.seismic, fullMark: 5 },
    { risk: 'Argiles', level: risks.clay, fullMark: 5 },
    { risk: 'Radon', level: risks.radon, fullMark: 5 },
    { risk: 'Terrain', level: risks.ground, fullMark: 5 },
    { risk: 'ICPE', level: risks.industrial, fullMark: 5 },
  ]

  const getRiskColor = (level: number) => {
    if (level === 0) return '#10b981' // Green
    if (level <= 2) return '#eab308' // Yellow
    if (level <= 3) return '#f97316' // Orange
    return '#ef4444' // Red
  }

  const getRiskLabel = (level: number) => {
    if (level === 0) return 'Aucun'
    if (level <= 2) return 'Faible'
    if (level <= 3) return 'Moyen'
    return 'Élevé'
  }

  const getRiskBadgeVariant = (level: number) => {
    if (level === 0) return 'default'
    if (level <= 2) return 'secondary'
    if (level <= 3) return 'default'
    return 'destructive'
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const level = payload[0].value
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-1 font-semibold">{payload[0].payload.risk}</p>
          <p className="text-sm" style={{ color: getRiskColor(level) }}>
            Niveau: {level}/5 ({getRiskLabel(level)})
          </p>
        </div>
      )
    }
    return null
  }

  // Détails des risques
  const riskDetails = [
    {
      icon: Droplet,
      label: 'Inondation',
      level: risks.flood,
      description:
        risks.flood > 0
          ? 'Zone à risque d\'inondation'
          : 'Aucun risque identifié',
    },
    {
      icon: Mountain,
      label: 'Sismicité',
      level: risks.seismic,
      description: `Zone sismique ${risks.seismic}`,
    },
    {
      icon: Wind,
      label: 'Argiles',
      level: risks.clay,
      description: data.rga?.potentiel
        ? `Potentiel ${data.rga.potentiel}`
        : 'Non renseigné',
    },
    {
      icon: Zap,
      label: 'Radon',
      level: risks.radon,
      description: `Classe ${risks.radon || 'non renseignée'}`,
    },
    {
      icon: AlertTriangle,
      label: 'Mouvements terrain',
      level: risks.ground,
      description:
        risks.ground > 0
          ? `${data.mvt?.length} événement(s)`
          : 'Aucun identifié',
    },
    {
      icon: Factory,
      label: 'Installations classées',
      level: risks.industrial,
      description:
        risks.industrial > 0
          ? `${data.installations_classees?.length} à proximité`
          : 'Aucune à proximité',
    },
  ]

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5" />
                Analyse des Risques Naturels
              </CardTitle>
              <InfoTooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-md">
                  <p className="font-semibold mb-1">Risques Géorisques</p>
                  <p className="text-xs">
                    Données officielles issues de Géorisques.fr :
                    <br />
                    • <strong>Inondation (TRI)</strong> : Territoire à Risque important d&apos;Inondation
                    <br />
                    • <strong>Sismicité</strong> : Niveau 1 (faible) à 5 (fort) selon zonage réglementaire
                    <br />
                    • <strong>Argile (RGA)</strong> : Retrait-gonflement des sols argileux (fondations)
                    <br />
                    • <strong>Radon</strong> : Gaz radioactif naturel (catégorie 1-3, santé)
                    <br />
                    • <strong>Mouvements terrain</strong> : Glissements, effondrements, éboulements
                    <br />• <strong>ICPE</strong> : Installations Classées (industries à proximité)
                  </p>
                </TooltipContent>
              </InfoTooltip>
            </div>
            <Badge
              variant="outline"
              className="text-lg font-bold"
              style={{
                borderColor: getRiskColor(globalRisk / 20),
                color: getRiskColor(globalRisk / 20),
              }}
            >
              {globalRisk}%
            </Badge>
          </div>
          {address && (
            <p className="text-sm text-muted-foreground">{address}</p>
          )}
        </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Graphique Radar */}
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="risk"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <Radar
                  name="Niveau de risque"
                  dataKey="level"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.5}
                  strokeWidth={2}
                />
                <RechartsTooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Détails des risques */}
          <div className="space-y-2">
            {riskDetails.map((risk, index) => {
              const Icon = risk.icon
              const color = getRiskColor(risk.level)

              return (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" style={{ color }} />
                    <div>
                      <p className="text-sm font-medium">{risk.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {risk.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color }}
                    >
                      {risk.level}/5
                    </span>
                    <Badge
                      variant={getRiskBadgeVariant(risk.level)}
                      className="text-xs"
                    >
                      {getRiskLabel(risk.level)}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommandations */}
        {globalRisk > 30 && (
          <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-600" />
              <p className="font-semibold text-orange-900">
                Recommandations
              </p>
            </div>
            <ul className="space-y-1 text-sm text-orange-800">
              {risks.flood > 2 && (
                <li>
                  • Vérifier l&apos;assurance habitation pour risques
                  d&apos;inondation
                </li>
              )}
              {risks.seismic >= 3 && (
                <li>
                  • Prévoir des normes parasismiques pour la construction
                </li>
              )}
              {risks.clay >= 3 && (
                <li>
                  • Étude de sol recommandée pour le retrait-gonflement des
                  argiles
                </li>
              )}
              {risks.radon >= 3 && (
                <li>
                  • Mesure de la concentration en radon recommandée
                </li>
              )}
              {risks.ground > 0 && (
                <li>
                  • Étude géotechnique conseillée en raison de mouvements de
                  terrain
                </li>
              )}
            </ul>
          </div>
        )}

        {globalRisk <= 30 && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <p className="text-sm font-medium text-green-900">
                ✓ Niveau de risque global faible - Zone favorable pour la
                construction
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  )
}
