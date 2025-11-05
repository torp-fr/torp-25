/**
 * LLM Insights Generator
 * Génère des insights, points majeurs et recommandations améliorées avec LLM
 */

import Anthropic from '@anthropic-ai/sdk'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment
export interface AnalysisInsights {
  executiveSummary: string
  keyStrengths: Array<{
    title: string
    description: string
    impact: 'high' | 'medium' | 'low'
  }>
  keyWeaknesses: Array<{
    title: string
    description: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    recommendation?: string
  }>
  priorityActions: Array<{
    action: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
    expectedImpact: string
    timeframe: string
  }>
  companyVerification: {
    verified: boolean
    confidence: number
    dataSources: string[]
    notes: string[]
  }
  enhancedRecommendations: Array<{
    title: string
    description: string
    category: string
    priority: 'high' | 'medium' | 'low'
    actionable: boolean
    estimatedSavings?: string
    complexity: 'simple' | 'moderate' | 'complex'
  }>
}

export class InsightsGenerator {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }

  /**
   * Génère des insights à partir de l'analyse d'un devis
   */
  async generateInsights(analysisData: {
    extractedData: any
    score: {
      scoreValue: number
      scoreGrade: string
      confidenceLevel: number
      breakdown: any
      alerts: any[]
      recommendations: any[]
    }
    companyData?: {
      siret?: string
      name?: string
      financialData?: any
      legalStatus?: any
      certifications?: any[]
      reputation?: any
      address?: any
      legalStatusInfo?: any
      activities?: any[]
    }
  }): Promise<AnalysisInsights> {
    try {
      const prompt = `Tu es un expert en analyse de devis BTP. Analyse les données suivantes et génère des insights stratégiques en JSON.

DONNÉES À ANALYSER:
- Score TORP: ${analysisData.score.scoreValue}/1000 (Grade ${analysisData.score.scoreGrade})
- Confiance: ${analysisData.score.confidenceLevel}%
- Breakdown: ${JSON.stringify(analysisData.score.breakdown)}
- Alertes: ${JSON.stringify(analysisData.score.alerts)}
- Recommandations: ${JSON.stringify(analysisData.score.recommendations)}
- Entreprise: ${analysisData.extractedData.company?.name || 'Inconnue'}
- SIRET: ${analysisData.extractedData.company?.siret || analysisData.companyData?.siret || 'Non disponible'}
${
  analysisData.companyData?.financialData
    ? `- **DONNÉES FINANCIÈRES DISPONIBLES (Infogreffe)**:
  - Chiffre d'affaires: ${analysisData.companyData.financialData.ca?.length ? analysisData.companyData.financialData.ca.map((ca: number, i: number) => `Année ${new Date().getFullYear() - i}: ${ca.toLocaleString('fr-FR')}€`).join(', ') : 'Non disponible'}
  - Résultat net: ${analysisData.companyData.financialData.result?.length ? analysisData.companyData.financialData.result.map((r: number, i: number) => `Année ${new Date().getFullYear() - i}: ${r.toLocaleString('fr-FR')}€`).join(', ') : 'Non disponible'}
  - Dettes: ${analysisData.companyData.financialData.debt ? `${analysisData.companyData.financialData.debt.toLocaleString('fr-FR')}€` : 'Non disponible'}
  - Dernière mise à jour: ${analysisData.companyData.financialData.lastUpdate || 'Non disponible'}`
    : '- Données financières: Non disponibles'
}
${
  analysisData.companyData?.legalStatus
    ? `- **STATUT JURIDIQUE**:
  - Procédure collective en cours: ${analysisData.companyData.legalStatus.hasCollectiveProcedure ? 'OUI ⚠️' : 'NON ✅'}
  ${analysisData.companyData.legalStatus.procedureType ? `- Type de procédure: ${analysisData.companyData.legalStatus.procedureType}` : ''}
  ${analysisData.companyData.legalStatus.procedureDate ? `- Date: ${analysisData.companyData.legalStatus.procedureDate}` : ''}`
    : '- Statut juridique: Non vérifié'
}
${analysisData.companyData?.certifications ? `- Certifications: ${JSON.stringify(analysisData.companyData.certifications)}` : ''}
${analysisData.companyData?.reputation ? `- Données de réputation: ${JSON.stringify(analysisData.companyData.reputation)}` : ''}

Génère un JSON avec cette structure EXACTE:
{
  "executiveSummary": "Résumé exécutif en 2-3 phrases sur la qualité globale du devis",
  "keyStrengths": [
    {
      "title": "Titre du point fort",
      "description": "Description détaillée",
      "impact": "high|medium|low"
    }
  ],
  "keyWeaknesses": [
    {
      "title": "Titre du point faible",
      "description": "Description détaillée",
      "severity": "critical|high|medium|low",
      "recommendation": "Recommandation spécifique"
    }
  ],
  "priorityActions": [
    {
      "action": "Action concrète à entreprendre",
      "priority": "urgent|high|medium|low",
      "expectedImpact": "Impact attendu",
      "timeframe": "Délai estimé"
    }
  ],
  "companyVerification": {
    "verified": true|false,
    "confidence": 0-100,
    "dataSources": ["Source1", "Source2"],
    "notes": ["Note1", "Note2"]
  },
  "enhancedRecommendations": [
    {
      "title": "Titre de la recommandation",
      "description": "Description détaillée et actionnable",
      "category": "prix|qualite|delais|conformite|entreprise",
      "priority": "high|medium|low",
      "actionable": true|false,
      "estimatedSavings": "Estimation d'économies si applicable",
      "complexity": "simple|moderate|complex"
    }
  ]
}

IMPORTANT: Retourne UNIQUEMENT le JSON valide, sans texte avant ou après.

RÈGLES IMPORTANTES pour companyVerification:
- Si des données financières sont disponibles, verified doit être true, confidence >= 70, et ajouter "Infogreffe" dans dataSources
- Si une procédure collective est détectée, ajouter une note critique dans notes: "⚠️ Procédure collective en cours"
- Si les données financières montrent une tendance défavorable (CA en baisse, résultat négatif), ajouter une note d'alerte
- Lister toutes les sources de données utilisées (Sirene, Infogreffe, etc.)`

      // Liste des modèles à essayer (par ordre de préférence)
      // Pour les insights (pas de PDF), on peut utiliser Claude 3 aussi
      const modelCandidates = [
        'claude-3-5-sonnet-20241022', // Version la plus récente (Oct 2024)
        'claude-3-5-sonnet-20240620', // Version stable (Juin 2024)
        'claude-3-sonnet-20240229', // Claude 3 Sonnet (Fallback - texte uniquement)
        'claude-3-opus-20240229', // Claude 3 Opus (Fallback - plus performant mais plus lent)
      ]

      // Essayer chaque modèle jusqu'à ce que l'un fonctionne
      let message
      let lastError: Error | null = null

      for (const model of modelCandidates) {
        try {
          log.debug(`[InsightsGenerator] Essai du modèle: ${model}`)
          message = await this.client.messages.create({
            model,
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          })
          log.debug(`[InsightsGenerator] ✅ Modèle ${model} fonctionne`)
          break // Succès, sortir de la boucle
        } catch (error: any) {
          lastError = error
          log.warn(
            `[InsightsGenerator] ⚠️ Modèle ${model} a échoué:`,
            error.message
          )
          // Continuer avec le modèle suivant
          continue
        }
      }

      if (!message) {
        throw new Error(
          `Aucun modèle Claude disponible pour générer les insights. Dernière erreur: ${lastError?.message || 'Unknown error'}. ` +
            `Modèles essayés: ${modelCandidates.join(', ')}. ` +
            `Vérifiez que ANTHROPIC_API_KEY est valide.`
        )
      }

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : ''

      let jsonResponse: AnalysisInsights
      try {
        jsonResponse = JSON.parse(responseText)
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Impossible de trouver le JSON dans la réponse')
        }
        jsonResponse = JSON.parse(jsonMatch[0])
      }

      return jsonResponse
    } catch (error) {
      log.error({ err: error }, 'Erreur')
      // Retourner des insights par défaut en cas d'erreur
      return this.getDefaultInsights(analysisData)
    }
  }

  /**
   * Insights par défaut si le LLM échoue
   */
  private getDefaultInsights(analysisData: any): AnalysisInsights {
    return {
      executiveSummary: `Devis analysé avec un score de ${analysisData.score.scoreValue}/1000 (Grade ${analysisData.score.scoreGrade}).`,
      keyStrengths: [],
      keyWeaknesses:
        analysisData.score.alerts?.slice(0, 3).map((alert: any) => ({
          title: alert.type,
          description: alert.message,
          severity: alert.severity || 'medium',
        })) || [],
      priorityActions: [],
      companyVerification: {
        verified: false,
        confidence: 0,
        dataSources: [],
        notes: ["Données d'entreprise non disponibles"],
      },
      enhancedRecommendations:
        analysisData.score.recommendations?.map((rec: any) => ({
          title: rec.category,
          description: rec.suggestion,
          category: rec.category,
          priority: rec.priority,
          actionable: true,
          complexity: 'simple' as const,
        })) || [],
    }
  }
}
