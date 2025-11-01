import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileEnrichmentService } from '@/services/building-profile-enrichment-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/building-profiles/[id]/characteristics
 * Récupère les caractéristiques formatées et lisibles du logement
 * Masque les sources techniques et présente uniquement les résultats
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

    // Récupérer le profil complet
    const profileResponse = await fetch(
      `${request.nextUrl.origin}/api/building-profiles/${profileId}?userId=${userId}`
    )

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      )
    }

    const profileData = await profileResponse.json()
    const profile = profileData.data

    // Extraire les caractéristiques
    const enrichmentService = new BuildingProfileEnrichmentService()
    
    // Construire enrichedData complet depuis toutes les sources disponibles
    const enrichedData: any = profile.enrichedData ? { ...profile.enrichedData } : {}
    
    // Compléter avec les données stockées séparément si enrichedData est vide ou incomplet
    if (!enrichedData.cadastre && profile.cadastralData) {
      enrichedData.cadastre = profile.cadastralData
    }
    if (!enrichedData.plu && profile.pluData) {
      enrichedData.plu = profile.pluData
    }
    if (!enrichedData.rnb && profile.rnbData) {
      enrichedData.rnb = profile.rnbData
    }
    if ((!enrichedData.energy && !enrichedData.dpe) && profile.dpeData) {
      enrichedData.energy = profile.dpeData
      enrichedData.dpe = profile.dpeData
    }
    if (!enrichedData.georisques) {
      // Géorisques peut être dans enrichedData directement
      enrichedData.georisques = enrichedData.georisques || null
    }
    
    // Log pour déboguer
    console.log('[API Characteristics] Données disponibles:', {
      hasEnrichedData: !!profile.enrichedData,
      enrichedDataKeys: Object.keys(enrichedData),
      hasCadastralData: !!profile.cadastralData,
      hasPLUData: !!profile.pluData,
      hasRNBData: !!profile.rnbData,
      hasDPEData: !!profile.dpeData,
    })
    
    // Extraire georisques
    const georisquesData = enrichedData.georisques || null
    
    const characteristics = enrichmentService.extractCharacteristics(
      enrichedData,
      profile.dpeData,
      georisquesData,
      profile.cadastralData || enrichedData.cadastre,
      enrichedData.dvf
    )

    // Grouper par catégorie
    const grouped = enrichmentService.groupByCategory(characteristics)

    return NextResponse.json({
      success: true,
      data: {
        characteristics,
        grouped,
        counts: {
          total: characteristics.length,
          known: characteristics.filter(c => c.status === 'known').length,
          unknown: characteristics.filter(c => c.status === 'unknown').length,
          partial: characteristics.filter(c => c.status === 'partial').length,
        },
      },
    })
  } catch (error) {
    console.error('[API Building Profiles Characteristics] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des caractéristiques',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/building-profiles/[id]/characteristics
 * Met à jour une caractéristique manuellement
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params
    const body = await request.json()
    const { userId, characteristicId, value } = body

    if (!userId || !characteristicId || value === undefined) {
      return NextResponse.json(
        { error: 'userId, characteristicId et value sont requis' },
        { status: 400 }
      )
    }

    // Récupérer le profil
    const profileResponse = await fetch(
      `${request.nextUrl.origin}/api/building-profiles/${profileId}?userId=${userId}`
    )

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: 'Profil non trouvé' },
        { status: 404 }
      )
    }

    const profileData = await profileResponse.json()
    const profile = profileData.data

    // Mettre à jour dans customFields
    const customFields = profile.customFields || {}
    customFields[characteristicId] = {
      value,
      updatedAt: new Date().toISOString(),
      source: 'manual',
    }

    // Mettre à jour le profil
    const updateResponse = await fetch(
      `${request.nextUrl.origin}/api/building-profiles/${profileId}?userId=${userId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customFields }),
      }
    )

    if (!updateResponse.ok) {
      throw new Error('Erreur lors de la mise à jour')
    }

    return NextResponse.json({
      success: true,
      message: 'Caractéristique mise à jour avec succès',
    })
  } catch (error) {
    console.error('[API Building Profiles Characteristics PATCH] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour de la caractéristique',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

