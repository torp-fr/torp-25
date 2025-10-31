/**
 * Service pour gérer les cartes d'identité de logement (Building Profiles)
 * 
 * Fonctionnalités :
 * - Création de profils depuis une adresse
 * - Enrichissement automatique avec toutes les APIs disponibles
 * - Mise à jour des données enrichies
 */

import { prisma } from '@/lib/db'
import { AddressService } from './external-apis/address-service'
import { BuildingService } from './external-apis/building-service'
import { CadastreService } from './external-apis/cadastre-service'
import { DVFService } from './external-apis/dvf-service'
import type { AddressData, AggregatedBuildingData } from './external-apis/types'
import type { CadastralData } from './external-apis/cadastre-service'

export interface BuildingProfileCreateInput {
  userId: string
  name?: string
  address: string // Adresse textuelle pour recherche
  coordinates?: { lat: number; lng: number }
}

export interface BuildingProfileUpdateInput {
  name?: string
  customFields?: Record<string, any>
  notes?: string
}

export interface BuildingProfileEnrichmentResult {
  success: boolean
  sources: string[]
  errors?: string[]
  enrichedAt: Date
}

export class BuildingProfileService {
  private addressService: AddressService
  private buildingService: BuildingService
  private cadastreService: CadastreService
  private dvfService: DVFService

  constructor() {
    this.addressService = new AddressService()
    this.buildingService = new BuildingService()
    this.cadastreService = new CadastreService()
    this.dvfService = new DVFService()
  }

  /**
   * Crée un nouveau profil de logement depuis une adresse
   */
  async createProfile(input: BuildingProfileCreateInput) {
    try {
      // 1. Résoudre l'adresse
      let addressData: AddressData
      let coordinates = input.coordinates

      if (coordinates) {
        // Géocodage inverse depuis coordonnées
        const reverseGeocode = await this.addressService.reverseGeocode(coordinates.lat, coordinates.lng)
        if (!reverseGeocode) {
          throw new Error('Impossible de résoudre l\'adresse depuis les coordonnées')
        }
        addressData = reverseGeocode
      } else {
        // Recherche depuis texte
        const addresses = await this.addressService.searchAddress(input.address)
        if (addresses.length === 0) {
          throw new Error('Adresse non trouvée')
        }
        addressData = addresses[0]
        coordinates = addressData.coordinates
      }

      // 2. Créer le profil avec les données de base
      const profile = await prisma.buildingProfile.create({
        data: {
          userId: input.userId,
          name: input.name || null,
          address: addressData as any,
          coordinates: coordinates ? (coordinates as any) : null,
          parcelleNumber: null,
          sectionCadastrale: null,
          codeINSEE: addressData.department ? undefined : null,
          enrichmentStatus: 'pending',
          enrichmentSources: [],
        },
      })

      // 3. Lancer l'enrichissement en arrière-plan (non-bloquant)
      this.enrichProfile(profile.id).catch((error) => {
        console.error('[BuildingProfileService] Erreur enrichissement initial:', error)
      })

      return profile
    } catch (error) {
      console.error('[BuildingProfileService] Erreur création profil:', error)
      throw error
    }
  }

  /**
   * Enrichit automatiquement un profil avec toutes les données disponibles
   */
  async enrichProfile(profileId: string): Promise<BuildingProfileEnrichmentResult> {
    try {
      const profile = await prisma.buildingProfile.findUnique({
        where: { id: profileId },
      })

      if (!profile) {
        throw new Error('Profil non trouvé')
      }

      // Mettre à jour le statut
      await prisma.buildingProfile.update({
        where: { id: profileId },
        data: { enrichmentStatus: 'in_progress' },
      })

      const addressData = profile.address as unknown as AddressData
      const sources: string[] = []
      const errors: string[] = []

      // 1. Enrichissement via BuildingService (agrégation complète)
      let aggregatedData: AggregatedBuildingData | null = null
      try {
        aggregatedData = await this.buildingService.getAggregatedData(addressData.formatted)
        if (aggregatedData) {
          sources.push(...aggregatedData.sources)
          await prisma.buildingProfile.update({
            where: { id: profileId },
            data: {
              enrichedData: aggregatedData as any,
              pluData: aggregatedData.plu ? (aggregatedData.plu as any) : null,
              rnbData: aggregatedData.rnb ? (aggregatedData.rnb as any) : null,
              dpeData: aggregatedData.energy ? (aggregatedData.energy as any) : null,
              urbanismData: aggregatedData.urbanism ? (aggregatedData.urbanism as any) : null,
            },
          })
        }
      } catch (error) {
        console.error('[BuildingProfileService] Erreur enrichissement BuildingService:', error)
        errors.push(`Enrichissement bâti: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // 2. Enrichissement cadastral détaillé
      let cadastralData: CadastralData | null = null
      try {
        cadastralData = await this.cadastreService.getCadastralData(addressData)
        if (cadastralData) {
          sources.push('Cadastre IGN')
          const parcelle = cadastralData.parcelle
          
          await prisma.buildingProfile.update({
            where: { id: profileId },
            data: {
              cadastralData: cadastralData as any,
              parcelleNumber: parcelle?.numero || null,
              sectionCadastrale: parcelle?.section || null,
              codeINSEE: cadastralData.codeINSEE || null,
            },
          })
        }
      } catch (error) {
        console.error('[BuildingProfileService] Erreur enrichissement cadastral:', error)
        errors.push(`Enrichissement cadastral: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // 3. Enrichissement DVF (valeurs foncières pour estimation et comparaison)
      try {
        const dvfData = await this.dvfService.getDVFData(addressData, {
          rayon: 1000, // 1km de rayon
          annee_min: new Date().getFullYear() - 5, // 5 dernières années
        })
        
        if (dvfData) {
          sources.push('DVF (Demandes de Valeurs Foncières)')
          
          // Mettre à jour le profil avec les données DVF dans enrichedData
          const currentEnriched = await prisma.buildingProfile.findUnique({
            where: { id: profileId },
            select: { enrichedData: true },
          })
          
          const enrichedData = currentEnriched?.enrichedData as any || {}
          enrichedData.dvf = dvfData
          
          await prisma.buildingProfile.update({
            where: { id: profileId },
            data: {
              enrichedData: enrichedData as any,
            },
          })
        }
      } catch (error) {
        console.error('[BuildingProfileService] Erreur enrichissement DVF:', error)
        errors.push(`Enrichissement DVF: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // 4. Mettre à jour le statut final
      const uniqueSources = Array.from(new Set(sources))
      await prisma.buildingProfile.update({
        where: { id: profileId },
        data: {
          enrichmentStatus: errors.length > 0 && uniqueSources.length === 0 ? 'failed' : 'completed',
          enrichmentSources: uniqueSources,
          enrichmentErrors: errors.length > 0 ? (errors as any) : null,
          lastEnrichedAt: new Date(),
        },
      })

      return {
        success: uniqueSources.length > 0,
        sources: uniqueSources,
        errors: errors.length > 0 ? errors : undefined,
        enrichedAt: new Date(),
      }
    } catch (error) {
      console.error('[BuildingProfileService] Erreur enrichissement profil:', error)
      
      await prisma.buildingProfile.update({
        where: { id: profileId },
        data: {
          enrichmentStatus: 'failed',
          enrichmentErrors: [error instanceof Error ? error.message : 'Unknown error'] as any,
        },
      })

      throw error
    }
  }

  /**
   * Met à jour un profil
   */
  async updateProfile(profileId: string, userId: string, input: BuildingProfileUpdateInput) {
    // Vérifier que le profil appartient à l'utilisateur
    const profile = await prisma.buildingProfile.findFirst({
      where: { id: profileId, userId },
    })

    if (!profile) {
      throw new Error('Profil non trouvé ou non autorisé')
    }

    return prisma.buildingProfile.update({
      where: { id: profileId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.customFields !== undefined && { customFields: input.customFields as any }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    })
  }

  /**
   * Récupère tous les profils d'un utilisateur
   */
  async getUserProfiles(userId: string) {
    return prisma.buildingProfile.findMany({
      where: { userId },
      include: {
        buildingDocuments: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Limiter pour la liste principale
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  }

  /**
   * Récupère un profil par son ID
   */
  async getProfileById(profileId: string, userId: string) {
    const profile = await prisma.buildingProfile.findFirst({
      where: { id: profileId, userId },
      include: {
        buildingDocuments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!profile) {
      throw new Error('Profil non trouvé ou non autorisé')
    }

    return profile
  }

  /**
   * Supprime un profil
   */
  async deleteProfile(profileId: string, userId: string) {
    const profile = await prisma.buildingProfile.findFirst({
      where: { id: profileId, userId },
    })

    if (!profile) {
      throw new Error('Profil non trouvé ou non autorisé')
    }

    // Les documents seront supprimés automatiquement via onDelete: Cascade
    await prisma.buildingProfile.delete({
      where: { id: profileId },
    })

    return { success: true }
  }

  /**
   * Relance l'enrichissement d'un profil
   */
  async refreshEnrichment(profileId: string, userId: string) {
    const profile = await prisma.buildingProfile.findFirst({
      where: { id: profileId, userId },
    })

    if (!profile) {
      throw new Error('Profil non trouvé ou non autorisé')
    }

    return this.enrichProfile(profileId)
  }
}

