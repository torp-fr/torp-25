/**
 * API Endpoint: POST /api/devis/[id]/analyze-gpt
 * Déclenche une analyse automatique d'un devis par le GPT
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeDevisWithGPT, hasGPTAnalysis } from '@/services/gpt/gpt-analyzer-service';

/**
 * POST /api/devis/[id]/analyze-gpt
 * Analyse un devis avec le GPT et enregistre le résultat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: devisId } = await params;

    // Vérifier si le devis a déjà été analysé
    const alreadyAnalyzed = await hasGPTAnalysis(devisId);

    if (alreadyAnalyzed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Ce devis a déjà été analysé par le GPT',
          hint: 'Utilisez GET /api/devis/[id]/gpt-analysis pour récupérer l\'analyse existante',
        },
        { status: 409 }
      );
    }

    // Lancer l'analyse
    const analysis = await analyzeDevisWithGPT(devisId);

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to analyze devis',
          message: 'Le GPT n\'a pas pu analyser le devis. Vérifiez les logs pour plus de détails.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Devis analysé avec succès par le GPT',
        data: analysis,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in analyze-gpt endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
