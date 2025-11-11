/**
 * API Endpoint GPT: GET /api/gpt/devis/[id]
 * Récupère les données d'un devis pour analyse par le GPT
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
 * GET /api/gpt/devis/[id]
 * Récupère les données complètes d'un devis pour analyse
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentification
    const auth = await authenticateGPTRequest(request);
    if (!auth.authenticated) {
      return createAuthErrorResponse(auth.error || 'Authentication failed');
    }

    const { id } = await params;

    // Récupérer le devis avec toutes les données
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileUrl: true,
            uploadStatus: true,
            createdAt: true,
          },
        },
        torpScores: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Prendre le score le plus récent
        },
        gptAnalyses: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5, // Prendre les 5 dernières analyses
        },
      },
    });

    if (!devis) {
      return NextResponse.json(
        {
          error: 'Devis not found',
          message: `No devis found with ID: ${id}`,
        },
        { status: 404 }
      );
    }

    // Formater la réponse pour le GPT
    const response = {
      devis: {
        id: devis.id,
        createdAt: devis.createdAt,
        updatedAt: devis.updatedAt,

        // Informations du devis
        projectType: devis.projectType,
        tradeType: devis.tradeType,
        totalAmount: devis.totalAmount,
        validationStatus: devis.validationStatus,

        // Données extraites par OCR
        extractedData: devis.extractedData,

        // Données enrichies (entreprise, etc.)
        enrichedData: devis.enrichedData,

        // Données parsées
        parsedData: devis.parsedData,

        // Document source
        document: devis.document,

        // Score TORP existant (si disponible)
        torpScore: devis.torpScores.length > 0 ? {
          id: devis.torpScores[0].id,
          scoreValue: devis.torpScores[0].scoreValue,
          scoreGrade: devis.torpScores[0].scoreGrade,
          confidenceLevel: devis.torpScores[0].confidenceLevel,
          breakdown: devis.torpScores[0].breakdown,
          alerts: devis.torpScores[0].alerts,
          recommendations: devis.torpScores[0].recommendations,
          algorithmVersion: devis.torpScores[0].algorithmVersion,
        } : null,

        // Analyses GPT précédentes (pour contexte)
        previousGPTAnalyses: devis.gptAnalyses.map(analysis => ({
          id: analysis.id,
          gptScore: analysis.gptScore,
          gptGrade: analysis.gptGrade,
          confidence: analysis.confidence,
          createdAt: analysis.createdAt,
          version: analysis.version,
        })),
      },

      // Métadonnées
      meta: {
        requestedAt: new Date().toISOString(),
        apiVersion: '1.0.0',
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error fetching devis for GPT:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch devis data',
      },
      { status: 500 }
    );
  }
}
