/**
 * Service d'indexation RGE (Reconnu Garant de l'Environnement)
 * Permet d'indexer progressivement les fichiers CSV/JSON volumineux dans une base de données locale
 * et de rechercher rapidement des certifications par SIRET
 */

import { prisma } from '@/lib/db'
import type { RGECertification } from './rge-service'

export interface RGESearchParams {
  siret?: string
  siren?: string
  department?: string
  postalCode?: string
  city?: string
  activity?: string // Domaine d'activité (chauffage, isolation, etc.)
  isValid?: boolean
}

export interface RGEImportProgress {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  totalRows?: number
  processedRows?: number
}

export class RGEIndexer {
  /**
   * Recherche une certification RGE dans l'index local par SIRET
   */
  async searchCertification(siret: string): Promise<RGECertification | null> {
    try {
      console.log(`[RGEIndexer] 🔍 Recherche certification RGE pour SIRET: ${siret}`)
      
      // Normaliser le SIRET
      const normalizedSiret = this.normalizeSiret(siret)
      if (!normalizedSiret) {
        console.warn('[RGEIndexer] ⚠️ SIRET invalide:', siret)
        return null
      }

      // Recherche exacte par SIRET
      const certification = await prisma.rGECertification.findUnique({
        where: { siret: normalizedSiret },
      })

      if (certification) {
        console.log(`[RGEIndexer] ✅ Certification trouvée dans l'index local`)
        return this.mapToRGECertification(certification)
      }

      // Si pas trouvé, essayer par SIREN (9 premiers chiffres)
      const siren = normalizedSiret.substring(0, 9)
      const certificationBySiren = await prisma.rGECertification.findFirst({
        where: { siren },
        orderBy: { indexedAt: 'desc' },
      })

      if (certificationBySiren) {
        console.log(`[RGEIndexer] ✅ Certification trouvée par SIREN dans l'index local`)
        return this.mapToRGECertification(certificationBySiren)
      }

      console.log(`[RGEIndexer] ℹ️ Aucune certification trouvée dans l'index local`)
      return null
    } catch (error) {
      console.error('[RGEIndexer] ❌ Erreur recherche certification:', error)
      return null
    }
  }

  /**
   * Recherche des certifications RGE par critères multiples
   */
  async searchCertifications(params: RGESearchParams): Promise<RGECertification[]> {
    try {
      const where: any = {}

      if (params.siret) {
        where.siret = this.normalizeSiret(params.siret)
      } else if (params.siren) {
        where.siren = params.siren.substring(0, 9)
      }

      if (params.department) {
        where.department = params.department
      }

      if (params.postalCode) {
        where.postalCode = params.postalCode.substring(0, 5)
      }

      if (params.city) {
        where.city = {
          contains: params.city,
          mode: 'insensitive',
        }
      }

      if (params.isValid !== undefined) {
        where.isValid = params.isValid
      }

      const certifications = await prisma.rGECertification.findMany({
        where,
        take: 100, // Limite pour éviter les résultats trop volumineux
        orderBy: {
          indexedAt: 'desc',
        },
      })

      return certifications.map((c) => this.mapToRGECertification(c))
    } catch (error) {
      console.error('[RGEIndexer] ❌ Erreur recherche certifications:', error)
      return []
    }
  }

  /**
   * Indexe une certification RGE dans la base de données
   */
  async indexCertification(certData: RGECertification): Promise<string | null> {
    try {
      const normalizedSiret = this.normalizeSiret(certData.siret)
      if (!normalizedSiret) {
        console.warn('[RGEIndexer] ⚠️ SIRET invalide pour indexation:', certData.siret)
        return null
      }

      const certification = await prisma.rGECertification.upsert({
        where: {
          siret: normalizedSiret,
        },
        update: {
          companyName: certData.companyName,
          address: certData.address?.formatted || certData.address?.street,
          postalCode: certData.address?.postalCode,
          city: certData.address?.city,
          department: this.extractDepartment(certData.address?.postalCode || ''),
          region: certData.address?.region,
          certificationNumber: certData.certificationNumber,
          certificationDate: certData.certificationDate ? new Date(certData.certificationDate) : undefined,
          expiryDate: certData.expiryDate ? new Date(certData.expiryDate) : undefined,
          isValid: certData.isValid,
          activities: certData.activities as any,
          lastUpdated: new Date(),
        },
        create: {
          siret: normalizedSiret,
          siren: certData.siren || normalizedSiret.substring(0, 9),
          companyName: certData.companyName,
          address: certData.address?.formatted || certData.address?.street,
          postalCode: certData.address?.postalCode,
          city: certData.address?.city,
          department: this.extractDepartment(certData.address?.postalCode || ''),
          region: certData.address?.region,
          certificationNumber: certData.certificationNumber,
          certificationDate: certData.certificationDate ? new Date(certData.certificationDate) : undefined,
          expiryDate: certData.expiryDate ? new Date(certData.expiryDate) : undefined,
          isValid: certData.isValid,
          activities: certData.activities as any,
          sourceUrl: certData.source || 'RGE data.gouv.fr',
        },
      })

      return certification.id
    } catch (error) {
      console.error('[RGEIndexer] ❌ Erreur indexation certification:', error)
      return null
    }
  }

  /**
   * Indexe plusieurs certifications en batch (pour import progressif)
   */
  async indexCertificationsBatch(
    certificationsData: RGECertification[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    // Traiter par batch de 100 pour éviter de surcharger la base
    const batchSize = 100
    for (let i = 0; i < certificationsData.length; i += batchSize) {
      const batch = certificationsData.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (certData) => {
          const result = await this.indexCertification(certData)
          if (result) {
            success++
          } else {
            failed++
          }
        })
      )

      // Log de progression
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= certificationsData.length) {
        console.log(`[RGEIndexer] 📊 Progression: ${Math.min(i + batchSize, certificationsData.length)}/${certificationsData.length} certifications traitées`)
      }
    }

    return { success, failed }
  }

  /**
   * Crée ou met à jour un job d'import
   */
  async createImportJob(
    resourceUrl: string,
    resourceId?: string,
    resourceTitle?: string,
    resourceFormat?: string
  ): Promise<string> {
    const job = await prisma.rGEImportJob.create({
      data: {
        resourceId,
        resourceUrl,
        resourceTitle,
        resourceFormat,
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
    await prisma.rGEImportJob.update({
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
  async getActiveImportJobs(): Promise<RGEImportProgress[]> {
    const jobs = await prisma.rGEImportJob.findMany({
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
      status: job.status.toLowerCase() as 'pending' | 'in_progress' | 'completed' | 'failed',
      progress: job.progress,
      totalRows: job.totalRows || undefined,
      processedRows: job.processedRows || undefined,
    }))
  }

  /**
   * Récupère les statistiques d'indexation
   */
  async getIndexingStats(): Promise<{
    total: number
    valid: number
    expired: number
    byDepartment: Record<string, number>
  }> {
    const [total, valid, expired] = await Promise.all([
      prisma.rGECertification.count(),
      prisma.rGECertification.count({ where: { isValid: true } }),
      prisma.rGECertification.count({
        where: {
          isValid: false,
          expiryDate: { lt: new Date() },
        },
      }),
    ])

    const stats = await prisma.rGECertification.groupBy({
      by: ['department'],
      _count: {
        id: true,
      },
    })

    const byDepartment: Record<string, number> = {}
    stats.forEach((stat) => {
      if (stat.department) {
        byDepartment[stat.department] = stat._count.id
      }
    })

    return {
      total,
      valid,
      expired,
      byDepartment,
    }
  }

  /**
   * Convertit un modèle Prisma en RGECertification
   */
  private mapToRGECertification(cert: any): RGECertification {
    return {
      siret: cert.siret,
      siren: cert.siren,
      companyName: cert.companyName || undefined,
      address: cert.address || cert.postalCode || cert.city
        ? {
            street: cert.address,
            postalCode: cert.postalCode || undefined,
            city: cert.city || undefined,
            department: cert.department || undefined,
            region: cert.region || undefined,
            formatted: cert.address || undefined,
          }
        : undefined,
      certificationNumber: cert.certificationNumber || undefined,
      certificationDate: cert.certificationDate?.toISOString() || undefined,
      expiryDate: cert.expiryDate?.toISOString() || undefined,
      isValid: cert.isValid,
      activities: (cert.activities as any) || [],
      source: cert.sourceUrl || 'RGE Index Local',
      verifiedAt: cert.indexedAt?.toISOString() || new Date().toISOString(),
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

  /**
   * Extrait le département depuis le code postal
   */
  private extractDepartment(postalCode: string): string {
    if (!postalCode || postalCode.length < 2) {
      return ''
    }

    // DOM-TOM (971, 972, etc.)
    if (postalCode.length >= 3 && postalCode.startsWith('97')) {
      return postalCode.substring(0, 3)
    }

    return postalCode.substring(0, 2)
  }
}
