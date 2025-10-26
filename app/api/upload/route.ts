/**
 * Document Upload API Route
 * Handles file uploads to S3 and creates document records
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { documentUploadService } from '@/services/document/upload'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

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

    // Upload to S3
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
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
