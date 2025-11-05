import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { loggers } from '@/lib/logger'

nconst log = loggers.api
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Auth0 désactivé - accès libre au devis
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        document: true,
        torpScores: true,
      },
    })

    if (!devis) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: devis })
  } catch (error) {
    log.error('Devis fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Vérifier que le devis existe
    const devis = await prisma.devis.findUnique({
      where: { id },
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis not found' },
        { status: 404 }
      )
    }

    // Supprimer le devis (les relations sont en cascade dans Prisma)
    await prisma.devis.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Devis deleted successfully',
    })
  } catch (error) {
    log.error('[API Devis] Erreur suppression:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete devis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

