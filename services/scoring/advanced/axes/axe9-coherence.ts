/**
 * AXE 9 : COHÉRENCE DEMANDE/DEVIS (150 points - 11%)
 *
 * Analyse la cohérence entre la demande initiale du client
 * et le devis proposé par l'entreprise
 *
 * 9.1 Adéquation à la Demande (70 points)
 * 9.2 Analyse des Écarts (50 points)
 * 9.3 Compréhension du Besoin (30 points)
 */

import type { Devis } from '@/types'
import type {
  ScoringEnrichmentData,
  ControlPointScore,
  SubCriteriaScore,
  AxisScore,
  Alert,
  Recommendation,
} from '../types'

export interface CoherenceData {
  clientNeed: string // Besoin initial
  clientRequest: string // Demande précise
  needType: string // Type de besoin
  constraints?: {
    maxBudget?: number
    desiredDeadline?: string
    other?: string
  }
}

export class Axe9Coherence {
  /**
   * Calcule le score de l'Axe 9 - Cohérence
   */
  async calculate(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData,
    context: { projectType: string; coherenceData?: CoherenceData }
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []
    const alerts: Alert[] = []
    const recommendations: Recommendation[] = []

    // Si pas de données de cohérence, retourner score partiel
    if (!context.coherenceData) {
      return this.createPartialScore()
    }

    // 9.1 Adéquation à la Demande (70 points)
    const adequationScore = await this.calculateAdequation(devis, context.coherenceData)
    subCriteriaScores.push(adequationScore)
    this.extractAlertsAndRecommendations(adequationScore, alerts, recommendations)

    // 9.2 Analyse des Écarts (50 points)
    const ecartsScore = await this.calculateEcarts(devis, context.coherenceData)
    subCriteriaScores.push(ecartsScore)
    this.extractAlertsAndRecommendations(ecartsScore, alerts, recommendations)

    // 9.3 Compréhension du Besoin (30 points)
    const comprehensionScore = await this.calculateComprehension(devis, context.coherenceData)
    subCriteriaScores.push(comprehensionScore)
    this.extractAlertsAndRecommendations(comprehensionScore, alerts, recommendations)

    // Calculer le score total
    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)
    const maxPoints = 150

    return {
      axisId: 'coherence',
      score: totalScore,
      maxPoints,
      percentage: (totalScore / maxPoints) * 100,
      subCriteriaScores,
      alerts,
      recommendations,
    }
  }

  /**
   * Créer un score partiel quand pas de données CCF
   */
  private createPartialScore(): AxisScore {
    return {
      axisId: 'coherence',
      score: 0,
      maxPoints: 150,
      percentage: 0,
      subCriteriaScores: [],
      alerts: [
        {
          type: 'minor',
          axisId: 'coherence',
          message: 'Données de cohérence non disponibles',
          impact: "Impossible d'analyser la cohérence entre la demande et le devis",
          recommendation:
            'Remplir le wizard de cohérence lors du prochain upload pour bénéficier de cette analyse',
        },
      ],
      recommendations: [
        {
          priority: 'low',
          category: 'coherence',
          suggestion: 'Utiliser le wizard de cohérence pour les prochaines analyses',
          potentialImpact: '+150 points potentiels sur le score final',
          actionable: true,
        },
      ],
    }
  }

  /**
   * 9.1 Adéquation à la Demande (70 points)
   */
  private async calculateAdequation(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []

    // Travaux demandés présents dans devis (40 pts)
    const travauxPresents = await this.scoreTravauxPresents(devis, coherenceData)
    controlPointScores.push(travauxPresents)

    // Solutions proposées répondent au besoin (20 pts)
    const solutionsAdequates = await this.scoreSolutionsAdequates(devis, coherenceData)
    controlPointScores.push(solutionsAdequates)

    // Respect contraintes exprimées (10 pts)
    const respectContraintes = await this.scoreRespectContraintes(devis, coherenceData)
    controlPointScores.push(respectContraintes)

    const totalScore = controlPointScores.reduce((sum, cp) => sum + cp.score, 0)

    return {
      subCriteriaId: 'adequation-demande',
      score: totalScore,
      maxPoints: 70,
      controlPointScores,
    }
  }

  /**
   * Travaux demandés présents dans devis (40 pts)
   */
  private async scoreTravauxPresents(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''
    let confidence = 70

    const extractedData = devis.extractedData as any
    const devisDescription = extractedData?.project?.description || ''
    const devisItems = extractedData?.items || []

    // Analyser la présence des travaux demandés
    const clientRequest = coherenceData.clientRequest.toLowerCase()
    const devisContent = (
      devisDescription +
      ' ' +
      devisItems.map((item: any) => item.description || '').join(' ')
    ).toLowerCase()

    // Mots clés principaux de la demande
    const keywords = this.extractKeywords(clientRequest)
    const matchedKeywords = keywords.filter((kw) => devisContent.includes(kw))

    // Calcul du score basé sur la présence des mots clés
    const matchPercentage = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0

    if (matchPercentage >= 0.8) {
      score = 40
      justification = `Excellente adéquation : ${matchedKeywords.length}/${keywords.length} éléments demandés trouvés dans le devis`
      confidence = 90
    } else if (matchPercentage >= 0.6) {
      score = 30
      justification = `Bonne adéquation : ${matchedKeywords.length}/${keywords.length} éléments demandés présents`
      confidence = 80
    } else if (matchPercentage >= 0.4) {
      score = 20
      justification = `Adéquation partielle : ${matchedKeywords.length}/${keywords.length} éléments trouvés`
      confidence = 70
    } else if (matchPercentage >= 0.2) {
      score = 10
      justification = `Adéquation faible : seulement ${matchedKeywords.length}/${keywords.length} éléments demandés identifiés`
      confidence = 60
    } else {
      score = 0
      justification = `Incohérence majeure : ${matchedKeywords.length}/${keywords.length} éléments demandés trouvés`
      confidence = 85
    }

    return {
      controlPointId: 'travaux-presents',
      score,
      maxPoints: 40,
      justification,
      confidence,
    }
  }

  /**
   * Solutions proposées répondent au besoin (20 pts)
   */
  private async scoreSolutionsAdequates(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''
    const confidence = 65

    const needType = coherenceData.needType
    const clientNeed = coherenceData.clientNeed.toLowerCase()

    // Vérifier que le type de solution correspond au type de besoin
    const extractedData = devis.extractedData as any
    const projectType = extractedData?.project?.projectType || devis.projectType

    // Mapping besoin → type de projet attendu
    const needTypeMapping: Record<string, string[]> = {
      urgence: ['maintenance', 'reparation', 'intervention'],
      renovation: ['renovation', 'refection', 'amelioration'],
      amelioration: ['renovation', 'optimisation', 'amelioration'],
      construction: ['construction', 'installation'],
      maintenance: ['maintenance', 'entretien'],
    }

    const expectedTypes = needTypeMapping[needType] || []
    const projectTypeMatch = expectedTypes.some((type) =>
      projectType?.toLowerCase().includes(type)
    )

    if (projectTypeMatch) {
      score = 20
      justification = `Type de solution cohérent avec le besoin exprimé (${needType})`
    } else {
      // Analyse du contenu pour détecter la pertinence
      const hasUrgencyKeywords = ['urgence', 'rapide', 'immédiat'].some((kw) =>
        clientNeed.includes(kw)
      )
      const devisHasUrgencyResponse =
        extractedData?.project?.description?.toLowerCase().includes('urgence') ||
        extractedData?.project?.description?.toLowerCase().includes('rapide')

      if (hasUrgencyKeywords && devisHasUrgencyResponse) {
        score = 15
        justification = 'Solution proposée adaptée au caractère urgent du besoin'
      } else if (hasUrgencyKeywords && !devisHasUrgencyResponse) {
        score = 5
        justification = "Besoin urgent exprimé mais aucune mention d'urgence dans le devis"
      } else {
        score = 10
        justification = 'Cohérence partielle entre le besoin et la solution proposée'
      }
    }

    return {
      controlPointId: 'solutions-adequates',
      score,
      maxPoints: 20,
      justification,
      confidence,
    }
  }

  /**
   * Respect contraintes exprimées (10 pts)
   */
  private async scoreRespectContraintes(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<ControlPointScore> {
    let score = 10
    let justification = 'Aucune contrainte spécifique exprimée'
    let confidence = 50

    const constraints = coherenceData.constraints
    if (!constraints) {
      return {
        controlPointId: 'respect-contraintes',
        score: 10,
        maxPoints: 10,
        justification,
        confidence,
      }
    }

    const violations: string[] = []

    // Vérifier budget max
    if (constraints.maxBudget && devis.totalAmount) {
      const budgetExceeded = devis.totalAmount > constraints.maxBudget
      if (budgetExceeded) {
        const excess = ((devis.totalAmount - constraints.maxBudget) / constraints.maxBudget) * 100
        violations.push(
          `Budget dépassé de ${excess.toFixed(1)}% (${devis.totalAmount}€ vs ${constraints.maxBudget}€ max)`
        )
        score -= 5
      }
    }

    // Vérifier délai
    if (constraints.desiredDeadline) {
      const extractedData = devis.extractedData as any
      const devisDeadline = extractedData?.project?.timeline?.duration
      // Simplification : si deadline mentionné dans contraintes mais pas dans devis
      if (!devisDeadline) {
        violations.push(`Délai souhaité "${constraints.desiredDeadline}" non mentionné dans le devis`)
        score -= 3
      }
    }

    // Autres contraintes
    if (constraints.other) {
      // Analyse basique pour détecter si contraintes autres sont mentionnées
      const otherConstraints = constraints.other.toLowerCase()
      const devisDescription = (devis.extractedData as any)?.project?.description?.toLowerCase() || ''

      // Chercher mention des contraintes
      if (otherConstraints.length > 10 && !devisDescription.includes(otherConstraints.substring(0, 20))) {
        violations.push('Contraintes spécifiques non prises en compte dans le devis')
        score -= 2
      }
    }

    if (violations.length === 0) {
      justification = 'Toutes les contraintes exprimées sont respectées'
      confidence = 80
    } else {
      justification = `Contraintes non respectées : ${violations.join(', ')}`
      confidence = 85
    }

    return {
      controlPointId: 'respect-contraintes',
      score: Math.max(0, score),
      maxPoints: 10,
      justification,
      confidence,
    }
  }

  /**
   * 9.2 Analyse des Écarts (50 points)
   */
  private async calculateEcarts(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []

    // Détection éléments manquants (25 pts)
    const elementsManquants = await this.scoreElementsManquants(devis, coherenceData)
    controlPointScores.push(elementsManquants)

    // Détection éléments superflus (25 pts)
    const elementsSupperflus = await this.scoreElementsSuperflus(devis, coherenceData)
    controlPointScores.push(elementsSupperflus)

    const totalScore = controlPointScores.reduce((sum, cp) => sum + cp.score, 0)

    return {
      subCriteriaId: 'analyse-ecarts',
      score: totalScore,
      maxPoints: 50,
      controlPointScores,
    }
  }

  /**
   * Éléments manquants (25 pts)
   */
  private async scoreElementsManquants(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<ControlPointScore> {
    let score = 25
    let justification = ''
    const confidence = 70

    const keywords = this.extractKeywords(coherenceData.clientRequest)
    const extractedData = devis.extractedData as any
    const devisContent = (
      (extractedData?.project?.description || '') +
      ' ' +
      (extractedData?.items || []).map((item: any) => item.description || '').join(' ')
    ).toLowerCase()

    const missingKeywords = keywords.filter((kw) => !devisContent.includes(kw))

    if (missingKeywords.length === 0) {
      score = 25
      justification = 'Aucun élément demandé manquant'
    } else if (missingKeywords.length <= 2) {
      score = 20
      justification = `${missingKeywords.length} élément(s) demandé(s) possiblement manquant(s)`
    } else if (missingKeywords.length <= 4) {
      score = 15
      justification = `${missingKeywords.length} éléments demandés manquants`
    } else {
      score = 5
      justification = `Nombreux éléments demandés absents du devis (${missingKeywords.length})`
    }

    return {
      controlPointId: 'elements-manquants',
      score,
      maxPoints: 25,
      justification,
      confidence,
    }
  }

  /**
   * Éléments superflus (25 pts)
   */
  private async scoreElementsSuperflus(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<ControlPointScore> {
    let score = 25
    let justification = 'Pas d\'éléments superflus détectés'
    const confidence = 60

    const extractedData = devis.extractedData as any
    const devisItems = extractedData?.items || []

    // Si trop d'items par rapport à la demande, c'est suspect
    const requestComplexity = coherenceData.clientRequest.split(' ').length
    const devisItemsCount = devisItems.length

    if (devisItemsCount > requestComplexity * 0.5 && devisItemsCount > 10) {
      score = 15
      justification = `Devis contient ${devisItemsCount} postes, possiblement surdimensionné`
    } else if (devisItemsCount > requestComplexity && devisItemsCount > 15) {
      score = 10
      justification = `Devis très détaillé (${devisItemsCount} postes) - vérifier pertinence de tous les éléments`
    }

    return {
      controlPointId: 'elements-superflus',
      score,
      maxPoints: 25,
      justification,
      confidence,
    }
  }

  /**
   * 9.3 Compréhension du Besoin (30 points)
   */
  private async calculateComprehension(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []

    // Pertinence de la solution vs problème (15 pts)
    const pertinence = await this.scorePertinenceSolution(devis, coherenceData)
    controlPointScores.push(pertinence)

    // Justification des choix techniques (10 pts)
    const justificationTech = await this.scoreJustificationTechnique(devis)
    controlPointScores.push(justificationTech)

    // Clarté de la réponse au besoin (5 pts)
    const clarte = await this.scoreClarteReponse(devis, coherenceData)
    controlPointScores.push(clarte)

    const totalScore = controlPointScores.reduce((sum, cp) => sum + cp.score, 0)

    return {
      subCriteriaId: 'comprehension-besoin',
      score: totalScore,
      maxPoints: 30,
      controlPointScores,
    }
  }

  /**
   * Pertinence de la solution vs problème (15 pts)
   */
  private async scorePertinenceSolution(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<ControlPointScore> {
    let score = 10
    let justification = 'Solution proposée cohérente avec le besoin'
    let confidence = 65

    const need = coherenceData.clientNeed.toLowerCase()
    const request = coherenceData.clientRequest.toLowerCase()
    const extractedData = devis.extractedData as any
    const devisDescription = extractedData?.project?.description?.toLowerCase() || ''

    // Problèmes → Solutions attendues
    const problemSolutionMap: Record<string, string[]> = {
      panne: ['remplacement', 'réparation', 'dépannage'],
      fuite: ['étanchéité', 'réparation', 'remplacement'],
      vétuste: ['rénovation', 'remplacement', 'modernisation'],
      isolation: ['isolation', 'isolant', 'thermique'],
      infiltration: ['étanchéité', 'drainage', 'réparation'],
    }

    // Chercher le problème dans le besoin
    let problemFound = false
    for (const [problem, solutions] of Object.entries(problemSolutionMap)) {
      if (need.includes(problem)) {
        problemFound = true
        const hasSolution = solutions.some((sol) => devisDescription.includes(sol))
        if (hasSolution) {
          score = 15
          justification = `Solution pertinente proposée pour résoudre le problème de ${problem}`
          confidence = 85
        } else {
          score = 5
          justification = `Problème identifié (${problem}) mais solution attendue non trouvée`
          confidence = 75
        }
        break
      }
    }

    if (!problemFound) {
      // Score par défaut
      score = 10
    }

    return {
      controlPointId: 'pertinence-solution',
      score,
      maxPoints: 15,
      justification,
      confidence,
    }
  }

  /**
   * Justification des choix techniques (10 pts)
   */
  private async scoreJustificationTechnique(devis: Devis): Promise<ControlPointScore> {
    let score = 5
    let justification = 'Justifications techniques standards'
    let confidence = 60

    const extractedData = devis.extractedData as any
    const devisDescription = extractedData?.project?.description?.toLowerCase() || ''
    const items = extractedData?.items || []

    // Chercher indices de justification technique
    const hasJustifications =
      devisDescription.includes('parce que') ||
      devisDescription.includes('afin de') ||
      devisDescription.includes('pour') ||
      items.some((item: any) => (item.description || '').toLowerCase().includes('conforme'))

    if (hasJustifications) {
      score = 10
      justification = 'Choix techniques justifiés dans le devis'
      confidence = 70
    }

    return {
      controlPointId: 'justification-technique',
      score,
      maxPoints: 10,
      justification,
      confidence,
    }
  }

  /**
   * Clarté de la réponse au besoin (5 pts)
   */
  private async scoreClarteReponse(
    devis: Devis,
    coherenceData: CoherenceData
  ): Promise<ControlPointScore> {
    let score = 3
    let justification = 'Réponse claire au besoin exprimé'
    let confidence = 60

    const extractedData = devis.extractedData as any
    const devisDescription = extractedData?.project?.description || ''

    if (devisDescription && devisDescription.length > 50) {
      score = 5
      justification = 'Devis détaillé et clair'
      confidence = 70
    } else if (devisDescription && devisDescription.length > 20) {
      score = 3
      justification = 'Devis concis'
    } else {
      score = 1
      justification = 'Devis peu détaillé'
    }

    return {
      controlPointId: 'clarte-reponse',
      score,
      maxPoints: 5,
      justification,
      confidence,
    }
  }

  /**
   * Extraire mots clés d'une demande
   */
  private extractKeywords(text: string): string[] {
    // Mots vides à exclure
    const stopWords = [
      'le',
      'la',
      'les',
      'un',
      'une',
      'des',
      'de',
      'du',
      'et',
      'ou',
      'mais',
      'pour',
      'par',
      'avec',
      'dans',
      'sur',
      'je',
      'tu',
      'il',
      'nous',
      'vous',
      'mon',
      'ma',
      'mes',
      'votre',
      'vos',
      'est',
      'sont',
      'ai',
      'avez',
      'avoir',
      'être',
    ]

    const words = text
      .toLowerCase()
      .replace(/[^\wÀ-ÿ\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.includes(w))

    // Retourner mots uniques
    return [...new Set(words)]
  }

  /**
   * Extraire alertes et recommandations depuis les control points
   */
  private extractAlertsAndRecommendations(
    subCriteria: SubCriteriaScore,
    alerts: Alert[],
    recommendations: Recommendation[]
  ): void {
    // Analyser chaque control point pour générer alertes et recommandations
    for (const cp of subCriteria.controlPointScores) {
      const percentage = (cp.score / cp.maxPoints) * 100

      // Alertes pour scores faibles
      if (percentage < 40 && cp.maxPoints >= 10) {
        alerts.push({
          type: percentage < 20 ? 'critical' : 'major',
          axisId: 'coherence',
          subCriteriaId: subCriteria.subCriteriaId,
          controlPointId: cp.controlPointId,
          message: `Incohérence détectée : ${cp.justification}`,
          impact: `Impact: ${cp.maxPoints - cp.score} points perdus`,
          recommendation: 'Vérifier la cohérence entre votre demande et le devis proposé',
        })
      }

      // Recommandations pour scores moyens
      if (percentage >= 40 && percentage < 70 && cp.maxPoints >= 15) {
        recommendations.push({
          priority: 'medium',
          category: 'coherence',
          suggestion: `Améliorer: ${cp.justification}`,
          potentialImpact: `+${cp.maxPoints - cp.score} points possibles`,
          actionable: true,
        })
      }
    }
  }
}
