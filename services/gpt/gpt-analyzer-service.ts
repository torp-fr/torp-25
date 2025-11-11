/**
 * Service pour appeler votre GPT personnalisé depuis la plateforme TORP
 * Utilise l'API OpenAI pour envoyer un devis au GPT et récupérer l'analyse
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GPTAnalysisResult {
  score: number;
  grade: string;
  confidence: number;
  analysis: {
    summary: string;
    details: any;
  };
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    action?: string;
  }>;
  alerts?: Array<{
    severity: string;
    title: string;
    description: string;
  }>;
  strengths?: Array<{
    category: string;
    title: string;
    description: string;
  }>;
  weaknesses?: Array<{
    category: string;
    title: string;
    description: string;
    impact: string;
  }>;
}

/**
 * Appelle votre GPT via l'API OpenAI pour analyser un devis
 */
export async function analyzeDevisWithGPT(devisId: string): Promise<GPTAnalysisResult | null> {
  try {
    // 1. Récupérer le devis avec toutes ses données
    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        document: true,
        torpScores: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!devis) {
      throw new Error(`Devis not found: ${devisId}`);
    }

    // 2. Préparer le contexte pour le GPT
    const context = {
      devis: {
        id: devis.id,
        montantTotal: devis.totalAmount,
        typeProjet: devis.projectType,
        typeMetier: devis.tradeType,
        donneesExtraites: devis.extractedData,
        donneesEnrichies: devis.enrichedData,
        scoreTORP: devis.torpScores[0] || null,
      },
    };

    // 3. Appeler l'API OpenAI avec votre GPT
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GPT_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en analyse de devis de construction pour la plateforme TORP.

Analyse le devis fourni selon 4 critères :
- Prix (25%) : comparaison au marché, détection d'anomalies
- Qualité (30%) : certifications, santé financière de l'entreprise
- Conformité (25%) : normes DTU, mentions légales, garanties
- Délais (20%) : réalisme du planning

Réponds UNIQUEMENT avec un objet JSON valide dans ce format exact :
{
  "score": 75,
  "grade": "B",
  "confidence": 85,
  "analysis": {
    "summary": "Résumé court de l'analyse",
    "details": {
      "prix": "Analyse du prix...",
      "qualite": "Analyse de la qualité...",
      "conformite": "Analyse de la conformité...",
      "delais": "Analyse des délais..."
    }
  },
  "recommendations": [
    {
      "type": "prix",
      "priority": "high",
      "title": "Titre court",
      "description": "Description détaillée",
      "action": "Action recommandée"
    }
  ],
  "alerts": [
    {
      "severity": "warning",
      "title": "Titre de l'alerte",
      "description": "Description"
    }
  ],
  "strengths": [
    {
      "category": "qualite",
      "title": "Point fort",
      "description": "Explication"
    }
  ],
  "weaknesses": [
    {
      "category": "prix",
      "title": "Point faible",
      "description": "Explication",
      "impact": "medium"
    }
  ]
}`,
          },
          {
            role: 'user',
            content: `Analyse ce devis :\n\n${JSON.stringify(context, null, 2)}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const gptResponse = data.choices[0]?.message?.content;

    if (!gptResponse) {
      throw new Error('No response from GPT');
    }

    // 4. Parser la réponse JSON du GPT
    let analysis: GPTAnalysisResult;
    try {
      // Extraire le JSON de la réponse (au cas où le GPT ajoute du texte avant/après)
      const jsonMatch = gptResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in GPT response');
      }
    } catch (parseError) {
      console.error('Failed to parse GPT response:', gptResponse);
      throw new Error('Invalid JSON response from GPT');
    }

    // 5. Enregistrer l'analyse dans la base de données
    await prisma.gPTAnalysis.create({
      data: {
        devisId: devis.id,
        // apiKeyId non fourni = appel système automatique
        gptScore: analysis.score,
        gptGrade: analysis.grade,
        confidence: analysis.confidence,
        analysis: analysis.analysis,
        recommendations: analysis.recommendations,
        alerts: analysis.alerts ?? undefined,
        strengths: analysis.strengths ?? undefined,
        weaknesses: analysis.weaknesses ?? undefined,
        gptModel: process.env.GPT_MODEL || 'gpt-4-turbo-preview',
        version: '1.0.0',
      },
    });

    return analysis;
  } catch (error) {
    console.error('Error analyzing devis with GPT:', error);
    return null;
  }
}

/**
 * Récupère la dernière analyse GPT pour un devis
 */
export async function getLatestGPTAnalysis(devisId: string) {
  return await prisma.gPTAnalysis.findFirst({
    where: { devisId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Vérifie si un devis a déjà été analysé par le GPT
 */
export async function hasGPTAnalysis(devisId: string): Promise<boolean> {
  const count = await prisma.gPTAnalysis.count({
    where: { devisId },
  });
  return count > 0;
}
