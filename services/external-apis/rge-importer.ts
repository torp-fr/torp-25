/**
 * Service d'import progressif des fichiers RGE
 * Parse les fichiers CSV/JSON volumineux et les indexe progressivement dans la base de données
 */

import { RGEIndexer } from './rge-indexer'
import type { RGECertification } from './rge-service'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export interface ImportOptions {
  resourceUrl: string
  resourceId?: string
  resourceTitle?: string
  resourceFormat?: string
  maxRows?: number // Limite pour tester ou import partiel
  batchSize?: number // Taille des batches d'indexation
  onProgress?: (progress: { processed: number; total?: number; percentage: number }) => void
}

export class RGEImporter {
  private indexer: RGEIndexer

  constructor() {
    this.indexer = new RGEIndexer()
  }

  /**
   * Importe un fichier RGE complet depuis data.gouv.fr
   * Télécharge le fichier CSV/JSON, le parse et l'indexe progressivement
   */
  async importResource(options: ImportOptions): Promise<{ success: boolean; indexed: number; errors: number }> {
    const { resourceUrl, resourceId, resourceTitle, resourceFormat, maxRows, batchSize = 1000, onProgress } = options

    try {
      // 1. Créer un job d'import
      const jobId = await this.indexer.createImportJob(
        resourceUrl,
        resourceId,
        resourceTitle,
        resourceFormat
      )
      await this.indexer.updateImportJob(jobId, { status: 'IN_PROGRESS' })

      log.info({ resourceUrl, format: resourceFormat || 'auto-detect' }, 'Début import RGE')

      let indexed = 0
      let errors = 0
      let totalRows = maxRows

      try {
        // 2. Télécharger le fichier
        const response = await fetch(resourceUrl, {
          headers: {
            'Accept': resourceFormat === 'json' ? 'application/json' : 'text/csv',
          },
        })

        if (!response.ok) {
          throw new Error(`Erreur téléchargement: ${response.statusText}`)
        }

        const format = resourceFormat || this.detectFormat(resourceUrl, response.headers.get('content-type'))
        log.debug({ format }, 'Format détecté')

        // 3. Parser le fichier selon le format
        let certifications: RGECertification[] = []

        if (format === 'json') {
          const data = await response.json()
          certifications = this.parseJSON(data, maxRows)
        } else if (format === 'csv') {
          const text = await response.text()
          certifications = this.parseCSV(text, maxRows)
        } else {
          throw new Error(`Format non supporté: ${format}`)
        }

        totalRows = certifications.length
        log.info({ totalRows }, 'Certifications à indexer')

        // 4. Indexer par batch
        const batches = []
        for (let i = 0; i < certifications.length; i += batchSize) {
          batches.push(certifications.slice(i, i + batchSize))
        }

        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i]
          const result = await this.indexer.indexCertificationsBatch(batch)
          indexed += result.success
          errors += result.failed

          const progress = ((i + 1) / batches.length) * 100

          // Mettre à jour le job
          await this.indexer.updateImportJob(jobId, {
            progress,
            processedRows: indexed + errors,
            totalRows,
          })

          // Callback de progression
          if (onProgress) {
            onProgress({
              processed: indexed + errors,
              total: totalRows,
              percentage: progress,
            })
          }

          log.debug({
            progress: Math.round(progress * 10) / 10,
            indexed,
            errors,
          }, 'Progression import')
        }

        await this.indexer.updateImportJob(jobId, {
          status: 'COMPLETED',
          progress: 100,
          processedRows: indexed + errors,
          totalRows,
        })

        log.info({ indexed, errors }, 'Import terminé')
      } catch (error) {
        log.error({ err: error }, 'Erreur import')
        await this.indexer.updateImportJob(jobId, {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      }

      return { success: true, indexed, errors }
    } catch (error) {
      log.error({ err: error }, 'Erreur import globale')
      return { success: false, indexed: 0, errors: 1 }
    }
  }

  /**
   * Détecte le format du fichier
   */
  private detectFormat(url: string, contentType?: string | null): 'csv' | 'json' {
    if (contentType) {
      if (contentType.includes('json')) return 'json'
      if (contentType.includes('csv') || contentType.includes('text/plain')) return 'csv'
    }

    const urlLower = url.toLowerCase()
    if (urlLower.endsWith('.json')) return 'json'
    if (urlLower.endsWith('.csv')) return 'csv'

    // Par défaut, essayer CSV
    return 'csv'
  }

  /**
   * Parse un fichier JSON
   */
  private parseJSON(data: any, maxRows?: number): RGECertification[] {
    const certifications: RGECertification[] = []

    let items: any[] = []
    if (Array.isArray(data)) {
      items = data
    } else if (data.features && Array.isArray(data.features)) {
      // GeoJSON format
      items = data.features.map((f: any) => ({ ...f.properties, geometry: f.geometry }))
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data
    } else {
      log.warn('Format JSON non reconnu')
      return []
    }

    const limit = maxRows || items.length
    for (let i = 0; i < Math.min(limit, items.length); i++) {
      const cert = this.parseRowToCertification(items[i])
      if (cert) {
        certifications.push(cert)
      }
    }

    return certifications
  }

  /**
   * Parse un fichier CSV
   */
  private parseCSV(csvText: string, maxRows?: number): RGECertification[] {
    const certifications: RGECertification[] = []
    const lines = csvText.split('\n').filter((line) => line.trim())

    if (lines.length === 0) {
      log.warn('Fichier CSV vide')
      return []
    }

    // Parser la ligne d'en-tête
    const headers = lines[0]
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/["\s]/g, ''))

    // Trouver les index des colonnes importantes
    const siretIndex = headers.findIndex((h) => h.includes('siret') || h === 'numero_siret')
    const sirenIndex = headers.findIndex((h) => h.includes('siren'))

    if (siretIndex === -1 && sirenIndex === -1) {
      log.warn('Colonne SIRET/SIREN non trouvée dans le CSV')
      return []
    }

    const limit = maxRows ? Math.min(maxRows + 1, lines.length) : lines.length
    for (let i = 1; i < limit; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      const columns = this.parseCSVLine(line)
      const row: any = {}
      headers.forEach((header, idx) => {
        row[header] = columns[idx]?.trim() || ''
      })

      const cert = this.parseRowToCertification(row, {
        siretIndex: siretIndex !== -1 ? siretIndex : sirenIndex ? undefined : sirenIndex,
      })
      if (cert) {
        certifications.push(cert)
      }
    }

    return certifications
  }

  /**
   * Parse une ligne CSV en tenant compte des valeurs entre guillemets
   */
  private parseCSVLine(line: string): string[] {
    const columns: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        columns.push(current)
        current = ''
      } else {
        current += char
      }
    }

    columns.push(current)
    return columns
  }

  /**
   * Convertit une ligne (CSV ou JSON) en RGECertification
   */
  private parseRowToCertification(row: any, options?: { siretIndex?: number }): RGECertification | null {
    try {
      // Extraire le SIRET
      const siret = options?.siretIndex !== undefined
        ? row[Object.keys(row)[options.siretIndex]]?.replace(/[\s-]/g, '')
        : row.siret || row.numero_siret || row.siret_entreprise

      if (!siret || !/^\d{14}$/.test(siret.replace(/[\s-]/g, ''))) {
        return null // SIRET invalide, ignorer cette ligne
      }

      const normalizedSiret = siret.replace(/[\s-]/g, '')

      // Extraire les autres informations
      const siren = row.siren || normalizedSiret.substring(0, 9)
      const companyName = row.raison_sociale || row.denomination || row.nom || row.nom_entreprise || row.entreprise
      const address = row.adresse || row.adresse_complete || row.adresse_postale
      const postalCode = row.code_postal || row.cp || row.codePostal
      const city = row.ville || row.commune || row.localite

      // Extraire les activités
      const activities: Array<{ code: string; label: string }> = []
      const activityFields = ['activite', 'domaine', 'specialite', 'qualification', 'metier']
      for (const field of activityFields) {
        const value = row[field]
        if (value && typeof value === 'string' && value.trim()) {
          activities.push({
            code: value.toUpperCase(),
            label: value,
          })
        }
      }

      // Extraire les dates
      const certificationDate = row.date_certification || row.date_debut || row.date_obtention
      const expiryDate = row.date_fin || row.date_expiration || row.date_validite

      return {
        siret: normalizedSiret,
        siren,
        companyName,
        address: address || postalCode || city
          ? {
              street: address,
              postalCode,
              city,
              formatted: [address, postalCode, city].filter(Boolean).join(', ') || undefined,
            }
          : undefined,
        certificationNumber: row.numero_certification || row.certification_number || row.id_certification,
        certificationDate: certificationDate ? new Date(certificationDate).toISOString() : undefined,
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        isValid: expiryDate ? new Date(expiryDate) >= new Date() : true,
        activities,
        source: 'RGE data.gouv.fr (indexé)',
        verifiedAt: new Date().toISOString(),
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur parsing ligne')
      return null
    }
  }
}
