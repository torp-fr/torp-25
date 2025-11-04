import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileService } from '@/services/building-profile-service'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

/**
 * GET /api/building-profiles/[id]
 * Récupère un profil spécifique
 * 
 * PATCH /api/building-profiles/[id]
 * Met à jour un profil
 * 
 * DELETE /api/building-profiles/[id]
 * Supprime un profil
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const profile = await service.getProfileById(id, userId)

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur récupération profil')
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: error instanceof Error && error.message.includes('non trouvé') ? 404 : 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const profile = await service.updateProfile(id, userId, body)

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur mise à jour profil')
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    await service.deleteProfile(id, userId)

    return NextResponse.json({
      success: true,
      message: 'Profil supprimé avec succès',
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur suppression profil')
    return NextResponse.json(
      {
        error: 'Erreur lors de la suppression du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

