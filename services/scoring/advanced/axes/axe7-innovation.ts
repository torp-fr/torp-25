/**
 * AXE 7 : INNOVATION & DÉVELOPPEMENT DURABLE (50 points - 4%)
 * 
 * 7.1 Performance Environnementale (30 points)
 * 7.2 Innovation Technique (20 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe7Innovation {
  async calculate(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: { projectType: string }
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []

    // 7.1 Performance Environnementale (30 points)
    const environnement = await this.calculatePerformanceEnvironnementale(devis, enrichmentData, context)
    subCriteriaScores.push(environnement)

    // 7.2 Innovation Technique (20 points)
    const innovation = await this.calculateInnovationTechnique(devis, enrichmentData)
    subCriteriaScores.push(innovation)

    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)

    return {
      axisId: 'innovation',
      score: totalScore,
      maxPoints: 50,
      percentage: (totalScore / 50) * 100,
      subCriteriaScores,
      alerts: [],
      recommendations: [],
    }
  }

  /**
   * 7.1 Performance Environnementale (30 points)
   */
  private async calculatePerformanceEnvironnementale(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Solutions Bas Carbone (20 points)
    const basCarbone = await this.scoreSolutionsBasCarbone(devis, enrichmentData, context)
    controlPointScores.push(basCarbone)
    totalScore += basCarbone.score

    // Démarche Écologique (10 points)
    const demarche = await this.scoreDemarcheEcologique(devis, enrichmentData)
    controlPointScores.push(demarche)
    totalScore += demarche.score

    return {
      subCriteriaId: 'performance-environnementale',
      score: totalScore,
      maxPoints: 30,
      controlPointScores,
    }
  }

  /**
   * Solutions Bas Carbone (20 points)
   */
  private async scoreSolutionsBasCarbone(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Matériaux biosourcés (10 pts)
    const hasBioMaterials = text.includes('biosourcé') ||
                           text.includes('bois') ||
                           text.includes('chanvre') ||
                           text.includes('paille') ||
                           text.includes('laine') ||
                           text.includes('fibre végétale')
    if (hasBioMaterials) {
      score += 9
      justification += 'Matériaux biosourcés mentionnés. '
    } else {
      score += 4
      justification += 'Matériaux biosourcés non identifiés. '
    }

    // Économies énergétiques (10 pts)
    const hasEnergySavings = text.includes('économies énergétiques') ||
                            text.includes('gain énergétique') ||
                            text.includes('performance énergétique') ||
                            text.includes('isolation') ||
                            text.includes('rénovation énergétique')
    if (hasEnergySavings) {
      score += 9
      justification += 'Économies énergétiques mentionnées. '
    } else {
      score += 4
      justification += 'Économies énergétiques non quantifiées. '
    }

    return {
      controlPointId: 'solutions-bas-carbone',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: 65,
    }
  }

  /**
   * Démarche Écologique (10 points)
   */
  private async scoreDemarcheEcologique(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Gestion déchets chantier (5 pts)
    const hasWasteManagement = text.includes('déchet') ||
                               text.includes('tri') ||
                               text.includes('valorisation') ||
                               text.includes('recyclage')
    if (hasWasteManagement) {
      score += 4
      justification += 'Gestion déchets mentionnée. '
    } else {
      score += 2
      justification += 'Gestion déchets non mentionnée. '
    }

    // Circuits courts (5 pts)
    const hasLocal = text.includes('local') ||
                    text.includes('circuit court') ||
                    text.includes('régional') ||
                    text.includes('proximité')
    if (hasLocal) {
      score += 4
      justification += 'Circuits courts mentionnés. '
    } else {
      score += 2
      justification += 'Origine matériaux non spécifiée. '
    }

    return {
      controlPointId: 'demarche-ecologique',
      score: Math.round(score),
      maxPoints: 10,
      justification,
      confidence: 55,
    }
  }

  /**
   * 7.2 Innovation Technique (20 points)
   */
  private async calculateInnovationTechnique(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Technologies Avancées (15 points)
    const technologies = await this.scoreTechnologiesAvancees(devis, enrichmentData)
    controlPointScores.push(technologies)
    totalScore += technologies.score

    // Veille & Formation (5 points)
    const veille = await this.scoreVeilleFormation(devis, enrichmentData)
    controlPointScores.push(veille)
    totalScore += veille.score

    return {
      subCriteriaId: 'innovation-technique',
      score: totalScore,
      maxPoints: 20,
      controlPointScores,
    }
  }

  /**
   * Technologies Avancées (15 points)
   */
  private async scoreTechnologiesAvancees(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Solutions innovantes maîtrisées (10 pts)
    const hasInnovation = text.includes('innovation') ||
                         text.includes('nouvelle technologie') ||
                         text.includes('smart') ||
                         text.includes('domotique') ||
                         text.includes('connecté') ||
                         text.includes('bim')
    if (hasInnovation) {
      score += 9
      justification += 'Technologies innovantes mentionnées. '
    } else {
      score += 5
      justification += 'Solutions standard (fiabilité éprouvée). '
    }

    // Outils numériques (5 pts)
    const hasDigital = text.includes('bim') ||
                     text.includes('maquette 3d') ||
                     text.includes('numérique') ||
                     text.includes('digital') ||
                     text.includes('suivi digital')
    if (hasDigital) {
      score += 5
      justification += 'Outils numériques mentionnés. '
    } else {
      score += 2
      justification += 'Outils numériques non mentionnés. '
    }

    return {
      controlPointId: 'technologies-avancees',
      score: Math.round(score),
      maxPoints: 15,
      justification,
      confidence: 60,
    }
  }

  /**
   * Veille & Formation (5 points)
   */
  private async scoreVeilleFormation(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const certifications = enrichmentData.company?.humanResources?.certifications || []
    const certificationsPro = enrichmentData.certifications || []

    // Formation continue équipes (3 pts)
    const recentCerts = [...certifications, ...certificationsPro].filter((c) => {
      // Vérifier si certification récente (dans les 3 dernières années)
      return true // Placeholder - nécessiterait dates de certification
    })

    if (recentCerts.length >= 3) {
      score += 3
      justification += 'Formation continue vérifiée. '
    } else if (recentCerts.length > 0) {
      score += 2
      justification += 'Quelques certifications récentes. '
    } else {
      score += 1
      justification += 'Formation continue non vérifiable. '
    }

    // Veille technologique (2 pts)
    // Nécessiterait données externes (salons, abonnements, etc.)
    score += 1
    justification += 'Veille technologique non vérifiable. '

    return {
      controlPointId: 'veille-formation',
      score: Math.round(score),
      maxPoints: 5,
      justification,
      confidence: 40,
    }
  }
}

