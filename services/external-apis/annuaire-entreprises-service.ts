/**
 * Service d'enrichissement via API Annuaire des Entreprises
 * API gratuite et publique: https://recherche-entreprises.api.gouv.fr
 *
 * Source de données complémentaire/alternative à l'API Sirene
 */

import { ApiClient } from '../data-enrichment/api-client'

export interface AnnuaireEntrepriseData {
  siret: string
  siren: string
  name: string
  legalStatus?: string
  address?: {
    street: string
    postalCode: string
    city: string
    fullAddress: string
  }
  activities?: Array<{
    code: string
    label: string
  }>
  creationDate?: string
  closureDate?: string
  employees?: number
  isActive: boolean
  matchingType?: 'siret' | 'siren' | 'name'
}

interface AnnuaireAPIResponse {
  results?: Array<{
    siege?: {
      siret?: string
      code_postal?: string
      commune?: string
      libelle_commune?: string
      libelle_voie?: string
      numero_voie?: string
      complement_adresse?: string
      geo_adresse?: string
      latitude?: number
      longitude?: number
      activite_principale?: string
      libelle_activite_principale?: string
      date_creation?: string
      etat_administratif?: string
      tranche_effectif_salarie?: string
    }
    siren?: string
    nom_complet?: string
    nom_raison_sociale?: string
    nature_juridique?: string
    activite_principale?: string
    libelle_activite_principale?: string
    date_creation?: string
    etat_administratif?: string
    matching_etablissements?: Array<{
      siret?: string
      nom_complet?: string
      commune?: string
      code_postal?: string
      activite_principale?: string
    }>
  }>
  total_results?: number
}

export class AnnuaireEntreprisesService {
  private client: ApiClient
  private readonly baseUrl = 'https://recherche-entreprises.api.gouv.fr'

  constructor() {
    this.client = new ApiClient({
      baseUrl: this.baseUrl,
      timeout: 8000,
      retries: 2,
    })
  }

  /**
   * Recherche une entreprise par SIRET
   */
  async searchBySiret(siret: string): Promise<AnnuaireEntrepriseData | null> {
    try {
      const cleanSiret = siret.replace(/[\s\-\.]/g, '')
      console.log(`[AnnuaireEntreprises] 🔍 Recherche SIRET: ${cleanSiret}`)

      const response = await this.client.get<AnnuaireAPIResponse>('/search', {
        q: cleanSiret,
        mtm_campaign: 'torp-platform',
      })

      if (!response.results || response.results.length === 0) {
        console.log(`[AnnuaireEntreprises] ℹ️ Aucun résultat pour SIRET: ${cleanSiret}`)
        return null
      }

      const result = response.results[0]
      const data = this.mapToAnnuaireData(result, cleanSiret)

      if (data) {
        console.log(
          `[AnnuaireEntreprises] ✅ Données trouvées: ${data.name} - ${data.address?.city || 'N/A'}`
        )
      }

      return data
    } catch (error) {
      console.error('[AnnuaireEntreprises] ❌ Erreur recherche SIRET:', error)
      return null
    }
  }

  /**
   * Recherche une entreprise par SIREN
   */
  async searchBySiren(siren: string): Promise<AnnuaireEntrepriseData | null> {
    try {
      const cleanSiren = siren.replace(/[\s\-\.]/g, '')
      console.log(`[AnnuaireEntreprises] 🔍 Recherche SIREN: ${cleanSiren}`)

      const response = await this.client.get<AnnuaireAPIResponse>('/search', {
        q: cleanSiren,
        mtm_campaign: 'torp-platform',
      })

      if (!response.results || response.results.length === 0) {
        console.log(`[AnnuaireEntreprises] ℹ️ Aucun résultat pour SIREN: ${cleanSiren}`)
        return null
      }

      const result = response.results[0]
      const data = this.mapToAnnuaireData(result, cleanSiren)

      if (data) {
        console.log(
          `[AnnuaireEntreprises] ✅ Données trouvées: ${data.name} - ${data.siren}`
        )
      }

      return data
    } catch (error) {
      console.error('[AnnuaireEntreprises] ❌ Erreur recherche SIREN:', error)
      return null
    }
  }

  /**
   * Recherche une entreprise par nom
   */
  async searchByName(name: string, postalCode?: string): Promise<AnnuaireEntrepriseData[]> {
    try {
      console.log(`[AnnuaireEntreprises] 🔍 Recherche nom: ${name}`)

      const query = postalCode ? `${name} ${postalCode}` : name

      const response = await this.client.get<AnnuaireAPIResponse>('/search', {
        q: query,
        mtm_campaign: 'torp-platform',
        per_page: '10',
      })

      if (!response.results || response.results.length === 0) {
        console.log(`[AnnuaireEntreprises] ℹ️ Aucun résultat pour: ${name}`)
        return []
      }

      const results: AnnuaireEntrepriseData[] = []
      for (const result of response.results) {
        const data = this.mapToAnnuaireData(result)
        if (data) {
          results.push(data)
        }
      }

      console.log(
        `[AnnuaireEntreprises] ✅ ${results.length} résultat(s) trouvé(s) pour: ${name}`
      )

      return results
    } catch (error) {
      console.error('[AnnuaireEntreprises] ❌ Erreur recherche nom:', error)
      return []
    }
  }

  /**
   * Convertit les données API en format AnnuaireEntrepriseData
   */
  private mapToAnnuaireData(
    result: NonNullable<AnnuaireAPIResponse['results']>[number],
    searchIdentifier?: string
  ): AnnuaireEntrepriseData | null {
    if (!result) return null

    // Déterminer si on utilise les données du siège ou de l'entreprise
    const siege = result.siege
    const siret = siege?.siret || searchIdentifier?.substring(0, 14) || ''
    const siren = result.siren || siret.substring(0, 9)

    if (!siren) {
      console.warn('[AnnuaireEntreprises] ⚠️ Pas de SIREN trouvé dans les résultats')
      return null
    }

    // Nom de l'entreprise
    const name = result.nom_complet || result.nom_raison_sociale || 'Entreprise inconnue'

    // Adresse du siège
    let address: AnnuaireEntrepriseData['address'] | undefined
    if (siege) {
      const street = [
        siege.numero_voie,
        siege.libelle_voie,
        siege.complement_adresse,
      ]
        .filter(Boolean)
        .join(' ')
        .trim()

      if (street || siege.code_postal || siege.libelle_commune) {
        address = {
          street: street || '',
          postalCode: siege.code_postal || '',
          city: siege.libelle_commune || siege.commune || '',
          fullAddress: siege.geo_adresse || `${street}, ${siege.code_postal} ${siege.libelle_commune}`,
        }
      }
    }

    // Activité principale
    let activities: AnnuaireEntrepriseData['activities'] | undefined
    const activityCode = siege?.activite_principale || result.activite_principale
    const activityLabel =
      siege?.libelle_activite_principale || result.libelle_activite_principale

    if (activityCode) {
      // Si on a le label, l'utiliser. Sinon utiliser le code APE/NAF
      const displayLabel = activityLabel || `Activité ${activityCode}`
      activities = [
        {
          code: activityCode,
          label: displayLabel,
        },
      ]
    }

    // État administratif
    const etatAdmin = siege?.etat_administratif || result.etat_administratif
    const isActive = etatAdmin === 'A' || etatAdmin === 'actif'

    // Effectifs (conversion de la tranche en nombre approximatif)
    let employees: number | undefined
    if (siege?.tranche_effectif_salarie) {
      employees = this.parseEffectifTranche(siege.tranche_effectif_salarie)
    }

    // Déterminer le type de correspondance
    let matchingType: AnnuaireEntrepriseData['matchingType'] = 'name'
    if (searchIdentifier) {
      if (searchIdentifier.length === 14 && siret === searchIdentifier) {
        matchingType = 'siret'
      } else if (searchIdentifier.length === 9 && siren === searchIdentifier) {
        matchingType = 'siren'
      }
    }

    return {
      siret,
      siren,
      name,
      legalStatus: result.nature_juridique,
      address,
      activities,
      creationDate: siege?.date_creation || result.date_creation,
      closureDate: undefined, // Non fourni par l'API
      employees,
      isActive,
      matchingType,
    }
  }

  /**
   * Convertit une tranche d'effectifs en nombre approximatif
   */
  private parseEffectifTranche(tranche: string): number {
    const tranches: Record<string, number> = {
      NN: 0, // Non renseigné
      '00': 0, // 0 salarié
      '01': 1, // 1 ou 2 salariés
      '02': 3, // 3 à 5 salariés
      '03': 8, // 6 à 9 salariés
      '11': 15, // 10 à 19 salariés
      '12': 25, // 20 à 49 salariés
      '21': 75, // 50 à 99 salariés
      '22': 150, // 100 à 199 salariés
      '31': 300, // 200 à 249 salariés
      '32': 375, // 250 à 499 salariés
      '41': 750, // 500 à 999 salariés
      '42': 1500, // 1 000 à 1 999 salariés
      '51': 3500, // 2 000 à 4 999 salariés
      '52': 7500, // 5 000 à 9 999 salariés
      '53': 10000, // 10 000 salariés et plus
    }

    return tranches[tranche] || 0
  }

  /**
   * Enrichit les données manquantes d'une entreprise
   * Combine les données existantes avec celles de l'Annuaire
   */
  async enrichMissingData(
    existingData: Partial<AnnuaireEntrepriseData>
  ): Promise<AnnuaireEntrepriseData | null> {
    try {
      // Chercher d'abord par SIRET, puis SIREN
      let annuaireData: AnnuaireEntrepriseData | null = null

      if (existingData.siret) {
        annuaireData = await this.searchBySiret(existingData.siret)
      } else if (existingData.siren) {
        annuaireData = await this.searchBySiren(existingData.siren)
      }

      if (!annuaireData) {
        console.log('[AnnuaireEntreprises] ℹ️ Pas de données complémentaires trouvées')
        return null
      }

      // Fusionner les données (priorité aux données existantes)
      return {
        siret: existingData.siret || annuaireData.siret,
        siren: existingData.siren || annuaireData.siren,
        name: existingData.name || annuaireData.name,
        legalStatus: existingData.legalStatus || annuaireData.legalStatus,
        address: existingData.address || annuaireData.address,
        activities: existingData.activities || annuaireData.activities,
        creationDate: existingData.creationDate || annuaireData.creationDate,
        closureDate: existingData.closureDate || annuaireData.closureDate,
        employees: existingData.employees || annuaireData.employees,
        isActive: existingData.isActive ?? annuaireData.isActive,
        matchingType: annuaireData.matchingType,
      }
    } catch (error) {
      console.error('[AnnuaireEntreprises] ❌ Erreur enrichissement:', error)
      return null
    }
  }
}
