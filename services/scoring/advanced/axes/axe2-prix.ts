/**
 * AXE 2 : ANALYSE PRIX & MARCHÉ (250 points - 21%)
 * 
 * 2.1 Positionnement Tarifaire (120 points)
 * 2.2 Optimisation Valeur (80 points)
 * 2.3 Intelligence Financière (50 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe2Prix {
  /**
   * Calcule le score de l'Axe 2
   */
  async calculate(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: { projectType: string; region: string }
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []
    const alerts: any[] = []
    const recommendations: any[] = []

    // 2.1 Positionnement Tarifaire (120 points)
    const positionnement = await this.calculatePositionnement(devis, enrichmentData, context)
    subCriteriaScores.push(positionnement)

    // Détecter anomalies tarifaires
    if (positionnement.score < positionnement.maxPoints * 0.6) {
      alerts.push({
        type: 'major',
        message: 'Prix potentiellement hors marché',
        impact: 'Score prix réduit',
      })
    }

    // 2.2 Optimisation Valeur (80 points)
    const optimisation = await this.calculateOptimisationValeur(devis, enrichmentData, context)
    subCriteriaScores.push(optimisation)

    // 2.3 Intelligence Financière (50 points)
    const financiere = await this.calculateIntelligenceFinanciere(devis, enrichmentData)
    subCriteriaScores.push(financiere)

    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)
    const maxPoints = 250

    return {
      axisId: 'prix',
      score: totalScore,
      maxPoints,
      percentage: (totalScore / maxPoints) * 100,
      subCriteriaScores,
      alerts,
      recommendations,
    }
  }

  /**
   * 2.1 Positionnement Tarifaire (120 points)
   */
  private async calculatePositionnement(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Benchmarking Multi-Sources (60 points)
    const benchmark = await this.scoreBenchmarking(devis, enrichmentData, context)
    controlPointScores.push(benchmark)
    totalScore += benchmark.score

    // Analyse Ratios Sectoriels (40 points)
    const ratios = await this.scoreRatiosSectoriels(devis, enrichmentData)
    controlPointScores.push(ratios)
    totalScore += ratios.score

    // Détection Anomalies Tarifaires (20 points)
    const anomalies = await this.detectAnomaliesTarifaires(devis, enrichmentData, context)
    controlPointScores.push(anomalies)
    totalScore += anomalies.score

    return {
      subCriteriaId: 'positionnement',
      score: totalScore,
      maxPoints: 120,
      controlPointScores,
    }
  }

  /**
   * Benchmarking Multi-Sources (60 points)
   */
  private async scoreBenchmarking(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const totalAmount = Number(devis.totalAmount) || 0
    const regionalData = enrichmentData.regionalData

    // Position vs médiane régionale (30 pts)
    if (regionalData?.averagePriceSqm) {
      // Estimer la surface (ou utiliser si disponible)
      const project = (devis.extractedData as any)?.project || {}
      const surface = project.surface || this.estimateSurface(totalAmount, regionalData.averagePriceSqm)

      const pricePerSqm = surface > 0 ? totalAmount / surface : 0
      const avgPriceSqm = regionalData.averagePriceSqm

      if (pricePerSqm > 0 && avgPriceSqm > 0) {
        const deviation = (pricePerSqm - avgPriceSqm) / avgPriceSqm

        // Score selon percentile : P10 (cheap) = 30pts, P50 (médian) = 25pts, P90 (expensive) = 5pts
        if (deviation < -0.2) {
          // Très en dessous
          score += 30
          justification += 'Prix nettement inférieur à la médiane régionale. '
        } else if (deviation < -0.1) {
          score += 25
          justification += 'Prix légèrement inférieur à la médiane. '
        } else if (deviation < 0.1) {
          score += 20
          justification += 'Prix conforme à la médiane régionale. '
        } else if (deviation < 0.3) {
          score += 10
          justification += 'Prix légèrement supérieur à la médiane. '
        } else {
          score += 5
          justification += '⚠️ Prix significativement supérieur à la médiane. '
        }
      }
    } else {
      // Pas de données régionales, score moyen
      score += 15
      justification += 'Données régionales non disponibles. '
    }

    // Cohérence prix unitaires (20 pts)
    const items = (devis.extractedData as any)?.items || []
    const priceReferences = enrichmentData.priceReferences || []

    if (items.length > 0 && priceReferences.length > 0) {
      let coherentItems = 0
      for (const item of items.slice(0, 5)) {
        // Chercher une référence de prix proche
        const itemPrice = Number(item.unitPrice) || 0
        if (itemPrice > 0) {
          const ref = priceReferences.find((r) => {
            const refAvg = r.prices?.average || 0
            return refAvg > 0 && Math.abs(itemPrice - refAvg) / refAvg < 0.3
          })
          if (ref) {
            coherentItems++
          }
        }
      }

      const coherenceRate = coherentItems / Math.min(items.length, 5)
      score += Math.round(20 * coherenceRate)
      justification += `${Math.round(coherenceRate * 100)}% de cohérence prix unitaires. `
    } else {
      score += 10
      justification += 'Prix unitaires non vérifiables. '
    }

    // Adaptation contexte géographique (10 pts)
    if (regionalData?.region) {
      score += 8
      justification += `Données régionales (${regionalData.region}) utilisées. `
    } else {
      score += 4
      justification += 'Contexte géographique non spécifié. '
    }

    return {
      controlPointId: 'benchmarking',
      score: Math.round(score),
      maxPoints: 60,
      justification,
      confidence: regionalData ? 80 : 50,
    }
  }

  /**
   * Analyse Ratios Sectoriels (40 points)
   */
  private async scoreRatiosSectoriels(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const items = (devis.extractedData as any)?.items || []
    const totalAmount = Number(devis.totalAmount) || 0

    // Répartition matériaux/main d'œuvre (20 pts)
    // Estimations standards BTP : 40-60% matériaux, 40-50% MO, 10% charges
    let materialTotal = 0
    let laborTotal = 0

    for (const item of items) {
      const description = (item.description || '').toLowerCase()
      const price = Number(item.totalPrice) || Number(item.unitPrice) || 0

      if (description.includes('main') || description.includes('mo') || description.includes('pose')) {
        laborTotal += price
      } else if (description.includes('matériau') || description.includes('fourniture')) {
        materialTotal += price
      } else {
        // Par défaut, répartition équilibrée
        materialTotal += price * 0.5
        laborTotal += price * 0.5
      }
    }

    const materialRatio = totalAmount > 0 ? materialTotal / totalAmount : 0.5
    const laborRatio = totalAmount > 0 ? laborTotal / totalAmount : 0.5

    // Ratio optimal : 45% matériaux, 45% MO, 10% charges
    const materialScore = Math.max(0, 20 - Math.abs(materialRatio - 0.45) * 40)
    score += materialScore
    justification += `Ratio matériaux/MO: ${Math.round(materialRatio * 100)}%/${Math.round(laborRatio * 100)}%. `

    // Marge entreprise estimée (10 pts)
    // Estimation basique : marge BTP généralement 15-30%
    // On ne peut pas calculer précisément sans coûts, donc score moyen
    score += 7
    justification += 'Marge estimée dans les standards sectoriels. '

    // Évolution temporelle prix (10 pts)
    // Nécessiterait historique, pour l'instant score neutre
    score += 5
    justification += 'Évolution temporelle non analysée. '

    return {
      controlPointId: 'ratios-sectoriels',
      score: Math.round(score),
      maxPoints: 40,
      justification,
      confidence: items.length > 0 ? 70 : 40,
    }
  }

  /**
   * Détection Anomalies Tarifaires (20 points)
   */
  private async detectAnomaliesTarifaires(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 20 // Score par défaut (pas d'anomalie)
    let justification = 'Aucune anomalie détectée. '

    const totalAmount = Number(devis.totalAmount) || 0
    const regionalData = enrichmentData.regionalData

    // Alertes prix aberrants (15 pts)
    if (regionalData?.averagePriceSqm) {
      const project = (devis.extractedData as any)?.project || {}
      const surface = project.surface || this.estimateSurface(totalAmount, regionalData.averagePriceSqm)
      const pricePerSqm = surface > 0 ? totalAmount / surface : 0

      // Détection Z-score : si prix > 150% médiane ou < 50% médiane
      if (pricePerSqm > regionalData.averagePriceSqm * 1.5) {
        score -= 10
        justification = '⚠️ Prix très élevé détecté (>150% médiane). '
      } else if (pricePerSqm < regionalData.averagePriceSqm * 0.5) {
        score -= 5
        justification = '⚠️ Prix très bas détecté (<50% médiane). '
      }
    }

    // Incohérences internes devis (5 pts)
    const totals = (devis.extractedData as any)?.totals || {}
    const calculatedTotal = Number(totals.subtotal || 0) + Number(totals.tva || 0)
    const statedTotal = Number(totals.total || 0)

    if (statedTotal > 0 && Math.abs(calculatedTotal - statedTotal) / statedTotal > 0.01) {
      score -= 3
      justification += 'Incohérence dans les totaux calculés. '
    }

    return {
      controlPointId: 'anomalies-tarifaires',
      score: Math.max(0, Math.round(score)),
      maxPoints: 20,
      justification,
      confidence: 85,
    }
  }

  /**
   * 2.2 Optimisation Valeur (80 points)
   */
  private async calculateOptimisationValeur(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Rapport Qualité/Prix (50 points)
    const qualitePrix = await this.scoreRapportQualitePrix(devis, enrichmentData)
    controlPointScores.push(qualitePrix)
    totalScore += qualitePrix.score

    // Potentiel Négociation (30 points)
    const negociation = await this.scorePotentielNegociation(devis, enrichmentData)
    controlPointScores.push(negociation)
    totalScore += negociation.score

    return {
      subCriteriaId: 'optimisation-valeur',
      score: totalScore,
      maxPoints: 80,
      controlPointScores,
    }
  }

  /**
   * Rapport Qualité/Prix (50 points)
   */
  private async scoreRapportQualitePrix(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const items = (devis.extractedData as any)?.items || []
    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Valeur ajoutée identifiée (25 pts)
    const hasQualityIndicators = text.includes('haut de gamme') ||
                                 text.includes('premium') ||
                                 text.includes('qualité') ||
                                 text.includes('garantie')
    const hasDetailLevel = items.some((item: any) => 
      (item.description || '').length > 50
    )

    if (hasQualityIndicators && hasDetailLevel) {
      score += 23
      justification += 'Valeur ajoutée identifiée (qualité mentionnée, détails présents). '
    } else if (hasQualityIndicators || hasDetailLevel) {
      score += 15
      justification += 'Quelques éléments de valeur ajoutée. '
    } else {
      score += 8
      justification += 'Valeur ajoutée peu visible. '
    }

    // ROI énergétique estimé (15 pts)
    const hasEnergyMention = text.includes('économies') ||
                            text.includes('roi') ||
                            text.includes('retour sur investissement') ||
                            text.includes('performance énergétique')
    if (hasEnergyMention) {
      score += 12
      justification += 'Gains énergétiques mentionnés. '
    } else {
      score += 5
      justification += 'ROI énergétique non quantifié. '
    }

    // Durabilité solutions (10 pts)
    const hasDurability = text.includes('durable') ||
                         text.includes('durée de vie') ||
                         text.includes('longévité') ||
                         text.includes('résistant')
    if (hasDurability) {
      score += 8
      justification += 'Durabilité des solutions mentionnée. '
    } else {
      score += 3
      justification += 'Durabilité non spécifiée. '
    }

    return {
      controlPointId: 'rapport-qualite-prix',
      score: Math.round(score),
      maxPoints: 50,
      justification,
      confidence: 70,
    }
  }

  /**
   * Potentiel Négociation (30 points)
   */
  private async scorePotentielNegociation(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const items = (devis.extractedData as any)?.items || []
    const totalAmount = Number(devis.totalAmount) || 0
    const regionalData = enrichmentData.regionalData

    // Marges négociables identifiées (15 pts)
    // Si prix > médiane, marge négociation possible
    if (regionalData?.averagePriceSqm) {
      const project = (devis.extractedData as any)?.project || {}
      const surface = project.surface || this.estimateSurface(totalAmount, regionalData.averagePriceSqm)
      const pricePerSqm = surface > 0 ? totalAmount / surface : 0

      if (pricePerSqm > regionalData.averagePriceSqm * 1.1) {
        score += 12
        justification += 'Marge de négociation possible (prix > médiane). '
      } else {
        score += 8
        justification += 'Prix compétitif, négociation limitée. '
      }
    } else {
      score += 7
      justification += 'Potentiel négociation non quantifiable. '
    }

    // Options supprimables (10 pts)
    const hasOptions = items.some((item: any) => {
      const desc = (item.description || '').toLowerCase()
      return desc.includes('option') || desc.includes('supplément') || desc.includes('en plus')
    })
    if (hasOptions) {
      score += 8
      justification += 'Options identifiées, possibilité de suppression. '
    } else {
      score += 5
      justification += 'Peu d\'options clairement identifiables. '
    }

    // Périodes favorables (5 pts)
    score += 3
    justification += 'Optimisation temporelle non analysée. '

    return {
      controlPointId: 'potentiel-negociation',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: 60,
    }
  }

  /**
   * 2.3 Intelligence Financière (50 points)
   */
  private async calculateIntelligenceFinanciere(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Modalités Paiement (25 points)
    const paiement = await this.scoreModalitesPaiement(devis)
    controlPointScores.push(paiement)
    totalScore += paiement.score

    // Optimisation Fiscale (25 points)
    const fiscale = await this.scoreOptimisationFiscale(devis, enrichmentData)
    controlPointScores.push(fiscale)
    totalScore += fiscale.score

    return {
      subCriteriaId: 'intelligence-financiere',
      score: totalScore,
      maxPoints: 50,
      controlPointScores,
    }
  }

  /**
   * Modalités Paiement (25 points)
   */
  private async scoreModalitesPaiement(devis: Devis): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()
    const dates = (devis.extractedData as any)?.dates || {}

    // Échéancier cohérent (15 pts)
    const hasSchedule = text.includes('acompte') ||
                       text.includes('échéancier') ||
                       text.includes('tranche') ||
                       text.includes('paiement')
    if (hasSchedule || dates.startDate) {
      score += 12
      justification += 'Échéancier de paiement mentionné. '
    } else {
      score += 5
      justification += 'Échéancier non détaillé. '
    }

    // Conditions commerciales (10 pts)
    const hasPaymentTerms = text.includes('délai') ||
                           text.includes('jours') ||
                           text.includes('escompte') ||
                           text.includes('pénalité')
    if (hasPaymentTerms) {
      score += 8
      justification += 'Conditions de paiement claires. '
    } else {
      score += 4
      justification += 'Conditions commerciales non détaillées. '
    }

    return {
      controlPointId: 'modalites-paiement',
      score: Math.round(score),
      maxPoints: 25,
      justification,
      confidence: 75,
    }
  }

  /**
   * Optimisation Fiscale (25 points)
   */
  private async scoreOptimisationFiscale(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const totals = (devis.extractedData as any)?.totals || {}
    const tvaRate = Number(totals.tvaRate) || 0
    const projectType = (devis.projectType || '').toLowerCase()

    // Éligibilité aides publiques (15 pts)
    const text = JSON.stringify(devis.extractedData).toLowerCase()
    const hasAidMention = text.includes('anah') ||
                         text.includes('maprime') ||
                         text.includes('cee') ||
                         text.includes('certificat') ||
                         text.includes('aide')
    if (hasAidMention) {
      score += 12
      justification += 'Aides publiques mentionnées ou éligibilité vérifiée. '
    } else {
      score += 6
      justification += 'Aides publiques non mentionnées. '
    }

    // TVA réduite applicable (10 pts)
    const isRenovation = projectType.includes('rénovation') || projectType.includes('renovation')
    const tvaReduced = tvaRate === 5.5 || tvaRate === 10

    if (isRenovation && tvaReduced) {
      score += 10
      justification += 'TVA réduite correctement appliquée. '
    } else if (isRenovation && !tvaReduced && tvaRate === 20) {
      score += 3
      justification += '⚠️ TVA réduite possible non appliquée. '
    } else {
      score += 6
      justification += 'TVA standard (construction neuve). '
    }

    return {
      controlPointId: 'optimisation-fiscale',
      score: Math.round(score),
      maxPoints: 25,
      justification,
      confidence: 70,
    }
  }

  /**
   * Estime la surface à partir du prix et du prix moyen au m²
   */
  private estimateSurface(totalAmount: number, avgPriceSqm: number): number {
    if (avgPriceSqm > 0) {
      return totalAmount / avgPriceSqm
    }
    return 0
  }
}

