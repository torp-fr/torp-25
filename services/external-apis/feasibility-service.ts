/**
 * Service d'étude de faisabilité automatique
 * Analyse la faisabilité d'un projet depuis :
 * - Données cadastrales
 * - Données PLU
 * - Données urbanisme
 * - Données bâti
 * - Contraintes et conditions d'accès
 */

import type { AggregatedBuildingData } from './types'
import type { CadastralData } from './cadastre-service'
import type { PLUData } from './plu-service'

export interface FeasibilityStudy {
  projectId: string
  address: string
  projectType: 'construction' | 'renovation' | 'extension' | 'maintenance'
  
  // Scores de faisabilité (0-100)
  overallFeasibility: number
  scores: {
    regulatory: number // Conformité réglementaire
    technical: number // Faisabilité technique
    access: number // Conditions d'accès
    connectivity: number // Réseaux et connexions
    environmental: number // Contraintes environnementales
  }
  
  // Analyses détaillées
  analyses: {
    implantation?: {
      possible: boolean
      constraints: string[]
      recommendations: string[]
      availableSurface?: number
      maxHeight?: number
      setbackRequired?: number
    }
    connections?: {
      electricity: { available: boolean; distance?: number; cost?: number }
      water: { available: boolean; distance?: number; cost?: number }
      sewer: { available: boolean; distance?: number; cost?: number }
      gas: { available: boolean; distance?: number; cost?: number }
      internet: { available: boolean; distance?: number; cost?: number }
      totalEstimatedCost?: number
    }
    constraints?: {
      regulatory: string[]
      technical: string[]
      environmental: string[]
      access: string[]
    }
    risks?: Array<{
      type: 'high' | 'medium' | 'low'
      category: string
      description: string
      mitigation?: string
    }>
  }
  
  // Recommandations globales
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    title: string
    description: string
    actionable: boolean
  }>
  
  // Conclusion
  conclusion: {
    feasible: boolean
    confidence: number // 0-100
    summary: string
    nextSteps: string[]
  }
  
  metadata: {
    generatedAt: string
    dataSources: string[]
    version: string
  }
}

export class FeasibilityService {
  /**
   * Génère une étude de faisabilité complète
   */
  async generateFeasibilityStudy(
    address: string,
    projectType: 'construction' | 'renovation' | 'extension' | 'maintenance',
    buildingData: AggregatedBuildingData | null,
    cadastralData: CadastralData | null,
    pluData: PLUData | null,
    userConstraints: string[] = [],
    accessConditions: string[] = [],
    rooms: string[] = []
  ): Promise<FeasibilityStudy> {
    const study: FeasibilityStudy = {
      projectId: `feasibility-${Date.now()}`,
      address,
      projectType,
      overallFeasibility: 0,
      scores: {
        regulatory: 0,
        technical: 0,
        access: 0,
        connectivity: 0,
        environmental: 0,
      },
      analyses: {},
      recommendations: [],
      conclusion: {
        feasible: false,
        confidence: 0,
        summary: '',
        nextSteps: [],
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSources: [],
        version: '1.0.0',
      },
    }

    // Collecter les sources de données
    if (buildingData) {
      study.metadata.dataSources.push(...buildingData.sources)
    }
    if (cadastralData) {
      study.metadata.dataSources.push(...cadastralData.sources)
    }
    if (pluData) {
      study.metadata.dataSources.push(...pluData.sources)
    }

    // 1. Analyse d'implantation
    study.analyses.implantation = this.analyzeImplantation(
      buildingData,
      cadastralData,
      pluData,
      projectType
    )

    // 2. Analyse des connexions
    study.analyses.connections = this.analyzeConnections(
      cadastralData,
      buildingData,
      accessConditions
    )

    // 3. Analyse des contraintes
    study.analyses.constraints = this.analyzeConstraints(
      pluData,
      cadastralData,
      buildingData,
      userConstraints
    )

    // 4. Analyse des risques
    study.analyses.risks = this.analyzeRisks(
      cadastralData,
      buildingData,
      pluData
    )

    // 5. Calculer les scores
    study.scores = this.calculateScores(study.analyses)
    study.overallFeasibility = this.calculateOverallFeasibility(study.scores)

    // 6. Générer les recommandations
    study.recommendations = this.generateRecommendations(study)

    // 7. Conclusion
    study.conclusion = this.generateConclusion(study, projectType)

    return study
  }

  /**
   * Analyse les possibilités d'implantation
   */
  private analyzeImplantation(
    buildingData: AggregatedBuildingData | null,
    cadastralData: CadastralData | null,
    pluData: PLUData | null,
    projectType: string
  ): FeasibilityStudy['analyses']['implantation'] {
    const constraints: string[] = []
    const recommendations: string[] = []

    // Surface disponible
    const availableSurface = cadastralData?.parcelle?.surface
    if (availableSurface && availableSurface < 200 && projectType === 'construction') {
      constraints.push(`Surface limitée (${availableSurface}m²) - Vérifier les possibilités`)
    }

    // Contraintes PLU
    if (pluData?.contraintes) {
      pluData.contraintes.forEach((c) => {
        if (c.description) constraints.push(c.description)
      })
    }

    // Contraintes de hauteur
    const maxHeight = buildingData?.building?.heightRestriction
    if (maxHeight) {
      constraints.push(`Limitation de hauteur: ${maxHeight}m`)
    }

    // Contraintes de retrait
    const setback = buildingData?.building?.setbackRestriction
    if (setback) {
      constraints.push(`Retrait obligatoire: ${setback}m`)
      recommendations.push('Respecter les retraits réglementaires dans le projet')
    }

    // Zonage PLU
    if (pluData?.zonage?.type) {
      const zoneType = pluData.zonage.type
      if (['N', 'NC'].includes(zoneType)) {
        constraints.push(`Zone ${zoneType} - Construction limitée ou interdite`)
      } else if (zoneType === 'A') {
        constraints.push('Zone agricole - Autorisation spéciale requise')
      }
    }

    const possible = constraints.length === 0 || constraints.every((c) => !c.toLowerCase().includes('interdit'))

    return {
      possible,
      constraints,
      recommendations,
      availableSurface,
      maxHeight,
      setbackRequired: setback,
    }
  }

  /**
   * Analyse les connexions et réseaux
   */
  private analyzeConnections(
    cadastralData: CadastralData | null,
    buildingData: AggregatedBuildingData | null,
    accessConditions: string[]
  ): FeasibilityStudy['analyses']['connections'] {
    const connectivity = cadastralData?.connectivity || {}

    const connections = {
      electricity: {
        available: connectivity.hasElectricity ?? true,
        distance: accessConditions.includes('Accès difficile') ? 50 : 0,
      },
      water: {
        available: connectivity.hasWater ?? true,
        distance: accessConditions.includes('Accès difficile') ? 50 : 0,
      },
      sewer: {
        available: connectivity.hasSewer ?? true,
        distance: accessConditions.includes('Accès difficile') ? 50 : 0,
      },
      gas: {
        available: connectivity.hasGas ?? true,
        distance: accessConditions.includes('Accès difficile') ? 30 : 0,
      },
      internet: {
        available: connectivity.hasInternet ?? true,
        distance: 0,
      },
    }

    // Estimer les coûts si distance > 0
    Object.entries(connections).forEach(([key, value]) => {
      if (value.distance && value.distance > 0) {
        // Estimation: ~50€/m pour électricité/eau, ~30€/m pour gaz
        const costPerMeter = key === 'gas' ? 30 : 50
        value.cost = value.distance * costPerMeter
      }
    })

    const totalCost = Object.values(connections).reduce(
      (sum, conn) => sum + (conn.cost || 0),
      0
    )

    return {
      ...connections,
      totalEstimatedCost: totalCost > 0 ? totalCost : undefined,
    } as FeasibilityStudy['analyses']['connections']
  }

  /**
   * Analyse les contraintes
   */
  private analyzeConstraints(
    pluData: PLUData | null,
    cadastralData: CadastralData | null,
    buildingData: AggregatedBuildingData | null,
    userConstraints: string[]
  ): FeasibilityStudy['analyses']['constraints'] {
    const regulatory: string[] = []
    const technical: string[] = []
    const environmental: string[] = []
    const access: string[] = []

    // Contraintes PLU réglementaires
    if (pluData?.contraintes) {
      pluData.contraintes.forEach((c) => {
        if (c.type === 'hauteur' || c.type === 'retrait' || c.type === 'densite') {
          regulatory.push(c.description || `${c.type}: ${c.valeur}`)
        } else {
          regulatory.push(c.description || c.type)
        }
      })
    }

    // Contraintes cadastrales
    if (cadastralData?.constraints) {
      if (cadastralData.constraints.isProtected) {
        regulatory.push('Zone protégée - Autorisation spéciale requise')
      }
      if (cadastralData.constraints.hasArchaeologicalSite) {
        regulatory.push('Site archéologique - Étude préalable nécessaire')
      }
      if (cadastralData.constraints.isFloodZone) {
        environmental.push('Zone inondable - Normes spécifiques requises')
      }
    }

    // Contraintes techniques depuis données bâti
    if (buildingData?.building?.pluConstraints) {
      regulatory.push(...buildingData.building.pluConstraints)
    }

    // Contraintes utilisateur (à classifier)
    userConstraints.forEach((constraint) => {
      const lower = constraint.toLowerCase()
      if (lower.includes('accès') || lower.includes('accès')) {
        access.push(constraint)
      } else if (lower.includes('technique') || lower.includes('structure')) {
        technical.push(constraint)
      } else if (lower.includes('environnement') || lower.includes('protection')) {
        environmental.push(constraint)
      } else {
        regulatory.push(constraint)
      }
    })

    return {
      regulatory,
      technical,
      environmental,
      access,
    }
  }

  /**
   * Analyse les risques
   */
  private analyzeRisks(
    cadastralData: CadastralData | null,
    buildingData: AggregatedBuildingData | null,
    pluData: PLUData | null
  ): FeasibilityStudy['analyses']['risks'] {
    const risks: FeasibilityStudy['analyses']['risks'] = []

    // Risques environnementaux
    if (cadastralData?.constraints?.isFloodZone) {
      risks.push({
        type: 'high',
        category: 'Environnemental',
        description: 'Zone inondable identifiée',
        mitigation: 'Vérifier les règles PLU et normes de construction en zone inondable',
      })
    }

    // Risques réglementaires
    if (pluData?.zonage && ['N', 'NC'].includes(pluData.zonage.type || '')) {
      risks.push({
        type: 'high',
        category: 'Réglementaire',
        description: `Zone ${pluData.zonage.type} - Construction limitée ou interdite`,
        mitigation: 'Contacter les services d\'urbanisme pour vérifier les possibilités',
      })
    }

    // Risques techniques
    if (buildingData?.building?.heightRestriction && buildingData.building.heightRestriction < 7) {
      risks.push({
        type: 'medium',
        category: 'Technique',
        description: 'Hauteur limitée - Contraintes de construction',
        mitigation: 'Adapter le projet aux limitations de hauteur',
      })
    }

    return risks
  }

  /**
   * Calcule les scores de faisabilité
   */
  private calculateScores(analyses: FeasibilityStudy['analyses']): FeasibilityStudy['scores'] {
    let regulatory = 100
    let technical = 100
    let access = 100
    let connectivity = 100
    let environmental = 100

    // Score réglementaire (pénalités pour contraintes)
    const regulatoryConstraints = analyses.constraints?.regulatory.length || 0
    regulatory -= regulatoryConstraints * 10

    // Score technique (pénalités pour contraintes techniques)
    const technicalConstraints = analyses.constraints?.technical.length || 0
    technical -= technicalConstraints * 15

    // Score environnemental (pénalités pour risques environnementaux)
    const envConstraints = analyses.constraints?.environmental.length || 0
    const envRisks = analyses.risks?.filter((r) => r.category === 'Environnemental').length || 0
    environmental -= envConstraints * 10 + envRisks * 20

    // Score accès (pénalités pour contraintes d'accès)
    const accessConstraints = analyses.constraints?.access.length || 0
    access -= accessConstraints * 10

    // Score connectivité (vérifier disponibilité des réseaux)
    const connections = analyses.connections
    if (connections) {
      const missingConnections = Object.values(connections).filter((c) => !c.available).length
      connectivity -= missingConnections * 20

      // Pénalité pour coûts élevés de connexion
      if (connections.totalEstimatedCost && connections.totalEstimatedCost > 5000) {
        connectivity -= 10
      }
    }

    return {
      regulatory: Math.max(0, Math.min(100, regulatory)),
      technical: Math.max(0, Math.min(100, technical)),
      access: Math.max(0, Math.min(100, access)),
      connectivity: Math.max(0, Math.min(100, connectivity)),
      environmental: Math.max(0, Math.min(100, environmental)),
    }
  }

  /**
   * Calcule le score global de faisabilité
   */
  private calculateOverallFeasibility(scores: FeasibilityStudy['scores']): number {
    // Poids pour chaque critère
    const weights = {
      regulatory: 0.3,
      technical: 0.2,
      access: 0.15,
      connectivity: 0.15,
      environmental: 0.2,
    }

    return Math.round(
      scores.regulatory * weights.regulatory +
        scores.technical * weights.technical +
        scores.access * weights.access +
        scores.connectivity * weights.connectivity +
        scores.environmental * weights.environmental
    )
  }

  /**
   * Génère les recommandations
   */
  private generateRecommendations(study: FeasibilityStudy): FeasibilityStudy['recommendations'] {
    const recommendations: FeasibilityStudy['recommendations'] = []

    // Recommandations selon les scores
    if (study.scores.regulatory < 70) {
      recommendations.push({
        priority: 'high',
        category: 'Réglementaire',
        title: 'Vérifier la conformité réglementaire',
        description: 'Des contraintes réglementaires importantes ont été identifiées. Contactez les services d\'urbanisme avant de commencer.',
        actionable: true,
      })
    }

    if (study.scores.connectivity < 70) {
      recommendations.push({
        priority: 'high',
        category: 'Connexions',
        title: 'Vérifier les connexions aux réseaux',
        description: 'Les connexions aux réseaux nécessitent une attention particulière. Estimez les coûts avant le projet.',
        actionable: true,
      })
    }

    if (study.analyses.connections?.totalEstimatedCost && study.analyses.connections.totalEstimatedCost > 5000) {
      recommendations.push({
        priority: 'medium',
        category: 'Budget',
        title: 'Coûts de connexion élevés',
        description: `Les coûts de connexion estimés sont de ${study.analyses.connections.totalEstimatedCost.toLocaleString('fr-FR')}€. Intégrez ces coûts dans votre budget.`,
        actionable: false,
      })
    }

    // Recommandations d'implantation
    if (study.analyses.implantation?.recommendations) {
      study.analyses.implantation.recommendations.forEach((rec) => {
        recommendations.push({
          priority: 'medium',
          category: 'Implantation',
          title: 'Recommandation d\'implantation',
          description: rec,
          actionable: true,
        })
      })
    }

    return recommendations
  }

  /**
   * Génère la conclusion de l'étude
   */
  private generateConclusion(
    study: FeasibilityStudy,
    projectType: string
  ): FeasibilityStudy['conclusion'] {
    const feasible = study.overallFeasibility >= 60
    const confidence = this.calculateConfidence(study)

    let summary = ''
    if (feasible) {
      summary = `Le projet de ${projectType} est faisable (score: ${study.overallFeasibility}/100). `
    } else {
      summary = `Le projet présente des difficultés importantes (score: ${study.overallFeasibility}/100). `
    }

    summary += `Les principaux points d'attention concernent ${this.getMainConcerns(study)}.`

    const nextSteps: string[] = []

    if (!feasible) {
      nextSteps.push('Contacter les services d\'urbanisme pour clarifier les contraintes')
    }

    if (study.scores.regulatory < 70) {
      nextSteps.push('Demander un certificat d\'urbanisme pour valider la faisabilité réglementaire')
    }

    if (study.analyses.connections?.totalEstimatedCost && study.analyses.connections.totalEstimatedCost > 0) {
      nextSteps.push('Obtenir des devis précis pour les connexions aux réseaux')
    }

    if (study.analyses.risks && study.analyses.risks.length > 0) {
      nextSteps.push('Consulter les experts nécessaires pour les risques identifiés')
    }

    if (nextSteps.length === 0) {
      nextSteps.push('Déposer une demande d\'autorisation d\'urbanisme si nécessaire')
      nextSteps.push('Finaliser le projet en tenant compte des contraintes identifiées')
    }

    return {
      feasible,
      confidence,
      summary,
      nextSteps,
    }
  }

  private calculateConfidence(study: FeasibilityStudy): number {
    let confidence = 100

    // Pénalité si données manquantes
    const hasBuildingData = study.metadata.dataSources.some((s) => s.includes('Bâti') || s.includes('ONTB'))
    const hasPLUData = study.metadata.dataSources.some((s) => s.includes('PLU'))
    const hasCadastralData = study.metadata.dataSources.some((s) => s.includes('Cadastre') || s.includes('Géoportail'))

    if (!hasBuildingData) confidence -= 20
    if (!hasPLUData) confidence -= 30
    if (!hasCadastralData) confidence -= 15

    return Math.max(0, Math.min(100, confidence))
  }

  private getMainConcerns(study: FeasibilityStudy): string {
    const concerns: string[] = []

    if (study.scores.regulatory < 70) concerns.push('la conformité réglementaire')
    if (study.scores.connectivity < 70) concerns.push('les connexions aux réseaux')
    if (study.scores.environmental < 70) concerns.push('les contraintes environnementales')
    if (study.scores.access < 70) concerns.push('les conditions d\'accès')

    if (concerns.length === 0) return 'aucun point particulier'
    if (concerns.length === 1) return concerns[0]

    return concerns.slice(0, -1).join(', ') + ' et ' + concerns[concerns.length - 1]
  }
}

