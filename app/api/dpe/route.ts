import { NextRequest, NextResponse } from 'next/server'
import { DPEService } from '@/services/external-apis/dpe-service'
import { AddressService } from '@/services/external-apis/address-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dpe
 * Récupère les données DPE certifiées pour une adresse
 * Paramètres :
 * - address: Adresse à rechercher (requis)
 * - postalCode: Code postal (optionnel)
 * - codeINSEE: Code INSEE (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')
    const codeINSEE = searchParams.get('codeINSEE')

    if (!address) {
      return NextResponse.json(
        { error: 'Le paramètre "address" est requis' },
        { status: 400 }
      )
    }

    // Résoudre l'adresse pour obtenir les coordonnées et le code INSEE
    const addressService = new AddressService()
    const addresses = await addressService.searchAddress(address)
    
    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'Adresse non trouvée' },
        { status: 404 }
      )
    }

    const addressData = addresses[0]
    
    // Utiliser le code INSEE fourni ou celui de l'adresse
    if (codeINSEE) {
      addressData.postalCode = codeINSEE.padStart(5, '0')
    }

    // Récupérer les données DPE
    const dpeService = new DPEService()
    const dpeData = await dpeService.getDPEData(addressData)

    if (!dpeData) {
      return NextResponse.json(
        {
          success: true,
          message: 'Aucune donnée DPE trouvée pour cette adresse',
          data: null,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      success: true,
      data: dpeData,
    })
  } catch (error) {
    console.error('[API DPE GET] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des données DPE',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

