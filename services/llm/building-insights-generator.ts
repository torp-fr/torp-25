/**
 * Building Insights Generator - Agent IA pour recommandations de logements
 * Analyse contextuelle intelligente basée sur les données enrichies
 */

import Anthropic from '@anthropic-ai/sdk'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export interface BuildingInsights {
  recommendations: Array<{
    id: string
    priority: 'high' | 'medium' | 'low'
    category: 'energy' | 'safety' | 'maintenance' | 'valuation' | 'compliance' | 'documentation' | 'risk'
    title: string
    description: string
    actionable: boolean
    estimatedCost?: number
    estimatedImpact?: 'high' | 'medium' | 'low'
    deadline?: string
    reasoning: string // Explication du pourquoi de cette recommandation
  }>
  notifications: Array<{
    id: string
    type: 'info' | 'warning' | 'alert' | 'success'
    category: string
    title: string
    message: string
    actionUrl?: string
    createdAt: string
    read: boolean
  }>
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical'
    riskScore: number // 0-100
    majorRisks: string[]
    mitigationPriorities: string[]
  }
  valuationInsights: {
    marketPosition: 'undervalued' | 'fair' | 'overvalued' | 'unknown'
    improvementPotential: number // % de valorisation potentielle
    keyValueDrivers: string[]
    investmentRecommendations: string[]
  }
  energyInsights?: {
    performanceLevel: 'excellent' | 'good' | 'average' | 'poor' | 'critical'
    potentialSavings: number // €/an
    renovationPriority: 'urgent' | 'high' | 'medium' | 'low'
    recommendedActions: string[]
  }
}

export class BuildingInsightsGenerator {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    })
  }

  /**
   * Génère des insights intelligents sur un bâtiment via Claude
   */
  async generateInsights(buildingData: {
    address: any
    enrichedData?: any
    dpeData?: any
    cadastralData?: any
    rnbData?: any
    documents?: any[]
    customFields?: any
  }): Promise<BuildingInsights> {
    try {
      const prompt = this.buildPrompt(buildingData)

      const modelCandidates = [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-sonnet-20240620',
        'claude-3-sonnet-20240229',
      ]

      let message
      let lastError: Error | null = null

      for (const model of modelCandidates) {
        try {
          log.debug({ model }, 'Essai modèle Building Insights')
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
          log.debug({ model }, 'Modèle Building Insights OK')
          break
        } catch (error: any) {
          lastError = error
          log.warn({ model, error: error.message }, 'Modèle Building Insights échec')
          continue
        }
      }

      if (!message) {
        throw new Error(
          `Aucun modèle disponible. Dernière erreur: ${lastError?.message}`
        )
      }

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : ''

      let jsonResponse: BuildingInsights
      try {
        jsonResponse = JSON.parse(responseText)
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('JSON introuvable dans la réponse')
        }
        jsonResponse = JSON.parse(jsonMatch[0])
      }

      // Ajouter des IDs uniques aux recommandations si manquants
      jsonResponse.recommendations = jsonResponse.recommendations.map((rec, idx) => ({
        ...rec,
        id: rec.id || `ai-rec-${Date.now()}-${idx}`,
      }))

      jsonResponse.notifications = jsonResponse.notifications.map((notif, idx) => ({
        ...notif,
        id: notif.id || `ai-notif-${Date.now()}-${idx}`,
        createdAt: new Date().toISOString(),
        read: false,
      }))

      return jsonResponse
    } catch (error) {
      log.error({ err: error }, 'Erreur génération Building Insights')
      return this.getDefaultInsights()
    }
  }

  /**
   * Construit le prompt pour Claude avec tout le contexte
   */
  private buildPrompt(buildingData: any): string {
    return `Tu es un expert en immobilier, performance énergétique, gestion des risques naturels et valorisation du patrimoine. Analyse les données suivantes d'un logement et génère des insights stratégiques et recommandations personnalisées.

**DONNÉES DU LOGEMENT:**

Adresse: ${buildingData.address?.formatted || 'Non renseignée'}
${buildingData.address?.coordinates ? `Coordonnées: Lat ${buildingData.address.coordinates.lat}, Lon ${buildingData.address.coordinates.lon}` : ''}

${
  buildingData.enrichedData?.georisques
    ? `
**RISQUES NATURELS ET TECHNOLOGIQUES (Géorisques):**
- Territoire à Risque Inondation (TRI): ${buildingData.enrichedData.georisques.tri?.length > 0 ? `⚠️ OUI (${buildingData.enrichedData.georisques.tri.length} TRI)` : '✅ Non'}
- Risque sismique: ${buildingData.enrichedData.georisques.seisme ? `Zone ${buildingData.enrichedData.georisques.seisme.zone} (niveau ${buildingData.enrichedData.georisques.seisme.niveau}/5)` : 'Non renseigné'}
- Retrait-gonflement des argiles (RGA): ${buildingData.enrichedData.georisques.rga?.potentiel || 'Non renseigné'}
- Radon: ${buildingData.enrichedData.georisques.radon ? `Catégorie ${buildingData.enrichedData.georisques.radon.classe}/3 ${buildingData.enrichedData.georisques.radon.classe > 2 ? '⚠️' : ''}` : 'Non renseigné'}
- Mouvements de terrain: ${buildingData.enrichedData.georisques.mvt?.length > 0 ? `⚠️ ${buildingData.enrichedData.georisques.mvt.length} évènement(s)` : '✅ Aucun'}
- Installations classées (ICPE): ${buildingData.enrichedData.georisques.icpe?.length > 0 ? `${buildingData.enrichedData.georisques.icpe.length} installation(s) à proximité` : 'Aucune'}
`
    : '- Données Géorisques: Non disponibles'
}

${
  buildingData.enrichedData?.dvf
    ? `
**VALORISATION IMMOBILIÈRE (DVF - Demandes Valeurs Foncières):**
- Prix médian du secteur: ${buildingData.enrichedData.dvf.statistics?.prix_m2_median ? `${buildingData.enrichedData.dvf.statistics.prix_m2_median.toLocaleString('fr-FR')} €/m²` : 'Non disponible'}
- Prix moyen du secteur: ${buildingData.enrichedData.dvf.statistics?.prix_m2_moyen ? `${buildingData.enrichedData.dvf.statistics.prix_m2_moyen.toLocaleString('fr-FR')} €/m²` : 'Non disponible'}
- Estimation du bien: ${buildingData.enrichedData.dvf.estimation?.prix_total_estime ? `${(buildingData.enrichedData.dvf.estimation.prix_total_estime / 1000).toFixed(0)}k€ (${buildingData.enrichedData.dvf.estimation.prix_m2_estime?.toLocaleString('fr-FR')} €/m²)` : 'Non disponible'}
- Confiance estimation: ${buildingData.enrichedData.dvf.estimation?.confiance || 'N/A'}%
- Transactions comparables: ${buildingData.enrichedData.dvf.transactions?.length || 0} dans un rayon de ${buildingData.enrichedData.dvf.estimation?.rayon_recherche || 'N/A'}m
${
  buildingData.enrichedData.dvf.transactions?.length > 0
    ? `- Dernière transaction comparable: ${buildingData.enrichedData.dvf.transactions[0].date_mutation} à ${(buildingData.enrichedData.dvf.transactions[0].valeur_fonciere / 1000).toFixed(0)}k€`
    : ''
}
`
    : '- Données DVF: Non disponibles'
}

${
  buildingData.enrichedData?.cadastre
    ? `
**DONNÉES CADASTRALES:**
- Section cadastrale: ${buildingData.cadastralData?.section || 'Non renseigné'}
- Numéro de parcelle: ${buildingData.cadastralData?.parcelle || 'Non renseigné'}
- Surface parcelle: ${buildingData.enrichedData.cadastre.surface ? `${buildingData.enrichedData.cadastre.surface}m²` : 'Non renseigné'}
- Zone inondable: ${buildingData.enrichedData.cadastre.constraints?.isFloodZone ? '⚠️ OUI' : '✅ Non'}
- Contraintes/Servitudes: ${buildingData.enrichedData.cadastre.constraints?.hasRisk ? '⚠️ OUI (voir détails)' : '✅ Aucune'}
`
    : '- Données cadastrales: Non disponibles'
}

${
  buildingData.dpeData
    ? `
**PERFORMANCE ÉNERGÉTIQUE (DPE):**
- Classe énergétique: ${buildingData.dpeData.dpeClass || 'Non disponible'} ${['E', 'F', 'G'].includes(buildingData.dpeData.dpeClass) ? '⚠️ PASSOIRE THERMIQUE' : ''}
- Consommation énergétique: ${buildingData.dpeData.energyConsumption || 'N/A'} kWh/m²/an
- Classe GES (Gaz à Effet de Serre): ${buildingData.dpeData.gesClass || 'Non disponible'}
- Émissions GES: ${buildingData.dpeData.gesEmissions || 'N/A'} kg CO₂/m²/an
- Date du DPE: ${buildingData.dpeData.dpeDate || 'Non renseignée'}
${buildingData.dpeData.recommendations?.length > 0 ? `- Recommandations DPE: ${buildingData.dpeData.recommendations.join('; ')}` : ''}
`
    : '- Données DPE: Non disponibles'
}

${
  buildingData.rnbData
    ? `
**DONNÉES RNB (Registre National des Bâtiments):**
- Type de bâtiment: ${buildingData.rnbData.buildingType || 'Non renseigné'}
- Usage: ${buildingData.rnbData.usage || 'Non renseigné'}
- Année de construction: ${buildingData.rnbData.constructionYear || 'Non renseigné'}
`
    : '- Données RNB: Non disponibles'
}

${
  buildingData.documents?.length > 0
    ? `
**DOCUMENTS DISPONIBLES:**
- Nombre de documents: ${buildingData.documents.length}
- Types: ${[...new Set(buildingData.documents.map((d: any) => d.documentType))].join(', ')}
${buildingData.documents.some((d: any) => d.expirationDate && new Date(d.expirationDate) < new Date()) ? '⚠️ Certains documents sont expirés' : ''}
`
    : '- Documents: Aucun document disponible'
}

**MISSION:**
En tant qu'expert immobilier avec une vision à 360°, analyse ces données et génère un JSON structuré avec:

1. **recommendations**: Liste de recommandations concrètes et actionnables
   - Priorise selon l'urgence et l'impact
   - Pour chaque recommandation, explique le "pourquoi" (reasoning)
   - Sois spécifique: évite les recommandations génériques
   - Estime les coûts si pertinent (en €)

2. **notifications**: Alertes immédiates nécessitant l'attention
   - Risques critiques
   - Documents expirés/expirant
   - Opportunités urgentes

3. **riskAssessment**: Évaluation globale des risques
   - Calcule un score de risque global (0-100)
   - Identifie les risques majeurs avec priorités de mitigation

4. **valuationInsights**: Analyse de valorisation
   - Compare au marché (sous-évalué/juste/surévalué)
   - Identifie le potentiel d'amélioration (%)
   - Propose des leviers de valorisation

5. **energyInsights**: Analyse énergétique (si DPE disponible)
   - Niveau de performance
   - Économies potentielles (€/an)
   - Actions recommandées

**FORMAT JSON ATTENDU:**
{
  "recommendations": [
    {
      "id": "string (généré automatiquement)",
      "priority": "high|medium|low",
      "category": "energy|safety|maintenance|valuation|compliance|documentation|risk",
      "title": "Titre court",
      "description": "Description détaillée et actionnable",
      "actionable": true|false,
      "estimatedCost": number (optionnel),
      "estimatedImpact": "high|medium|low",
      "deadline": "ISO date string si applicable",
      "reasoning": "Explication du pourquoi cette recommandation est importante"
    }
  ],
  "notifications": [
    {
      "id": "string",
      "type": "info|warning|alert|success",
      "category": "string",
      "title": "Titre",
      "message": "Message détaillé",
      "actionUrl": "string optionnel"
    }
  ],
  "riskAssessment": {
    "overallRisk": "low|medium|high|critical",
    "riskScore": 0-100,
    "majorRisks": ["Risque 1", "Risque 2"],
    "mitigationPriorities": ["Priorité 1", "Priorité 2"]
  },
  "valuationInsights": {
    "marketPosition": "undervalued|fair|overvalued|unknown",
    "improvementPotential": 0-100 (% de valorisation potentielle),
    "keyValueDrivers": ["Facteur 1", "Facteur 2"],
    "investmentRecommendations": ["Recommandation 1", "Recommandation 2"]
  },
  "energyInsights": {
    "performanceLevel": "excellent|good|average|poor|critical",
    "potentialSavings": number (€/an),
    "renovationPriority": "urgent|high|medium|low",
    "recommendedActions": ["Action 1", "Action 2"]
  }
}

**IMPORTANT:**
- Retourne UNIQUEMENT le JSON valide, sans texte avant ou après
- Sois SPÉCIFIQUE et ACTIONNABLE dans tes recommandations
- Base-toi sur les DONNÉES RÉELLES fournies
- Si des données manquent, indique-le clairement (ex: "unknown", null)
- Priorise selon URGENCE × IMPACT
- Adopte une approche PRÉVENTIVE et PROACTIVE`
  }

  /**
   * Insights par défaut si l'IA échoue
   */
  private getDefaultInsights(): BuildingInsights {
    return {
      recommendations: [
        {
          id: `default-rec-${Date.now()}`,
          priority: 'medium',
          category: 'documentation',
          title: 'Compléter les données du logement',
          description:
            'Pour bénéficier de recommandations personnalisées, complétez les données de votre logement (DPE, documents, etc.).',
          actionable: true,
          estimatedImpact: 'medium',
          reasoning:
            'Des données complètes permettent une analyse plus précise et des recommandations adaptées.',
        },
      ],
      notifications: [
        {
          id: `default-notif-${Date.now()}`,
          type: 'info',
          category: 'enrichment',
          title: 'Enrichissement recommandé',
          message:
            'Lancez l\'enrichissement automatique pour obtenir des données complètes sur votre logement.',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ],
      riskAssessment: {
        overallRisk: 'low',
        riskScore: 0,
        majorRisks: [],
        mitigationPriorities: ['Enrichir les données pour une évaluation complète'],
      },
      valuationInsights: {
        marketPosition: 'unknown',
        improvementPotential: 0,
        keyValueDrivers: [],
        investmentRecommendations: [
          'Obtenir une estimation DVF pour connaître la valeur de marché',
        ],
      },
    }
  }
}
