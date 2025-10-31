/**
 * AXE 5 : TRANSPARENCE & COMMUNICATION (100 points - 8%)
 * 
 * 5.1 Qualité Documentation (50 points)
 * 5.2 Relation Client (30 points)
 * 5.3 Suivi Projet (20 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe5Transparence {
  async calculate(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []

    // 5.1 Qualité Documentation (50 points)
    const documentation = await this.calculateDocumentation(devis, _enrichmentData)
    subCriteriaScores.push(documentation)

    // 5.2 Relation Client (30 points)
    const relation = await this.calculateRelationClient(devis, _enrichmentData)
    subCriteriaScores.push(relation)

    // 5.3 Suivi Projet (20 points)
    const suivi = await this.calculateSuiviProjet(devis, _enrichmentData)
    subCriteriaScores.push(suivi)

    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)

    return {
      axisId: 'transparence',
      score: totalScore,
      maxPoints: 100,
      percentage: (totalScore / 100) * 100,
      subCriteriaScores,
      alerts: [],
      recommendations: [],
    }
  }

  /**
   * 5.1 Qualité Documentation (50 points)
   */
  private async calculateDocumentation(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Clarté Devis (30 points)
    const clarte = await this.scoreClarteDevis(devis)
    controlPointScores.push(clarte)
    totalScore += clarte.score

    // Plans & Techniques (20 points)
    const plans = await this.scorePlansTechniques(devis)
    controlPointScores.push(plans)
    totalScore += plans.score

    return {
      subCriteriaId: 'documentation',
      score: totalScore,
      maxPoints: 50,
      controlPointScores,
    }
  }

  /**
   * Clarté Devis (30 points)
   */
  private async scoreClarteDevis(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const items = (devis.extractedData as any)?.items || []

    // Descriptif détaillé (15 pts)
    let detailedItems = 0
    let totalDescriptions = 0
    for (const item of items) {
      const desc = item.description || ''
      if (desc.length > 30) {
        detailedItems++
      }
      totalDescriptions += desc.length
    }

    const avgDescriptionLength = items.length > 0 ? totalDescriptions / items.length : 0
    const detailRate = items.length > 0 ? detailedItems / items.length : 0

    if (detailRate >= 0.7 && avgDescriptionLength >= 50) {
      score += 15
      justification += `Descriptifs très détaillés (${Math.round(detailRate * 100)}% items détaillés). `
    } else if (detailRate >= 0.5 && avgDescriptionLength >= 30) {
      score += 10
      justification += `Descriptifs corrects (${Math.round(detailRate * 100)}% items détaillés). `
    } else {
      score += 5
      justification += `Descriptifs insuffisants (${Math.round(detailRate * 100)}% items détaillés). `
    }

    // Références matériaux (15 pts)
    let hasReferences = 0
    for (const item of items) {
      const desc = (item.description || '').toLowerCase()
      if (desc.match(/marque|réf|modèle|référence/i) || item.unitPrice) {
        hasReferences++
      }
    }

    const refRate = items.length > 0 ? hasReferences / items.length : 0
    if (refRate >= 0.6) {
      score += 15
      justification += `${Math.round(refRate * 100)}% d'items avec références. `
    } else if (refRate >= 0.3) {
      score += 9
      justification += `${Math.round(refRate * 100)}% d'items avec références. `
    } else {
      score += 4
      justification += `Peu de références matériaux (${Math.round(refRate * 100)}%). `
    }

    return {
      controlPointId: 'clarte-devis',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: items.length > 0 ? 80 : 50,
    }
  }

  /**
   * Plans & Techniques (20 points)
   */
  private async scorePlansTechniques(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Documents techniques (10 pts)
    const hasTechnicalDocs = text.includes('plan') ||
                            text.includes('schéma') ||
                            text.includes('détail') ||
                            text.includes('coupe') ||
                            text.includes('façade')
    if (hasTechnicalDocs) {
      score += 9
      justification += 'Documents techniques mentionnés. '
    } else {
      score += 4
      justification += 'Documents techniques non mentionnés. '
    }

    // Notices & modes d'emploi (10 pts)
    const hasNotices = text.includes('notice') ||
                     text.includes('mode d\'emploi') ||
                     text.includes('manuel') ||
                     text.includes('maintenance')
    if (hasNotices) {
      score += 8
      justification += 'Notices/maintenance mentionnées. '
    } else {
      score += 4
      justification += 'Notices/maintenance non mentionnées. '
    }

    return {
      controlPointId: 'plans-techniques',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: 70,
    }
  }

  /**
   * 5.2 Relation Client (30 points)
   */
  private async calculateRelationClient(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Professionnalisme (20 points)
    const professionnalisme = await this.scoreProfessionnalisme(devis, _enrichmentData)
    controlPointScores.push(professionnalisme)
    totalScore += professionnalisme.score

    // Réactivité (10 points)
    const reactivite = await this.scoreReactivite(devis)
    controlPointScores.push(reactivite)
    totalScore += reactivite.score

    return {
      subCriteriaId: 'relation-client',
      score: totalScore,
      maxPoints: 30,
      controlPointScores,
    }
  }

  /**
   * Professionnalisme (20 points)
   */
  private async scoreProfessionnalisme(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const company = (devis.extractedData as any)?.company || {}

    // Qualité présentation (10 pts)
    const hasCompleteInfo = company.name && 
                           (company.siret || company.address) &&
                           (company.phone || company.email)
    
    if (hasCompleteInfo) {
      score += 9
      justification += 'Informations entreprise complètes. '
    } else {
      score += 5
      justification += 'Informations entreprise incomplètes. '
    }

    // Expertise conseil (10 pts)
    const text = JSON.stringify(devis.extractedData).toLowerCase()
    const hasAdvice = text.includes('conseil') ||
                     text.includes('recommandation') ||
                     text.includes('suggestion') ||
                     text.includes('alternative')
    if (hasAdvice) {
      score += 9
      justification += 'Conseils et recommandations présents. '
    } else {
      score += 5
      justification += 'Peu de conseils personnalisés. '
    }

    return {
      controlPointId: 'professionnalisme',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: 75,
    }
  }

  /**
   * Réactivité (10 points)
   */
  private async scoreReactivite(devis: Devis): Promise<ControlPointScore> {
    let score = 5 // Score neutre par défaut
    let justification = 'Réactivité non mesurable depuis le devis. '

    // Dans un contexte réel, on pourrait vérifier :
    // - Délai de réponse à la demande
    // - Historique de réactivité de l'entreprise
    // - Disponibilité des moyens de contact

    const company = (devis.extractedData as any)?.company || {}
    if (company.phone && company.email) {
      score += 2
      justification = 'Moyens de contact disponibles. '
    }

    return {
      controlPointId: 'reactivite',
      score: Math.round(score),
      maxPoints: 10,
      justification,
      confidence: 40,
    }
  }

  /**
   * 5.3 Suivi Projet (20 points)
   */
  private async calculateSuiviProjet(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Accompagnement (15 points)
    const accompagnement = await this.scoreAccompagnement(devis)
    controlPointScores.push(accompagnement)
    totalScore += accompagnement.score

    // Service Après-Vente (5 points)
    const sav = await this.scoreSAV(devis)
    controlPointScores.push(sav)
    totalScore += sav.score

    return {
      subCriteriaId: 'suivi-projet',
      score: totalScore,
      maxPoints: 20,
      controlPointScores,
    }
  }

  /**
   * Accompagnement (15 points)
   */
  private async scoreAccompagnement(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Points d'étape (8 pts)
    const hasMilestones = text.includes('jalon') ||
                        text.includes('étape') ||
                        text.includes('point d\'étape') ||
                        text.includes('reporting')
    if (hasMilestones) {
      score += 7
      justification += 'Points d\'étape mentionnés. '
    } else {
      score += 3
      justification += 'Points d\'étape non mentionnés. '
    }

    // Communication proactive (7 pts)
    const hasCommunication = text.includes('communication') ||
                            text.includes('information') ||
                            text.includes('suivi régulier')
    if (hasCommunication) {
      score += 6
      justification += 'Communication proactive mentionnée. '
    } else {
      score += 3
      justification += 'Communication proactive non explicitée. '
    }

    return {
      controlPointId: 'accompagnement',
      score: Math.round(score),
      maxPoints: 15,
      justification,
      confidence: 60,
    }
  }

  /**
   * Service Après-Vente (5 points)
   */
  private async scoreSAV(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // SAV organisé (3 pts)
    const hasSAV = text.includes('sav') ||
                  text.includes('service après vente') ||
                  text.includes('intervention') ||
                  text.includes('dépannage')
    if (hasSAV) {
      score += 3
      justification += 'SAV mentionné. '
    } else {
      score += 1
      justification += 'SAV non mentionné. '
    }

    // Maintenance (2 pts)
    const hasMaintenance = text.includes('maintenance') ||
                          text.includes('entretien') ||
                          text.includes('contrat maintenance')
    if (hasMaintenance) {
      score += 2
      justification += 'Maintenance mentionnée. '
    } else {
      score += 0
      justification += 'Maintenance non mentionnée. '
    }

    return {
      controlPointId: 'sav',
      score: Math.round(score),
      maxPoints: 5,
      justification,
      confidence: 50,
    }
  }
}

