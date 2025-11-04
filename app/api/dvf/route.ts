import { NextRequest, NextResponse } from 'next/server'
import { DVFService } from '@/services/external-apis/dvf-service'
import { AddressService } from '@/services/external-apis/address-service'
import { z } from 'zod'
import { loggers } from '@/lib/logger'

const log = loggers.api

export const dynamic = 'force-dynamic'

const dvfRequestSchema = z.object({
  address: z.string().min(1),
  rayon: z.number().optional().default(1000),
  annee_min: z.number().optional(),
  annee_max: z.number().optional(),
  type_local: z.string().optional(),
  surface_min: z.number().optional(),
  surface_max: z.number().optional(),
})

/**
 * POST /api/dvf
 * 
 * Récupère les données DVF (Demandes de Valeurs Foncières) pour une adresse
 * Permet d'estimer la valeur d'un bien, comparer avec les transactions récentes
 * 
 * Body:
 * {
 *   "address": "123 rue de la Paix, 75001 Paris",
 *   "rayon": 1000, // Rayon en mètres (optionnel, défaut: 1000)
 *   "annee_min": 2020, // Année minimale (optionnel)
 *   "annee_max": 2024, // Année maximale (optionnel)
 *   "type_local": "Maison", // Type de local (optionnel)
 *   "surface_min": 80, // Surface minimale en m² (optionnel)
 *   "surface_max": 150 // Surface maximale en m² (optionnel)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = dvfRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 422 }
      )
    }

    const { address, ...filters } = parsed.data

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

    // 2. Récupérer les données DVF
    const dvfService = new DVFService()
    const dvfData = await dvfService.getDVFData(addressData, {
      rayon: filters.rayon,
      annee_min: filters.annee_min,
      annee_max: filters.annee_max,
      type_local: filters.type_local,
      surface_min: filters.surface_min,
      surface_max: filters.surface_max,
    })

    if (!dvfData) {
      return NextResponse.json(
        {
          error: 'No DVF data available for this address',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      address: addressData.formatted,
      data: dvfData,
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur récupération données DVF')
    return NextResponse.json(
      {
        error: 'Failed to fetch DVF data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/dvf?code_insee={code}&lat={lat}&lon={lon}
 * 
 * Récupère les données DVF depuis l'API
 * Paramètres:
 * - code_insee: Code INSEE de la commune (optionnel)
 * - lat, lon: Coordonnées GPS (optionnel)
 * - rayon: Rayon en mètres (optionnel, défaut: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const codeInsee = searchParams.get('code_insee')
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const rayon = parseInt(searchParams.get('rayon') || '1000', 10)

    if (!codeInsee && (!lat || !lon)) {
      return NextResponse.json(
        {
          error: 'Missing parameters',
          usage: {
            post: 'POST /api/dvf with { "address": "..." }',
            get: 'GET /api/dvf?code_insee={code} OR ?lat={lat}&lon={lon}',
          },
        },
        { status: 400 }
      )
    }

    const dvfService = new DVFService()
    const addressService = new AddressService()

    // Si code INSEE fourni
    if (codeInsee) {
      // Récupérer les informations de la commune
      try {
        const communeResponse = await fetch(
          `https://geo.api.gouv.fr/communes/${codeInsee}?format=json`,
          {
            headers: { Accept: 'application/json' },
          }
        )
        
        if (communeResponse.ok) {
          const commune = await communeResponse.json()
          
          if (commune) {
            // Créer un AddressData depuis les données de la commune
            const addressData = {
              formatted: `${commune.nom}, ${commune.codeDepartement || commune.code}`,
              street: '',
              postalCode: commune.codesPostaux?.[0] || '',
              city: commune.nom,
              region: commune.region?.nom || '',
              department: commune.departement?.nom || commune.codeDepartement || '',
              coordinates: commune.centre ? {
                lat: commune.centre.coordinates[1],
                lng: commune.centre.coordinates[0],
              } : undefined,
              completeness: 80,
            }

            const dvfData = await dvfService.getDVFData(addressData, {
              rayon,
            })

            if (dvfData) {
              return NextResponse.json({
                success: true,
                code_insee: codeInsee,
                commune: commune.nom,
                data: dvfData,
              })
            }
          }
        }
      } catch (error) {
        log.error({ err: error }, 'Erreur récupération commune')
      }
    }

    // Si coordonnées GPS fournies
    if (lat && lon) {
      const coordinates = { lat: parseFloat(lat), lng: parseFloat(lon) }
      
      // Géocodage inverse
      const addressData = await addressService.reverseGeocode(coordinates.lat, coordinates.lng)
      
      if (addressData) {
        const dvfData = await dvfService.getDVFData(addressData, {
          rayon,
        })

        if (dvfData) {
          return NextResponse.json({
            success: true,
            coordinates,
            data: dvfData,
          })
        }
      }
    }

    return NextResponse.json(
      { error: 'No DVF data available' },
      { status: 404 }
    )
  } catch (error) {
    log.error({ err: error }, 'Erreur récupération données DVF')
    return NextResponse.json(
      {
        error: 'Failed to fetch DVF data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

