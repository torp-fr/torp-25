import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { documentUploadService } from '@/services/document/upload'

export const dynamic = 'force-dynamic'

/**
 * GET /api/building-profiles/[id]/documents/[documentId]
 * Récupère un document spécifique
 * 
 * PATCH /api/building-profiles/[id]/documents/[documentId]
 * Met à jour les métadonnées d'un document
 * 
 * DELETE /api/building-profiles/[id]/documents/[documentId]
 * Supprime un document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const document = await prisma.buildingDocument.findFirst({
      where: {
        id: documentId,
        buildingProfileId: id,
        userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('[API Building Document GET] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération du document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      documentType,
      documentCategory,
      description,
      documentDate,
      expirationDate,
      tags,
      isValidated,
    } = body

    const document = await prisma.buildingDocument.findFirst({
      where: {
        id: documentId,
        buildingProfileId: id,
        userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    const updatedDocument = await prisma.buildingDocument.update({
      where: { id: documentId },
      data: {
        ...(documentType && { documentType: documentType as any }),
        ...(documentCategory !== undefined && { documentCategory }),
        ...(description !== undefined && { description }),
        ...(documentDate && { documentDate: new Date(documentDate) }),
        ...(expirationDate && { expirationDate: new Date(expirationDate) }),
        ...(tags && { tags }),
        ...(isValidated !== undefined && { isValidated }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDocument,
    })
  } catch (error) {
    console.error('[API Building Document PATCH] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const document = await prisma.buildingDocument.findFirst({
      where: {
        id: documentId,
        buildingProfileId: id,
        userId,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document non trouvé ou non autorisé' },
        { status: 404 }
      )
    }

    // Supprimer le fichier S3 (si le service le supporte)
    try {
      // TODO: Implémenter delete dans documentUploadService si nécessaire
      // Pour l'instant, on supprime juste en base
    } catch (error) {
      console.warn('[API Building Document DELETE] Erreur suppression S3:', error)
      // Continuer quand même la suppression en base
    }

    // Supprimer l'enregistrement en base
    await prisma.buildingDocument.delete({
      where: { id: documentId },
    })

    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès',
    })
  } catch (error) {
    console.error('[API Building Document DELETE] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la suppression du document',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

