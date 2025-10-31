import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { documentUploadService } from '@/services/document/upload'

export const dynamic = 'force-dynamic'

/**
 * GET /api/building-profiles/[id]/documents
 * Récupère tous les documents d'un profil
 * 
 * POST /api/building-profiles/[id]/documents
 * Upload un nouveau document dans le coffre-fort
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    // Vérifier que le profil appartient à l'utilisateur
    const profile = await prisma.buildingProfile.findFirst({
      where: { id: params.id, userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    const documents = await prisma.buildingDocument.findMany({
      where: { buildingProfileId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      count: documents.length,
      data: documents,
    })
  } catch (error) {
    console.error('[API Building Documents GET] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des documents',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    // Vérifier que le profil appartient à l'utilisateur
    const profile = await prisma.buildingProfile.findFirst({
      where: { id: params.id, userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentType = formData.get('documentType') as string
    const documentCategory = formData.get('documentCategory') as string | null
    const description = formData.get('description') as string | null
    const documentDate = formData.get('documentDate') as string | null
    const expirationDate = formData.get('expirationDate') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        { error: 'Type de document requis' },
        { status: 400 }
      )
    }

    // Upload vers S3 via le service existant
    const uploadResult = await documentUploadService.upload({
      userId,
      file,
      folder: `building-documents/${params.id}`,
    })

    const fileUrl = uploadResult.fileUrl

    // Créer l'enregistrement dans la base de données
    const document = await prisma.buildingDocument.create({
      data: {
        buildingProfileId: params.id,
        userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        documentType: documentType as any,
        documentCategory: documentCategory || null,
        description: description || null,
        documentDate: documentDate ? new Date(documentDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        ocrStatus: 'PENDING',
        isValidated: false,
        tags: [],
      },
    })

    // TODO: Lancer l'OCR en arrière-plan si nécessaire

    return NextResponse.json({
      success: true,
      data: document,
    }, { status: 201 })
  } catch (error) {
    console.error('[API Building Documents POST] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'upload du document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

