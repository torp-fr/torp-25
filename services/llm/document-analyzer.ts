import Anthropic from '@anthropic-ai/sdk'
import { ModelResolver } from './model-resolver'
import fs from 'fs'
import path from 'path'

// Types
export interface ExtractedDevisData {
  company: {
    name: string
    siret?: string
    address?: string
    phone?: string
    email?: string
  }
  client: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
  project: {
    title: string
    description?: string
    location?: string
    surface?: number
  }
  items: Array<{
    description: string
    quantity?: number
    unit?: string
    unitPrice?: number
    totalPrice?: number
  }>
  totals: {
    subtotal: number
    tva: number
    tvaRate?: number
    total: number
  }
  dates?: {
    devis?: string
    validityEnd?: string
    startDate?: string
    endDate?: string
  }
  legalMentions?: {
    hasInsurance?: boolean
    hasGuarantees?: boolean
    hasPaymentTerms?: boolean
  }
}

export interface TORPAnalysis {
  extractedData: ExtractedDevisData
  torpscore: {
    scoreValue: number
    scoreGrade: 'A' | 'B' | 'C' | 'D' | 'E'
    confidenceLevel: number
    breakdown: {
      prix: { score: number; weight: number; justification: string }
      qualite: { score: number; weight: number; justification: string }
      delais: { score: number; weight: number; justification: string }
      conformite: { score: number; weight: number; justification: string }
    }
    alerts: Array<{
      type: string
      severity: 'critical' | 'high' | 'medium' | 'low'
      message: string
    }>
    recommendations: Array<{
      category: string
      priority: 'high' | 'medium' | 'low'
      suggestion: string
      potentialImpact?: string
    }>
  }
  rawText: string
}

export class DocumentAnalyzer {
  private client: Anthropic
  private modelResolver: ModelResolver

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }
    this.client = new Anthropic({ apiKey })
    this.modelResolver = new ModelResolver(apiKey)
  }

  /**
   * Analyse complète d'un devis BTP avec Claude
   * @param filePath Chemin du fichier à analyser
   * @param enrichmentData Données enrichies (optionnel, sera utilisé si fourni)
   */
  async analyzeDevis(
    filePath: string,
    enrichmentData?: {
      company?: any
      priceReferences?: any[]
      regionalData?: any
      complianceData?: any
      weatherData?: any
    }
  ): Promise<TORPAnalysis> {
    try {
      // Lire le fichier
      const fileBuffer = fs.readFileSync(filePath)
      const fileExt = path.extname(filePath).toLowerCase()

      let documentContent: any

      // Préparer le contenu selon le type de fichier
      if (fileExt === '.pdf') {
        documentContent = {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: fileBuffer.toString('base64'),
          },
        }
      } else if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
        const mediaType = fileExt === '.png' ? 'image/png' : 'image/jpeg'
        documentContent = {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: fileBuffer.toString('base64'),
          },
        }
      } else {
        throw new Error(`Format de fichier non supporté: ${fileExt}`)
      }

      // Construire le prompt avec les données enrichies si disponibles
      let enrichmentContext = ''
      if (enrichmentData) {
        enrichmentContext = `

**DONNÉES ENRICHIES DISPONIBLES** (utilise-les pour améliorer ta précision):

${
  (enrichmentData as any).ccfData
    ? `
**CAHIER DES CHARGES FONCTIONNEL (CCF)** - Utilise ces informations pour une analyse contextuelle précise:
- **Type de projet**: ${(enrichmentData as any).ccfData.projectType}
  ${(enrichmentData as any).ccfData.projectTitle ? `- **Titre**: ${(enrichmentData as any).ccfData.projectTitle}` : ''}
  ${(enrichmentData as any).ccfData.projectDescription ? `- **Description**: ${(enrichmentData as any).ccfData.projectDescription}` : ''}
  ${(enrichmentData as any).ccfData.address ? `- **Adresse du projet**: ${(enrichmentData as any).ccfData.address}` : ''}
  ${(enrichmentData as any).ccfData.region ? `- **Région**: ${(enrichmentData as any).ccfData.region}` : ''}
  ${(enrichmentData as any).ccfData.rooms && (enrichmentData as any).ccfData.rooms.length > 0 ? `- **Pièces concernées**: ${(enrichmentData as any).ccfData.rooms.join(', ')}` : ''}
  ${(enrichmentData as any).ccfData.constraints && (enrichmentData as any).ccfData.constraints.length > 0 ? `- **Contraintes identifiées**: ${(enrichmentData as any).ccfData.constraints.join('; ')}` : ''}
  ${(enrichmentData as any).ccfData.requirements && (enrichmentData as any).ccfData.requirements.length > 0 ? `- **Besoins fonctionnels**: ${(enrichmentData as any).ccfData.requirements.join('; ')}` : ''}
  ${(enrichmentData as any).ccfData.budgetRange && (enrichmentData as any).ccfData.budgetRange.max > 0 ? `- **Budget estimé**: ${(enrichmentData as any).ccfData.budgetRange.min}€ - ${(enrichmentData as any).ccfData.budgetRange.max}€${(enrichmentData as any).ccfData.budgetRange.preferred ? ` (idéal: ${(enrichmentData as any).ccfData.budgetRange.preferred}€)` : ''}` : ''}
  ${(enrichmentData as any).ccfData.pluData ? `- **Contraintes PLU détectées**: Utilise ces données pour vérifier la conformité réglementaire du devis` : ''}
  ${(enrichmentData as any).ccfData.buildingData ? `- **Données bâti disponibles**: Informations sur le bâtiment et son environnement` : ''}
  
  **ACTIONS REQUISES avec le CCF**:
  - Vérifie que le devis correspond au type de projet déclaré
  - Compare les prix avec le budget estimé du client
  - Vérifie la cohérence avec les contraintes PLU/urbanisme mentionnées
  - Évalue si les prestations correspondent aux pièces et besoins exprimés
  - Détecte les écarts significatifs entre le devis et les attentes du projet
  - Utilise les données bâti pour vérifier la pertinence des travaux proposés

`
    : ''
}
${
  enrichmentData.company
    ? `
- **Entreprise vérifiée**: ${JSON.stringify(enrichmentData.company, null, 2)}
  - Utilise ces informations pour vérifier la cohérence avec le devis
  - Vérifie que le SIRET correspond
  ${
    enrichmentData.company.financialData
      ? `
  - **⚠️ DONNÉES FINANCIÈRES (Infogreffe)**:
    - Chiffre d'affaires: ${enrichmentData.company.financialData.ca?.length ? enrichmentData.company.financialData.ca.map((ca: number, i: number) => `Année ${new Date().getFullYear() - i}: ${ca.toLocaleString('fr-FR')}€`).join(', ') : 'Non disponible'}
    - Résultat net: ${enrichmentData.company.financialData.result?.length ? enrichmentData.company.financialData.result.map((r: number, i: number) => `Année ${new Date().getFullYear() - i}: ${r.toLocaleString('fr-FR')}€`).join(', ') : 'Non disponible'}
    - Dettes: ${enrichmentData.company.financialData.debt ? `${enrichmentData.company.financialData.debt.toLocaleString('fr-FR')}€` : 'Non disponible'}
    - **⚠️ ALERTES À DÉTECTER**:
      * CA en baisse significative d'une année sur l'autre
      * Résultat net négatif ou en forte baisse
      * Dettes élevées par rapport au CA
      * Tendance financière défavorable
  `
      : ''
  }
  ${
    enrichmentData.company.legalStatusDetails?.hasCollectiveProcedure
      ? `
  - **🚨 ALERTE CRITIQUE - PROCÉDURE COLLECTIVE**:
    - Type: ${enrichmentData.company.legalStatusDetails.procedureType || 'Type inconnu'}
    - Date de début: ${enrichmentData.company.legalStatusDetails.procedureDate || 'Date inconnue'}
    - **ACTION REQUISE**: Recommander fortement la vérification des garanties (décennale, RC), questionner la viabilité de l'entreprise pour ce projet, alerter sur les risques de non-achèvement
  `
      : ''
  }
`
    : ''
}
${
  enrichmentData.priceReferences && enrichmentData.priceReferences.length > 0
    ? `
- **Prix de référence marché**: ${JSON.stringify(enrichmentData.priceReferences, null, 2)}
  - Compare les prix du devis avec ces références
  - Détecte les écarts significatifs (surfacturation/sous-tarification)
`
    : ''
}
${
  enrichmentData.regionalData
    ? `
- **Données régionales**: ${JSON.stringify(enrichmentData.regionalData, null, 2)}
  - Utilise le benchmark régional pour évaluer le prix global
  - Prends en compte les prix moyens au m² de la région
`
    : ''
}
${
  enrichmentData.complianceData
    ? `
- **Normes et conformité**: ${JSON.stringify(enrichmentData.complianceData, null, 2)}
  - Vérifie si les normes obligatoires sont mentionnées
  - Détecte les manquements aux réglementations
`
    : ''
}
${
  enrichmentData.weatherData
    ? `
- **Données météorologiques régionales**: ${JSON.stringify(enrichmentData.weatherData, null, 2)}
  - Évalue le réalisme des délais en tenant compte des retards météo moyens
  - Vérifie si les délais proposés sont réalistes selon la région
`
    : ''
}
`
      }

      // Prompt pour extraction et analyse complète
      const prompt = `Tu es un expert en analyse de devis BTP. Analyse ce document de devis et fournis une réponse JSON structurée.
${enrichmentContext}
IMPORTANT: Ta réponse doit être UNIQUEMENT du JSON valide, sans texte avant ou après. Commence directement par {

Le JSON doit contenir:
1. **extractedData**: Toutes les informations extraites du devis
   - company: nom, SIRET, adresse, téléphone, email de l'entreprise
   - client: nom, adresse, téléphone, email du client
   - project: titre, description, localisation, surface
   - items: liste des lignes du devis (description, quantité, unité, prix unitaire, prix total)
   - totals: sous-total HT, TVA, taux de TVA, total TTC
   - dates: date du devis, date de validité, dates de début/fin prévues
   - legalMentions: présence d'assurance, garanties, conditions de paiement

2. **torpscore**: Analyse et notation selon ces 4 critères (80 points au total):

   **PRIX (30% - 300 points max)**:
   - Cohérence des prix unitaires (100 pts)
   - Rapport qualité/prix global (100 pts)
   - Transparence de la facturation (50 pts)
   - Absence de surcharges anormales (50 pts)

   **QUALITÉ (30% - 300 points max)**:
   - Niveau de détail des prestations (100 pts)
   - Qualité des matériaux mentionnés (100 pts)
   - Normes et labels (50 pts)
   - Garanties proposées (50 pts)

   **DÉLAIS (20% - 200 points max)**:
   - Réalisme des délais annoncés (100 pts)
   - Précision du planning (50 pts)
   - Pénalités de retard (50 pts)

   **CONFORMITÉ (20% - 200 points max)**:
   - Mentions légales obligatoires (100 pts)
   - Assurances et garanties (50 pts)
   - Conditions de paiement claires (50 pts)

   Le score final est la somme pondérée: (prix*0.3 + qualité*0.3 + délais*0.2 + conformité*0.2)

   Grades:
   - A: 800-1000 (Excellent)
   - B: 600-799 (Bon)
   - C: 400-599 (Moyen)
   - D: 200-399 (Faible)
   - E: 0-199 (Très faible)

   Pour chaque catégorie, donne:
   - score: nombre entre 0 et le max de la catégorie (300 pour prix/qualité, 200 pour délais/conformité)
   - weight: poids (0.3, 0.3, 0.2, 0.2)
   - justification: explication détaillée du score

3. **alerts**: Liste des problèmes détectés (severity: critical/high/medium/low)
4. **recommendations**: Suggestions d'amélioration (priority: high/medium/low)
5. **rawText**: Texte brut extrait du document

Structure JSON exacte:
{
  "extractedData": {
    "company": { "name": "...", "siret": "...", "address": "...", "phone": "...", "email": "..." },
    "client": { "name": "...", "address": "...", "phone": "...", "email": "..." },
    "project": { "title": "...", "description": "...", "location": "...", "surface": 0 },
    "items": [
      { "description": "...", "quantity": 0, "unit": "...", "unitPrice": 0, "totalPrice": 0 }
    ],
    "totals": { "subtotal": 0, "tva": 0, "tvaRate": 10, "total": 0 },
    "dates": { "devis": "...", "validityEnd": "...", "startDate": "...", "endDate": "..." },
    "legalMentions": { "hasInsurance": true, "hasGuarantees": true, "hasPaymentTerms": true }
  },
  "torpscore": {
    "scoreValue": 0,
    "scoreGrade": "C",
    "confidenceLevel": 85,
    "breakdown": {
      "prix": { "score": 0, "weight": 0.3, "justification": "..." },
      "qualite": { "score": 0, "weight": 0.3, "justification": "..." },
      "delais": { "score": 0, "weight": 0.2, "justification": "..." },
      "conformite": { "score": 0, "weight": 0.2, "justification": "..." }
    },
    "alerts": [
      { "type": "...", "severity": "high", "message": "..." }
    ],
    "recommendations": [
      { "category": "prix", "priority": "high", "suggestion": "...", "potentialImpact": "..." }
    ]
  },
  "rawText": "..."
}

IMPORTANT: Retourne UNIQUEMENT le JSON, pas de texte explicatif avant ou après.`

      // Détecter automatiquement le meilleur modèle disponible pour PDFs
      console.log(
        '[DocumentAnalyzer] 🔍 Détection du meilleur modèle pour PDF...'
      )
      const model = await this.modelResolver.findBestModelForPdf()
      console.log(`[DocumentAnalyzer] ✅ Utilisation du modèle: ${model}`)

      // Déterminer max_tokens selon le modèle (Haiku a une limite plus basse)
      // Claude 3.5 Sonnet: 12000 tokens max
      // Claude 3.5 Haiku: 8192 tokens max
      const maxTokens = model.includes('haiku') ? 8192 : 12000
      console.log(
        `[DocumentAnalyzer] Max tokens: ${maxTokens} pour modèle ${model}`
      )

      // Appel à Claude avec le modèle détecté
      const message = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: [documentContent, { type: 'text', text: prompt }],
          },
        ],
      })

      // Extraire le JSON de la réponse
      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : ''

      // Parser le JSON
      let jsonResponse: TORPAnalysis
      try {
        // Essayer de parser directement
        jsonResponse = JSON.parse(responseText)
      } catch {
        // Si échec, chercher le JSON dans le texte
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Impossible de trouver le JSON dans la réponse')
        }
        jsonResponse = JSON.parse(jsonMatch[0])
      }

      return jsonResponse
    } catch (error) {
      console.error('Erreur analyse LLM:', error)
      throw error
    }
  }

  /**
   * Analyse rapide pour vérifier la qualité du document
   */
  async quickCheck(filePath: string): Promise<{
    isValid: boolean
    documentType: string
    confidence: number
    message: string
  }> {
    try {
      const fileBuffer = fs.readFileSync(filePath)
      const fileExt = path.extname(filePath).toLowerCase()

      let documentContent: any

      if (fileExt === '.pdf') {
        documentContent = {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: fileBuffer.toString('base64'),
          },
        }
      } else if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
        const mediaType = fileExt === '.png' ? 'image/png' : 'image/jpeg'
        documentContent = {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: fileBuffer.toString('base64'),
          },
        }
      } else {
        return {
          isValid: false,
          documentType: 'unknown',
          confidence: 0,
          message: 'Format de fichier non supporté',
        }
      }

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              documentContent,
              {
                type: 'text',
                text: 'Ce document est-il un devis BTP valide ? Réponds en JSON avec: {"isValid": boolean, "documentType": string, "confidence": number 0-100, "message": string}',
              },
            ],
          },
        ],
      })

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '{}'
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      return jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            isValid: false,
            documentType: 'unknown',
            confidence: 0,
            message: 'Erreur de parsing',
          }
    } catch (error) {
      console.error('Erreur quick check:', error)
      return {
        isValid: false,
        documentType: 'error',
        confidence: 0,
        message: 'Erreur lors de la vérification',
      }
    }
  }
}
