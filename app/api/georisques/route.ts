import { NextRequest, NextResponse } from 'next/server'
import { GeorisquesService } from '@/services/external-apis/georisques-service'
import { AddressService } from '@/services/external-apis/address-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const georisquesRequestSchema = z.object({
  address: z.string().min(1),
})

/**
 * POST /api/georisques
 * 
 * Récupère les données de risques depuis l'API Géorisques pour une adresse
 * 
 * Body:
 * {
 *   "address": "123 rue de la Paix, 75001 Paris"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = georisquesRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { address } = parsed.data

    // 1. Géocoder l'adresse
    const addressService = new AddressService()
    const addresses = await addressService.searchAddress(address)
    
    if (addresses.length === 0) {
      return NextResponse.json(
        {
          error: 'Address not found',
        },
        { status: 404 }
      )
    }

    const addressData = addresses[0]

    // 2. Récupérer les données de risques
    const georisquesService = new GeorisquesService()
    const riskData = await georisquesService.getRiskData(addressData)

    if (!riskData) {
      return NextResponse.json(
        {
          error: 'No risk data available for this address',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      address: addressData.formatted,
      data: riskData,
    })
  } catch (error) {
    console.error('[API Géorisques] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch risk data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/georisques?code_insee={code}&lat={lat}&lon={lon}
 * 
 * Récupère les données de risques depuis l'API Géorisques
 * Paramètres:
 * - code_insee: Code INSEE de la commune (optionnel)
 * - lat, lon: Coordonnées GPS (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codeInsee = searchParams.get('code_insee')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')

    if (!codeInsee && (!lat || !lon)) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          usage: {
            post: 'POST /api/georisques with { "address": "..." }',
            get: 'GET /api/georisques?code_insee={code} OR ?lat={lat}&lon={lon}',
          },
        },
        { status: 400 }
      )
    }

    const georisquesService = new GeorisquesService()

    // Si code INSEE fourni, utiliser directement
    if (codeInsee) {
      const [tri, azi, rga, radon, sismique] = await Promise.all([
        georisquesService.getTRI(codeInsee),
        georisquesService.getAZI(codeInsee),
        georisquesService.getRGA(codeInsee),
        georisquesService.getRadon(codeInsee),
        georisquesService.getZonageSismique(codeInsee),
      ])

      return NextResponse.json({
        success: true,
        code_insee: codeInsee,
        data: {
          tri,
          azi,
          rga,
          radon,
          sismique,
        },
      })
    }

    // Si coordonnées GPS fournies
    if (lat && lon) {
      const coordinates = { lat: parseFloat(lat), lng: parseFloat(lon) }
      const tri = await georisquesService.getTRI(undefined, coordinates)

      return NextResponse.json({
        success: true,
        coordinates,
        data: {
          tri,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[API Géorisques] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch risk data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

