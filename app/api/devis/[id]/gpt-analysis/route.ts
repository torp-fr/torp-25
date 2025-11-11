/**
 * API Endpoint: GET /api/devis/[id]/gpt-analysis
 * Récupère l'analyse GPT d'un devis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLatestGPTAnalysis } from '@/services/gpt/gpt-analyzer-service';

/**
 * GET /api/devis/[id]/gpt-analysis
 * Récupère la dernière analyse GPT pour un devis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: devisId } = await params;

    const analysis = await getLatestGPTAnalysis(devisId);

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          message: 'Aucune analyse GPT trouvée pour ce devis',
          hint: 'Utilisez POST /api/devis/[id]/analyze-gpt pour déclencher une analyse',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: analysis,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching GPT analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to fetch GPT analysis',
      },
      { status: 500 }
    );
  }
}
