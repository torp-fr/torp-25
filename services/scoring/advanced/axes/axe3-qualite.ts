/**
 * AXE 3 : QUALITÉ & RÉPUTATION ENTREPRISE (200 points - 17%)
 * 
 * 3.1 Solidité Financière (80 points)
 * 3.2 Réputation & Références (70 points)
 * 3.3 Capital Humain & Organisation (50 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe3Qualite {
  async calculate(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: { projectType: string; projectAmount: string }
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []
    const alerts: any[] = []
    const recommendations: any[] = []

    // 3.1 Solidité Financière (80 points)
    const solidite = await this.calculateSoliditeFinanciere(devis, enrichmentData, context)
    subCriteriaScores.push(solidite)

    // Alerte si risque financier élevé
    if (solidite.score < solidite.maxPoints * 0.5) {
      alerts.push({
        type: 'critical',
        message: 'Risque financier détecté - Entreprise en difficulté potentielle',
        impact: 'Score qualité entreprise réduit',
      })
    }

    // 3.2 Réputation & Références (70 points)
    const reputation = await this.calculateReputation(devis, enrichmentData)
    subCriteriaScores.push(reputation)

    // 3.3 Capital Humain & Organisation (50 points)
    const capitalHumain = await this.calculateCapitalHumain(devis, enrichmentData, context)
    subCriteriaScores.push(capitalHumain)

    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)

    return {
      axisId: 'qualite',
      score: totalScore,
      maxPoints: 200,
      percentage: (totalScore / 200) * 100,
      subCriteriaScores,
      alerts,
      recommendations,
    }
  }

  /**
   * 3.1 Solidité Financière (80 points)
   */
  private async calculateSoliditeFinanciere(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Santé Économique (50 points)
    const sante = await this.scoreSanteEconomique(devis, enrichmentData, context)
    controlPointScores.push(sante)
    totalScore += sante.score

    // Prédiction Défaillance (30 points)
    const defaillance = await this.scorePredictionDefaillance(devis, enrichmentData)
    controlPointScores.push(defaillance)
    totalScore += defaillance.score

    return {
      subCriteriaId: 'solidite-financiere',
      score: totalScore,
      maxPoints: 80,
      controlPointScores,
    }
  }

  /**
   * Santé Économique (50 points)
   */
  private async scoreSanteEconomique(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const company = enrichmentData.company
    const financialData = company?.financialData
    const totalAmount = Number(devis.totalAmount) || 0

    // Évolution chiffre d'affaires (20 pts)
    if (financialData?.ca && financialData.ca.length >= 2) {
      const ca = financialData.ca
      const caLast = ca[0] || 0
      const caPrevious = ca[1] || caLast
      const caPrev2 = ca[2] || caPrevious

      if (caLast > 0 && caPrevious > 0) {
        const growth = (caLast - caPrevious) / caPrevious
        const growthPrev = caPrevious > 0 && caPrev2 > 0 ? (caPrevious - caPrev2) / caPrev2 : 0

        // Score selon croissance : croissance = bon, décroissance = mauvais
        if (growth > 0.1 && growthPrev >= 0) {
          score += 18
          justification += `CA en croissance (+${Math.round(growth * 100)}%). `
        } else if (growth > 0) {
          score += 12
          justification += `CA stable/croissance modérée (+${Math.round(growth * 100)}%). `
        } else if (growth > -0.1) {
          score += 8
          justification += `CA légèrement en baisse (${Math.round(growth * 100)}%). `
        } else {
          score += 3
          justification += `⚠️ CA en forte baisse (${Math.round(growth * 100)}%). `
        }
      }
    } else {
      score += 10
      justification += 'Données financières incomplètes. '
    }

    // Résultats financiers (15 pts)
    if (financialData?.result && financialData.result.length > 0) {
      const results = financialData.result
      const lastResult = results[0] || 0
      const avgResult = results.reduce((a, b) => a + b, 0) / results.length

      if (lastResult > 0 && avgResult > 0) {
        score += 15
        justification += 'Résultats financiers positifs. '
      } else if (lastResult > 0) {
        score += 10
        justification += 'Résultat récent positif. '
      } else {
        score += 5
        justification += '⚠️ Résultats financiers négatifs. '
      }
    } else {
      score += 7
      justification += 'Résultats financiers non disponibles. '
    }

    // Capacité projet (15 pts)
    if (financialData?.ca && financialData.ca.length > 0 && totalAmount > 0) {
      const caAnnuel = financialData.ca[0] || 0
      const ratio = totalAmount / caAnnuel

      // Ratio optimal : projet < 20% du CA annuel
      if (ratio < 0.2) {
        score += 15
        justification += `Projet représente ${Math.round(ratio * 100)}% du CA (capacité excellente). `
      } else if (ratio < 0.5) {
        score += 12
        justification += `Projet représente ${Math.round(ratio * 100)}% du CA (capacité bonne). `
      } else if (ratio < 1.0) {
        score += 7
        justification += `Projet représente ${Math.round(ratio * 100)}% du CA (capacité à surveiller). `
      } else {
        score += 2
        justification += `⚠️ Projet > CA annuel (${Math.round(ratio * 100)}%) - risque capacité. `
      }
    } else {
      score += 8
      justification += 'Capacité projet non vérifiable (données CA manquantes). '
    }

    return {
      controlPointId: 'sante-economique',
      score: Math.round(score),
      maxPoints: 50,
      justification,
      confidence: financialData ? 85 : 50,
    }
  }

  /**
   * Prédiction Défaillance (30 points)
   */
  private async scorePredictionDefaillance(
    _devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 30 // Score par défaut (pas de risque)
    let justification = 'Aucun risque majeur détecté. '

    const company = enrichmentData.company
    const financialScore = company?.financialScore
    const legalStatus = company?.legalStatusDetails

    // Score risque Banque de France (15 pts)
    if (financialScore?.banqueDeFrance) {
      const bdfScore = financialScore.banqueDeFrance
      // BDF : 3+ = bon, 4 = moyen, 5-7 = mauvais, 8-9 = très mauvais
      if (['3+', '4-', '3'].includes(bdfScore)) {
        score -= 0
        justification += `Score BDF: ${bdfScore} (favorable). `
      } else if (bdfScore === '4') {
        score -= 3
        justification += `Score BDF: ${bdfScore} (moyen). `
      } else if (['5', '6', '7'].includes(bdfScore)) {
        score -= 10
        justification += `⚠️ Score BDF: ${bdfScore} (dégradé). `
      } else {
        score -= 15
        justification += `🚨 Score BDF: ${bdfScore} (très dégradé). `
      }
    } else {
      score -= 2
      justification += 'Score BDF non disponible. '
    }

    // Modèle prédictif TORP (15 pts)
    if (financialScore?.torpPrediction !== undefined) {
      const riskLevel = financialScore.torpPrediction // 0-100 probabilité défaillance
      if (riskLevel < 10) {
        score -= 0
        justification += `Risque défaillance très faible (${riskLevel}%). `
      } else if (riskLevel < 25) {
        score -= 5
        justification += `Risque défaillance faible (${riskLevel}%). `
      } else if (riskLevel < 50) {
        score -= 10
        justification += `⚠️ Risque défaillance modéré (${riskLevel}%). `
      } else {
        score -= 15
        justification += `🚨 Risque défaillance élevé (${riskLevel}%). `
      }
    } else {
      // Calculer un risque basique depuis les données disponibles
      const hasFinancialIssues = legalStatus?.hasCollectiveProcedure ||
                                (company?.financialData?.result?.[0] || 0) < 0
      if (hasFinancialIssues) {
        score -= 8
        justification += 'Indicateurs financiers négatifs détectés. '
      }
    }

    return {
      controlPointId: 'prediction-defaillance',
      score: Math.max(0, Math.round(score)),
      maxPoints: 30,
      justification,
      confidence: financialScore ? 80 : 60,
    }
  }

  /**
   * 3.2 Réputation & Références (70 points)
   */
  private async calculateReputation(
    _devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Satisfaction Client (40 points)
    const satisfaction = await this.scoreSatisfactionClient(_devis, enrichmentData)
    controlPointScores.push(satisfaction)
    totalScore += satisfaction.score

    // Portfolio & Réalisations (30 points)
    const portfolio = await this.scorePortfolio(_devis, enrichmentData)
    controlPointScores.push(portfolio)
    totalScore += portfolio.score

    return {
      subCriteriaId: 'reputation',
      score: totalScore,
      maxPoints: 70,
      controlPointScores,
    }
  }

  /**
   * Satisfaction Client (40 points)
   */
  private async scoreSatisfactionClient(
    _devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const reputation = enrichmentData.company?.reputation

    // Avis agrégés multi-sources (25 pts)
    if (reputation?.averageRating) {
      const rating = reputation.averageRating
      const numReviews = reputation.numberOfReviews || 0

      // Score selon note moyenne (0-5)
      if (rating >= 4.5 && numReviews >= 10) {
        score += 25
        justification += `Excellente réputation (${rating}/5, ${numReviews} avis). `
      } else if (rating >= 4.0 && numReviews >= 5) {
        score += 20
        justification += `Bonne réputation (${rating}/5, ${numReviews} avis). `
      } else if (rating >= 3.5) {
        score += 12
        justification += `Réputation moyenne (${rating}/5). `
      } else if (rating >= 3.0) {
        score += 6
        justification += `Réputation médiocre (${rating}/5). `
      } else {
        score += 2
        justification += `⚠️ Réputation faible (${rating}/5). `
      }

      // Bonus si beaucoup d'avis
      if (numReviews >= 50) {
        score = Math.min(25, score + 2)
      }
    } else {
      score += 12
      justification += 'Réputation non vérifiée (données indisponibles). '
    }

    // NPS estimé (15 pts)
    if (reputation?.nps !== undefined) {
      const nps = reputation.nps
      if (nps >= 50) {
        score += 15
        justification += `NPS excellent (${nps}). `
      } else if (nps >= 30) {
        score += 12
        justification += `NPS bon (${nps}). `
      } else if (nps >= 10) {
        score += 8
        justification += `NPS moyen (${nps}). `
      } else {
        score += 4
        justification += `NPS faible (${nps}). `
      }
    } else if (reputation?.averageRating) {
      // Estimer NPS depuis la note moyenne
      const rating = reputation.averageRating
      if (rating >= 4.5) {
        score += 12
      } else if (rating >= 4.0) {
        score += 9
      } else {
        score += 5
      }
      justification += 'NPS estimé depuis note moyenne. '
    } else {
      score += 5
      justification += 'NPS non calculable. '
    }

    return {
      controlPointId: 'satisfaction-client',
      score: Math.round(score),
      maxPoints: 40,
      justification,
      confidence: reputation ? 75 : 40,
    }
  }

  /**
   * Portfolio & Réalisations (30 points)
   */
  private async scorePortfolio(
    _devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const portfolio = enrichmentData.company?.portfolio

    // Références pertinentes (20 pts)
    if (portfolio?.similarProjects !== undefined) {
      const similarProjects = portfolio.similarProjects
      if (similarProjects >= 10) {
        score += 20
        justification += `${similarProjects} projets similaires référencés. `
      } else if (similarProjects >= 5) {
        score += 15
        justification += `${similarProjects} projets similaires référencés. `
      } else if (similarProjects >= 1) {
        score += 10
        justification += `${similarProjects} projet(s) similaire(s) référencé(s). `
      } else {
        score += 5
        justification += 'Peu de références similaires. '
      }
    } else {
      score += 10
      justification += 'Références non vérifiables. '
    }

    // Certifications qualité (10 pts)
    const certifications = enrichmentData.certifications || []
    const qualityCerts = certifications.filter((c) =>
      c.name.toLowerCase().includes('qualité') ||
      c.name.toLowerCase().includes('iso') ||
      c.name.toLowerCase().includes('label')
    )
    if (qualityCerts.length > 0) {
      score += 10
      justification += `${qualityCerts.length} certification(s) qualité. `
    } else {
      score += 4
      justification += 'Certifications qualité non mentionnées. '
    }

    return {
      controlPointId: 'portfolio',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: portfolio ? 70 : 50,
    }
  }

  /**
   * 3.3 Capital Humain & Organisation (50 points)
   */
  private async calculateCapitalHumain(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Moyens Humains (30 points)
    const humains = await this.scoreMoyensHumains(devis, enrichmentData, context)
    controlPointScores.push(humains)
    totalScore += humains.score

    // Moyens Matériels (20 points)
    const materiels = await this.scoreMoyensMateriels(devis, enrichmentData)
    controlPointScores.push(materiels)
    totalScore += materiels.score

    return {
      subCriteriaId: 'capital-humain',
      score: totalScore,
      maxPoints: 50,
      controlPointScores,
    }
  }

  /**
   * Moyens Humains (30 points)
   */
  private async scoreMoyensHumains(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const company = enrichmentData.company
    const totalAmount = Number(devis.totalAmount) || 0
    const employees = company?.humanResources?.employees || 
                     company?.humanResources?.linkedInEmployees

    // Effectifs adaptés (15 pts)
    if (employees !== undefined && totalAmount > 0) {
      // Estimation : pour un projet de X€, besoin d'environ Y employés
      // Ratio approximatif : 1 employé pour 100-200k€ de CA annuel
      const estimatedRequired = Math.ceil(totalAmount / 150000)
      
      if (employees >= estimatedRequired * 0.8) {
        score += 15
        justification += `Effectifs adéquats (${employees} employés pour projet de ${Math.round(totalAmount/1000)}k€). `
      } else if (employees >= estimatedRequired * 0.5) {
        score += 10
        justification += `Effectifs potentiellement limités (${employees} employés). `
      } else {
        score += 5
        justification += `⚠️ Effectifs peut-être insuffisants (${employees} employés). `
      }
    } else {
      score += 8
      justification += 'Effectifs non vérifiables. '
    }

    // Compétences techniques (15 pts)
    const certifications = company?.humanResources?.certifications || []
    const certificationsPro = enrichmentData.certifications || []
    const totalCerts = certifications.length + certificationsPro.length

    if (totalCerts >= 5) {
      score += 15
      justification += `Compétences certifiées (${totalCerts} certifications). `
    } else if (totalCerts >= 2) {
      score += 10
      justification += `Quelques certifications (${totalCerts}). `
    } else {
      score += 5
      justification += 'Compétences techniques non vérifiées. '
    }

    return {
      controlPointId: 'moyens-humains',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: employees !== undefined ? 75 : 50,
    }
  }

  /**
   * Moyens Matériels (20 points)
   */
  private async scoreMoyensMateriels(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    // Pour l'instant, score basique car nécessiterait données d'investissement matériel
    // À améliorer avec données Infogreffe (immobilisations) si disponibles
    
    score += 12
    justification += 'Équipements non vérifiables (données manquantes). '

    // Capacité logistique (10 pts)
    const company = enrichmentData.company
    if (company?.address?.region) {
      score += 8
      justification += `Localisation: ${company.address.region}. `
    } else {
      score += 5
      justification += 'Localisation non vérifiable. '
    }

    return {
      controlPointId: 'moyens-materiels',
      score: Math.round(score),
      maxPoints: 20,
      justification,
      confidence: 50,
    }
  }
}

