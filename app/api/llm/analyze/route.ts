import { NextRequest, NextResponse } from 'next/server'
import { DocumentAnalyzer } from '@/services/llm/document-analyzer'
import { prisma } from '@/lib/db'
import fs from 'fs'
import path from 'path'
import { Decimal } from '@prisma/client/runtime/library'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/llm/analyze
 * Analyse complète d'un devis avec Claude:
 * 1. Upload du fichier
 * 2. Analyse LLM (extraction + scoring)
 * 3. Création du devis en DB
 * 4. Création du score TORP en DB
 * 5. Retourne l'ID du devis
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null

  try {
    // Récupérer le fichier uploadé
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId manquant' },
        { status: 400 }
      )
    }

    // Vérifier le format
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format de fichier non supporté. Utilisez PDF, JPG ou PNG.' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Taille maximale: 10MB' },
        { status: 400 }
      )
    }

    // Créer un fichier temporaire
    const uploadsDir = path.join(process.cwd(), 'uploads', 'temp')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const timestamp = Date.now()
    const fileExt = path.extname(file.name)
    const tempFileName = `${userId}-${timestamp}${fileExt}`
    tempFilePath = path.join(uploadsDir, tempFileName)

    // Écrire le fichier
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(tempFilePath, buffer)

    console.log(`[LLM Analyze] Fichier sauvegardé: ${tempFilePath}`)

    // Analyser avec Claude
    console.log('[LLM Analyze] Début de l\'analyse avec Claude...')
    const analyzer = new DocumentAnalyzer()
    const analysis = await analyzer.analyzeDevis(tempFilePath)

    console.log('[LLM Analyze] Analyse terminée, création en DB...')

    // 1. Créer le Document d'abord
    const document = await prisma.document.create({
      data: {
        userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: `/uploads/temp/${tempFileName}`,
        uploadStatus: 'COMPLETED',
        ocrStatus: 'COMPLETED',
      },
    })

    console.log(`[LLM Analyze] Document créé: ${document.id}`)

    // 2. Créer le Devis avec le documentId
    const devis = await prisma.devis.create({
      data: {
        documentId: document.id,
        userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractedData: analysis.extractedData as any,
        validationStatus: 'COMPLETED',
        totalAmount: new Decimal(analysis.extractedData.totals.total),
        projectType: analysis.extractedData.project.title || 'Non spécifié',
        tradeType: inferTradeType(analysis.rawText),
      },
    })

    console.log(`[LLM Analyze] Devis créé: ${devis.id}`)

    // 3. Créer le score TORP
    const torpScore = await prisma.tORPScore.create({
      data: {
        devisId: devis.id,
        userId,
        scoreValue: new Decimal(analysis.torpscore.scoreValue),
        scoreGrade: analysis.torpscore.scoreGrade,
        confidenceLevel: new Decimal(analysis.torpscore.confidenceLevel),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        breakdown: analysis.torpscore.breakdown as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        alerts: analysis.torpscore.alerts as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recommendations: analysis.torpscore.recommendations as any,
        algorithmVersion: 'claude-llm-v1.0',
        // Benchmark régional par défaut (peut être amélioré plus tard)
        regionalBenchmark: {
          region: 'ILE_DE_FRANCE',
          averagePriceSqm: 1500,
          percentilePosition: 50,
          comparisonData: {
            devisPrice: analysis.extractedData.totals.total,
            averagePrice: analysis.extractedData.totals.total,
            priceRange: {
              min: analysis.extractedData.totals.total * 0.8,
              max: analysis.extractedData.totals.total * 1.2,
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      },
    })

    console.log(`[LLM Analyze] Score TORP créé: ${torpScore.id}`)

    // Retourner la réponse
    return NextResponse.json(
      {
        success: true,
        message: 'Analyse complète réussie',
        data: {
          devisId: devis.id,
          scoreId: torpScore.id,
          scoreGrade: torpScore.scoreGrade,
          scoreValue: torpScore.scoreValue,
          extractedData: analysis.extractedData,
          analysis: {
            alerts: analysis.torpscore.alerts,
            recommendations: analysis.torpscore.recommendations,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[LLM Analyze] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'analyse du document',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
      },
      { status: 500 }
    )
  } finally {
    // Nettoyer le fichier temporaire
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
        console.log(`[LLM Analyze] Fichier temporaire supprimé: ${tempFilePath}`)
      } catch (err) {
        console.error('Erreur lors de la suppression du fichier temporaire:', err)
      }
    }
  }
}

/**
 * Inférer le type de métier depuis le texte brut
 */
function inferTradeType(rawText: string): string {
  const text = rawText.toLowerCase()

  if (text.includes('plomberie') || text.includes('plombier') || text.includes('sanitaire')) {
    return 'plomberie'
  }
  if (text.includes('électricité') || text.includes('électricien') || text.includes('électrique')) {
    return 'electricite'
  }
  if (text.includes('maçonnerie') || text.includes('maçon') || text.includes('gros œuvre')) {
    return 'maconnerie'
  }
  if (text.includes('menuiserie') || text.includes('menuisier') || text.includes('charpente')) {
    return 'menuiserie'
  }
  if (text.includes('peinture') || text.includes('peintre') || text.includes('revêtement')) {
    return 'peinture'
  }
  if (text.includes('chauffage') || text.includes('climatisation') || text.includes('cvc')) {
    return 'chauffage'
  }
  if (text.includes('toiture') || text.includes('couvreur') || text.includes('zinguerie')) {
    return 'couverture'
  }

  return 'general'
}
