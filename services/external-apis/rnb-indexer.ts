/**
 * Service d'indexation RNB (Référentiel National des Bâtiments)
 * Permet d'indexer progressivement les fichiers CSV volumineux dans une base de données locale
 * et de rechercher rapidement des données spécifiques
 */

import { prisma } from '@/lib/db'
import type { RNBBuildingData } from './rnb-service'

export interface RNBSearchParams {
  department?: string
  postalCode?: string
  codeINSEE?: string
  coordinates?: { lat: number; lng: number }
  address?: string
  radius?: number // Rayon en mètres pour recherche par coordonnées
}

export interface RNBImportProgress {
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  totalRows?: number
  processedRows?: number
}

export class RNBIndexer {
  /**
   * Recherche un bâtiment dans l'index local
   */
  async searchBuilding(
    postalCode?: string,
    address?: string,
    coordinates?: { lat: number; lng: number }
  ): Promise<RNBBuildingData | null> {
    try {
      // Recherche par code postal en priorité
      if (postalCode) {
        const building = await prisma.rNBBuilding.findFirst({
          where: {
            postalCode: postalCode.substring(0, 5), // Format standardisé
          },
          orderBy: {
            indexedAt: 'desc',
          },
        })

        if (building) {
          return this.mapToRNBBuildingData(building)
        }
      }

      // Recherche par adresse (approximative)
      if (address) {
        const addressNormalized = address.toLowerCase().trim()
        const building = await prisma.rNBBuilding.findFirst({
          where: {
            address: {
              contains: addressNormalized,
              mode: 'insensitive',
            },
          },
          orderBy: {
            indexedAt: 'desc',
          },
        })

        if (building) {
          return this.mapToRNBBuildingData(building)
        }
      }

      // Recherche par coordonnées (si radius spécifié)
      if (coordinates && coordinates.lat && coordinates.lng) {
        // TODO: Implémenter recherche géographique avec PostGIS si disponible
        // Pour l'instant, recherche simple par proximité approximative
        const building = await prisma.rNBBuilding.findFirst({
          where: {
            coordinates: {
              path: ['lat'],
              equals: coordinates.lat,
            },
          },
          orderBy: {
            indexedAt: 'desc',
          },
        })

        if (building) {
          return this.mapToRNBBuildingData(building)
        }
      }

      return null
    } catch (error) {
      console.error('[RNBIndexer] Erreur recherche bâtiment:', error)
      return null
    }
  }

  /**
   * Recherche des bâtiments par critères multiples
   */
  async searchBuildings(params: RNBSearchParams): Promise<RNBBuildingData[]> {
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

      const buildings = await prisma.rNBBuilding.findMany({
        where,
        take: 100, // Limite pour éviter les résultats trop volumineux
        orderBy: {
          indexedAt: 'desc',
        },
      })

      return buildings.map((b) => this.mapToRNBBuildingData(b))
    } catch (error) {
      console.error('[RNBIndexer] Erreur recherche bâtiments:', error)
      return []
    }
  }

  /**
   * Indexe un bâtiment dans la base de données
   */
  async indexBuilding(buildingData: RNBBuildingData): Promise<string | null> {
    try {
      const building = await prisma.rNBBuilding.upsert({
        where: {
          rnbId: buildingData.id || undefined,
        },
        update: {
          dpeClass: buildingData.dpeClass,
          dpeDate: buildingData.dpeDate ? new Date(buildingData.dpeDate) : undefined,
          energyConsumption: buildingData.energyConsumption,
          ghgEmissions: buildingData.ghgEmissions,
          lastUpdated: new Date(),
        },
        create: {
          rnbId: buildingData.id,
          department: this.extractDepartment(buildingData.codeINSEE || ''),
          codeINSEE: buildingData.codeINSEE,
          commune: buildingData.commune,
          address: buildingData.address,
          postalCode: buildingData.codeINSEE?.substring(0, 5),
          coordinates: buildingData.coordinates
            ? {
                lat: buildingData.coordinates.lat,
                lng: buildingData.coordinates.lng,
              }
            : undefined,
          constructionYear: buildingData.constructionYear,
          buildingType: buildingData.buildingType,
          surface: buildingData.surface,
          dpeClass: buildingData.dpeClass && buildingData.dpeClass !== 'N/A' ? buildingData.dpeClass : undefined,
          dpeDate: buildingData.dpeDate ? new Date(buildingData.dpeDate) : undefined,
          energyConsumption: buildingData.energyConsumption,
          ghgEmissions: buildingData.ghgEmissions,
          hvd: buildingData.hvd || false,
          sourceUrl: buildingData.sources[0],
        },
      })

      return building.id
    } catch (error) {
      console.error('[RNBIndexer] Erreur indexation bâtiment:', error)
      return null
    }
  }

  /**
   * Indexe plusieurs bâtiments en batch (pour import progressif)
   */
  async indexBuildingsBatch(buildingsData: RNBBuildingData[]): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    // Traiter par batch de 100 pour éviter de surcharger la base
    const batchSize = 100
    for (let i = 0; i < buildingsData.length; i += batchSize) {
      const batch = buildingsData.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (buildingData) => {
          const result = await this.indexBuilding(buildingData)
          if (result) {
            success++
          } else {
            failed++
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
    const job = await prisma.rNBImportJob.create({
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
    }
  ): Promise<void> {
    await prisma.rNBImportJob.update({
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
  async getActiveImportJobs(): Promise<RNBImportProgress[]> {
    const jobs = await prisma.rNBImportJob.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return jobs.map((job) => ({
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
    const stats = await prisma.rNBBuilding.groupBy({
      by: ['department'],
      _count: {
        id: true,
      },
    })

    const result: Record<string, number> = {}
    stats.forEach((stat) => {
      result[stat.department] = stat._count.id
    })

    return result
  }

  /**
   * Convertit un modèle Prisma en RNBBuildingData
   */
  private mapToRNBBuildingData(building: any): RNBBuildingData {
    return {
      id: building.rnbId || building.id,
      constructionYear: building.constructionYear || undefined,
      buildingType: building.buildingType || undefined,
      surface: building.surface || undefined,
      dpeClass: (building.dpeClass as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'N/A') || undefined,
      dpeDate: building.dpeDate?.toISOString() || undefined,
      energyConsumption: building.energyConsumption || undefined,
      ghgEmissions: building.ghgEmissions || undefined,
      hvd: building.hvd || false,
      commune: building.commune || undefined,
      codeINSEE: building.codeINSEE || undefined,
      coordinates: building.coordinates
        ? {
            lat: building.coordinates.lat,
            lng: building.coordinates.lng,
          }
        : undefined,
      sources: building.sourceUrl ? [building.sourceUrl] : ['RNB Index Local'],
      lastUpdated: building.lastUpdated?.toISOString() || new Date().toISOString(),
    }
  }

  /**
   * Extrait le département depuis le code INSEE
   */
  private extractDepartment(codeINSEE: string): string {
    if (!codeINSEE || codeINSEE.length < 2) {
      return '00'
    }

    // DOM-TOM (971, 972, etc.)
    if (codeINSEE.length >= 3 && codeINSEE.startsWith('97')) {
      return codeINSEE.substring(0, 3)
    }

    return codeINSEE.substring(0, 2)
  }
}
