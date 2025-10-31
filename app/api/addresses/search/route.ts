import { NextRequest, NextResponse } from 'next/server'
import { BANIndexer } from '@/services/external-apis/ban-indexer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/addresses/search?q={query}&department={dept}&postalCode={code}&limit={limit}
 * Recherche d'adresses depuis l'index BAN local
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const department = searchParams.get('department') || undefined
    const postalCode = searchParams.get('postalCode') || undefined
    const codeINSEE = searchParams.get('codeINSEE') || undefined
    const city = searchParams.get('city') || undefined
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    if (!query && !department && !postalCode && !codeINSEE && !city) {
      return NextResponse.json(
        { error: 'Au moins un critère de recherche est requis (q, department, postalCode, codeINSEE, ou city)' },
        { status: 400 }
      )
    }

    const indexer = new BANIndexer()
    
    let addresses
    if (query) {
      // Recherche simple par texte
      addresses = await indexer.searchAddress(query, limit)
    } else {
      // Recherche avancée par critères
      addresses = await indexer.searchAddresses({
        department,
        postalCode,
        codeINSEE,
        city,
      })
    }

    return NextResponse.json({
      success: true,
      count: addresses.length,
      addresses,
    })
  } catch (error) {
    console.error('[API Addresses Search] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la recherche d\'adresses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

