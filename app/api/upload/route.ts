/**
 * Document Upload API Route
 * Handles file uploads to S3 and creates document records
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { documentUploadService, isS3Enabled } from '@/services/document/upload'
import { getSession } from '@auth0/nextjs-auth0'
import { ensureUserExistsFromAuth0 } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await ensureUserExistsFromAuth0(session.user as any)
    const userId = session.user.sub

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

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
    console.error('Upload error:', error)
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
