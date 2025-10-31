/**
 * POST /api/chat/send
 * Envoie un message dans le chat d'un devis
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

const chatMessageSchema = z.object({
  devisId: z.string(),
  userId: z.string(),
  content: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']).default('user'),
  recommendationId: z.string().optional(),
  documentId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = chatMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { devisId, userId, content, role, recommendationId, documentId } = parsed.data

    // 1. Sauvegarder le message utilisateur
    const userMessage = await prisma.chatMessage.create({
      data: {
        devisId,
        userId,
        role,
        content,
        recommendationId,
        documentId,
      },
    })

    // 2. Si c'est un message utilisateur, générer une réponse avec l'assistant
    if (role === 'user') {
      // Récupérer le devis et son score pour le contexte
      const devis = await prisma.devis.findUnique({
        where: { id: devisId },
        include: {
          torpScores: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      // Générer une réponse contextuelle avec Claude
      let assistantResponse = 'Je vais analyser votre demande...'
      
      try {
        // Utiliser le DocumentAnalyzer pour générer une réponse contextuelle
        // TODO: Créer un service de chat dédié pour des réponses plus ciblées
        assistantResponse = `Merci pour votre question. En analysant votre devis, je peux vous aider à mieux comprendre les recommandations et points d'attention identifiés.`
        
        // Logique plus poussée selon le contexte
        if (recommendationId) {
          assistantResponse = `Concernant cette recommandation, voici des éléments de clarification et des conseils pour améliorer votre situation.`
        }
      } catch (error) {
        console.error('[Chat] Erreur génération réponse:', error)
        assistantResponse = 'Désolé, je rencontre une difficulté technique. Pouvez-vous reformuler votre question ?'
      }

      // Sauvegarder la réponse de l'assistant
      const assistantMessage = await prisma.chatMessage.create({
        data: {
          devisId,
          userId,
          role: 'assistant',
          content: assistantResponse,
        },
      })

      return NextResponse.json({
        success: true,
        messageId: assistantMessage.id,
        response: assistantResponse,
      })
    }

    return NextResponse.json({
      success: true,
      messageId: userMessage.id,
    })
  } catch (error) {
    console.error('[API Chat] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

