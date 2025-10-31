import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

/**
 * GET /api/user/payment-methods
 * Récupère les méthodes de paiement de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || DEMO_USER_ID

    // Pour l'instant, retourner une liste vide
    // À implémenter avec Stripe ou autre service de paiement
    return NextResponse.json({
      success: true,
      data: [],
    })
  } catch (error) {
    console.error('[API Payment Methods GET] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des méthodes de paiement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/payment-methods
 * Met à jour une méthode de paiement (définir par défaut, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId = DEMO_USER_ID, methodId, isDefault } = body

    // À implémenter avec Stripe ou autre service de paiement
    return NextResponse.json({
      success: true,
      message: 'Méthode de paiement mise à jour',
    })
  } catch (error) {
    console.error('[API Payment Methods PATCH] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

