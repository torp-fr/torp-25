import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileService } from '@/services/building-profile-service'

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
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const profile = await service.getProfileById(params.id, userId)

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    console.error('[API Building Profile GET] Erreur:', error)
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
  { params }: { params: { id: string } }
) {
  try {
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
    const profile = await service.updateProfile(params.id, userId, body)

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error) {
    console.error('[API Building Profile PATCH] Erreur:', error)
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
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    await service.deleteProfile(params.id, userId)

    return NextResponse.json({
      success: true,
      message: 'Profil supprimé avec succès',
    })
  } catch (error) {
    console.error('[API Building Profile DELETE] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la suppression du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

