/**
 * GET /api/chat/messages
 * Récupère les messages de chat pour un devis
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { loggers } from '@/lib/logger'

nconst log = loggers.api
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const devisId = searchParams.get('devisId')

    if (!devisId) {
      return NextResponse.json(
        { error: 'devisId is required' },
        { status: 400 }
      )
    }

    const messages = await prisma.chatMessage.findMany({
      where: { devisId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      messages: messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
        recommendationId: msg.recommendationId,
        documentId: msg.documentId,
      })),
    })
  } catch (error) {
    log.error('[API Chat Messages] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

