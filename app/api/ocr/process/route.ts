/**
 * OCR Processing API Route
 * Processes uploaded documents and extracts data using OCR
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ocrService } from '@/services/document/ocr'
import { createLogger } from '@/lib/logger'

const logger = createLogger('OCR API')

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let documentId: string | undefined

  try {
    const body = await request.json()
    documentId = body.documentId

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
    logger.error('OCR processing failed', error, { documentId })

    // Try to update document status to failed (using stored documentId)
    if (documentId) {
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { ocrStatus: 'FAILED' },
        })
      } catch (updateError) {
        logger.error('Failed to update document status after OCR failure', updateError, { documentId })
      }
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
