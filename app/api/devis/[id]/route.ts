import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  context: any
) {
  try {
    // Auth0 désactivé - accès libre au devis
    const devis = await prisma.devis.findUnique({
      where: { id: context?.params?.id },
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
    console.error('Devis fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: any
) {
  try {
    const devisId = context?.params?.id

    if (!devisId) {
      return NextResponse.json(
        { error: 'Devis ID is required' },
        { status: 400 }
      )
    }

    // Vérifier que le devis existe
    const devis = await prisma.devis.findUnique({
      where: { id: devisId },
    })

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis not found' },
        { status: 404 }
      )
    }

    // Supprimer le devis (les relations sont en cascade dans Prisma)
    await prisma.devis.delete({
      where: { id: devisId },
    })

    return NextResponse.json({
      success: true,
      message: 'Devis deleted successfully',
    })
  } catch (error) {
    console.error('[API Devis] Erreur suppression:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete devis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

