/**
 * Test Seed API Route
 * Creates sample data for testing and demonstration
 * WARNING: This should be removed or protected in production!
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { torpScoringEngine } from '@/services/scoring/torp-score'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'demo-user-id'

    // Create or get user first (required for foreign key constraint)
    let user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'demo@torp.fr',
          role: 'CONSUMER',
        },
      })
    }

    // Create sample document
    const document = await prisma.document.create({
      data: {
        userId,
        fileName: 'devis-renovation-cuisine.pdf',
        fileType: 'pdf',
        fileSize: 245678,
        fileUrl: 'https://example.com/demo/devis-renovation-cuisine.pdf',
        uploadStatus: 'COMPLETED',
        ocrStatus: 'COMPLETED',
      },
    })

    // Create sample devis with realistic French construction quote data
    const devis = await prisma.devis.create({
      data: {
        documentId: document.id,
        userId,
        projectType: 'renovation',
        tradeType: 'menuiserie',
        totalAmount: 28500.0,
        validationStatus: 'PENDING',
        extractedData: {
          company: {
            name: 'Entreprise Dupont & Fils',
            siret: '83456789012345',
            address: '12 Rue des Artisans, 75011 Paris',
            phone: '01 42 85 76 93',
            email: 'contact@dupont-fils.fr',
          },
          client: {
            name: 'M. Jean Martin',
            address: '45 Avenue de la République, 75011 Paris',
            phone: '06 12 34 56 78',
            email: 'jean.martin@example.com',
          },
          project: {
            title: 'Rénovation complète cuisine',
            description:
              'Rénovation complète de la cuisine avec pose de nouveaux meubles, plan de travail en quartz et électroménager encastré',
            location: 'Paris 11ème',
          },
          items: [
            {
              description: 'Dépose ancienne cuisine',
              quantity: 1,
              unit: 'forfait',
              unitPrice: 850.0,
              totalPrice: 850.0,
              category: 'demolition',
            },
            {
              description: 'Meubles bas (L 320cm) avec plan de travail quartz',
              quantity: 1,
              unit: 'ensemble',
              unitPrice: 8500.0,
              totalPrice: 8500.0,
              category: 'mobilier',
            },
            {
              description: 'Meubles hauts (L 240cm)',
              quantity: 1,
              unit: 'ensemble',
              unitPrice: 3200.0,
              totalPrice: 3200.0,
              category: 'mobilier',
            },
            {
              description: 'Crédence carrelage métro blanc (10m²)',
              quantity: 10,
              unit: 'm²',
              unitPrice: 85.0,
              totalPrice: 850.0,
              category: 'revetement',
            },
            {
              description: 'Évier inox 2 bacs avec mitigeur',
              quantity: 1,
              unit: 'unité',
              unitPrice: 420.0,
              totalPrice: 420.0,
              category: 'plomberie',
            },
            {
              description: 'Hotte aspirante 90cm inox',
              quantity: 1,
              unit: 'unité',
              unitPrice: 650.0,
              totalPrice: 650.0,
              category: 'electromenager',
            },
            {
              description: 'Plaque induction 4 feux',
              quantity: 1,
              unit: 'unité',
              unitPrice: 580.0,
              totalPrice: 580.0,
              category: 'electromenager',
            },
            {
              description: 'Four encastrable multifonctions',
              quantity: 1,
              unit: 'unité',
              unitPrice: 720.0,
              totalPrice: 720.0,
              category: 'electromenager',
            },
            {
              description: 'Réfection électricité (prises, éclairage)',
              quantity: 1,
              unit: 'forfait',
              unitPrice: 1850.0,
              totalPrice: 1850.0,
              category: 'electricite',
            },
            {
              description: 'Plomberie (eau, évacuation)',
              quantity: 1,
              unit: 'forfait',
              unitPrice: 1250.0,
              totalPrice: 1250.0,
              category: 'plomberie',
            },
            {
              description: 'Peinture murs et plafond (18m²)',
              quantity: 18,
              unit: 'm²',
              unitPrice: 32.0,
              totalPrice: 576.0,
              category: 'finitions',
            },
            {
              description: 'Pose parquet stratifié (12m²)',
              quantity: 12,
              unit: 'm²',
              unitPrice: 48.0,
              totalPrice: 576.0,
              category: 'revetement',
            },
          ],
          totals: {
            subtotal: 19472.0,
            tva: 1947.2,
            tvaRate: 0.1,
            total: 21419.2,
            deposit: 4283.84,
          },
          dates: {
            issueDate: new Date('2025-01-15'),
            validUntil: new Date('2025-03-15'),
            startDate: new Date('2025-02-01'),
            endDate: new Date('2025-02-28'),
          },
        },
      },
    })

    // Calculate TORP score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoreResult = await torpScoringEngine.calculateScore(devis as any, {
      region: 'ILE_DE_FRANCE',
      projectType: 'renovation',
      benchmark: {
        averagePrice: 26000,
        priceRange: { min: 18000, max: 35000 },
        averagePriceSqm: 2100,
        itemPrices: {
          'meubles-bas': 250,
          'meubles-hauts': 180,
          'plan-travail-quartz': 320,
          credence: 85,
        },
      },
    })

    // Save score to database
    const score = await prisma.tORPScore.create({
      data: {
        devisId: devis.id,
        userId,
        scoreValue: scoreResult.scoreValue,
        scoreGrade: scoreResult.scoreGrade,
        confidenceLevel: scoreResult.confidenceLevel,
        breakdown: JSON.parse(JSON.stringify(scoreResult.breakdown)),
        alerts: JSON.parse(JSON.stringify(scoreResult.alerts)),
        recommendations: JSON.parse(
          JSON.stringify(scoreResult.recommendations)
        ),
        regionalBenchmark: scoreResult.regionalBenchmark
          ? JSON.parse(JSON.stringify(scoreResult.regionalBenchmark))
          : null,
        algorithmVersion: scoreResult.algorithmVersion,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Test data created successfully',
      data: {
        document,
        devis,
        score,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET to check if test data exists
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'demo-user-id'

    const devisCount = await prisma.devis.count({
      where: { userId },
    })

    const scoreCount = await prisma.tORPScore.count({
      where: { userId },
    })

    return NextResponse.json({
      success: true,
      data: {
        userId,
        devisCount,
        scoreCount,
        hasTestData: devisCount > 0,
      },
    })
  } catch (error) {
    console.error('Check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check test data' },
      { status: 500 }
    )
  }
}
