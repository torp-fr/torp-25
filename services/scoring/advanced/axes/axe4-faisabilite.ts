/**
 * AXE 4 : FAISABILITÉ & COHÉRENCE TECHNIQUE (150 points - 12%)
 * 
 * 4.1 Pertinence Solutions (70 points)
 * 4.2 Réalisme Exécution (50 points)
 * 4.3 Gestion Risques (30 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe4Faisabilite {
  async calculate(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: { projectType: string }
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []

    // 4.1 Pertinence Solutions (70 points)
    const pertinence = await this.calculatePertinence(devis, enrichmentData, context)
    subCriteriaScores.push(pertinence)

    // 4.2 Réalisme Exécution (50 points)
    const realisme = await this.calculateRealisme(devis, enrichmentData, context)
    subCriteriaScores.push(realisme)

    // 4.3 Gestion Risques (30 points)
    const risques = await this.calculateGestionRisques(devis, enrichmentData)
    subCriteriaScores.push(risques)

    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)

    return {
      axisId: 'faisabilite',
      score: totalScore,
      maxPoints: 150,
      percentage: (totalScore / 150) * 100,
      subCriteriaScores,
      alerts: [],
      recommendations: [],
    }
  }

  /**
   * 4.1 Pertinence Solutions (70 points)
   */
  private async calculatePertinence(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Adéquation Technique (40 points)
    const adequation = await this.scoreAdequationTechnique(devis, enrichmentData, context)
    controlPointScores.push(adequation)
    totalScore += adequation.score

    // Innovation Maîtrisée (30 points)
    const innovation = await this.scoreInnovationMaitrisee(devis, enrichmentData)
    controlPointScores.push(innovation)
    totalScore += innovation.score

    return {
      subCriteriaId: 'pertinence',
      score: totalScore,
      maxPoints: 70,
      controlPointScores,
    }
  }

  /**
   * Adéquation Technique (40 points)
   */
  private async scoreAdequationTechnique(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()
    const project = (devis.extractedData as any)?.project || {}

    // Diagnostic préalable (20 pts)
    const hasDiagnostic = text.includes('diagnostic') ||
                         text.includes('état') ||
                         text.includes('visite') ||
                         text.includes('expertise') ||
                         text.includes('relevé')
    if (hasDiagnostic) {
      score += 18
      justification += 'Diagnostic préalable mentionné. '
    } else {
      score += 8
      justification += 'Diagnostic préalable non vérifié. '
    }

    // Dimensionnement cohérent (20 pts)
    const hasDimensions = text.includes('surface') ||
                         text.includes('m²') ||
                         text.includes('mètre') ||
                         text.includes('volume') ||
                         project.surface !== undefined
    const hasCalculations = text.includes('calcul') ||
                           text.includes('dimensionnement') ||
                           text.includes('charge')

    if (hasDimensions && hasCalculations) {
      score += 18
      justification += 'Dimensionnement et calculs mentionnés. '
    } else if (hasDimensions || hasCalculations) {
      score += 12
      justification += 'Quelques éléments de dimensionnement. '
    } else {
      score += 6
      justification += 'Dimensionnement non détaillé. '
    }

    return {
      controlPointId: 'adequation-technique',
      score: Math.round(score),
      maxPoints: 40,
      justification,
      confidence: 70,
    }
  }

  /**
   * Innovation Maîtrisée (30 points)
   */
  private async scoreInnovationMaitrisee(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Technologies nouvelles (15 pts)
    const hasInnovation = text.includes('innovation') ||
                         text.includes('nouvelle technologie') ||
                         text.includes('smart') ||
                         text.includes('domotique')
    if (hasInnovation) {
      score += 12
      justification += 'Solutions innovantes mentionnées. '
    } else {
      score += 8
      justification += 'Solutions standard (fiabilité éprouvée). '
    }

    // Retour d'expérience (15 pts)
    const portfolio = enrichmentData.company?.portfolio
    if (portfolio?.similarProjects && portfolio.similarProjects >= 5) {
      score += 12
      justification += 'Expérience sur projets similaires vérifiée. '
    } else {
      score += 6
      justification += 'Expérience non vérifiable. '
    }

    return {
      controlPointId: 'innovation-maitrisee',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: 60,
    }
  }

  /**
   * 4.2 Réalisme Exécution (50 points)
   */
  private async calculateRealisme(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Planning & Ressources (30 points)
    const planning = await this.scorePlanning(devis, enrichmentData, context)
    controlPointScores.push(planning)
    totalScore += planning.score

    // Contraintes Chantier (20 points)
    const contraintes = await this.scoreContraintes(devis, enrichmentData)
    controlPointScores.push(contraintes)
    totalScore += contraintes.score

    return {
      subCriteriaId: 'realisme',
      score: totalScore,
      maxPoints: 50,
      controlPointScores,
    }
  }

  /**
   * Planning & Ressources (30 points)
   */
  private async scorePlanning(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const dates = (devis.extractedData as any)?.dates || {}
    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Durée réaliste (15 pts)
    if (dates.startDate && dates.endDate) {
      const start = new Date(dates.startDate)
      const end = new Date(dates.endDate)
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      // Estimation durée standard selon type projet
      let estimatedDuration = 30 // jours par défaut
      if (context.projectType === 'renovation') estimatedDuration = 45
      if (context.projectType === 'construction') estimatedDuration = 180

      const deviation = Math.abs(durationDays - estimatedDuration) / estimatedDuration

      if (deviation < 0.2) {
        score += 15
        justification += `Durée réaliste (${durationDays} jours). `
      } else if (deviation < 0.5) {
        score += 10
        justification += `Durée acceptable (${durationDays} jours). `
      } else {
        score += 5
        justification += `⚠️ Durée potentiellement irréaliste (${durationDays} jours). `
      }
    } else {
      score += 8
      justification += 'Durée non spécifiée. '
    }

    // Disponibilité matériaux (15 pts)
    const hasMaterialDetails = text.includes('disponibilité') ||
                              text.includes('stock') ||
                              text.includes('approvisionnement') ||
                              text.includes('délai')
    if (hasMaterialDetails) {
      score += 12
      justification += 'Disponibilité matériaux mentionnée. '
    } else {
      score += 7
      justification += 'Disponibilité matériaux non vérifiée. '
    }

    return {
      controlPointId: 'planning',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: dates.startDate ? 75 : 50,
    }
  }

  /**
   * Contraintes Chantier (20 points)
   */
  private async scoreContraintes(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Accessibilité & logistique (10 pts)
    const hasAccessibility = text.includes('accès') ||
                            text.includes('logistique') ||
                            text.includes('chantier') ||
                            text.includes('contrainte')
    if (hasAccessibility) {
      score += 8
      justification += 'Contraintes chantier mentionnées. '
    } else {
      score += 5
      justification += 'Contraintes chantier non détaillées. '
    }

    // Coordination métiers (10 pts)
    const hasCoordination = text.includes('coordination') ||
                           text.includes('corps d\'état') ||
                           text.includes('intervenant') ||
                           text.includes('phasage')
    if (hasCoordination) {
      score += 8
      justification += 'Coordination métiers mentionnée. '
    } else {
      score += 4
      justification += 'Coordination métiers non détaillée. '
    }

    return {
      controlPointId: 'contraintes',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: 65,
    }
  }

  /**
   * 4.3 Gestion Risques (30 points)
   */
  private async calculateGestionRisques(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Identification Risques (20 points)
    const identification = await this.scoreIdentificationRisques(devis, enrichmentData)
    controlPointScores.push(identification)
    totalScore += identification.score

    // Mesures Préventives (10 points)
    const preventives = await this.scoreMesuresPreventives(devis, enrichmentData)
    controlPointScores.push(preventives)
    totalScore += preventives.score

    return {
      subCriteriaId: 'gestion-risques',
      score: totalScore,
      maxPoints: 30,
      controlPointScores,
    }
  }

  /**
   * Identification Risques (20 points)
   */
  private async scoreIdentificationRisques(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Risques techniques (10 pts)
    const hasRiskMention = text.includes('risque') ||
                          text.includes('aléa') ||
                          text.includes('précaution') ||
                          text.includes('mesure')
    if (hasRiskMention) {
      score += 8
      justification += 'Risques techniques identifiés. '
    } else {
      score += 4
      justification += 'Risques techniques non mentionnés. '
    }

    // Risques planning (10 pts)
    const weatherData = enrichmentData.weatherData
    if (weatherData) {
      score += 8
      justification += `Risques météo pris en compte (${weatherData.averageWeatherDays} jours défavorables en moyenne). `
    } else {
      score += 5
      justification += 'Risques planning/météo non quantifiés. '
    }

    return {
      controlPointId: 'identification-risques',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: 60,
    }
  }

  /**
   * Mesures Préventives (10 points)
   */
  private async scoreMesuresPreventives(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Plans contingence (5 pts)
    const hasContingency = text.includes('plan b') ||
                          text.includes('alternative') ||
                          text.includes('solution de secours')
    if (hasContingency) {
      score += 4
      justification += 'Plans de contingence mentionnés. '
    } else {
      score += 2
      justification += 'Plans de contingence non explicités. '
    }

    // Couvertures risques (5 pts)
    const legalMentions = (devis.extractedData as any)?.legalMentions || {}
    if (legalMentions.hasInsurance) {
      score += 4
      justification += 'Assurances et garanties présentes. '
    } else {
      score += 1
      justification += 'Couvertures risques limitées. '
    }

    return {
      controlPointId: 'mesures-preventives',
      score: Math.round(score),
      maxPoints: 10,
      justification,
      confidence: 55,
    }
  }
}

