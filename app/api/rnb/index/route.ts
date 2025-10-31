/**
 * API pour gérer l'indexation progressive des données RNB
 * - Démarrer l'indexation d'un département
 * - Consulter le progrès
 * - Rechercher des bâtiments
 */

import { NextRequest, NextResponse } from 'next/server'
import { RNBService } from '@/services/external-apis/rnb-service'
import { RNBIndexer } from '@/services/external-apis/rnb-indexer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/rnb/index
 * Liste les jobs d'indexation ou récupère le progrès d'un département
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')

    const indexer = new RNBIndexer()

    if (department) {
      // Progrès d'un département spécifique
      const progress = await indexer.getProgress(department)
      return NextResponse.json({ success: true, data: progress })
    } else {
      // Liste tous les jobs
      const jobs = await indexer.listJobs()
      return NextResponse.json({ success: true, data: jobs })
    }
  } catch (error) {
    console.error('[API RNB Index] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch indexation progress',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/rnb/index
 * Démarre l'indexation d'un département
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { department } = body

    if (!department) {
      return NextResponse.json(
        { error: 'Department is required' },
        { status: 400 }
      )
    }

    const rnbService = new RNBService()
    const result = await rnbService.startIndexation(department)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to start indexation' },
        { status: 500 }
      )
    }

    const indexer = new RNBIndexer()
    const progress = await indexer.getProgress(department)

    return NextResponse.json({
      success: true,
      message: 'Indexation démarrée',
      data: progress,
    })
  } catch (error) {
    console.error('[API RNB Index] Erreur démarrage:', error)
    return NextResponse.json(
      {
        error: 'Failed to start indexation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/rnb/index
 * Met à jour un job (pause/resume)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { department, action } = body

    if (!department || !action) {
      return NextResponse.json(
        { error: 'Department and action are required' },
        { status: 400 }
      )
    }

    const indexer = new RNBIndexer()

    if (action === 'pause') {
      await indexer.pauseIndexation(department)
      return NextResponse.json({ success: true, message: 'Indexation mise en pause' })
    }

    if (action === 'resume') {
      const rnbService = new RNBService()
      const resource = await rnbService.getDepartmentResource(department)
      
      if (!resource) {
        return NextResponse.json(
          { error: 'Resource not found for department' },
          { status: 404 }
        )
      }

      const progress = await indexer.resumeIndexation(department, resource.url)
      return NextResponse.json({ success: true, data: progress })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "pause" or "resume"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API RNB Index] Erreur mise à jour:', error)
    return NextResponse.json(
      {
        error: 'Failed to update indexation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

