/**
 * API Endpoint GPT: POST /api/gpt/analysis
 * Reçoit l'analyse d'un devis depuis le GPT et la stocke
 *
 * Authentification: Clé API via header Authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import {
  authenticateGPTRequest,
  createAuthErrorResponse,
} from '@/lib/gpt-auth-middleware';

const prisma = new PrismaClient();

/**
 * Interface pour les données d'analyse reçues du GPT
 */
interface GPTAnalysisRequest {
  devisId: string;
  gptScore: number;
  gptGrade?: string;
  confidence?: number;
  analysis: {
    summary?: string;
    details?: any;
    methodology?: string;
  };
  recommendations: Array<{
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    action?: string;
  }>;
  alerts?: Array<{
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    description: string;
    recommendation?: string;
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
    impact: 'low' | 'medium' | 'high';
  }>;
  processingTime?: number;
  gptModel?: string;
  version?: string;
  metadata?: any;
}

/**
 * POST /api/gpt/analysis
 * Enregistre une nouvelle analyse GPT pour un devis
 */
export async function POST(request: NextRequest) {
  try {
    // Authentification
    const auth = await authenticateGPTRequest(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth.error || 'Authentication failed');
    }

    // Parser le body
    const body: GPTAnalysisRequest = await request.json();

    // Validation des champs requis
    if (!body.devisId) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'devisId is required',
        },
        { status: 400 }
      );
    }

    if (body.gptScore === undefined || body.gptScore === null) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'gptScore is required',
        },
        { status: 400 }
      );
    }

    if (!body.analysis) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'analysis is required',
        },
        { status: 400 }
      );
    }

    if (!body.recommendations) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'recommendations is required',
        },
        { status: 400 }
      );
    }

    // Vérifier que le devis existe
    const devis = await prisma.devis.findUnique({
      where: { id: body.devisId },
    });

    if (!devis) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: `Devis not found with ID: ${body.devisId}`,
        },
        { status: 404 }
      );
    }

    // Créer l'analyse GPT
    const gptAnalysis = await prisma.gPTAnalysis.create({
      data: {
        devisId: body.devisId,
        apiKeyId: auth.apiKeyId!,
        gptScore: body.gptScore,
        gptGrade: body.gptGrade || null,
        confidence: body.confidence || 0,
        analysis: body.analysis,
        recommendations: body.recommendations,
        alerts: body.alerts || null,
        strengths: body.strengths || null,
        weaknesses: body.weaknesses || null,
        processingTime: body.processingTime || null,
        gptModel: body.gptModel || null,
        version: body.version || '1.0.0',
        metadata: body.metadata || null,
      },
    });

    // Réponse
    return NextResponse.json(
      {
        success: true,
        message: 'GPT analysis saved successfully',
        data: {
          id: gptAnalysis.id,
          devisId: gptAnalysis.devisId,
          gptScore: gptAnalysis.gptScore,
          gptGrade: gptAnalysis.gptGrade,
          confidence: gptAnalysis.confidence,
          createdAt: gptAnalysis.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving GPT analysis:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to save GPT analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gpt/analysis?devisId=xxx
 * Récupère les analyses GPT pour un devis
 */
export async function GET(request: NextRequest) {
  try {
    // Authentification
    const auth = await authenticateGPTRequest(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth.error || 'Authentication failed');
    }

    // Récupérer les paramètres de requête
    const searchParams = request.nextUrl.searchParams;
    const devisId = searchParams.get('devisId');

    if (!devisId) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'devisId query parameter is required',
        },
        { status: 400 }
      );
    }

    // Récupérer les analyses
    const analyses = await prisma.gPTAnalysis.findMany({
      where: { devisId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        apiKey: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: analyses.length,
        data: analyses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching GPT analyses:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch GPT analyses',
      },
      { status: 500 }
    );
  }
}
