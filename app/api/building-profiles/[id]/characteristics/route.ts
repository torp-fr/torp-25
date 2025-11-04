import { NextRequest, NextResponse } from 'next/server'
import { BuildingProfileEnrichmentService } from '@/services/building-profile-enrichment-service'
import { loggers } from '@/lib/logger'

const log = loggers.api

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

    // Récupérer le profil complet directement depuis Prisma
    const { BuildingProfileService } = await import('@/services/building-profile-service')
    const buildingProfileService = new BuildingProfileService()
    
    let profile
    try {
      profile = await buildingProfileService.getProfileById(profileId, userId)
      if (!profile) {
        return NextResponse.json(
          { error: 'Profil non trouvé ou non autorisé' },
          { status: 404 }
        )
      }
    } catch (error) {
      log.error({ err: error, profileId }, 'Erreur récupération profil')
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du profil' },
        { status: 500 }
      )
    }

    // Extraire les caractéristiques
    const enrichmentService = new BuildingProfileEnrichmentService()
    
    // Construire enrichedData complet depuis toutes les sources disponibles
    // profile.enrichedData est un JsonValue de Prisma, il faut le convertir en objet
    let enrichedData: any = {}
    if (profile.enrichedData) {
      if (typeof profile.enrichedData === 'object' && profile.enrichedData !== null && !Array.isArray(profile.enrichedData)) {
        enrichedData = { ...(profile.enrichedData as Record<string, any>) }
      } else {
        // Si ce n'est pas un objet, essayer de le parser
        try {
          enrichedData = typeof profile.enrichedData === 'string' ? JSON.parse(profile.enrichedData) : profile.enrichedData
        } catch {
          enrichedData = {}
        }
      }
    }
    
    // Compléter avec les données stockées séparément si enrichedData est vide ou incomplet
    // PRIORITÉ : Utiliser enrichedData d'abord, puis les champs séparés
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
    // Géorisques : peut être dans enrichedData.georisques OU enrichData (sans 's')
    if (!enrichedData.georisques) {
      enrichedData.georisques = enrichedData.georisques || enrichedData.georisques || null
    }
    
    // S'assurer qu'on a au moins l'adresse
    if (!enrichedData.address && profile.address) {
      enrichedData.address = profile.address
    }
    
    // Log pour déboguer - DÉTAILLÉ
    log.debug({
      profileId,
      hasEnrichedData: !!profile.enrichedData,
      enrichedDataType: typeof profile.enrichedData,
      enrichedDataIsArray: Array.isArray(profile.enrichedData),
      enrichedDataKeys: Object.keys(enrichedData),
      enrichedDataStructure: {
        hasCadastre: !!enrichedData.cadastre,
        cadastreKeys: enrichedData.cadastre ? Object.keys(enrichedData.cadastre) : [],
        hasPLU: !!enrichedData.plu,
        hasRNB: !!enrichedData.rnb,
        hasEnergy: !!enrichedData.energy,
        hasDPE: !!enrichedData.dpe,
        hasGeorisques: !!enrichedData.georisques,
        hasDVF: !!enrichedData.dvf,
        hasAddress: !!enrichedData.address,
      },
      hasCadastralData: !!profile.cadastralData,
      hasPLUData: !!profile.pluData,
      hasRNBData: !!profile.rnbData,
      hasDPEData: !!profile.dpeData,
      hasAddress: !!profile.address,
      enrichmentStatus: profile.enrichmentStatus,
    }, 'Données profil disponibles')
    
    // VÉRIFICATION CRITIQUE : Si enrichedData est vraiment vide, utiliser au moins l'adresse
    if (Object.keys(enrichedData).length === 0 || (!enrichedData.address && profile.address)) {
      log.warn({ profileId }, 'enrichedData vide ou incomplet, utilisation données de base')
      enrichedData = {
        address: profile.address || enrichedData.address,
        cadastre: profile.cadastralData || enrichedData.cadastre || null,
      }
      log.debug({
        keys: Object.keys(enrichedData),
        hasAddress: !!enrichedData.address,
        hasCadastre: !!enrichedData.cadastre,
      }, 'enrichedData corrigé')
    }
    
    // Extraire georisques (peut être dans enrichedData.georisques OU directement)
    const georisquesData = enrichedData.georisques || null
    
    // DVF peut être dans enrichedData.dvf
    const dvfData = enrichedData.dvf || null
    
    // TOUJOURS extraire les caractéristiques, même si données vides
    // Cela affichera au moins les champs "unknown" avec possibilité de saisie manuelle
    log.debug({
      enrichedDataKeys: Object.keys(enrichedData),
      hasDPEData: !!profile.dpeData || !!enrichedData.energy || !!enrichedData.dpe,
      hasGeorisques: !!georisquesData,
      hasCadastral: !!(profile.cadastralData || enrichedData.cadastre),
      hasDVF: !!dvfData,
    }, 'Extraction caractéristiques avec données')
    
    const characteristics = enrichmentService.extractCharacteristics(
      enrichedData,
      profile.dpeData || enrichedData.energy || enrichedData.dpe,
      georisquesData,
      profile.cadastralData || enrichedData.cadastre,
      dvfData
    )
    
    log.info({
      total: characteristics.length,
      known: characteristics.filter(c => c.status === 'known').length,
      unknown: characteristics.filter(c => c.status === 'unknown').length,
      partial: characteristics.filter(c => c.status === 'partial').length,
      categories: Array.from(new Set(characteristics.map(c => c.category))),
    }, 'Caractéristiques extraites')

    // Grouper par catégorie
    const grouped = enrichmentService.groupByCategory(characteristics)

    log.debug({
      groupedCategories: Object.keys(grouped),
      totalInGrouped: Object.values(grouped).reduce((sum, chars) => sum + chars.length, 0),
    }, 'Caractéristiques groupées')

    const response = {
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
    }
    
    log.debug({
      success: response.success,
      characteristicsCount: response.data.characteristics.length,
      groupedCount: Object.keys(response.data.grouped).length,
      counts: response.data.counts,
    }, 'Réponse envoyée')

    return NextResponse.json(response)
  } catch (error) {
    log.error({ err: error }, 'Erreur récupération caractéristiques')
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
  let profileId: string | undefined
  try {
    const resolvedParams = await params
    profileId = resolvedParams.id
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
    log.error({ err: error, profileId }, 'Erreur mise à jour caractéristique')
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour de la caractéristique',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

