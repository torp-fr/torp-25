import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileService } from '@/services/building-profile-service'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * POST /api/building-profiles/[id]/tenant
 * Crée une carte locataire liée à une carte propriétaire
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: parentProfileId } = await params
    const body = await request.json()
    const { userId, name } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const tenantProfile = await service.createTenantProfile(
      parentProfileId,
      userId,
      name
    )

    return NextResponse.json({
      success: true,
      data: tenantProfile,
    }, { status: 201 })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    
    if (error instanceof Error) {
      // Erreur de validation
      if (error.message.includes('Carte propriétaire non trouvée')) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'PARENT_NOT_FOUND',
          },
          { status: 404 }
        )
      }
      // Erreur de duplication
      if (error.message.includes('déjà une carte locataire')) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'DUPLICATE_TENANT',
          },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la création de la carte locataire',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/building-profiles/[id]/tenant
 * Récupère toutes les cartes locataires liées à une carte propriétaire
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const tenantProfiles = await service.getTenantProfiles(profileId, userId)

    return NextResponse.json({
      success: true,
      count: tenantProfiles.length,
      data: tenantProfiles,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur')
    
    if (error instanceof Error) {
      if (error.message.includes('non trouvé') || error.message.includes('non autorisé')) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'NOT_FOUND',
          },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des cartes locataires',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

