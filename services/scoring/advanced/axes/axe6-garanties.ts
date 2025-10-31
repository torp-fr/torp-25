/**
 * AXE 6 : GARANTIES & ASSURANCES (80 points - 7%)
 * 
 * 6.1 Couvertures Légales (50 points)
 * 6.2 Extensions & Garanties Commerciales (30 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe6Garanties {
  async calculate(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []
    const alerts: any[] = []

    // 6.1 Couvertures Légales (50 points)
    const legales = await this.calculateCouverturesLegales(devis, enrichmentData)
    subCriteriaScores.push(legales)

    if (legales.score < legales.maxPoints * 0.6) {
      alerts.push({
        type: 'major',
        message: 'Garanties légales incomplètes ou insuffisantes',
        impact: 'Protection client réduite',
      })
    }

    // 6.2 Extensions & Garanties Commerciales (30 points)
    const extensions = await this.calculateExtensions(devis, enrichmentData)
    subCriteriaScores.push(extensions)

    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)

    return {
      axisId: 'garanties',
      score: totalScore,
      maxPoints: 80,
      percentage: (totalScore / 80) * 100,
      subCriteriaScores,
      alerts,
      recommendations: [],
    }
  }

  /**
   * 6.1 Couvertures Légales (50 points)
   */
  private async calculateCouverturesLegales(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Garanties Obligatoires (35 points)
    const garanties = await this.scoreGarantiesObligatoires(devis, enrichmentData)
    controlPointScores.push(garanties)
    totalScore += garanties.score

    // Assurances Professionnelles (15 points)
    const assurances = await this.scoreAssurancesProfessionnelles(devis, enrichmentData)
    controlPointScores.push(assurances)
    totalScore += assurances.score

    return {
      subCriteriaId: 'couvertures-legales',
      score: totalScore,
      maxPoints: 50,
      controlPointScores,
    }
  }

  /**
   * Garanties Obligatoires (35 points)
   */
  private async scoreGarantiesObligatoires(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()
    const legalMentions = (devis.extractedData as any)?.legalMentions || {}

    // Garantie décennale (15 pts)
    if (legalMentions.hasInsurance || text.includes('décennale')) {
      score += 15
      justification += 'Garantie décennale mentionnée. '

      // Vérifier montant si disponible
      const totalAmount = Number(devis.totalAmount) || 0
      // La décennale doit généralement couvrir au moins le montant des travaux
      if (totalAmount > 0) {
        score += 2
        justification += 'Montant probablement couvert. '
      }
    } else {
      justification += '⚠️ Garantie décennale non vérifiée. '
    }

    // Garantie parfait achèvement (10 pts)
    if (text.includes('parfait achèvement') || text.includes('réception')) {
      score += 10
      justification += 'Garantie parfait achèvement mentionnée. '
    } else {
      score += 5
      justification += 'Garantie parfait achèvement non explicitée. '
    }

    // Garantie biennale (10 pts)
    if (text.includes('biennal') || text.includes('2 ans') || text.includes('deux ans')) {
      score += 10
      justification += 'Garantie biennale mentionnée. '
    } else {
      score += 4
      justification += 'Garantie biennale non mentionnée. '
    }

    return {
      controlPointId: 'garanties-obligatoires',
      score: Math.round(score),
      maxPoints: 35,
      justification,
      confidence: 75,
    }
  }

  /**
   * Assurances Professionnelles (15 points)
   */
  private async scoreAssurancesProfessionnelles(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const legalMentions = (devis.extractedData as any)?.legalMentions || {}
    const company = enrichmentData.company

    // Montants adaptés (10 pts)
    if (legalMentions.hasInsurance || company?.insurances?.hasRC) {
      score += 9
      justification += 'Assurances professionnelles présentes. '

      // Vérifier adéquation montants si données disponibles
      const totalAmount = Number(devis.totalAmount) || 0
      const decennaleAmount = company?.insurances?.decennaleAmount

      if (decennaleAmount && totalAmount > 0) {
        if (decennaleAmount >= totalAmount) {
          score += 1
          justification += 'Montants adéquats. '
        } else {
          justification += '⚠️ Montant décennale peut-être insuffisant. '
        }
      }
    } else {
      score += 3
      justification += 'Assurances professionnelles non vérifiées. '
    }

    // Historique sinistres (5 pts)
    // Nécessiterait données historiques, pour l'instant score neutre
    score += 3
    justification += 'Historique sinistres non vérifiable. '

    return {
      controlPointId: 'assurances-professionnelles',
      score: Math.round(score),
      maxPoints: 15,
      justification,
      confidence: 60,
    }
  }

  /**
   * 6.2 Extensions & Garanties Commerciales (30 points)
   */
  private async calculateExtensions(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Garanties Étendues (20 points)
    const etendues = await this.scoreGarantiesEtendues(devis)
    controlPointScores.push(etendues)
    totalScore += etendues.score

    // Protection Financière (10 points)
    const financiere = await this.scoreProtectionFinanciere(devis)
    controlPointScores.push(financiere)
    totalScore += financiere.score

    return {
      subCriteriaId: 'extensions',
      score: totalScore,
      maxPoints: 30,
      controlPointScores,
    }
  }

  /**
   * Garanties Étendues (20 points)
   */
  private async scoreGarantiesEtendues(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Garanties fabricants (10 pts)
    const hasManufacturerWarranty = text.includes('garantie fabricant') ||
                                   text.includes('garantie constructeur') ||
                                   text.includes('warranty')
    if (hasManufacturerWarranty) {
      score += 9
      justification += 'Garanties fabricants mentionnées. '
    } else {
      score += 4
      justification += 'Garanties fabricants non mentionnées. '
    }

    // Extensions durée (10 pts)
    const hasExtendedWarranty = text.includes('garantie étendue') ||
                               text.includes('extension garantie') ||
                               text.includes('plus de') && text.includes('ans')
    if (hasExtendedWarranty) {
      score += 9
      justification += 'Garanties étendues proposées. '
    } else {
      score += 4
      justification += 'Pas de garanties étendues mentionnées. '
    }

    return {
      controlPointId: 'garanties-etendues',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: 65,
    }
  }

  /**
   * Protection Financière (10 points)
   */
  private async scoreProtectionFinanciere(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()
    const totals = (devis.extractedData as any)?.totals || {}

    // Garantie financière achèvement (5 pts)
    // Généralement requise si acomptes > 30%
    const hasAdvance = text.includes('acompte') || text.includes('avance')
    if (hasAdvance) {
      const hasFinancialGuarantee = text.includes('garantie financière') ||
                                    text.includes('caution') ||
                                    text.includes('soumission')
      if (hasFinancialGuarantee) {
        score += 5
        justification += 'Garantie financière mentionnée. '
      } else {
        score += 2
        justification += 'Acompte mentionné mais garantie financière non explicitée. '
      }
    } else {
      score += 3
      justification += 'Acomptes non mentionnés. '
    }

    // Assurance dommages ouvrage (5 pts)
    const hasDO = text.includes('dommages ouvrage') ||
                 text.includes('do') ||
                 text.includes('assurance do')
    if (hasDO) {
      score += 5
      justification += 'Assurance dommages ouvrage mentionnée. '
    } else {
      score += 2
      justification += 'Assurance DO non mentionnée. '
    }

    return {
      controlPointId: 'protection-financiere',
      score: Math.round(score),
      maxPoints: 10,
      justification,
      confidence: 70,
    }
  }
}

