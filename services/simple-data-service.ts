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
 * Récupère le DPE depuis l'API ADEME - RECHERCHE DANS 2 DATASETS
 */
export async function getDPESimple(address: SimpleAddress): Promise<SimpleDPE | null> {
  try {
    console.log('[SimpleDataService] 🔍 Recherche DPE pour:', address.formatted)
    console.log('[SimpleDataService] 🌍 GPS utilisés:', JSON.stringify(address.coordinates, null, 2))

    const datasets = [
      { id: 'meg-83tjwtg8dyz4vv7h1dqe', label: 'DPE v2 (après juillet 2021)' }, // Nouveau ID depuis 2024
      { id: 'dpe-france', label: 'DPE v1 (avant juillet 2021)' },
    ]

    const foundDPEs: Array<{ dpe: any; dataset: string; date: Date }> = []

    // Chercher dans les deux datasets
    for (const dataset of datasets) {
      console.log(`[SimpleDataService] 📚 Recherche dans ${dataset.label}...`)

      // 1. Recherche par GPS avec rayons progressifs
      if (address.coordinates) {
        const { lat, lng } = address.coordinates
        const rayons = [200, 500, 1000] // Essayer 200m, 500m, 1000m

        for (const rayon of rayons) {
          const url = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset.id}/lines?geo_distance=${lat},${lng},${rayon}m&size=10&sort=-date_etablissement_dpe`

          console.log(`[SimpleDataService] 📍 ${dataset.label} - Recherche GPS rayon ${rayon}m...`)
          console.log(`[SimpleDataService] 🔗 URL complète: ${url}`)

          try {
            const response = await fetch(url, {
              headers: { 'Accept': 'application/json' },
            })

            if (response.ok) {
              const data = await response.json()
              console.log(`[SimpleDataService] 📊 ${dataset.label} - ${data.total || 0} DPE trouvés dans rayon ${rayon}m`)

              if (data.results && data.results.length > 0) {
                const dpe = data.results[0]

                // Parser la date d'établissement
                const dateEtablissement = dpe.date_etablissement_dpe || dpe.Date_etablissement_DPE
                if (dateEtablissement) {
                  foundDPEs.push({
                    dpe,
                    dataset: dataset.label,
                    date: new Date(dateEtablissement),
                  })
                  console.log(`[SimpleDataService] ✅ ${dataset.label} - DPE trouvé à ${rayon}m, date: ${dateEtablissement}`)
                  break // Passer au dataset suivant
                }
              }
            }
          } catch (e) {
            console.warn(`[SimpleDataService] ⚠️ Erreur recherche GPS ${dataset.label}:`, e)
          }
        }
      }

      // 2. Recherche par adresse texte (fallback si pas trouvé en GPS)
      if (foundDPEs.filter(f => f.dataset === dataset.label).length === 0) {
        console.log(`[SimpleDataService] 🔍 ${dataset.label} - Recherche par adresse texte (fallback)...`)
        const searchUrl = `https://data.ademe.fr/data-fair/api/v1/datasets/${dataset.id}/lines?q=${encodeURIComponent(address.formatted)}&size=10&sort=-date_etablissement_dpe`

        try {
          const response = await fetch(searchUrl, {
            headers: { 'Accept': 'application/json' },
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`[SimpleDataService] 📊 ${dataset.label} - ${data.total || 0} DPE trouvés par recherche texte`)

            if (data.results && data.results.length > 0) {
              const dpe = data.results[0]
              const dateEtablissement = dpe.date_etablissement_dpe || dpe.Date_etablissement_DPE
              if (dateEtablissement) {
                foundDPEs.push({
                  dpe,
                  dataset: dataset.label,
                  date: new Date(dateEtablissement),
                })
                console.log(`[SimpleDataService] ✅ ${dataset.label} - DPE trouvé par texte, date: ${dateEtablissement}`)
              }
            }
          }
        } catch (e) {
          console.warn(`[SimpleDataService] ⚠️ Erreur recherche texte ${dataset.label}:`, e)
        }
      }
    }

    // Sélectionner le DPE le plus récent parmi tous ceux trouvés
    if (foundDPEs.length === 0) {
      console.warn('[SimpleDataService] ⚠️ Aucun DPE trouvé dans aucun des 2 datasets')
      return null
    }

    // Trier par date décroissante et prendre le plus récent
    foundDPEs.sort((a, b) => b.date.getTime() - a.date.getTime())
    const mostRecent = foundDPEs[0]

    console.log(`[SimpleDataService] ✅ DPE le plus récent sélectionné:`, {
      dataset: mostRecent.dataset,
      date: mostRecent.date.toISOString(),
      classe: mostRecent.dpe.classe_consommation_energie || mostRecent.dpe.Classe_consommation_energie,
      totalTrouve: foundDPEs.length,
    })

    const dpe = mostRecent.dpe

    return {
      classe: dpe.classe_consommation_energie || dpe.Classe_consommation_energie,
      consommation: parseFloat(dpe.consommation_energie || dpe.Consommation_energie) || parseFloat(dpe.conso_5_usages_m2_e_primaire || dpe.Conso_5_usages_m2_e_primaire) || undefined,
      ges: parseFloat(dpe.estimation_ges || dpe.Emission_GES) || parseFloat(dpe.emission_ges_5_usages_m2 || dpe.Emission_GES_5_usages_m2) || undefined,
      surface: parseFloat(dpe.surface_habitable || dpe.Surface_habitable || dpe.surface_thermique_lot) || undefined,
      annee: (dpe.annee_construction || dpe.Annee_construction) ? parseInt(dpe.annee_construction || dpe.Annee_construction, 10) : undefined,
      type: dpe.tr002_type_batiment_description || dpe.Type_batiment,
      chauffage: dpe.type_energie_chauffage || dpe.Type_energie_chauffage,
      dateEstablissement: dpe.date_etablissement_dpe || dpe.Date_etablissement_DPE,
    }
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

      console.log('[SimpleDataService] 📍 Recherche parcelle GPS:', { lat, lng })

      try {
        const response = await fetch(parcelleUrl, {
          headers: { 'Accept': 'application/json' },
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`[SimpleDataService] 📊 ${data.features?.length || 0} parcelle(s) trouvée(s)`)

          if (data.features && data.features.length > 0) {
            const parcelle = data.features[0].properties

            console.log('[SimpleDataService] ✅ Parcelle trouvée:', {
              numero: parcelle.numero,
              section: parcelle.section,
              surface: parcelle.surface,
              commune: parcelle.commune,
            })

            return {
              commune: address.city,
              codeINSEE,
              codeDepartement: codeINSEE.substring(0, 2),
              parcelle: parcelle.numero,
              section: parcelle.section,
              surface: parcelle.surface,
            }
          } else {
            console.warn('[SimpleDataService] ⚠️ API Carto ne retourne aucune parcelle pour ces coordonnées')
          }
        } else {
          console.warn(`[SimpleDataService] ⚠️ API Carto erreur HTTP: ${response.status}`)
        }
      } catch (e) {
        console.error('[SimpleDataService] ❌ Erreur API Carto:', e)
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
