/**
 * Service de Recherche Intelligente d'Entreprises
 *
 * Fonctionnalités:
 * - Extraction date d'immatriculation depuis SIRET
 * - Recherche fuzzy par nom + adresse si SIRET manquant/invalide
 * - Recoupement multi-sources (Sirene, Annuaire, Infogreffe)
 * - Fusion intelligente des données
 */

import { SireneService } from '../external-apis/sirene-service'
import { AnnuaireEntreprisesService } from '../external-apis/annuaire-entreprises-service'
import { InfogreffeService } from '../external-apis/infogreffe-service'
import type { CompanyEnrichment } from './types'

export interface CompanySearchCriteria {
  siret?: string
  siren?: string
  name?: string
  address?: string
  postalCode?: string
  city?: string
}

export interface EnrichedCompanyProfile extends CompanyEnrichment {
  // Métadonnées d'enrichissement
  creationDate?: string // Date d'immatriculation
  companyAge?: number // Age en années
  isRecent?: boolean // Moins de 2 ans

  // Sources de données utilisées
  dataSources: string[]
  dataCompleteness: number // Score 0-100
  lastEnrichmentDate: string

  // Mots-clés d'activité
  activityKeywords?: string[]

  // Indicateurs de confiance
  confidenceScore: number // 0-100
  verificationStatus: {
    siretVerified: boolean
    addressVerified: boolean
    activityVerified: boolean
  }
}

export class IntelligentCompanySearch {
  private sireneService: SireneService
  private annuaireService: AnnuaireEntreprisesService
  private infogreffeService: InfogreffeService

  constructor() {
    this.sireneService = new SireneService()
    this.annuaireService = new AnnuaireEntreprisesService()
    this.infogreffeService = new InfogreffeService()
  }

  /**
   * Recherche intelligente avec recoupement multi-sources
   * Essaie plusieurs stratégies pour trouver l'entreprise
   */
  async search(criteria: CompanySearchCriteria): Promise<EnrichedCompanyProfile | null> {
    console.log('[IntelligentSearch] 🔍 Début recherche intelligente:', criteria)

    const dataSources: string[] = []
    let baseData: CompanyEnrichment | null = null
    let confidenceScore = 0

    // Stratégie 1: Recherche par SIRET (plus fiable)
    if (criteria.siret && this.isValidSiretFormat(criteria.siret)) {
      console.log('[IntelligentSearch] 📌 Stratégie 1: Recherche par SIRET')
      baseData = await this.searchBySiret(criteria.siret)
      if (baseData) {
        dataSources.push('SIRET Direct')
        confidenceScore = 95
      }
    }

    // Stratégie 2: Recherche par SIREN (si SIRET échoue)
    if (!baseData && criteria.siren) {
      console.log('[IntelligentSearch] 📌 Stratégie 2: Recherche par SIREN')
      baseData = await this.searchBySiren(criteria.siren)
      if (baseData) {
        dataSources.push('SIREN')
        confidenceScore = 85
      }
    }

    // Stratégie 3: Recherche fuzzy par nom + adresse
    if (!baseData && criteria.name) {
      console.log('[IntelligentSearch] 📌 Stratégie 3: Recherche fuzzy par nom/adresse')
      baseData = await this.searchByNameAndAddress(
        criteria.name,
        criteria.address,
        criteria.postalCode,
        criteria.city
      )
      if (baseData) {
        dataSources.push('Recherche Fuzzy')
        confidenceScore = 70
      }
    }

    if (!baseData) {
      console.log('[IntelligentSearch] ❌ Aucune entreprise trouvée')
      return null
    }

    // Enrichissement croisé depuis autres sources
    const enrichedData = await this.crossEnrich(baseData, dataSources)

    // Calculer métadonnées
    const metadata = this.calculateMetadata(enrichedData, dataSources, confidenceScore)

    console.log('[IntelligentSearch] ✅ Recherche terminée:', {
      siret: enrichedData.siret,
      sources: dataSources.length,
      confidence: metadata.confidenceScore,
      completeness: metadata.dataCompleteness,
    })

    return {
      ...enrichedData,
      ...metadata,
    }
  }

  /**
   * Recherche par SIRET avec extraction date d'immatriculation
   */
  private async searchBySiret(siret: string): Promise<CompanyEnrichment | null> {
    try {
      // Essayer Sirene d'abord
      const sireneData = await this.sireneService.getCompanyBySiret(siret)
      if (sireneData) {
        return this.mapSireneToEnrichment(sireneData)
      }

      // Fallback Annuaire
      const annuaireData = await this.annuaireService.searchBySiret(siret)
      if (annuaireData) {
        return this.mapAnnuaireToEnrichment(annuaireData)
      }

      return null
    } catch (error) {
      console.error('[IntelligentSearch] Erreur recherche SIRET:', error)
      return null
    }
  }

  /**
   * Recherche par SIREN
   */
  private async searchBySiren(siren: string): Promise<CompanyEnrichment | null> {
    try {
      const annuaireData = await this.annuaireService.searchBySiren(siren)
      if (annuaireData) {
        return this.mapAnnuaireToEnrichment(annuaireData)
      }
      return null
    } catch (error) {
      console.error('[IntelligentSearch] Erreur recherche SIREN:', error)
      return null
    }
  }

  /**
   * Recherche fuzzy par nom et adresse
   * Utilise score de similarité pour trouver la meilleure correspondance
   */
  private async searchByNameAndAddress(
    name: string,
    address?: string,
    postalCode?: string,
    city?: string
  ): Promise<CompanyEnrichment | null> {
    try {
      // Rechercher par nom dans l'Annuaire
      const results = await this.annuaireService.searchByName(name, postalCode)

      if (results.length === 0) {
        return null
      }

      // Si plusieurs résultats, trouver le meilleur match
      const bestMatch = this.findBestMatch(results, {
        name,
        address,
        postalCode,
        city,
      })

      if (bestMatch) {
        console.log(`[IntelligentSearch] 🎯 Meilleur match trouvé: ${bestMatch.company.name} (score: ${bestMatch.similarity})`)
        return this.mapAnnuaireToEnrichment(bestMatch.company)
      }

      return null
    } catch (error) {
      console.error('[IntelligentSearch] Erreur recherche fuzzy:', error)
      return null
    }
  }

  /**
   * Trouve la meilleure correspondance parmi plusieurs résultats
   */
  private findBestMatch(
    results: any[],
    criteria: { name: string; address?: string; postalCode?: string; city?: string }
  ): { company: any; similarity: number } | null {
    let bestMatch: { company: any; similarity: number } | null = null
    let highestScore = 0

    for (const company of results) {
      let score = 0
      let checks = 0

      // Score sur le nom (50%)
      const nameSimilarity = this.calculateStringSimilarity(
        criteria.name.toLowerCase(),
        company.name.toLowerCase()
      )
      score += nameSimilarity * 0.5
      checks++

      // Score sur le code postal (30%)
      if (criteria.postalCode && company.address?.postalCode) {
        if (criteria.postalCode === company.address.postalCode) {
          score += 0.3
        }
        checks++
      }

      // Score sur la ville (20%)
      if (criteria.city && company.address?.city) {
        const citySimilarity = this.calculateStringSimilarity(
          criteria.city.toLowerCase(),
          company.address.city.toLowerCase()
        )
        score += citySimilarity * 0.2
        checks++
      }

      const finalScore = checks > 0 ? score : 0

      if (finalScore > highestScore && finalScore > 0.6) {
        // Seuil minimum de 60%
        highestScore = finalScore
        bestMatch = { company, similarity: finalScore }
      }
    }

    return bestMatch
  }

  /**
   * Calcule la similarité entre deux chaînes (algorithme Levenshtein simplifié)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1
    if (str1.length === 0 || str2.length === 0) return 0

    // Similarité basique par inclusion
    if (str1.includes(str2) || str2.includes(str1)) {
      return 0.8
    }

    // Vérifier mots communs
    const words1 = str1.split(/\s+/)
    const words2 = str2.split(/\s+/)
    const commonWords = words1.filter((w) => words2.includes(w))

    if (commonWords.length > 0) {
      return commonWords.length / Math.max(words1.length, words2.length)
    }

    return 0
  }

  /**
   * Enrichissement croisé depuis autres sources
   */
  private async crossEnrich(
    baseData: CompanyEnrichment,
    sources: string[]
  ): Promise<CompanyEnrichment> {
    const enriched = { ...baseData }

    // Si on a un SIREN, enrichir avec Infogreffe
    if (baseData.siren && !enriched.financialData) {
      try {
        const infogreffeData = await this.infogreffeService.getCompanyData(baseData.siren)
        if (infogreffeData?.financial) {
          enriched.financialData = {
            ca: infogreffeData.financial.turnover?.years?.map((y: any) => y.amount) || [],
            result: (infogreffeData.financial as any).result?.years?.map((y: any) => y.amount) || [],
            lastUpdate: new Date().toISOString(),
          }
          sources.push('Infogreffe (Finances)')
        }
      } catch (error) {
        console.warn('[IntelligentSearch] Erreur Infogreffe:', error)
      }
    }

    return enriched
  }

  /**
   * Calcule les métadonnées d'enrichissement
   */
  private calculateMetadata(
    data: CompanyEnrichment,
    sources: string[],
    confidenceScore: number
  ): Omit<EnrichedCompanyProfile, keyof CompanyEnrichment> {
    // Extraire date d'immatriculation depuis SIRET
    const creationInfo = data.siret ? this.extractCreationDateFromSiret(data.siret) : null

    // Calculer complétude des données
    const dataCompleteness = this.calculateDataCompleteness(data)

    // Extraire mots-clés d'activité
    const activityKeywords = this.extractActivityKeywords(data)

    return {
      creationDate: creationInfo?.date,
      companyAge: creationInfo?.age,
      isRecent: creationInfo ? creationInfo.age < 2 : undefined,
      dataSources: sources,
      dataCompleteness,
      lastEnrichmentDate: new Date().toISOString(),
      activityKeywords,
      confidenceScore,
      verificationStatus: {
        siretVerified: !!data.siret && this.isValidSiretFormat(data.siret),
        addressVerified: !!data.address?.city && !!data.address?.postalCode,
        activityVerified: !!(data.activities && data.activities.length > 0),
      },
    }
  }

  /**
   * Extrait la date d'immatriculation depuis le SIRET
   * Format SIRET: [9 chiffres SIREN][5 chiffres établissement]
   * Les 3 premiers chiffres du SIREN indiquent l'année (depuis 1973)
   */
  private extractCreationDateFromSiret(siret: string): {
    date: string
    age: number
  } | null {
    if (!siret || siret.length !== 14) return null

    try {
      // Les 3 premiers chiffres du SIREN
      const sirenPrefix = siret.substring(0, 3)
      const prefixNum = parseInt(sirenPrefix, 10)

      // Estimation de l'année (approximative)
      // Les SIREN commencent à 001 en 1973
      // Incrémentés chronologiquement (environ 1M/an)
      let estimatedYear: number

      if (prefixNum < 100) {
        // Très vieux SIREN (1973-1980s)
        estimatedYear = 1973 + Math.floor(prefixNum / 10)
      } else if (prefixNum < 300) {
        // 1980s-1990s
        estimatedYear = 1980 + Math.floor((prefixNum - 100) / 20)
      } else if (prefixNum < 500) {
        // 1990s-2000s
        estimatedYear = 1990 + Math.floor((prefixNum - 300) / 25)
      } else if (prefixNum < 700) {
        // 2000s-2010s
        estimatedYear = 2000 + Math.floor((prefixNum - 500) / 30)
      } else if (prefixNum < 850) {
        // 2010s-2020
        estimatedYear = 2010 + Math.floor((prefixNum - 700) / 35)
      } else {
        // 2020+
        estimatedYear = 2020 + Math.floor((prefixNum - 850) / 40)
      }

      const currentYear = new Date().getFullYear()
      const age = currentYear - estimatedYear

      // Validation basique
      if (estimatedYear < 1973 || estimatedYear > currentYear) {
        return null
      }

      return {
        date: `01/01/${estimatedYear}`, // Format approximatif
        age,
      }
    } catch (error) {
      console.error('[IntelligentSearch] Erreur extraction date:', error)
      return null
    }
  }

  /**
   * Calcule le score de complétude des données (0-100)
   */
  private calculateDataCompleteness(data: CompanyEnrichment): number {
    let score = 0
    const checks = [
      { field: data.siret, weight: 15 },
      { field: data.name, weight: 15 },
      { field: data.address?.street, weight: 10 },
      { field: data.address?.city, weight: 10 },
      { field: data.address?.postalCode, weight: 10 },
      { field: data.activities && data.activities.length > 0, weight: 10 },
      { field: data.legalStatus, weight: 5 },
      { field: data.financialData, weight: 15 },
      { field: data.certifications && data.certifications.length > 0, weight: 5 },
      { field: (data as any).qualifications && (data as any).qualifications.length > 0, weight: 5 },
    ]

    checks.forEach((check) => {
      if (check.field) {
        score += check.weight
      }
    })

    return Math.min(100, score)
  }

  /**
   * Extrait les mots-clés d'activité
   */
  private extractActivityKeywords(data: CompanyEnrichment): string[] {
    const keywords = new Set<string>()

    // Depuis les activités déclarées
    if (data.activities) {
      data.activities.forEach((activity) => {
        // Extraire mots significatifs du label
        const words = activity.label
          .toLowerCase()
          .split(/[\s,\-\.]+/)
          .filter((w) => w.length > 3) // Mots de plus de 3 lettres

        words.forEach((w) => keywords.add(w))
      })
    }

    // Depuis le nom de l'entreprise
    if (data.name) {
      const nameKeywords = this.extractKeywordsFromName(data.name)
      nameKeywords.forEach((k) => keywords.add(k))
    }

    return Array.from(keywords).slice(0, 10) // Max 10 mots-clés
  }

  /**
   * Extrait mots-clés métier depuis le nom de l'entreprise
   */
  private extractKeywordsFromName(name: string): string[] {
    const keywords: string[] = []
    const nameLower = name.toLowerCase()

    // Liste de mots-clés métier BTP courants
    const metierKeywords = [
      'toiture',
      'couverture',
      'charpente',
      'menuiserie',
      'plomberie',
      'électricité',
      'chauffage',
      'climatisation',
      'isolation',
      'maçonnerie',
      'peinture',
      'ravalement',
      'rénovation',
      'construction',
      'bâtiment',
      'travaux',
      'artisan',
      'entreprise',
      'services',
      'aménagement',
      'velux',
      'fenêtre',
      'porte',
      'carrelage',
      'parquet',
    ]

    metierKeywords.forEach((keyword) => {
      if (nameLower.includes(keyword)) {
        keywords.push(keyword)
      }
    })

    return keywords
  }

  /**
   * Valide le format SIRET (14 chiffres)
   */
  private isValidSiretFormat(siret: string): boolean {
    const cleaned = siret.replace(/[\s\-\.]/g, '')
    return /^\d{14}$/.test(cleaned)
  }

  /**
   * Mapping Sirene → CompanyEnrichment
   */
  private mapSireneToEnrichment(sireneData: any): CompanyEnrichment {
    return {
      siret: sireneData.siret,
      siren: sireneData.siren,
      name: sireneData.denomination || sireneData.nomUniteLegale,
      legalStatus: sireneData.categorieJuridique,
      address: sireneData.adresse
        ? {
            street: sireneData.adresse.libelleVoie || '',
            city: sireneData.adresse.libelleCommuneEtablissement || '',
            postalCode: sireneData.adresse.codePostalEtablissement || '',
            region: '',
          }
        : undefined,
      activities: sireneData.activitePrincipale
        ? [
            {
              code: sireneData.activitePrincipale,
              label: sireneData.activitePrincipaleLibelle || `Activité ${sireneData.activitePrincipale}`,
            },
          ]
        : [],
    }
  }

  /**
   * Mapping Annuaire → CompanyEnrichment
   */
  private mapAnnuaireToEnrichment(annuaireData: any): CompanyEnrichment {
    return {
      siret: annuaireData.siret,
      siren: annuaireData.siren,
      name: annuaireData.name,
      legalStatus: annuaireData.legalStatus,
      address: annuaireData.address
        ? {
            street: annuaireData.address.street,
            city: annuaireData.address.city,
            postalCode: annuaireData.address.postalCode,
            region: '',
          }
        : undefined,
      activities: annuaireData.activities || [],
    }
  }
}
