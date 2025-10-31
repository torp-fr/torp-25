import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileService } from '@/services/building-profile-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/building-profiles
 * Récupère tous les profils de logement de l'utilisateur
 * 
 * POST /api/building-profiles
 * Crée un nouveau profil de logement
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Récupérer l'utilisateur depuis la session Auth0
    // Pour l'instant, utiliser un userId en paramètre (temporaire)
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId est requis' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const profiles = await service.getUserProfiles(userId)

    return NextResponse.json({
      success: true,
      count: profiles.length,
      data: profiles,
    })
  } catch (error) {
    console.error('[API Building Profiles GET] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des profils',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, address, coordinates, role, parentProfileId, lotNumber } = body

    if (!userId || !address) {
      return NextResponse.json(
        { error: 'userId et address sont requis' },
        { status: 400 }
      )
    }

    // Validation pour cartes LOCATAIRE
    if (role === 'LOCATAIRE' && !parentProfileId) {
      return NextResponse.json(
        { error: 'parentProfileId est requis pour créer une carte LOCATAIRE' },
        { status: 400 }
      )
    }

    const service = new BuildingProfileService()
    const profile = await service.createProfile({
      userId,
      name,
      address,
      coordinates,
      role: role || 'PROPRIETAIRE',
      parentProfileId,
      lotNumber,
    })

    return NextResponse.json({
      success: true,
      data: profile,
    }, { status: 201 })
  } catch (error) {
    console.error('[API Building Profiles POST] Erreur:', error)
    
    // Gérer les erreurs de validation spécifiques
    if (error instanceof Error) {
      // Erreur d'unicité (carte déjà existante)
      if (error.message.includes('Une carte propriétaire existe déjà')) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'DUPLICATE_PROPRIETAIRE',
          },
          { status: 409 }
        )
      }
      // Erreur de validation (carte locataire)
      if (error.message.includes('LOCATAIRE') || error.message.includes('parentProfileId')) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'VALIDATION_ERROR',
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Erreur lors de la création du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

