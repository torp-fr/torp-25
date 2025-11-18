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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      where: { id, userId },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profil non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    const documents = await prisma.buildingDocument.findMany({
      where: { buildingProfileId: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      where: { id, userId },
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

    // Validate documentType against allowed enum values
    const validDocumentTypes = [
      'TITLE_DEED',
      'INSURANCE_HOME',
      'INSURANCE_LIFE',
      'PROPERTY_TAX',
      'NOTARY_ACT',
      'CONSTRUCTION_PERMIT',
      'DPE_CERTIFICATE',
      'TECHNICAL_REPORT',
      'WARRANTY',
      'MAINTENANCE_LOG',
      'INVOICE',
      'ESTIMATE',
      'QUOTE',
      'CONTRACT',
      'PHOTO',
      'VIDEO',
      'OTHER',
    ]

    if (!validDocumentTypes.includes(documentType)) {
      return NextResponse.json(
        {
          error: 'Type de document invalide',
          allowedTypes: validDocumentTypes,
        },
        { status: 400 }
      )
    }

    // Upload vers S3 via le service existant
    let uploadResult
    try {
      uploadResult = await documentUploadService.upload({
        userId,
        file,
        folder: `building-documents/${id}`,
      })
    } catch (uploadError) {
      console.error('[API Building Documents] S3 upload failed:', uploadError)
      return NextResponse.json(
        {
          error: 'Échec de l\'upload du fichier',
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        },
        { status: 500 }
      )
    }

    const fileUrl = uploadResult.fileUrl

    // Créer l'enregistrement dans la base de données
    // Si cela échoue, le catch principal gérera l'erreur
    let document
    try {
      document = await prisma.buildingDocument.create({
        data: {
          buildingProfileId: id,
          userId,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl,
          documentType: documentType, // Validated above
          documentCategory: documentCategory || null,
          description: description || null,
          documentDate: documentDate ? new Date(documentDate) : null,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          ocrStatus: 'PENDING',
          isValidated: false,
          tags: [],
        },
      })
    } catch (dbError) {
      console.error('[API Building Documents] DB creation failed:', dbError)
      // TODO: Implémenter la suppression du fichier S3 en compensation
      // await documentUploadService.delete(fileUrl)
      throw dbError // Re-throw pour que le catch principal le gère
    }

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

