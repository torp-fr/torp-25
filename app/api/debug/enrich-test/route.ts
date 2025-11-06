import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * ENDPOINT DE DEBUG DIRECT
 * GET /api/debug/enrich-test?address=<adresse>
 *
 * Teste l'enrichissement en temps réel et retourne TOUTES les données intermédiaires
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Paramètre "address" requis. Exemple: ?address=10 Rue de Rivoli, 75001 Paris' },
        { status: 400 }
      )
    }

    const debug: any = {
      timestamp: new Date().toISOString(),
      input: { address },
      steps: [],
    }

    // ÉTAPE 1: Recherche d'adresse
    console.log('[DEBUG] Étape 1: Recherche adresse via API Adresse')
    debug.steps.push({ step: 1, name: 'Recherche adresse', status: 'starting' })

    const { AddressService } = await import('@/services/external-apis/address-service')
    const addressService = new AddressService()

    const addresses = await addressService.searchAddress(address)

    if (addresses.length === 0) {
      debug.steps.push({ step: 1, status: 'failed', error: 'Aucune adresse trouvée' })
      return NextResponse.json({ debug, error: 'Aucune adresse trouvée' }, { status: 404 })
    }

    const addressData = addresses[0]
    debug.steps.push({
      step: 1,
      status: 'success',
      data: {
        formatted: addressData.formatted,
        city: addressData.city,
        postalCode: addressData.postalCode,
        coordinates: addressData.coordinates,
      },
    })

    // ÉTAPE 2: Enrichissement DPE
    console.log('[DEBUG] Étape 2: Recherche DPE avec coordonnées:', addressData.coordinates)
    debug.steps.push({ step: 2, name: 'Recherche DPE', status: 'starting', coordinates: addressData.coordinates })

    const { getDPESimple } = await import('@/services/simple-data-service')

    const simpleAddress = {
      formatted: addressData.formatted,
      city: addressData.city,
      postalCode: addressData.postalCode,
      coordinates: addressData.coordinates,
    }

    const dpeData = await getDPESimple(simpleAddress)

    debug.steps.push({
      step: 2,
      status: dpeData ? 'success' : 'not_found',
      data: dpeData,
    })

    // ÉTAPE 3: Test avec URLs ADEME directes
    console.log('[DEBUG] Étape 3: Test URLs ADEME directes')
    debug.steps.push({ step: 3, name: 'Test APIs ADEME directes', status: 'starting' })

    const testUrls = []
    if (addressData.coordinates) {
      const { lat, lng } = addressData.coordinates

      // Tester les 2 datasets avec rayon 500m
      const datasets = [
        { id: 'dpe-v2-logements-existants', label: 'DPE v2 (après juillet 2021)' },
        { id: 'dpe-france', label: 'DPE v1 (avant juillet 2021)' },
      ]

      for (const dataset of datasets) {
        const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset.id}/lines?geo_distance=${lat},${lng},500m&size=5`

        try {
          const response = await fetch(url, { headers: { 'Accept': 'application/json' } })
          const data = await response.json()

          testUrls.push({
            dataset: dataset.label,
            url,
            status: response.status,
            found: data.results?.length || 0,
            sample: data.results?.[0] || null,
          })
        } catch (e: any) {
          testUrls.push({
            dataset: dataset.label,
            url,
            error: e.message,
          })
        }
      }
    }

    debug.steps.push({
      step: 3,
      status: 'completed',
      urls: testUrls,
    })

    // ÉTAPE 4: Recherche cadastre
    console.log('[DEBUG] Étape 4: Recherche cadastre')
    debug.steps.push({ step: 4, name: 'Recherche cadastre', status: 'starting' })

    const { getCadastreSimple } = await import('@/services/simple-data-service')
    const cadastreData = await getCadastreSimple(simpleAddress)

    debug.steps.push({
      step: 4,
      status: cadastreData ? 'success' : 'not_found',
      data: cadastreData,
    })

    // RÉSUMÉ
    return NextResponse.json({
      success: true,
      debug,
      summary: {
        address: addressData.formatted,
        coordinates: addressData.coordinates,
        dpeFound: !!dpeData,
        dpeData: dpeData ? {
          classe: dpeData.classe,
          consommation: dpeData.consommation,
          surface: dpeData.surface,
          annee: dpeData.annee,
          type: dpeData.type,
        } : null,
        cadastreFound: !!cadastreData,
        cadastreData: cadastreData ? {
          commune: cadastreData.commune,
          parcelle: cadastreData.parcelle,
        } : null,
      },
    })
  } catch (error) {
    console.error('[DEBUG] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors du test d\'enrichissement',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
