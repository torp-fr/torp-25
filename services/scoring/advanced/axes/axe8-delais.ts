/**
 * AXE 8 : GESTION PROJET & DÉLAIS (70 points - 6%)
 * 
 * 8.1 Réalisme Planning (40 points)
 * 8.2 Capacité Respect Délais (30 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe8Delais {
  async calculate(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: { projectType: string; region: string }
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []
    const alerts: any[] = []

    // 8.1 Réalisme Planning (40 points)
    const planning = await this.calculateRealismePlanning(devis, enrichmentData, context)
    subCriteriaScores.push(planning)

    if (planning.score < planning.maxPoints * 0.6) {
      alerts.push({
        type: 'major',
        message: 'Planning potentiellement irréaliste',
        impact: 'Risque de retard important',
      })
    }

    // 8.2 Capacité Respect Délais (30 points)
    const capacite = await this.calculateCapaciteDelais(devis, enrichmentData)
    subCriteriaScores.push(capacite)

    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)

    return {
      axisId: 'delais',
      score: totalScore,
      maxPoints: 70,
      percentage: (totalScore / 70) * 100,
      subCriteriaScores,
      alerts,
      recommendations: [],
    }
  }

  /**
   * 8.1 Réalisme Planning (40 points)
   */
  private async calculateRealismePlanning(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Cohérence Temporelle (25 points)
    const coherence = await this.scoreCoherenceTemporelle(devis, enrichmentData, context)
    controlPointScores.push(coherence)
    totalScore += coherence.score

    // Coordination Métiers (15 points)
    const coordination = await this.scoreCoordinationMetiers(devis, enrichmentData)
    controlPointScores.push(coordination)
    totalScore += coordination.score

    return {
      subCriteriaId: 'realisme-planning',
      score: totalScore,
      maxPoints: 40,
      controlPointScores,
    }
  }

  /**
   * Cohérence Temporelle (25 points)
   */
  private async scoreCoherenceTemporelle(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const dates = (devis.extractedData as any)?.dates || {}
    const totalAmount = Number(devis.totalAmount) || 0

    // Durée adaptée complexité (15 pts)
    if (dates.startDate && dates.endDate) {
      const start = new Date(dates.startDate)
      const end = new Date(dates.endDate)
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

      // Estimation selon montant et type projet
      let estimatedDuration = 30
      if (context.projectType === 'renovation') {
        estimatedDuration = Math.max(30, totalAmount / 50000 * 30) // ~30 jours pour 50k€
      } else if (context.projectType === 'construction') {
        estimatedDuration = Math.max(90, totalAmount / 100000 * 60) // ~90 jours pour 100k€
      }

      const deviation = Math.abs(durationDays - estimatedDuration) / estimatedDuration

      if (deviation < 0.15) {
        score += 15
        justification += `Durée très cohérente (${durationDays} jours vs ${Math.round(estimatedDuration)} estimés). `
      } else if (deviation < 0.3) {
        score += 12
        justification += `Durée cohérente (${durationDays} jours). `
      } else if (deviation < 0.5) {
        score += 8
        justification += `Durée acceptable (${durationDays} jours). `
      } else {
        score += 4
        justification += `⚠️ Durée peut-être irréaliste (${durationDays} jours). `
      }
    } else {
      score += 8
      justification += 'Durée non spécifiée précisément. '
    }

    // Marges sécurité (10 pts)
    const text = JSON.stringify(devis.extractedData).toLowerCase()
    const hasBuffer = text.includes('marge') ||
                     text.includes('buffer') ||
                     text.includes('aléa') ||
                     text.includes('contingence')
    const weatherData = enrichmentData.weatherData

    if (hasBuffer || weatherData) {
      score += 8
      justification += 'Marges de sécurité prises en compte. '
    } else {
      score += 4
      justification += 'Marges de sécurité non explicitées. '
    }

    return {
      controlPointId: 'coherence-temporelle',
      score: Math.round(score),
      maxPoints: 25,
      justification,
      confidence: dates.startDate ? 80 : 50,
    }
  }

  /**
   * Coordination Métiers (15 points)
   */
  private async scoreCoordinationMetiers(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Interfaces bien définies (8 pts)
    const hasInterfaces = text.includes('interface') ||
                         text.includes('corps d\'état') ||
                         text.includes('jalon') ||
                         text.includes('phase')
    if (hasInterfaces) {
      score += 7
      justification += 'Interfaces entre métiers mentionnées. '
    } else {
      score += 4
      justification += 'Interfaces entre métiers non détaillées. '
    }

    // Séquençage optimisé (7 pts)
    const hasSequencing = text.includes('séquence') ||
                         text.includes('ordre') ||
                         text.includes('enchaînement') ||
                         text.includes('planning détaillé')
    if (hasSequencing) {
      score += 6
      justification += 'Séquençage des travaux mentionné. '
    } else {
      score += 3
      justification += 'Séquençage non détaillé. '
    }

    return {
      controlPointId: 'coordination-metiers',
      score: Math.round(score),
      maxPoints: 15,
      justification,
      confidence: 65,
    }
  }

  /**
   * 8.2 Capacité Respect Délais (30 points)
   */
  private async calculateCapaciteDelais(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Historique Performance (20 points)
    const historique = await this.scoreHistoriquePerformance(devis, enrichmentData)
    controlPointScores.push(historique)
    totalScore += historique.score

    // Engagement Contractuel (10 points)
    const engagement = await this.scoreEngagementContractuel(devis)
    controlPointScores.push(engagement)
    totalScore += engagement.score

    return {
      subCriteriaId: 'capacite-delais',
      score: totalScore,
      maxPoints: 30,
      controlPointScores,
    }
  }

  /**
   * Historique Performance (20 points)
   */
  private async scoreHistoriquePerformance(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const reputation = enrichmentData.company?.reputation

    // Taux respect délais antérieur (15 pts)
    // Nécessiterait base de données historique TORP
    // Pour l'instant, estimation depuis réputation
    if (reputation?.averageRating) {
      const rating = reputation.averageRating
      // Hypothèse : bonne réputation = bon respect délais
      if (rating >= 4.5) {
        score += 15
        justification += 'Historique excellent (estimé depuis réputation). '
      } else if (rating >= 4.0) {
        score += 12
        justification += 'Historique bon (estimé depuis réputation). '
      } else if (rating >= 3.5) {
        score += 8
        justification += 'Historique moyen (estimé depuis réputation). '
      } else {
        score += 4
        justification += 'Historique à surveiller (estimé depuis réputation). '
      }
    } else {
      score += 10
      justification += 'Historique non vérifiable. '
    }

    // Gestion imprévus (5 pts)
    score += 3
    justification += 'Gestion imprévus non vérifiable. '

    return {
      controlPointId: 'historique-performance',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: reputation ? 60 : 40,
    }
  }

  /**
   * Engagement Contractuel (10 points)
   */
  private async scoreEngagementContractuel(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Pénalités équilibrées (5 pts)
    const hasPenalties = text.includes('pénalité') ||
                        text.includes('retard') ||
                        text.includes('sanction')
    if (hasPenalties) {
      score += 4
      justification += 'Pénalités de retard mentionnées. '
    } else {
      score += 2
      justification += 'Pénalités de retard non mentionnées. '
    }

    // Bonus anticipation (5 pts)
    const hasBonus = text.includes('bonus') ||
                    text.includes('prime') ||
                    text.includes('anticipation')
    if (hasBonus) {
      score += 4
      justification += 'Bonus anticipation mentionné. '
    } else {
      score += 2
      justification += 'Pas de bonus anticipation. '
    }

    return {
      controlPointId: 'engagement-contractuel',
      score: Math.round(score),
      maxPoints: 10,
      justification,
      confidence: 55,
    }
  }
}

