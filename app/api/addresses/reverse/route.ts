import { NextRequest, NextResponse } from 'next/server'
import { BANIndexer } from '@/services/external-apis/ban-indexer'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

/**
 * GET /api/addresses/reverse?lat={lat}&lng={lng}&radius={radius}
 * Géocodage inverse depuis l'index BAN local
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')
    const radius = parseInt(searchParams.get('radius') || '100', 10)

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Les paramètres lat et lng sont requis et doivent être des nombres valides' },
        { status: 400 }
      )
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordonnées invalides (lat: -90 à 90, lng: -180 à 180)' },
        { status: 400 }
      )
    }

    const indexer = new BANIndexer()
    const address = await indexer.reverseGeocode(lat, lng, radius)

    if (!address) {
      return NextResponse.json(
        { error: 'Aucune adresse trouvée pour ces coordonnées' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      address,
    })
  } catch (error) {
    log.error('[API Addresses Reverse] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors du géocodage inverse',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

