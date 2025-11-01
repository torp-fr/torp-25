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
  role?: 'PROPRIETAIRE' | 'LOCATAIRE' // Rôle : propriétaire (par défaut) ou locataire
  parentProfileId?: string // ID de la carte propriétaire (obligatoire si LOCATAIRE)
  lotNumber?: string // Numéro de lot/appartement (pour différencier appartements)
}

export interface BuildingProfileUpdateInput {
  name?: string
  customFields?: Record<string, any>
  notes?: string
  tenantData?: Record<string, any> // Données spécifiques locataire (uniquement pour cartes LOCATAIRE)
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
   * Contrôle l'unicité : une seule carte PROPRIETAIRE par bien (parcelle + section + lot)
   */
  async createProfile(input: BuildingProfileCreateInput) {
    try {
      const role = input.role || 'PROPRIETAIRE'

      // Si c'est une carte LOCATAIRE, vérifier que la carte propriétaire existe
      if (role === 'LOCATAIRE') {
        if (!input.parentProfileId) {
          throw new Error('Une carte LOCATAIRE doit être liée à une carte PROPRIETAIRE (parentProfileId requis)')
        }

        const parentProfile = await prisma.buildingProfile.findFirst({
          where: {
            id: input.parentProfileId,
            role: 'PROPRIETAIRE',
          },
        })

        if (!parentProfile) {
          throw new Error('Carte propriétaire non trouvée ou non autorisée')
        }

        // Vérifier que l'utilisateur n'a pas déjà une carte locataire pour ce bien
        const existingTenantProfile = await prisma.buildingProfile.findFirst({
          where: {
            userId: input.userId,
            parentProfileId: input.parentProfileId,
            role: 'LOCATAIRE',
          },
        })

        if (existingTenantProfile) {
          throw new Error('Vous avez déjà une carte locataire pour ce bien')
        }
      }

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

      // 2. Si PROPRIETAIRE, enrichir avec données cadastrales pour identifier le bien de façon unique
      let parcelleNumber: string | null = null
      let sectionCadastrale: string | null = null
      let lotNumber: string | null = input.lotNumber || null

      if (role === 'PROPRIETAIRE') {
        try {
          const cadastralData = await this.cadastreService.getCadastralData(addressData)
          if (cadastralData?.parcelle) {
            parcelleNumber = cadastralData.parcelle.numero || null
            sectionCadastrale = cadastralData.parcelle.section || null
          }
        } catch (error) {
          console.warn('[BuildingProfileService] Erreur récupération cadastrales pour vérification unicité:', error)
          // On continue quand même, l'enrichissement se fera après
        }

        // Vérifier l'unicité : une seule carte PROPRIETAIRE par bien
        if (parcelleNumber && sectionCadastrale) {
          const existingProfile = await prisma.buildingProfile.findFirst({
            where: {
              parcelleNumber,
              sectionCadastrale,
              lotNumber: lotNumber || null,
              role: 'PROPRIETAIRE',
            },
          })

          if (existingProfile) {
            throw new Error(
              `Une carte propriétaire existe déjà pour ce bien (parcelle ${parcelleNumber}, section ${sectionCadastrale}${lotNumber ? `, lot ${lotNumber}` : ''}). ` +
              `Seul le propriétaire peut créer une carte pour ce bien.`
            )
          }
        }
      } else {
        // Pour LOCATAIRE, récupérer les données depuis la carte parent
        const parentProfile = await prisma.buildingProfile.findUnique({
          where: { id: input.parentProfileId! },
        })
        if (parentProfile) {
          parcelleNumber = parentProfile.parcelleNumber || null
          sectionCadastrale = parentProfile.sectionCadastrale || null
          lotNumber = parentProfile.lotNumber || null
        }
      }

      // 3. Créer le profil avec les données de base
      const profile = await prisma.buildingProfile.create({
        data: {
          userId: input.userId,
          name: input.name || null,
          role,
          parentProfileId: role === 'LOCATAIRE' ? input.parentProfileId : null,
          address: addressData as any,
          coordinates: coordinates ? (coordinates as any) : null,
          parcelleNumber,
          sectionCadastrale,
          lotNumber,
          codeINSEE: addressData.department ? undefined : null,
          enrichmentStatus: role === 'PROPRIETAIRE' ? 'pending' : 'completed', // Locataire n'a pas besoin d'enrichissement
          enrichmentSources: [],
        },
      })

      // 4. L'enrichissement sera lancé explicitement par l'API /enrich après création
      // pour éviter les problèmes de timing et garantir qu'il démarre
      console.log('[BuildingProfileService] ✅ Profil créé:', profile.id, '- Enrichissement à lancer via API /enrich')

      return profile
    } catch (error) {
      console.error('[BuildingProfileService] Erreur création profil:', error)
      throw error
    }
  }

  /**
   * Enrichit automatiquement un profil avec toutes les données disponibles
   * Note: L'enrichissement est uniquement disponible pour les cartes PROPRIETAIRE
   */
  /**
   * Enrichit un profil selon le flux : Adresse → Parcelle → Bâti → Données associées
   */
  async enrichProfile(profileId: string): Promise<BuildingProfileEnrichmentResult> {
    try {
      const profile = await prisma.buildingProfile.findUnique({
        where: { id: profileId },
      })

      if (!profile) {
        throw new Error('Profil non trouvé')
      }

      // L'enrichissement n'est disponible que pour les cartes PROPRIETAIRE
      if (profile.role !== 'PROPRIETAIRE') {
        throw new Error('L\'enrichissement automatique n\'est disponible que pour les cartes PROPRIETAIRE')
      }

      // Mettre à jour le statut
      await prisma.buildingProfile.update({
        where: { id: profileId },
        data: { enrichmentStatus: 'in_progress' },
      })

      const addressData = profile.address as unknown as AddressData
      const sources: string[] = []
      const errors: string[] = []
      let enrichedData: any = {}

      console.log('[BuildingProfileService] 🏠 ÉTAPE 1: Adresse → Parcelle cadastrale')
      console.log('📍 Adresse:', addressData.formatted)

      // ============================================
      // ÉTAPE 1: ADRESSE → PARCELLE CADASTRALE
      // ============================================
      let cadastralData: CadastralData | null = null
      try {
        cadastralData = await this.cadastreService.getCadastralData(addressData)
        if (cadastralData?.parcelle) {
          console.log('✅ Parcelle identifiée:', cadastralData.parcelle.numero, 'Section:', cadastralData.parcelle.section)
          sources.push('Cadastre IGN')
          
          await prisma.buildingProfile.update({
            where: { id: profileId },
            data: {
              cadastralData: cadastralData as any,
              parcelleNumber: cadastralData.parcelle.numero || null,
              sectionCadastrale: cadastralData.parcelle.section || null,
              codeINSEE: cadastralData.codeINSEE || null,
            },
          })
          
          enrichedData.cadastre = cadastralData
        } else {
          console.warn('⚠️ Aucune parcelle identifiée pour cette adresse')
        }
      } catch (error) {
        console.error('❌ Erreur identification parcelle:', error)
        errors.push(`Parcelle: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      console.log('[BuildingProfileService] 🏗️ ÉTAPE 2: Parcelle → Bâti et données associées')

      // ============================================
      // ÉTAPE 2: PARCELLE → BÂTI ET DONNÉES ASSOCIÉES
      // ============================================
      try {
        console.log('📊 Récupération données agrégées du bâti...')
        const aggregatedData = await this.buildingService.getAggregatedData(addressData.formatted)
        
        if (aggregatedData) {
          console.log('✅ Données bâti récupérées:', {
            hasPLU: !!aggregatedData.plu,
            hasRNB: !!aggregatedData.rnb,
            hasDPE: !!aggregatedData.energy || !!aggregatedData.dpe,
            hasGeorisques: !!aggregatedData.georisques,
          })
          
          sources.push(...aggregatedData.sources)
          
          // Construire enrichedData progressivement
          enrichedData = {
            address: aggregatedData.address,
            ...enrichedData, // Conserver cadastre si déjà récupéré
            urbanism: aggregatedData.urbanism || null,
            building: aggregatedData.building || null,
            energy: aggregatedData.energy || aggregatedData.dpe || null,
            plu: aggregatedData.plu || null,
            rnb: aggregatedData.rnb || null,
            georisques: aggregatedData.georisques || null,
            sources: aggregatedData.sources || [],
            lastUpdated: new Date().toISOString(),
          }
          
          // Sauvegarder dans les champs séparés aussi
          await prisma.buildingProfile.update({
            where: { id: profileId },
            data: {
              enrichedData: enrichedData as any,
              pluData: aggregatedData.plu ? (aggregatedData.plu as any) : null,
              rnbData: aggregatedData.rnb ? (aggregatedData.rnb as any) : null,
              dpeData: aggregatedData.energy || aggregatedData.dpe ? ((aggregatedData.energy || aggregatedData.dpe) as any) : null,
              urbanismData: aggregatedData.urbanism ? (aggregatedData.urbanism as any) : null,
            },
          })
        } else {
          console.warn('⚠️ Aucune donnée bâti récupérée')
        }
      } catch (error) {
        console.error('❌ Erreur récupération données bâti:', error)
        errors.push(`Bâti: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      console.log('[BuildingProfileService] 💰 ÉTAPE 3: Valorisation (DVF)')

      // ============================================
      // ÉTAPE 3: VALORISATION (DVF)
      // ============================================
      try {
        const dvfData = await this.dvfService.getDVFData(addressData, {
          rayon: 1000,
          annee_min: new Date().getFullYear() - 5,
        })
        
        if (dvfData) {
          console.log('✅ Données DVF récupérées:', {
            hasEstimation: !!dvfData.estimation,
            hasStatistics: !!dvfData.statistics,
            hasComparables: !!dvfData.comparables?.length,
          })
          sources.push('DVF (Demandes de Valeurs Foncières)')
          enrichedData.dvf = dvfData
          
          await prisma.buildingProfile.update({
            where: { id: profileId },
            data: {
              enrichedData: enrichedData as any,
            },
          })
        } else {
          console.warn('⚠️ Aucune donnée DVF récupérée')
        }
      } catch (error) {
        console.error('❌ Erreur récupération DVF:', error)
        errors.push(`DVF: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      // ============================================
      // FINALISATION
      // ============================================
      const uniqueSources = Array.from(new Set(sources))
      const hasData = Object.keys(enrichedData).length > 1 // Plus que juste "address"
      
      console.log('[BuildingProfileService] ✅ Enrichissement terminé:', {
        sources: uniqueSources.length,
        hasData,
        errors: errors.length,
      })

      await prisma.buildingProfile.update({
        where: { id: profileId },
        data: {
          enrichmentStatus: errors.length > 0 && uniqueSources.length === 0 ? 'failed' : 'completed',
          enrichmentSources: uniqueSources,
          enrichmentErrors: errors.length > 0 ? (errors as any) : null,
          lastEnrichedAt: new Date(),
          // S'assurer que enrichedData est sauvegardé même si partiel
          enrichedData: Object.keys(enrichedData).length > 0 ? (enrichedData as any) : null,
        },
      })

      return {
        success: uniqueSources.length > 0 || hasData,
        sources: uniqueSources,
        errors: errors.length > 0 ? errors : undefined,
        enrichedAt: new Date(),
      }
    } catch (error) {
      console.error('[BuildingProfileService] ❌ Erreur enrichissement profil:', error)
      
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

    // Validation : tenantData uniquement pour cartes LOCATAIRE
    if (input.tenantData !== undefined && profile.role !== 'LOCATAIRE') {
      throw new Error('Les données tenantData sont uniquement disponibles pour les cartes LOCATAIRE')
    }

    const updateData: any = {}
    
    if (input.name !== undefined) updateData.name = input.name
    if (input.customFields !== undefined) updateData.customFields = input.customFields
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.tenantData !== undefined && profile.role === 'LOCATAIRE') {
      updateData.tenantData = input.tenantData
    }

    return prisma.buildingProfile.update({
      where: { id: profileId },
      data: updateData,
    })
  }

  /**
   * Crée une carte LOCATAIRE liée à une carte propriétaire
   */
  async createTenantProfile(
    parentProfileId: string,
    userId: string,
    name?: string
  ) {
    // Vérifier que la carte propriétaire existe
    const parentProfile = await prisma.buildingProfile.findFirst({
      where: {
        id: parentProfileId,
        role: 'PROPRIETAIRE',
      },
    })

    if (!parentProfile) {
      throw new Error('Carte propriétaire non trouvée')
    }

    // Vérifier que l'utilisateur n'a pas déjà une carte locataire pour ce bien
    const existingTenantProfile = await prisma.buildingProfile.findFirst({
      where: {
        userId,
        parentProfileId,
        role: 'LOCATAIRE',
      },
    })

    if (existingTenantProfile) {
      throw new Error('Vous avez déjà une carte locataire pour ce bien')
    }

    // Créer la carte locataire avec les mêmes données de base
    return prisma.buildingProfile.create({
      data: {
        userId,
        name: name || null,
        role: 'LOCATAIRE',
        parentProfileId,
        address: parentProfile.address as any,
        coordinates: parentProfile.coordinates as any,
        parcelleNumber: parentProfile.parcelleNumber,
        sectionCadastrale: parentProfile.sectionCadastrale,
        lotNumber: parentProfile.lotNumber,
        codeINSEE: parentProfile.codeINSEE,
        enrichmentStatus: 'completed', // Pas d'enrichissement pour locataire
        enrichmentSources: [],
        tenantData: {} as any, // Données vides initialement
      },
    })
  }

  /**
   * Récupère toutes les cartes locataires liées à une carte propriétaire
   */
  async getTenantProfiles(profileId: string, userId: string) {
    // Vérifier que le profil appartient à l'utilisateur et est une carte propriétaire
    const profile = await prisma.buildingProfile.findFirst({
      where: {
        id: profileId,
        userId,
        role: 'PROPRIETAIRE',
      },
    })

    if (!profile) {
      throw new Error('Profil non trouvé, non autorisé, ou n\'est pas une carte propriétaire')
    }

    return prisma.buildingProfile.findMany({
      where: {
        parentProfileId: profileId,
        role: 'LOCATAIRE',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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

