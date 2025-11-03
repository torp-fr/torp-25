/**
 * LLM Insights Generator
 * Génère des insights, points majeurs et recommandations améliorées avec LLM
 */

import Anthropic from '@anthropic-ai/sdk'

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
${analysisData.companyData?.financialData ? `- Données financières: ${JSON.stringify(analysisData.companyData.financialData)}` : ''}
${analysisData.companyData?.legalStatus ? `- Statut légal: ${JSON.stringify(analysisData.companyData.legalStatus)}` : ''}

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

IMPORTANT: Retourne UNIQUEMENT le JSON valide, sans texte avant ou après.`

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20240620', // Version stable
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

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
      console.error('[InsightsGenerator] Erreur:', error)
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
