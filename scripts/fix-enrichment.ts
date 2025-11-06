/**
 * Script de diagnostic et correction de l'enrichissement
 * Lance manuellement l'enrichissement pour un profil donné
 */

import { BuildingProfileService } from '../services/building-profile-service'
import { prisma } from '../lib/db'

async function main() {
  console.log('🔍 Recherche du dernier profil logement créé...')

  // Trouver le dernier profil créé
  const profile = await prisma.buildingProfile.findFirst({
    where: {
      userId: 'demo-user-id',
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!profile) {
    console.error('❌ Aucun profil trouvé')
    process.exit(1)
  }

  console.log('✅ Profil trouvé:', {
    id: profile.id,
    name: profile.name || 'Sans nom',
    address: (profile.address as any)?.formatted || 'Non renseignée',
    enrichmentStatus: profile.enrichmentStatus,
    hasEnrichedData: !!profile.enrichedData,
    createdAt: profile.createdAt,
  })

  console.log('\n🚀 Lancement enrichissement...\n')

  const service = new BuildingProfileService()

  try {
    const startTime = Date.now()
    const result = await service.enrichProfile(profile.id)
    const duration = Date.now() - startTime

    console.log('\n✅ Enrichissement terminé en', (duration / 1000).toFixed(2), 'secondes')
    console.log('\n📊 Résultat:', {
      success: result.success,
      sources: result.sources,
      errorsCount: result.errors?.length || 0,
      errors: result.errors,
    })

    // Récupérer le profil mis à jour
    const updatedProfile = await prisma.buildingProfile.findUnique({
      where: { id: profile.id },
    })

    if (updatedProfile?.enrichedData) {
      const enrichedData = updatedProfile.enrichedData as any
      console.log('\n📦 Données enrichies:', {
        keys: Object.keys(enrichedData),
        hasCadastre: !!enrichedData.cadastre,
        hasRNB: !!enrichedData.rnb,
        hasDPE: !!enrichedData.dpe || !!enrichedData.energy,
        hasGeorisques: !!enrichedData.georisques,
        hasDVF: !!enrichedData.dvf,
        hasAddress: !!enrichedData.address,
      })

      // Afficher les données RNB si disponibles
      if (enrichedData.rnb) {
        console.log('\n🏠 Données RNB:',{
          constructionYear: enrichedData.rnb.constructionYear,
          buildingType: enrichedData.rnb.buildingType,
          surface: enrichedData.rnb.surface,
          dpeClass: enrichedData.rnb.dpeClass,
          energyConsumption: enrichedData.rnb.energyConsumption,
          sources: enrichedData.rnb.sources,
        })
      }

      // Afficher les données cadastre
      if (enrichedData.cadastre) {
        console.log('\n📐 Données cadastre:', {
          commune: enrichedData.cadastre.commune,
          codeINSEE: enrichedData.cadastre.codeINSEE,
          parcelle: enrichedData.cadastre.parcelle?.numero,
          section: enrichedData.cadastre.parcelle?.section,
          surface: enrichedData.cadastre.parcelle?.surface,
        })
      }

      // Afficher les risques
      if (enrichedData.georisques) {
        console.log('\n⚠️ Risques (Géorisques):', {
          hasData: !!enrichedData.georisques,
          keys: enrichedData.georisques ? Object.keys(enrichedData.georisques) : [],
        })
      }

      // Afficher estimation DVF
      if (enrichedData.dvf) {
        console.log('\n💰 Valorisation (DVF):', {
          estimation: enrichedData.dvf.estimation,
          pricePerSqm: enrichedData.dvf.pricePerSqm,
          confidence: enrichedData.dvf.confidence,
        })
      }
    } else {
      console.warn('\n⚠️ Pas de données enrichedData après enrichissement')
    }

    console.log('\n✅ Enrichissement terminé avec succès!')
    console.log('\n👉 Rafraîchissez la page dans votre navigateur pour voir les données\n')
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'enrichissement:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
