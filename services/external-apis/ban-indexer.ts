/**
 * Service d'indexation BAN (Base Adresse Nationale)
 * Permet d'indexer progressivement les fichiers CSV volumineux dans une base de données locale
 * et de rechercher rapidement des adresses
 */

import { prisma } from '@/lib/db'
import type { AddressData } from './types'

export interface BANSearchParams {
  department?: string
  postalCode?: string
  codeINSEE?: string
  city?: string
  query?: string
  coordinates?: { lat: number; lng: number }
  radius?: number // Rayon en mètres pour recherche par coordonnées
}

export interface BANImportProgress {
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  totalRows?: number
  processedRows?: number
}

export class BANIndexer {
  /**
   * Recherche des adresses dans l'index local
   */
  async searchAddress(query: string, limit = 10): Promise<AddressData[]> {
    try {
      // Recherche multi-critères : code postal, ville, rue
      const addresses = await prisma.bANAddress.findMany({
        where: {
          OR: [
            { formatted: { contains: query, mode: 'insensitive' } },
            { postalCode: query.replace(/\D/g, '') },
            { city: { contains: query, mode: 'insensitive' } },
            { street: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: {
          indexedAt: 'desc',
        },
      })

      return addresses.map((addr: any) => this.mapToAddressData(addr))
    } catch (error) {
      console.error('[BANIndexer] Erreur recherche adresse:', error)
      return []
    }
  }

  /**
   * Recherche avancée par critères multiples
   */
  async searchAddresses(params: BANSearchParams): Promise<AddressData[]> {
    try {
      const where: any = {}

      if (params.department) {
        where.department = params.department
      }

      if (params.postalCode) {
        where.postalCode = params.postalCode.substring(0, 5)
      }

      if (params.codeINSEE) {
        where.codeINSEE = params.codeINSEE
      }

      if (params.city) {
        where.city = { contains: params.city, mode: 'insensitive' }
      }

      if (params.query) {
        where.OR = [
          { formatted: { contains: params.query, mode: 'insensitive' } },
          { street: { contains: params.query, mode: 'insensitive' } },
        ]
      }

      const addresses = await prisma.bANAddress.findMany({
        where,
        take: 50,
        orderBy: {
          indexedAt: 'desc',
        },
      })

      return addresses.map((addr: any) => this.mapToAddressData(addr))
    } catch (error) {
      console.error('[BANIndexer] Erreur recherche adresses:', error)
      return []
    }
  }

  /**
   * Géocodage inverse depuis l'index local
   */
  async reverseGeocode(lat: number, _lng: number, _radiusMeters = 100): Promise<AddressData | null> {
    try {
      // TODO: Implémenter recherche géographique avec PostGIS si disponible
      // Pour l'instant, recherche approximative par coordonnées stockées
      const address = await prisma.bANAddress.findFirst({
        where: {
          coordinates: {
            path: ['lat'],
            gte: lat - 0.001, // Approximation grossière
            lte: lat + 0.001,
          },
        },
        orderBy: {
          indexedAt: 'desc',
        },
      })

      if (address) {
        return this.mapToAddressData(address)
      }

      return null
    } catch (error) {
      console.error('[BANIndexer] Erreur géocodage inverse:', error)
      return null
    }
  }

  /**
   * Indexe une adresse dans la base de données
   */
  async indexAddress(addressData: {
    banId?: string
    formatted: string
    housenumber?: string
    street?: string
    postalCode: string
    city: string
    codeINSEE?: string
    department?: string
    region?: string
    coordinates?: { lat: number; lng: number }
  }): Promise<string | null> {
    try {
      const address = await prisma.bANAddress.upsert({
        where: {
          banId: addressData.banId || undefined,
        },
        update: {
          formatted: addressData.formatted,
          street: addressData.street,
          postalCode: addressData.postalCode,
          city: addressData.city,
          lastUpdated: new Date(),
        },
        create: {
          banId: addressData.banId,
          department: addressData.department || this.extractDepartment(addressData.postalCode),
          codeINSEE: addressData.codeINSEE,
          commune: addressData.city,
          formatted: addressData.formatted,
          housenumber: addressData.housenumber,
          street: addressData.street,
          postalCode: addressData.postalCode,
          city: addressData.city,
          region: addressData.region,
          coordinates: addressData.coordinates
            ? {
                lat: addressData.coordinates.lat,
                lng: addressData.coordinates.lng,
              }
            : undefined,
        },
      })

      return address.id
    } catch (error) {
      console.error('[BANIndexer] Erreur indexation adresse:', error)
      return null
    }
  }

  /**
   * Indexe plusieurs adresses en batch
   */
  async indexAddressesBatch(addressesData: Array<{
    banId?: string
    formatted: string
    housenumber?: string
    street?: string
    postalCode: string
    city: string
    codeINSEE?: string
    department?: string
    coordinates?: { lat: number; lng: number }
  }>): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    const batchSize = 100
    for (let i = 0; i < addressesData.length; i += batchSize) {
      const batch = addressesData.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (addrData) => {
          try {
            await this.indexAddress(addrData)
            success++
          } catch (error) {
            failed++
            console.error('[BANIndexer] Erreur indexation batch:', error)
          }
        })
      )
    }

    return { success, failed }
  }

  /**
   * Crée ou met à jour un job d'import
   */
  async createImportJob(
    department: string,
    resourceUrl: string,
    resourceId?: string
  ): Promise<string> {
    const job = await prisma.bANImportJob.create({
      data: {
        department,
        resourceId,
        resourceUrl,
        status: 'PENDING',
        progress: 0,
      },
    })

    return job.id
  }

  /**
   * Met à jour le statut et la progression d'un job d'import
   */
  async updateImportJob(
    jobId: string,
    updates: {
      status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
      progress?: number
      totalRows?: number
      processedRows?: number
      errorMessage?: string
      startedAt?: Date
      completedAt?: Date
    }
  ): Promise<void> {
    await prisma.bANImportJob.update({
      where: { id: jobId },
      data: {
        ...updates,
        ...(updates.status === 'IN_PROGRESS' && !updates.startedAt
          ? { startedAt: new Date() }
          : {}),
        ...(updates.status === 'COMPLETED' || updates.status === 'FAILED'
          ? { completedAt: new Date() }
          : {}),
      },
    })
  }

  /**
   * Récupère les jobs d'import actifs
   */
  async getActiveImportJobs(): Promise<BANImportProgress[]> {
    const jobs = await prisma.bANImportJob.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return jobs.map((job: (typeof jobs)[number]) => ({
      department: job.department,
      status: job.status.toLowerCase() as 'pending' | 'in_progress' | 'completed' | 'failed',
      progress: job.progress,
      totalRows: job.totalRows || undefined,
      processedRows: job.processedRows || undefined,
    }))
  }

  /**
   * Récupère les statistiques d'indexation par département
   */
  async getIndexingStats(): Promise<Record<string, number>> {
    const stats = await prisma.bANAddress.groupBy({
      by: ['department'],
      _count: {
        id: true,
      },
    })

    const result: Record<string, number> = {}
    stats.forEach((stat: (typeof stats)[number]) => {
      result[stat.department] = stat._count.id
    })

    return result
  }

  /**
   * Convertit un modèle Prisma en AddressData
   */
  private mapToAddressData(address: any): AddressData {
    return {
      formatted: address.formatted,
      street: address.street || '',
      postalCode: address.postalCode,
      city: address.city,
      region: address.region || '',
      department: address.department,
      coordinates: address.coordinates
        ? {
            lat: address.coordinates.lat,
            lng: address.coordinates.lng,
          }
        : undefined,
      completeness: this.calculateCompleteness(address),
    }
  }

  /**
   * Normalise une requête de recherche
   * Réservé pour usage futur (normalisation avancée)
   */
  // private normalizeQuery(query: string): string {
  //   return query
  //     .toLowerCase()
  //     .normalize('NFD')
  //     .replace(/[\u0300-\u036f]/g, '')
  //     .trim()
  // }

  /**
   * Calcule un score de complétude
   */
  private calculateCompleteness(address: any): number {
    let score = 0
    if (address.formatted) score += 30
    if (address.street || address.housenumber) score += 20
    if (address.postalCode) score += 20
    if (address.city) score += 20
    if (address.coordinates) score += 10
    return score
  }

  /**
   * Extrait le département depuis le code postal
   */
  private extractDepartment(postalCode: string): string {
    if (!postalCode || postalCode.length < 2) {
      return '00'
    }

    // DOM-TOM (971, 972, etc.)
    if (postalCode.length >= 3 && postalCode.startsWith('97')) {
      return postalCode.substring(0, 3)
    }

    return postalCode.substring(0, 2)
  }
}

