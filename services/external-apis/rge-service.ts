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
        console.warn('[RGEService] SIRET invalide:', siret)
        return null
      }

      // 1. Essayer de récupérer depuis un index local (si implémenté)
      // TODO: Implémenter RGEIndexer similaire à RNBIndexer si nécessaire

      // 2. Recherche directe via API data.gouv.fr ou ressources du dataset
      const rgeData = await this.searchRGEBySiret(normalizedSiret)
      
      return rgeData
    } catch (error) {
      console.error('[RGEService] Erreur récupération certification RGE:', error)
      return null
    }
  }

  /**
   * Recherche RGE par SIRET
   * Utilise les ressources du dataset pour rechercher les certifications correspondantes
   */
  private async searchRGEBySiret(siret: string): Promise<RGECertification | null> {
    try {
      console.log('[RGEService] 🔍 Début recherche RGE pour SIRET:', siret)
      
      // Récupérer les métadonnées du dataset
      const dataset = await this.getDatasetInfo()
      if (!dataset || !dataset.resources || dataset.resources.length === 0) {
        console.warn('[RGEService] ⚠️ Aucune ressource trouvée pour le dataset RGE')
        return null
      }

      console.log(`[RGEService] ✅ Dataset trouvé avec ${dataset.resources.length} ressources`)

      // Chercher la ressource la plus récente
      const latestResource = dataset.resources
        .filter(r => r.format === 'csv' || r.format === 'json' || r.format === 'geojson')
        .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0]

      if (!latestResource) {
        console.warn('[RGEService] ⚠️ Aucune ressource récente trouvée')
        return null
      }

      console.log(`[RGEService] 📦 Ressource sélectionnée: ${latestResource.title} (${latestResource.format})`)
      console.log(`[RGEService] 🔗 URL: ${latestResource.url}`)

      // Tenter une recherche directe dans le fichier si c'est un CSV/JSON accessible
      // Pour les gros fichiers, on peut utiliser une recherche par département ou indexation locale
      if (latestResource.format === 'csv' || latestResource.format === 'json') {
        try {
          const cert = await this.searchInResource(latestResource.url, siret, latestResource.format)
          if (cert) {
            console.log('[RGEService] ✅ Certification RGE trouvée dans la ressource')
            return cert
          }
        } catch (error) {
          console.warn('[RGEService] ⚠️ Impossible de rechercher directement dans la ressource:', error)
          // Continue avec la méthode alternative
        }
      }

      // Fallback: Retourner une structure indiquant que la recherche nécessite une indexation
      console.log('[RGEService] ℹ️ Indexation recommandée pour recherche efficace')
      
      return {
        siret,
        siren: siret.substring(0, 9),
        isValid: false, // Nécessite indexation pour validation complète
        activities: [],
        source: 'RGE data.gouv.fr (recherche en cours)',
        verifiedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[RGEService] ❌ Erreur recherche RGE par SIRET:', error)
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
      console.log(`[RGEService] 🔎 Recherche dans ressource ${format}:`, resourceUrl)
      
      const response = await fetch(resourceUrl, {
        headers: {
          'Accept': format === 'json' ? 'application/json' : 'text/csv',
        },
      })

      if (!response.ok) {
        console.warn(`[RGEService] ⚠️ Réponse HTTP ${response.status} pour la ressource`)
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
      console.error('[RGEService] ❌ Erreur recherche dans ressource:', error)
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
      console.warn('[RGEService] ⚠️ Colonne SIRET non trouvée dans le CSV')
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
  private async getDatasetInfo(): Promise<DataGouvRGEDataset | null> {
    try {
      const response = await this.client.get<DataGouvRGEDataset>(
        `/datasets/${this.datasetId}/`
      )
      return response
    } catch (error) {
      console.error('[RGEService] Erreur récupération métadonnées dataset:', error)
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

      console.log('[RGEService] Recherche dans ressource:', resourceUrl)
      console.log('[RGEService] Indexation recommandée pour recherche efficace')

      return null
    } catch (error) {
      console.error('[RGEService] Erreur lecture ressource RGE:', error)
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
      console.error('[RGEService] Erreur recherche RGE par activité:', error)
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
      console.error('[RGEService] Erreur vérification certification RGE:', error)
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

