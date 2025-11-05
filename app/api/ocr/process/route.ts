/**
 * OCR Processing API Route
 * Processes uploaded documents and extracts data using OCR
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ocrService } from '@/services/document/ocr'
import { loggers } from '@/lib/logger'

nconst log = loggers.api
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Update OCR status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'PROCESSING' },
    })

    // Extract text from document
    const extractedData = await ocrService.processDocument(
      document.fileUrl,
      document.fileType
    )

    // Update document with OCR status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'COMPLETED',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        extractedData,
      },
    })
  } catch (error) {
    log.error('OCR processing error:', error)

    // Try to update document status to failed
    try {
      const { documentId } = await request.json()
      if (documentId) {
        await prisma.document.update({
          where: { id: documentId },
          data: { ocrStatus: 'FAILED' },
        })
      }
    } catch {
      // Ignore update errors
    }

    return NextResponse.json(
      {
        error: 'Failed to process document',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
