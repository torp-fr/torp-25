/**
 * Document Upload API Route
 * Handles file uploads to S3 and creates document records
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { documentUploadService, isS3Enabled } from '@/services/document/upload'
import { createLogger } from '@/lib/logger'
import { validateFileUpload } from '@/lib/upload-validator'

const logger = createLogger('Upload API')

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Auth0 temporairement désactivé - utilise un userId demo
const DEMO_USER_ID = 'demo-user-id'

export async function POST(request: NextRequest) {
  try {
    // Auth0 désactivé - utilisateur demo par défaut
    const userId = DEMO_USER_ID

    // S'assurer que l'utilisateur demo existe en DB
    try {
      await prisma.user.upsert({
        where: { id: DEMO_USER_ID },
        update: {},
        create: {
          id: DEMO_USER_ID,
          email: 'demo@torp.fr',
          role: 'CONSUMER',
        },
      })
    } catch (userError) {
      console.error('Failed to create/update demo user:', userError)
      return NextResponse.json(
        { error: 'Failed to initialize user session' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file upload
    const validation = validateFileUpload(file)
    if (!validation.valid) {
      logger.warn('File validation failed', { error: validation.error, fileName: file.name })
      return NextResponse.json(
        { error: 'File validation failed', message: validation.error },
        { status: 400 }
      )
    }

    logger.info('File validation successful', validation.file)

    // In production, require S3 to be configured
    if (process.env.NODE_ENV === 'production' && !isS3Enabled) {
      return NextResponse.json(
        { error: 'Storage not configured', message: 'AWS S3 credentials are missing' },
        { status: 500 }
      )
    }

    // Upload to S3 (or local mock)
    const uploadResult = await documentUploadService.upload({
      userId,
      file,
    })

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        userId,
        fileName: uploadResult.fileName,
        fileType: uploadResult.fileType,
        fileSize: uploadResult.fileSize,
        fileUrl: uploadResult.fileUrl,
        uploadStatus: 'COMPLETED',
        ocrStatus: 'PENDING',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
      },
    })
  } catch (error) {
    logger.error('File upload failed', error)
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    )
  }
}
