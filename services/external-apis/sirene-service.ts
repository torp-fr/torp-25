/**
 * Service pour récupérer les données Sirene (entreprises et établissements)
 * Sources :
 * - API INSEE Sirene (officielle) : https://api.insee.fr/entreprises/sirene/v3
 * - data.gouv.fr : https://www.data.gouv.fr/fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements/
 * Dataset ID: 5b7ffc618b4c4169d30727e0
 *
 * Le service permet de :
 * - Rechercher une entreprise par SIREN/SIRET
 * - Rechercher par nom/raison sociale
 * - Vérifier et certifier les données d'entreprise
 * - Obtenir les informations légales (forme juridique, activité, adresse, etc.)
 */

export interface SireneCompany {
  // Identifiants
  siren: string // 9 chiffres (unité légale)
  siret: string // 14 chiffres (établissement)

  // Informations générales
  name: string // Raison sociale ou dénomination
  commercialName?: string // Nom commercial (enseigne)
  acronym?: string // Sigle

  // Activité
  nafCode?: string // Code NAF (activité principale)
  nafLabel?: string // Libellé NAF
  secondaryActivities?: Array<{ code: string; label: string }>

  // Forme juridique
  legalForm?: string // Code forme juridique
  legalFormLabel?: string // Libellé forme juridique
  legalCategory?: string // Catégorie juridique

  // Dates importantes
  creationDate?: string // Date de création
  closingDate?: string // Date de fermeture (si fermé)
  lastUpdate?: string // Dernière mise à jour

  // Statut
  status: 'ACTIVE' | 'CLOSED' | 'TRANSFERRED' | 'UNKNOWN'
  isHeadquarters: boolean // Si c'est le siège social

  // Adresse
  address: {
    street?: string
    postalCode?: string
    city?: string
    department?: string
    region?: string
    country?: string
    formatted?: string
    coordinates?: { lat: number; lng: number }
  }

  // Effectifs (si disponible)
  employees?: {
    range?: string // Tranche d'effectifs (ex: "10-19", "20-49")
    count?: number // Effectif exact (si disponible)
  }

  // Informations financières (si disponibles)
  capital?: number // Capital social (en euros)
  turnover?: {
    range?: string // Tranche de CA
    lastYear?: number // CA dernier exercice (si disponible)
  }

  // Certifications et labels (si disponibles)
  certifications?: string[] // RGE, Qualibat, etc.

  // Métadonnées
  sources: string[]
  lastUpdated: string
  verified: boolean // Si les données ont été vérifiées/certifiées
}

export interface SireneSearchResult {
  companies: SireneCompany[]
  total: number
  page: number
  perPage: number
  hasMore: boolean
}

export interface SireneVerificationResult {
  valid: boolean
  company?: SireneCompany
  errors: string[]
  warnings: string[]
  matchScore?: number // Score de correspondance 0-100
}

export class SireneService {
  private readonly inseeApiUrl = 'https://api.insee.fr/entreprises/sirene/v3'

  // Clé API INSEE (à définir via variable d'environnement)
  private get inseeApiKey(): string | undefined {
    return process.env.INSEE_API_KEY || process.env.NEXT_PUBLIC_INSEE_API_KEY
  }

  // Constantes pour future implémentation data.gouv.fr (dataset: 5b7ffc618b4c4169d30727e0)
  // Ces valeurs seront utilisées lors de l'implémentation de l'indexation locale
  // private readonly dataGouvDatasetId = '5b7ffc618b4c4169d30727e0'
  // private readonly dataGouvBaseUrl = 'https://www.data.gouv.fr/api/1'

  /**
   * Recherche une entreprise par SIREN (unité légale)
   */
  async getCompanyBySiren(siren: string): Promise<SireneCompany | null> {
    try {
      // Nettoyer le SIREN (enlever espaces, tirets)
      const cleanSiren = siren.replace(/[\s-]/g, '')

      if (cleanSiren.length !== 9 || !/^\d{9}$/.test(cleanSiren)) {
        console.warn('[SireneService] SIREN invalide:', siren)
        return null
      }

      // Essayer d'abord l'API INSEE (si clé disponible)
      if (this.inseeApiKey) {
        const company = await this.fetchFromINSEE(cleanSiren, 'siren')
        if (company) {
          return company
        }
      }

      // Fallback sur data.gouv.fr ou recherche locale
      return await this.fetchFromDataGouv(cleanSiren, 'siren')
    } catch (error) {
      console.error(
        '[SireneService] Erreur récupération entreprise par SIREN:',
        error
      )
      return null
    }
  }

  /**
   * Recherche un établissement par SIRET
   */
  async getCompanyBySiret(siret: string): Promise<SireneCompany | null> {
    try {
      const cleanSiret = siret.replace(/[\s-]/g, '')

      if (cleanSiret.length !== 14 || !/^\d{14}$/.test(cleanSiret)) {
        console.warn('[SireneService] SIRET invalide:', siret)
        return null
      }

      if (this.inseeApiKey) {
        const company = await this.fetchFromINSEE(cleanSiret, 'siret')
        if (company) {
          return company
        }
      }

      return await this.fetchFromDataGouv(cleanSiret, 'siret')
    } catch (error) {
      console.error(
        '[SireneService] Erreur récupération établissement par SIRET:',
        error
      )
      return null
    }
  }

  /**
   * Recherche des entreprises par nom/raison sociale
   */
  async searchCompanies(
    query: string,
    options?: {
      department?: string
      nafCode?: string
      status?: 'ACTIVE' | 'CLOSED' | 'ALL'
      page?: number
      perPage?: number
    }
  ): Promise<SireneSearchResult> {
    try {
      const page = options?.page || 1
      const perPage = options?.perPage || 20

      if (this.inseeApiKey) {
        return await this.searchFromINSEE(query, options)
      }

      // Fallback : recherche simple (simulation pour data.gouv.fr)
      return {
        companies: [],
        total: 0,
        page,
        perPage,
        hasMore: false,
      }
    } catch (error) {
      console.error('[SireneService] Erreur recherche entreprises:', error)
      return {
        companies: [],
        total: 0,
        page: 1,
        perPage: 20,
        hasMore: false,
      }
    }
  }

  /**
   * Vérifie et certifie les données d'une entreprise
   * Compare les données fournies avec les données officielles Sirene
   */
  async verifyCompany(data: {
    siren?: string
    siret?: string
    name?: string
    address?: string
  }): Promise<SireneVerificationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let company: SireneCompany | null = null
    let matchScore = 0

    try {
      // 1. Rechercher l'entreprise
      if (data.siret) {
        company = await this.getCompanyBySiret(data.siret)
      } else if (data.siren) {
        company = await this.getCompanyBySiren(data.siren)
      } else if (data.name) {
        const search = await this.searchCompanies(data.name, { perPage: 1 })
        if (search.companies.length > 0) {
          company = search.companies[0]
        }
      }

      if (!company) {
        return {
          valid: false,
          errors: ['Entreprise non trouvée dans la base Sirene'],
          warnings: [],
        }
      }

      // 2. Vérifier la correspondance
      if (data.name && company.name) {
        const nameMatch = this.calculateNameMatch(
          data.name,
          company.name,
          company.commercialName
        )
        matchScore += nameMatch.score * 0.4
        if (nameMatch.score < 70) {
          warnings.push(
            `Nom fourni "${data.name}" ne correspond pas exactement à "${company.name}"`
          )
        }
      }

      if (data.address && company.address.formatted) {
        const addressMatch = this.calculateAddressMatch(
          data.address,
          company.address.formatted
        )
        matchScore += addressMatch * 0.3
        if (addressMatch < 70) {
          warnings.push('Adresse ne correspond pas exactement')
        }
      }

      // Vérification SIREN/SIRET
      if (data.siren && company.siren !== data.siren.replace(/[\s-]/g, '')) {
        errors.push(
          `SIREN fourni (${data.siren}) ne correspond pas au SIREN trouvé (${company.siren})`
        )
      }
      if (data.siret && company.siret !== data.siret.replace(/[\s-]/g, '')) {
        errors.push(
          `SIRET fourni (${data.siret}) ne correspond pas au SIRET trouvé (${company.siret})`
        )
      }

      // Vérifier le statut
      if (company.status !== 'ACTIVE') {
        warnings.push(
          `L'entreprise n'est pas active (statut: ${company.status})`
        )
      }

      const valid = errors.length === 0 && matchScore >= 60

      return {
        valid,
        company,
        errors,
        warnings,
        matchScore: Math.round(matchScore),
      }
    } catch (error) {
      console.error('[SireneService] Erreur vérification entreprise:', error)
      return {
        valid: false,
        errors: ['Erreur lors de la vérification'],
        warnings: [],
      }
    }
  }

  /**
   * Récupère les données depuis l'API INSEE
   */
  private async fetchFromINSEE(
    identifier: string,
    type: 'siren' | 'siret'
  ): Promise<SireneCompany | null> {
    if (!this.inseeApiKey) {
      return null
    }

    try {
      const endpoint =
        type === 'siren'
          ? `${this.inseeApiUrl}/siren/${identifier}`
          : `${this.inseeApiUrl}/siret/${identifier}`

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${this.inseeApiKey}`,
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`API INSEE error: ${response.status}`)
      }

      const data = await response.json()
      return this.mapINSEEResponseToCompany(data, type)
    } catch (error) {
      console.error('[SireneService] Erreur API INSEE:', error)
      return null
    }
  }

  /**
   * Recherche depuis l'API INSEE
   */
  private async searchFromINSEE(
    query: string,
    options?: {
      department?: string
      nafCode?: string
      status?: 'ACTIVE' | 'CLOSED' | 'ALL'
      page?: number
      perPage?: number
    }
  ): Promise<SireneSearchResult> {
    if (!this.inseeApiKey) {
      return {
        companies: [],
        total: 0,
        page: 1,
        perPage: 20,
        hasMore: false,
      }
    }

    try {
      // Construire les critères de recherche
      const criteria: string[] = []

      // Recherche par nom (dénomination)
      criteria.push(`denominationUniteLegale:"${query}"`)

      if (options?.department) {
        criteria.push(`codeCommuneEtablissement:${options.department}*`)
      }

      if (options?.nafCode) {
        criteria.push(`activitePrincipaleUniteLegale:${options.nafCode}`)
      }

      const q = criteria.join(' AND ')
      const page = options?.page || 1
      const perPage = options?.perPage || 20

      const response = await fetch(
        `${this.inseeApiUrl}/siret?q=${encodeURIComponent(q)}&nombre=${perPage}&debut=${(page - 1) * perPage}`,
        {
          headers: {
            Authorization: `Bearer ${this.inseeApiKey}`,
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`API INSEE search error: ${response.status}`)
      }

      const data = await response.json()
      return this.mapINSEESearchToResult(data, page, perPage)
    } catch (error) {
      console.error('[SireneService] Erreur recherche INSEE:', error)
      return {
        companies: [],
        total: 0,
        page: 1,
        perPage: 20,
        hasMore: false,
      }
    }
  }

  /**
   * Fallback : récupération depuis data.gouv.fr via API Recherche d'Entreprises
   * API GRATUITE, sans clé requise, temps réel
   * Documentation: https://recherche-entreprises.api.gouv.fr/docs
   */
  private async fetchFromDataGouv(
    identifier: string,
    type: 'siren' | 'siret'
  ): Promise<SireneCompany | null> {
    try {
      console.log(`[SireneService] 🔄 Fallback API Recherche d'Entreprises pour ${type}:${identifier}`)

      // API Recherche d'Entreprises (GRATUITE, sans clé)
      const response = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(identifier)}&per_page=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'TORP-Platform/1.0'
          }
        }
      )

      if (!response.ok) {
        console.error(`[SireneService] ❌ API Recherche d'Entreprises erreur HTTP: ${response.status}`)
        return null
      }

      const data = await response.json()

      if (!data.results || data.results.length === 0) {
        console.warn(`[SireneService] ⚠️ Aucun résultat pour ${type}:${identifier}`)
        return null
      }

      const company = data.results[0]

      // Vérifier correspondance exacte
      const foundIdentifier = type === 'siret' ? company.siret : company.siren
      if (foundIdentifier !== identifier) {
        console.warn(`[SireneService] ⚠️ Correspondance partielle: cherché ${identifier}, trouvé ${foundIdentifier}`)
      }

      console.log(`[SireneService] ✅ Données récupérées via API Recherche d'Entreprises: ${company.nom_complet}`)

      // Mapper vers SireneCompany
      return {
        siren: company.siren || identifier.substring(0, 9),
        siret: company.siret || identifier,
        name: company.nom_complet || company.nom_raison_sociale || '',
        commercialName: company.nom_commercial || company.enseigne,

        // Forme juridique
        legalForm: company.nature_juridique,
        legalFormLabel: company.libelle_nature_juridique,

        // Activité
        nafCode: company.activite_principale,
        nafLabel: company.libelle_activite_principale,

        // Dates
        creationDate: company.date_creation,
        lastUpdate: company.date_mise_a_jour,

        // Statut
        status: company.etat_administratif === 'A' || company.etat_administratif === 'Actif'
          ? 'ACTIVE'
          : company.etat_administratif === 'F' || company.etat_administratif === 'Fermé'
          ? 'CLOSED'
          : 'UNKNOWN',
        isHeadquarters: company.etablissement_siege === true || company.etablissement_siege === 'true',

        // Adresse
        address: {
          street: company.siege?.adresse
            ? `${company.siege.adresse.numero_voie || ''} ${company.siege.adresse.type_voie || ''} ${company.siege.adresse.libelle_voie || ''}`.trim()
            : company.adresse || '',
          postalCode: company.siege?.adresse?.code_postal || company.code_postal || '',
          city: company.siege?.adresse?.libelle_commune || company.libelle_commune || '',
          department: company.siege?.adresse?.code_commune?.substring(0, 2) || '',
          region: company.siege?.adresse?.libelle_region || company.region || '',
          country: 'FR',
          formatted: this.formatDataGouvAddress(company),
        },

        // Effectifs
        employees: company.tranche_effectif_salarie
          ? { range: company.tranche_effectif_salarie }
          : undefined,

        // Métadonnées
        sources: ['API Recherche d\'Entreprises (data.gouv.fr)'],
        lastUpdated: new Date().toISOString(),
        verified: true,
      }
    } catch (error) {
      console.error(`[SireneService] ❌ Erreur fetchFromDataGouv pour ${type}:${identifier}:`, error)
      return null
    }
  }

  /**
   * Formate une adresse depuis les données API Recherche d'Entreprises
   */
  private formatDataGouvAddress(company: any): string {
    const parts: string[] = []

    // Essayer d'abord l'adresse du siège si disponible
    if (company.siege?.adresse) {
      const addr = company.siege.adresse
      if (addr.numero_voie || addr.type_voie || addr.libelle_voie) {
        parts.push(
          `${addr.numero_voie || ''} ${addr.type_voie || ''} ${addr.libelle_voie || ''}`.trim()
        )
      }
      if (addr.code_postal && addr.libelle_commune) {
        parts.push(`${addr.code_postal} ${addr.libelle_commune}`)
      }
    } else if (company.adresse) {
      // Fallback sur adresse simple
      parts.push(company.adresse)
      if (company.code_postal && company.libelle_commune) {
        parts.push(`${company.code_postal} ${company.libelle_commune}`)
      }
    }

    return parts.filter(Boolean).join(', ')
  }

  /**
   * Mappe la réponse INSEE vers notre interface SireneCompany
   */
  private mapINSEEResponseToCompany(
    data: any,
    _type: 'siren' | 'siret'
  ): SireneCompany {
    const uniteLegale = data.uniteLegale || {}
    const etablissement = data.etablissement || {}
    const adresse =
      etablissement.adresseEtablissement ||
      uniteLegale.periodesUniteLegale?.[0]?.adresseUniteLegale ||
      {}

    return {
      siren: uniteLegale.siren || '',
      siret: etablissement.siret || '',
      name:
        uniteLegale.denominationUniteLegale || uniteLegale.nomUniteLegale || '',
      commercialName:
        uniteLegale.denominationUsuelle1UniteLegale ||
        etablissement.enseigne1Etablissement,
      acronym: uniteLegale.sigleUniteLegale,
      nafCode:
        uniteLegale.activitePrincipaleUniteLegale ||
        etablissement.activitePrincipaleEtablissement,
      nafLabel:
        uniteLegale.nomenclatureActivitePrincipaleUniteLegale ||
        etablissement.nomenclatureActivitePrincipaleEtablissement,
      legalForm: uniteLegale.categorieJuridiqueUniteLegale,
      legalFormLabel: uniteLegale.categorieJuridiqueUniteLegale, // À mapper avec libellés
      creationDate: uniteLegale.dateCreationUniteLegale,
      closingDate:
        uniteLegale.dateDebutActivite || etablissement.dateDebutActivite
          ? undefined
          : uniteLegale.periodesUniteLegale?.[0]?.dateFin,
      lastUpdate:
        etablissement.dateDernierTraitementEtablissement ||
        uniteLegale.dateDernierTraitementUniteLegale,
      status: this.determineStatus(uniteLegale, etablissement),
      isHeadquarters:
        etablissement.etablissementSiege === 'true' ||
        etablissement.etablissementSiege === true,
      address: {
        street: adresse.l4 || adresse.ligneVoieEtablissement || '',
        postalCode: adresse.codePostalEtablissement || adresse.codePostal || '',
        city:
          adresse.libelleCommuneEtablissement || adresse.libelleCommune || '',
        department:
          adresse.codeCommuneEtablissement?.substring(0, 2) ||
          adresse.codeCommune?.substring(0, 2),
        region: adresse.libelleRegionEtablissement || adresse.libelleRegion,
        country: 'FR',
        formatted: this.formatAddress(adresse),
      },
      employees: this.extractEmployees(uniteLegale, etablissement),
      sources: ['API INSEE Sirene'],
      lastUpdated: new Date().toISOString(),
      verified: true,
    }
  }

  /**
   * Mappe les résultats de recherche INSEE
   */
  private mapINSEESearchToResult(
    data: any,
    page: number,
    perPage: number
  ): SireneSearchResult {
    const etablissements = data.etablissements || []
    const total = data.header?.total || etablissements.length

    return {
      companies: etablissements.map((etab: any) =>
        this.mapINSEEResponseToCompany(
          { etablissement: etab, uniteLegale: etab.uniteLegale },
          'siret'
        )
      ),
      total,
      page,
      perPage,
      hasMore: total > page * perPage,
    }
  }

  /**
   * Détermine le statut de l'entreprise
   */
  private determineStatus(
    uniteLegale: any,
    etablissement: any
  ): SireneCompany['status'] {
    const etat =
      etablissement.etatAdministratifEtablissement ||
      uniteLegale.etatAdministratifUniteLegale

    if (etat === 'A') {
      return 'ACTIVE'
    } else if (etat === 'F') {
      return 'CLOSED'
    } else if (etat === 'T') {
      return 'TRANSFERRED'
    }

    return 'UNKNOWN'
  }

  /**
   * Extrait les informations d'effectifs
   */
  private extractEmployees(
    uniteLegale: any,
    etablissement: any
  ): SireneCompany['employees'] {
    const tranche =
      uniteLegale.trancheEffectifsUniteLegale ||
      etablissement.trancheEffectifsEtablissement

    if (!tranche) {
      return undefined
    }

    // Mapping des codes INSEE de tranche d'effectifs
    const trancheMap: Record<string, string> = {
      '00': '0',
      '01': '1-2',
      '02': '3-5',
      '03': '6-9',
      '11': '10-19',
      '12': '20-49',
      '21': '50-99',
      '22': '100-199',
      '31': '200-249',
      '32': '250-499',
      '41': '500-999',
      '42': '1000-1999',
      '51': '2000-4999',
      '52': '5000-9999',
      '53': '10000+',
    }

    return {
      range: trancheMap[tranche] || tranche,
    }
  }

  /**
   * Formate une adresse depuis les données INSEE
   */
  private formatAddress(adresse: any): string {
    const parts: string[] = []

    if (adresse.numeroVoieEtablissement || adresse.numeroVoie) {
      parts.push(
        `${adresse.numeroVoieEtablissement || adresse.numeroVoie} ${adresse.typeVoieEtablissement || adresse.typeVoie || ''}`
      )
    }
    if (adresse.libelleVoieEtablissement || adresse.libelleVoie) {
      parts.push(adresse.libelleVoieEtablissement || adresse.libelleVoie)
    }
    if (adresse.codePostalEtablissement || adresse.codePostal) {
      parts.push(
        (adresse.codePostalEtablissement || adresse.codePostal) +
          ' ' +
          (adresse.libelleCommuneEtablissement || adresse.libelleCommune || '')
      )
    }

    return parts.filter(Boolean).join(', ')
  }

  /**
   * Calcule un score de correspondance entre deux noms
   */
  private calculateNameMatch(
    provided: string,
    official: string,
    commercial?: string
  ): { score: number; matched: string } {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .trim()

    const normalizedProvided = normalize(provided)
    const normalizedOfficial = normalize(official)
    const normalizedCommercial = commercial ? normalize(commercial) : ''

    // Correspondance exacte
    if (
      normalizedProvided === normalizedOfficial ||
      normalizedProvided === normalizedCommercial
    ) {
      return { score: 100, matched: official }
    }

    // Correspondance partielle (contient)
    if (
      normalizedOfficial.includes(normalizedProvided) ||
      normalizedProvided.includes(normalizedOfficial)
    ) {
      return { score: 80, matched: official }
    }

    // Similarité par mots-clés
    const providedWords = normalizedProvided.split(/\s+/)
    const officialWords = normalizedOfficial.split(/\s+/)
    const matchedWords = providedWords.filter(
      (word) => word.length > 3 && officialWords.includes(word)
    )

    const similarity =
      (matchedWords.length /
        Math.max(providedWords.length, officialWords.length)) *
      100

    return {
      score: Math.max(60, Math.round(similarity)),
      matched: official,
    }
  }

  /**
   * Calcule un score de correspondance entre deux adresses
   */
  private calculateAddressMatch(provided: string, official: string): number {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .trim()

    const normalizedProvided = normalize(provided)
    const normalizedOfficial = normalize(official)

    if (normalizedProvided === normalizedOfficial) {
      return 100
    }

    // Extraire codes postaux
    const providedCP = provided.match(/\b\d{5}\b/)?.[0]
    const officialCP = official.match(/\b\d{5}\b/)?.[0]

    if (providedCP && officialCP && providedCP !== officialCP) {
      return 30 // Codes postaux différents = faible correspondance
    }

    // Correspondance partielle
    const providedWords = normalizedProvided.split(/\s+/)
    const officialWords = normalizedOfficial.split(/\s+/)
    const matchedWords = providedWords.filter(
      (word) => word.length > 3 && officialWords.includes(word)
    )

    return Math.round(
      (matchedWords.length /
        Math.max(providedWords.length, officialWords.length)) *
        100
    )
  }
}
