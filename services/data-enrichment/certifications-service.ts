/**
 * Service pour récupérer et vérifier les certifications BTP
 * Sources :
 * - RGE (Reconnu Garant de l'Environnement) : https://www.france-renov.gouv.fr
 * - Qualibat : https://www.qualibat.com
 * - Autres certifications BTP
 */

import { ApiClient } from './api-client'

export interface CertificationData {
  type: 'RGE' | 'Qualibat' | 'Capeb' | 'FFB' | 'other'
  name: string
  number?: string
  valid: boolean
  expiryDate?: string
  activities?: string[] // Domaines couverts
  level?: string // Niveau de qualification
  source: string
  verifiedAt: string
}

export interface CompanyCertifications {
  siret: string
  certifications: CertificationData[]
  lastUpdated: string
}

export class CertificationsEnrichmentService {
  private rgeClient: ApiClient
  private qualibatClient: ApiClient

  constructor() {
    // RGE - Données publiques via data.gouv.fr
    this.rgeClient = new ApiClient({
      baseUrl: 'https://www.data.gouv.fr/api/1',
      timeout: 10000,
      retries: 2,
    })

    // Qualibat - API officielle (nécessite clé API)
    this.qualibatClient = new ApiClient({
      baseUrl: process.env.QUALIBAT_API_URL || 'https://api.qualibat.com/v1',
      timeout: 10000,
      retries: 2,
      headers: process.env.QUALIBAT_API_KEY
        ? {
            Authorization: `Bearer ${process.env.QUALIBAT_API_KEY}`,
          }
        : undefined,
    })
  }

  /**
   * Récupère toutes les certifications d'une entreprise
   */
  async getCompanyCertifications(siret: string): Promise<CompanyCertifications | null> {
    try {
      const [rgeCert, qualibatCert, otherCerts] = await Promise.all([
        this.getRGECertification(siret),
        this.getQualibatCertification(siret),
        this.getOtherCertifications(siret),
      ])

      const certifications: CertificationData[] = []

      if (rgeCert) certifications.push(rgeCert)
      if (qualibatCert) certifications.push(qualibatCert)
      if (otherCerts) certifications.push(...otherCerts)

      if (certifications.length === 0) {
        return null
      }

      return {
        siret,
        certifications,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[CertificationsService] Erreur récupération certifications:', error)
      return null
    }
  }

  /**
   * Récupère la certification RGE depuis data.gouv.fr
   */
  private async getRGECertification(siret: string): Promise<CertificationData | null> {
    try {
      // Dataset RGE sur data.gouv.fr
      // Format : https://www.data.gouv.fr/fr/datasets/referentiel-entreprises-rge/
      const response = await fetch(
        `https://www.data.gouv.fr/api/1/datasets/referentiel-entreprises-rge/resources/`,
        {
          headers: { Accept: 'application/json' },
        }
      )

      if (!response.ok) {
        return null
      }

      // Pour l'instant, retourner une structure basique
      // En production, parser le CSV/JSON du référentiel RGE
      // et chercher le SIRET dans les données
      return {
        type: 'RGE',
        name: 'Reconnu Garant de l\'Environnement',
        valid: true,
        source: 'data.gouv.fr',
        verifiedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.warn('[CertificationsService] Erreur récupération RGE:', error)
      return null
    }
  }

  /**
   * Récupère la certification Qualibat
   */
  private async getQualibatCertification(siret: string): Promise<CertificationData | null> {
    try {
      if (!process.env.QUALIBAT_API_KEY) {
        console.warn('[CertificationsService] QUALIBAT_API_KEY non configurée')
        return null
      }

      const response = await this.qualibatClient.get<{
        siret: string
        certified: boolean
        qualifications?: Array<{
          code: string
          libelle: string
          niveau: string
          date_fin?: string
        }>
      }>(`/companies/${siret}`)

      if (!response || !response.certified) {
        return null
      }

      return {
        type: 'Qualibat',
        name: 'Qualibat',
        valid: true,
        activities: response.qualifications?.map((q) => q.libelle) || [],
        level: response.qualifications?.[0]?.niveau,
        expiryDate: response.qualifications?.[0]?.date_fin,
        source: 'Qualibat API',
        verifiedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.warn('[CertificationsService] Erreur récupération Qualibat:', error)
      return null
    }
  }

  /**
   * Récupère d'autres certifications (Capeb, FFB, etc.)
   */
  private async getOtherCertifications(_siret: string): Promise<CertificationData[]> {
    // Placeholder pour intégration future
    // - Capeb (Compagnons du Devoir)
    // - FFB (Fédération Française du Bâtiment)
    // - Autres organismes de certification

    return []
  }

  /**
   * Vérifie si une entreprise est certifiée pour une activité donnée
   */
  isCertifiedForActivity(
    certifications: CompanyCertifications | null,
    activity: string
  ): boolean {
    if (!certifications || !certifications.certifications) {
      return false
    }

    return certifications.certifications.some((cert) => {
      if (!cert.valid) return false

      // Vérifier si l'activité correspond
      if (cert.activities) {
        return cert.activities.some((a) =>
          a.toLowerCase().includes(activity.toLowerCase())
        )
      }

      return true // Certifications générales
    })
  }
}

