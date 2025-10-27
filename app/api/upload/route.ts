/**
 * Document Upload API Route
 * Handles file uploads to S3 and creates document records
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { documentUploadService } from '@/services/document/upload'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string
    const userEmail = formData.get('userEmail') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Ensure user exists in database (create if first time)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: userEmail || `user-${userId}@torp.fr`,
        authProvider: 'auth0',
      },
    })

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
