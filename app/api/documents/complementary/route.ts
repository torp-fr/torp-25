/**
 * POST /api/documents/complementary
 * Upload un document complémentaire lié à une recommandation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadToS3 } from '@/services/document/upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const devisId = formData.get('devisId') as string
    const userId = formData.get('userId') as string || DEMO_USER_ID
    const recommendationId = formData.get('recommendationId') as string | null
    const recommendationType = formData.get('recommendationType') as string | null
    const documentType = formData.get('documentType') as string | null

    if (!file || !devisId) {
      return NextResponse.json(
        { error: 'File and devisId are required' },
        { status: 400 }
      )
    }

    // Valider le fichier
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use PDF, JPG or PNG.' },
        { status: 400 }
      )
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum 10MB.' },
        { status: 400 }
      )
    }

    // Upload vers S3
    const fileUrl = await uploadToS3(file, userId)

    // Créer le document complémentaire en DB
    const document = await prisma.complementaryDocument.create({
      data: {
        devisId,
        userId,
        recommendationId: recommendationId || null,
        recommendationType: recommendationType || null,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl,
        documentType: documentType || 'other',
        status: 'pending',
      },
    })

    return NextResponse.json({
      success: true,
      documentId: document.id,
      data: document,
    })
  } catch (error) {
    console.error('[API Complementary Documents] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload complementary document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

