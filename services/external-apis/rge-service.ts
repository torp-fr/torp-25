/**
 * Service pour récupérer les données RGE (Reconnu Garant de l'Environnement) certifiées
 * Source : https://www.data.gouv.fr/fr/datasets/liste-des-entreprises-rge/
 * Dataset ID: 62bd63b70ff1edf452b83a6b
 *
 * Le dataset RGE contient :
 * - Liste des entreprises certifiées RGE
 * - SIRET des entreprises
 * - Domaines d'activité couverts (chauffage, isolation, etc.)
 * - Dates de certification et validité
 * - Informations de contact
 */

import { ApiClient } from '../data-enrichment/api-client'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export interface RGECertification {
  // Identifiants
  siret: string // SIRET de l'entreprise certifiée
  siren?: string // SIREN (9 premiers chiffres du SIRET)
  
  // Informations entreprise
  companyName?: string // Raison sociale
  address?: {
    street?: string
    postalCode?: string
    city?: string
    department?: string
    region?: string
    formatted?: string
  }
  
  // Certification RGE
  certificationNumber?: string // Numéro de certification RGE
  certificationDate?: string // Date d'obtention
  expiryDate?: string // Date d'expiration
  isValid: boolean // Si la certification est valide
  
  // Domaines d'activité couverts
  activities: Array<{
    code: string // Code domaine (ex: "CHAUFFAGE", "ISOLATION")
    label: string // Libellé domaine (ex: "Chauffage", "Isolation thermique")
    validUntil?: string // Date d'expiration pour ce domaine spécifique
  }>
  
  // Métadonnées
  source: string
  lastUpdated?: string
  verifiedAt: string
}

export interface DataGouvRGEDataset {
  id: string
  title: string
  resources: Array<{
    id: string
    title: string
    url: string
    format: string
    filesize: number
    last_modified: string
  }>
}

export class RGEService {
  private readonly datasetId = '62bd63b70ff1edf452b83a6b'
  private readonly baseUrl = 'https://www.data.gouv.fr/api/1'
  private client: ApiClient
  private indexer: any // Lazy import pour éviter dépendance circulaire

  constructor() {
    this.client = new ApiClient({
      baseUrl: this.baseUrl,
      timeout: 10000,
      retries: 2,
    })
  }

  /**
   * Récupère la certification RGE d'une entreprise par son SIRET
   */
  async getRGECertification(siret: string): Promise<RGECertification | null> {
    try {
      // Normaliser le SIRET (14 chiffres)
      const normalizedSiret = this.normalizeSiret(siret)
      if (!normalizedSiret) {
        log.warn({ siret }, 'SIRET invalide')
        return null
      }

      // 1. PRIORITÉ: Rechercher dans l'index local (si indexation effectuée)
      try {
        if (!this.indexer) {
          const { RGEIndexer } = await import('./rge-indexer')
          this.indexer = new RGEIndexer()
        }

        log.debug('Recherche dans l\'index local')
        const indexedCert = await this.indexer.searchCertification(normalizedSiret)
        if (indexedCert && indexedCert.isValid) {
          log.info('Certification RGE trouvée dans l\'index local')
          return indexedCert
        } else if (indexedCert) {
          log.warn('Certification trouvée mais non valide dans l\'index')
          // On continue quand même pour vérifier via API
        } else {
          log.debug('Aucune certification trouvée dans l\'index local')
        }
      } catch (error) {
        log.warn({ err: error }, 'Erreur accès index local (continuation avec recherche API)')
      }

      // 2. Fallback: Recherche directe via API data.gouv.fr ou ressources du dataset
      log.debug('Recherche via API data.gouv.fr')
      const rgeData = await this.searchRGEBySiret(normalizedSiret)
      
      if (rgeData && rgeData.isValid) {
        // Si trouvée via API et valide, indexer pour usage futur
        try {
          if (!this.indexer) {
            const { RGEIndexer } = await import('./rge-indexer')
            this.indexer = new RGEIndexer()
          }
          log.debug('Indexation de la certification trouvée')
          await this.indexer.indexCertification(rgeData).catch((err: any) => {
            log.warn({ err }, 'Erreur indexation')
          })
        } catch (error) {
          log.warn({ err: error }, 'Erreur indexation automatique')
        }
      }
      
      return rgeData
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération certification RGE')
      return null
    }
  }

  /**
   * Recherche RGE par SIRET
   * Utilise les ressources du dataset pour rechercher les certifications correspondantes
   */
  private async searchRGEBySiret(siret: string): Promise<RGECertification | null> {
    try {
      log.debug({ siret }, 'Début recherche RGE')
      
      // Récupérer les métadonnées du dataset
      const dataset = await this.getDatasetInfo()
      if (!dataset || !dataset.resources || dataset.resources.length === 0) {
        log.warn('Aucune ressource trouvée pour le dataset RGE')
        return null
      }

      log.info({ resourcesCount: dataset.resources.length }, 'Dataset trouvé')

      // Chercher la ressource la plus récente
      const latestResource = dataset.resources
        .filter(r => r.format === 'csv' || r.format === 'json' || r.format === 'geojson')
        .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0]

      if (!latestResource) {
        log.warn('Aucune ressource récente trouvée')
        return null
      }

      log.debug({
        title: latestResource.title,
        format: latestResource.format,
        url: latestResource.url
      }, 'Ressource sélectionnée')

      // Tenter une recherche directe dans le fichier si c'est un CSV/JSON accessible
      // Pour les gros fichiers, on peut utiliser une recherche par département ou indexation locale
      if (latestResource.format === 'csv' || latestResource.format === 'json') {
        try {
          const cert = await this.searchInResource(latestResource.url, siret, latestResource.format)
          if (cert) {
            log.info('Certification RGE trouvée dans la ressource')
            return cert
          }
        } catch (error) {
          log.warn({ err: error }, 'Impossible de rechercher directement dans la ressource')
          // Continue avec la méthode alternative
        }
      }

      // Fallback: Retourner une structure indiquant que la recherche nécessite une indexation
      log.debug('Indexation recommandée pour recherche efficace')
      
      return {
        siret,
        siren: siret.substring(0, 9),
        isValid: false, // Nécessite indexation pour validation complète
        activities: [],
        source: 'RGE data.gouv.fr (recherche en cours)',
        verifiedAt: new Date().toISOString(),
      }
    } catch (error) {
      log.error({ err: error, siret }, 'Erreur recherche RGE par SIRET')
      return null
    }
  }

  /**
   * Recherche dans une ressource CSV ou JSON
   */
  private async searchInResource(
    resourceUrl: string,
    siret: string,
    format: string
  ): Promise<RGECertification | null> {
    try {
      log.debug({ format, resourceUrl }, 'Recherche dans ressource')
      
      const response = await fetch(resourceUrl, {
        headers: {
          'Accept': format === 'json' ? 'application/json' : 'text/csv',
        },
      })

      if (!response.ok) {
        log.warn({ status: response.status }, 'Réponse HTTP pour la ressource')
        return null
      }

      if (format === 'json') {
        const data = await response.json()
        // Chercher le SIRET dans les données JSON
        const match = this.findSIRETInJSON(data, siret)
        if (match) {
          return this.parseRGEData(match)
        }
      } else if (format === 'csv') {
        // Pour les CSV volumineux, on lit par chunks ou on utilise un streaming parser
        // Pour l'instant, on tente de lire le début pour détecter le format
        const text = await response.text()
        const match = this.findSIRETInCSV(text, siret)
        if (match) {
          return this.parseRGEData(match)
        }
      }

      return null
    } catch (error) {
      log.error({ err: error }, 'Erreur recherche dans ressource')
      return null
    }
  }

  /**
   * Trouve un SIRET dans des données JSON
   */
  private findSIRETInJSON(data: any, siret: string): any {
    // Parcourir récursivement la structure JSON pour trouver le SIRET
    if (Array.isArray(data)) {
      for (const item of data) {
        const match = this.findSIRETInJSON(item, siret)
        if (match) return match
      }
    } else if (typeof data === 'object' && data !== null) {
      // Vérifier si cet objet contient le SIRET
      const values = Object.values(data).map(v => String(v))
      if (values.some(v => v.includes(siret) || v.includes(siret.replace(/^0+/, '')))) {
        return data
      }
      // Parcourir les propriétés
      for (const value of Object.values(data)) {
        const match = this.findSIRETInJSON(value, siret)
        if (match) return match
      }
    }
    return null
  }

  /**
   * Trouve un SIRET dans un CSV
   */
  private findSIRETInCSV(csvText: string, siret: string): any {
    const lines = csvText.split('\n')
    if (lines.length === 0) return null

    // Trouver la ligne d'en-tête
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const siretColumnIndex = headers.findIndex(h => 
      h.includes('siret') || h.includes('numero_siret')
    )

    if (siretColumnIndex === -1) {
      log.warn('Colonne SIRET non trouvée dans le CSV')
      return null
    }

    // Chercher dans les premières lignes (pour éviter de charger tout le fichier)
    const searchLimit = Math.min(1000, lines.length) // Limiter à 1000 lignes pour les performances
    for (let i = 1; i < searchLimit; i++) {
      const line = lines[i]
      if (!line.trim()) continue
      
      const columns = line.split(',')
      const lineSiret = columns[siretColumnIndex]?.trim()
      
      if (lineSiret === siret || lineSiret === siret.replace(/^0+/, '')) {
        // Construire un objet avec les colonnes
        const obj: any = {}
        headers.forEach((header, idx) => {
          obj[header] = columns[idx]?.trim() || ''
        })
        return obj
      }
    }

    return null
  }

  /**
   * Parse les données RGE depuis un objet trouvé
   */
  private parseRGEData(data: any): RGECertification {
    const siret = data.siret || data.numero_siret || ''
    
    // Extraire les activités depuis les colonnes disponibles
    const activities: Array<{ code: string; label: string }> = []
    const activityFields = ['activite', 'domaine', 'specialite', 'qualification']
    
    for (const field of activityFields) {
      const value = data[field]
      if (value && typeof value === 'string') {
        activities.push({
          code: value.toUpperCase(),
          label: value,
        })
      }
    }

    return {
      siret: siret.replace(/\s/g, ''),
      siren: siret.substring(0, 9),
      isValid: true, // Données trouvées = certification valide
      activities,
      certificationDate: data.date_certification || data.date_debut,
      expiryDate: data.date_fin || data.date_expiration,
      source: 'RGE data.gouv.fr (données certifiées)',
      verifiedAt: new Date().toISOString(),
    }
  }

  /**
   * Récupère les informations du dataset depuis data.gouv.fr
   */
  async getDatasetInfo(): Promise<DataGouvRGEDataset | null> {
    try {
      log.debug({ datasetId: this.datasetId }, 'Récupération dataset RGE')

      const response = await this.client.get<any>(
        `/datasets/${this.datasetId}/`
      )

      log.debug({
        hasResponse: !!response,
        hasResources: !!(response?.resources),
        resourcesCount: response?.resources?.length || 0,
      }, 'Réponse API data.gouv.fr')

      if (!response) {
        log.error('Réponse vide de l\'API')
        return null
      }

      // Mapper la réponse vers notre interface
      const dataset: DataGouvRGEDataset = {
        id: response.id || this.datasetId,
        title: response.title || response.name || 'Dataset RGE',
        resources: (response.resources || []).map((r: any) => {
          // Normaliser le format
          let format = (r.format || r.mime_type || r.filetype || 'unknown').toLowerCase()
          
          // Extraire le format réel (supprimer les préfixes)
          format = format
            .replace(/^application\//, '')
            .replace(/^text\//, '')
            .replace(/^page\s+web$/i, 'web')
          
          // Si c'est une page web, vérifier si l'URL pointe vers un fichier
          if (format === 'web' || format === 'html') {
            const url = r.url || ''
            if (url.includes('.csv')) format = 'csv'
            else if (url.includes('.json')) format = 'json'
            else if (url.includes('.xls') || url.includes('.xlsx')) format = 'xls'
          }

          return {
            id: r.id || r.uuid,
            title: r.title || r.name || 'Ressource RGE',
            url: r.url || r.file || (r.files?.length > 0 ? r.files[0] : ''),
            format,
            filesize: r.filesize || r.size || 0,
            last_modified: r.last_modified || r.modified || r.created_at || new Date().toISOString(),
          }
        }).filter((r: any) => {
          // Filtrer uniquement les ressources avec URL valide
          // Accepter CSV, JSON, XLS, mais exclure les pages web sans extension de fichier
          return r.url && (
            r.format === 'csv' || 
            r.format === 'json' || 
            r.format === 'xls' || 
            r.format === 'xlsx' ||
            r.url.match(/\.(csv|json|xls|xlsx)$/i)
          )
        }),
      }

      log.info({ resourcesCount: dataset.resources.length }, 'Dataset mappé')

      if (dataset.resources.length === 0) {
        log.warn('Aucune ressource valide trouvée dans le dataset')
        log.warn({ response: JSON.stringify(response, null, 2).substring(0, 500) }, 'Structure de réponse')
      }

      return dataset
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération métadonnées dataset')
      if (error instanceof Error) {
        log.error({ message: error.message, stack: error.stack }, 'Détails erreur')
      }
      return null
    }
  }

  /**
   * Recherche RGE depuis une ressource spécifique
   * Pour les gros fichiers, cette méthode peut être utilisée avec un index local
   */
  async getRGEFromResource(
    resourceUrl: string,
    _siret: string
  ): Promise<RGECertification | null> {
    try {
      // Note: Pour les très gros fichiers CSV/JSON, il est recommandé d'utiliser
      // un système d'indexation local (similaire à RNBIndexer)
      // ou d'utiliser un service de recherche externe

      log.debug({ resourceUrl }, 'Recherche dans ressource')
      log.debug('Indexation recommandée pour recherche efficace')

      return null
    } catch (error) {
      log.error({ err: error }, 'Erreur lecture ressource RGE')
      return null
    }
  }

  /**
   * Recherche toutes les entreprises RGE par domaine d'activité
   */
  async searchRGEByActivity(
    _activity: string,
    _department?: string
  ): Promise<RGECertification[]> {
    try {
      // TODO: Implémenter recherche par domaine d'activité
      // Peut utiliser un index local ou une API de recherche
      return []
    } catch (error) {
      log.error({ err: error }, 'Erreur recherche RGE par activité')
      return []
    }
  }

  /**
   * Vérifie si une entreprise est certifiée RGE et pour quels domaines
   */
  async verifyRGECertification(
    siret: string,
    requiredActivities?: string[]
  ): Promise<{
    isRGECertified: boolean
    certification?: RGECertification
    hasRequiredActivities: boolean
    missingActivities?: string[]
  }> {
    try {
      const certification = await this.getRGECertification(siret)
      
      if (!certification || !certification.isValid) {
        return {
          isRGECertified: false,
          hasRequiredActivities: false,
          missingActivities: requiredActivities || [],
        }
      }

      // Vérifier si tous les domaines requis sont couverts
      let hasRequiredActivities = true
      const missingActivities: string[] = []
      
      if (requiredActivities && requiredActivities.length > 0) {
        const certifiedActivities = certification.activities.map(a => a.code.toUpperCase())
        
        for (const required of requiredActivities) {
          const found = certifiedActivities.some(certified =>
            certified.includes(required.toUpperCase()) || 
            required.toUpperCase().includes(certified)
          )
          
          if (!found) {
            hasRequiredActivities = false
            missingActivities.push(required)
          }
        }
      }

      return {
        isRGECertified: true,
        certification,
        hasRequiredActivities,
        missingActivities: missingActivities.length > 0 ? missingActivities : undefined,
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur vérification certification RGE')
      return {
        isRGECertified: false,
        hasRequiredActivities: false,
        missingActivities: requiredActivities || [],
      }
    }
  }

  /**
   * Normalise un SIRET (supprime espaces, tirets, etc.)
   */
  private normalizeSiret(siret: string): string | null {
    const cleaned = siret.replace(/[\s-]/g, '')
    
    // Vérifier que c'est un nombre de 14 chiffres
    if (!/^\d{14}$/.test(cleaned)) {
      return null
    }
    
    return cleaned
  }
}

