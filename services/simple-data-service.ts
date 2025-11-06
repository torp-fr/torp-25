/**
 * SERVICE D'ENRICHISSEMENT ULTRA-SIMPLE
 *
 * Appels API directs, pas de classes complexes, juste des fonctions qui MARCHENT.
 * REFONTE COMPLÈTE 2025-11-06
 */

export interface SimpleAddress {
  formatted: string
  city: string
  postalCode: string
  coordinates: { lat: number; lng: number }
}

export interface SimpleDPE {
  classe?: string // A, B, C, D, E, F, G
  consommation?: number // kWh/m²/an
  ges?: number // kg CO2/m²/an
  surface?: number // m²
  annee?: number
  type?: string
  chauffage?: string
  dateEstablissement?: string
}

export interface SimpleCadastre {
  commune: string
  codeINSEE: string
  codeDepartement: string
  parcelle?: string
  section?: string
  surface?: number
}

export interface SimpleRisques {
  inondation: boolean
  radon?: number // 1, 2, 3
  argile?: string // faible, moyen, fort
  seisme?: string
  sitespollues?: number
}

/**
 * Récupère le DPE depuis l'API ADEME
 */
export async function getDPESimple(address: SimpleAddress): Promise<SimpleDPE | null> {
  try {
    console.log('[SimpleDataService] 🔍 Recherche DPE pour:', address.formatted)

    // 1. Recherche par GPS
    if (address.coordinates) {
      const { lat, lng } = address.coordinates
      const url = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines?geo_distance=${lat},${lng},200m&size=1&sort=Date_etablissement_DPE:-1`

      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.results && data.results.length > 0) {
          const dpe = data.results[0]

          console.log('[SimpleDataService] ✅ DPE trouvé:', {
            classe: dpe.Classe_consommation_energie,
            consommation: dpe.Consommation_energie,
            surface: dpe.Surface_habitable,
          })

          return {
            classe: dpe.Classe_consommation_energie,
            consommation: dpe.Consommation_energie || dpe.Conso_5_usages_m2_e_primaire,
            ges: dpe.Emission_GES || dpe.Emission_GES_5_usages_m2,
            surface: dpe.Surface_habitable,
            annee: dpe.Annee_construction ? parseInt(dpe.Annee_construction, 10) : undefined,
            type: dpe.Type_batiment,
            chauffage: dpe.Type_energie_chauffage,
            dateEstablissement: dpe.Date_etablissement_DPE,
          }
        }
      }
    }

    // 2. Recherche par adresse texte (fallback)
    const searchUrl = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines?q=${encodeURIComponent(address.formatted)}&size=1&sort=Date_etablissement_DPE:-1`

    const response2 = await fetch(searchUrl, {
      headers: { 'Accept': 'application/json' },
    })

    if (response2.ok) {
      const data = await response2.json()

      if (data.results && data.results.length > 0) {
        const dpe = data.results[0]

        console.log('[SimpleDataService] ✅ DPE trouvé par adresse:', {
          classe: dpe.Classe_consommation_energie,
        })

        return {
          classe: dpe.Classe_consommation_energie,
          consommation: dpe.Consommation_energie || dpe.Conso_5_usages_m2_e_primaire,
          ges: dpe.Emission_GES || dpe.Emission_GES_5_usages_m2,
          surface: dpe.Surface_habitable,
          annee: dpe.Annee_construction ? parseInt(dpe.Annee_construction, 10) : undefined,
          type: dpe.Type_batiment,
          chauffage: dpe.Type_energie_chauffage,
          dateEstablissement: dpe.Date_etablissement_DPE,
        }
      }
    }

    console.warn('[SimpleDataService] ⚠️ Aucun DPE trouvé')
    return null
  } catch (error) {
    console.error('[SimpleDataService] ❌ Erreur DPE:', error)
    return null
  }
}

/**
 * Récupère les données cadastrales depuis API Carto IGN
 */
export async function getCadastreSimple(address: SimpleAddress): Promise<SimpleCadastre | null> {
  try {
    console.log('[SimpleDataService] 🔍 Recherche cadastre pour:', address.city)

    // 1. Récupérer le code INSEE réel
    let codeINSEE = address.postalCode.substring(0, 5)

    try {
      const communeUrl = `https://geo.api.gouv.fr/communes?codePostal=${address.postalCode}&nom=${encodeURIComponent(address.city)}&format=json`
      const communeResponse = await fetch(communeUrl)

      if (communeResponse.ok) {
        const communes = await communeResponse.json()
        if (communes && communes.length > 0) {
          codeINSEE = communes[0].code
          console.log('[SimpleDataService] ✅ Code INSEE trouvé:', codeINSEE)
        }
      }
    } catch (e) {
      console.warn('[SimpleDataService] ⚠️ Erreur récupération code INSEE:', e)
    }

    // 2. Récupérer la parcelle par coordonnées GPS (API Carto IGN)
    if (address.coordinates) {
      const { lat, lng } = address.coordinates
      const geom = JSON.stringify({
        type: 'Point',
        coordinates: [lng, lat],
      })

      const parcelleUrl = `https://apicarto.ign.fr/api/cadastre/parcelle?geom=${encodeURIComponent(geom)}&source_ign=PCI&_limit=1`

      try {
        const response = await fetch(parcelleUrl, {
          headers: { 'Accept': 'application/json' },
        })

        if (response.ok) {
          const data = await response.json()

          if (data.features && data.features.length > 0) {
            const parcelle = data.features[0].properties

            console.log('[SimpleDataService] ✅ Parcelle trouvée:', {
              numero: parcelle.numero,
              section: parcelle.section,
            })

            return {
              commune: address.city,
              codeINSEE,
              codeDepartement: codeINSEE.substring(0, 2),
              parcelle: parcelle.numero,
              section: parcelle.section,
              surface: parcelle.surface,
            }
          }
        }
      } catch (e) {
        console.warn('[SimpleDataService] ⚠️ Erreur API Carto:', e)
      }
    }

    // 3. Retourner au moins les données de base
    console.log('[SimpleDataService] ℹ️ Parcelle non trouvée, retour données de base')
    return {
      commune: address.city,
      codeINSEE,
      codeDepartement: codeINSEE.substring(0, 2),
    }
  } catch (error) {
    console.error('[SimpleDataService] ❌ Erreur cadastre:', error)
    return {
      commune: address.city,
      codeINSEE: address.postalCode.substring(0, 5),
      codeDepartement: address.postalCode.substring(0, 2),
    }
  }
}

/**
 * Récupère les risques depuis API Géorisques
 */
export async function getRisquesSimple(address: SimpleAddress): Promise<SimpleRisques> {
  try {
    console.log('[SimpleDataService] 🔍 Recherche risques pour:', address.city)

    const risques: SimpleRisques = {
      inondation: false,
      radon: undefined,
      argile: undefined,
      seisme: undefined,
      sitespollues: 0,
    }

    if (!address.coordinates) {
      return risques
    }

    const { lat, lng } = address.coordinates

    // 1. Sites et sols pollués (SSP)
    try {
      const sspUrl = `https://georisques.gouv.fr/api/v1/gaspar/risques?latlon=${lat},${lng}&rayon=500`
      const response = await fetch(sspUrl)

      if (response.ok) {
        const data = await response.json()
        risques.sitespollues = data.data?.length || 0
      }
    } catch (e) {
      console.warn('[SimpleDataService] ⚠️ Erreur SSP:', e)
    }

    // 2. Retrait-gonflement des argiles (RGA)
    try {
      const rgaUrl = `https://georisques.gouv.fr/api/v1/gaspar/alea_rga?latlon=${lat},${lng}`
      const response = await fetch(rgaUrl)

      if (response.ok) {
        const data = await response.json()
        if (data.data && data.data.length > 0) {
          risques.argile = data.data[0].niv_alea // faible, moyen, fort
        }
      }
    } catch (e) {
      console.warn('[SimpleDataService] ⚠️ Erreur RGA:', e)
    }

    console.log('[SimpleDataService] ✅ Risques récupérés:', risques)
    return risques
  } catch (error) {
    console.error('[SimpleDataService] ❌ Erreur risques:', error)
    return {
      inondation: false,
      sitespollues: 0,
    }
  }
}

/**
 * Enrichissement complet - Appelle toutes les APIs
 */
export async function enrichirComplet(address: SimpleAddress) {
  console.log('[SimpleDataService] 🚀 ENRICHISSEMENT COMPLET pour:', address.formatted)

  const [dpe, cadastre, risques] = await Promise.all([
    getDPESimple(address),
    getCadastreSimple(address),
    getRisquesSimple(address),
  ])

  console.log('[SimpleDataService] ✅ ENRICHISSEMENT TERMINÉ:', {
    hasDPE: !!dpe,
    dpeClasse: dpe?.classe,
    dpeSurface: dpe?.surface,
    dpeAnnee: dpe?.annee,
    hasCadastre: !!cadastre,
    cadastreParcelle: cadastre?.parcelle,
    cadastreSection: cadastre?.section,
    hasRisques: !!risques,
  })

  return {
    dpe,
    cadastre,
    risques,
  }
}
