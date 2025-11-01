/**
 * Service de génération de recommandations pour les cartes d'identité de logement
 * Analyse les données enrichies et génère des recommandations personnalisées
 */

import type { AggregatedBuildingData } from './external-apis/types'

export interface BuildingRecommendation {
  id: string
  priority: 'high' | 'medium' | 'low'
  category: 
    | 'energy' 
    | 'safety' 
    | 'maintenance' 
    | 'valuation' 
    | 'compliance' 
    | 'documentation'
    | 'risk'
  title: string
  description: string
  actionable: boolean
  estimatedCost?: number
  estimatedImpact?: 'high' | 'medium' | 'low'
  deadline?: string // Date limite si applicable
  relatedData?: any // Données sources de la recommandation
}

export interface BuildingNotification {
  id: string
  type: 'info' | 'warning' | 'alert' | 'success'
  category: 'dpe' | 'document' | 'enrichment' | 'maintenance' | 'risk' | 'deadline'
  title: string
  message: string
  actionUrl?: string
  createdAt: string
  read: boolean
}

export class BuildingRecommendationsService {
  /**
   * Génère des recommandations basées sur les données enrichies d'un logement
   */
  generateRecommendations(enrichedData: any, dpeData: any, riskData: any): BuildingRecommendation[] {
    const recommendations: BuildingRecommendation[] = []

    // 1. Recommandations basées sur le DPE
    if (dpeData) {
      const dpeClass = dpeData.dpeClass
      const energyConsumption = dpeData.energyConsumption

      if (['E', 'F', 'G'].includes(dpeClass)) {
        recommendations.push({
          id: 'dpe-low-1',
          priority: 'high',
          category: 'energy',
          title: 'Classe énergétique faible détectée',
          description: `Votre logement a une classe énergétique ${dpeClass}, ce qui peut impacter sa valeur et votre confort. Des travaux de rénovation énergétique sont fortement recommandés.`,
          actionable: true,
          estimatedImpact: 'high',
          relatedData: { dpeClass, energyConsumption },
        })
      }

      if (energyConsumption && energyConsumption > 330) {
        recommendations.push({
          id: 'dpe-consumption-1',
          priority: 'high',
          category: 'energy',
          title: 'Consommation énergétique élevée',
          description: `Votre logement consomme ${energyConsumption} kWh/m²/an. Des travaux d'isolation et de modernisation du système de chauffage peuvent réduire significativement cette consommation.`,
          actionable: true,
          estimatedImpact: 'high',
          relatedData: { energyConsumption },
        })
      }

      if (dpeData.recommendations && dpeData.recommendations.length > 0) {
        dpeData.recommendations.forEach((rec: string, idx: number) => {
          recommendations.push({
            id: `dpe-rec-${idx}`,
            priority: 'medium',
            category: 'energy',
            title: 'Recommandation DPE',
            description: rec,
            actionable: true,
            estimatedImpact: 'medium',
          })
        })
      }
    }

    // 2. Recommandations basées sur les risques (Géorisques)
    if (riskData) {
      // Risques d'inondation
      if (riskData.tri && riskData.tri.length > 0) {
        recommendations.push({
          id: 'risk-flood-1',
          priority: 'high',
          category: 'risk',
          title: 'Zone à risque d\'inondation',
          description: 'Votre logement est situé dans un Territoire à Risques importants d\'Inondation (TRI). Il est recommandé de vérifier votre assurance et de mettre en place des mesures de prévention.',
          actionable: true,
          estimatedImpact: 'high',
          relatedData: { riskType: 'flood', tri: riskData.tri },
        })
      }

      // Mouvements de terrain
      if (riskData.mvt && riskData.mvt.length > 0) {
        recommendations.push({
          id: 'risk-ground-1',
          priority: 'medium',
          category: 'risk',
          title: 'Risque de mouvement de terrain',
          description: 'Des mouvements de terrain ont été identifiés dans votre secteur. Il est recommandé de faire réaliser une étude géotechnique avant tout projet de construction ou d\'extension.',
          actionable: true,
          estimatedImpact: 'medium',
          relatedData: { riskType: 'ground_movement', mvt: riskData.mvt },
        })
      }

      // Retrait-gonflement des argiles
      if (riskData.rga && riskData.rga.potentiel && riskData.rga.potentiel !== 'faible') {
        recommendations.push({
          id: 'risk-clay-1',
          priority: 'medium',
          category: 'risk',
          title: `Risque argile ${riskData.rga.potentiel}`,
          description: 'Votre secteur présente un risque de retrait-gonflement des argiles. Des fondations adaptées sont essentielles pour tout nouveau projet.',
          actionable: true,
          estimatedImpact: 'medium',
          relatedData: { riskType: 'clay', potentiel: riskData.rga.potentiel },
        })
      }

      // Radon
      if (riskData.radon && riskData.radon.classe && riskData.radon.classe > 1) {
        recommendations.push({
          id: 'risk-radon-1',
          priority: 'high',
          category: 'safety',
          title: 'Présence de radon détectée',
          description: `Votre commune est classée en catégorie ${riskData.radon.classe} pour le radon. Il est recommandé de faire mesurer la concentration de radon dans votre logement et d'installer un système de ventilation si nécessaire.`,
          actionable: true,
          estimatedImpact: 'high',
          relatedData: { riskType: 'radon', classe: riskData.radon.classe },
        })
      }
    }

    // 3. Recommandations basées sur l'estimation DVF
    if (enrichedData?.dvf?.estimation) {
      const estimation = enrichedData.dvf.estimation
      const prixM2 = estimation.prix_m2_estime
      const statistiques = enrichedData.dvf.statistics

      if (statistiques?.prix_m2_median && prixM2) {
        const ecart = ((prixM2 - statistiques.prix_m2_median) / statistiques.prix_m2_median) * 100
        
        if (ecart < -15) {
          recommendations.push({
            id: 'dvf-underprice-1',
            priority: 'medium',
            category: 'valuation',
            title: 'Valeur sous-évaluée',
            description: `Votre bien est estimé ${Math.abs(ecart).toFixed(0)}% en dessous du prix médian du secteur. Des travaux de rénovation pourraient augmenter significativement sa valeur.`,
            actionable: true,
            estimatedImpact: 'high',
            relatedData: { ecart, prixM2, prixMedian: statistiques.prix_m2_median },
          })
        }
      }

      if (estimation.confiance && estimation.confiance < 50) {
        recommendations.push({
          id: 'dvf-low-confidence-1',
          priority: 'low',
          category: 'valuation',
          title: 'Estimation peu précise',
          description: `L'estimation actuelle a un niveau de confiance de ${estimation.confiance}%. Pour une estimation plus précise, il est recommandé de faire appel à un professionnel.`,
          actionable: true,
          estimatedImpact: 'low',
          relatedData: { confiance: estimation.confiance },
        })
      }
    }

    // 4. Recommandations basées sur les données cadastrales
    if (enrichedData?.cadastre?.constraints) {
      const constraints = enrichedData.cadastre.constraints

      if (constraints.isFloodZone) {
        recommendations.push({
          id: 'cadastre-flood-1',
          priority: 'high',
          category: 'risk',
          title: 'Zone inondable cadastrale',
          description: 'Votre parcelle est située en zone inondable selon les données cadastrales. Vérifiez votre assurance et les obligations réglementaires.',
          actionable: true,
          estimatedImpact: 'high',
          relatedData: { constraintType: 'flood_zone' },
        })
      }

      if (constraints.hasRisk) {
        recommendations.push({
          id: 'cadastre-risk-1',
          priority: 'medium',
          category: 'risk',
          title: 'Contraintes cadastrales identifiées',
          description: 'Des contraintes ont été identifiées sur votre parcelle. Consultez les détails et les obligations réglementaires avant tout projet.',
          actionable: true,
          estimatedImpact: 'medium',
          relatedData: { constraints },
        })
      }
    }

    // 5. Recommandations générales de maintenance
    recommendations.push({
      id: 'maintenance-general-1',
      priority: 'low',
      category: 'maintenance',
      title: 'Maintenance préventive recommandée',
      description: 'Il est recommandé d\'effectuer une inspection annuelle de votre logement pour identifier les travaux de maintenance nécessaires.',
      actionable: true,
      estimatedImpact: 'medium',
    })

    // 6. Recommandations documentation
    recommendations.push({
      id: 'doc-general-1',
      priority: 'medium',
      category: 'documentation',
      title: 'Compléter votre dossier',
      description: 'Ajoutez les documents importants (titre de propriété, DPE, assurances) pour avoir un dossier complet et à jour.',
      actionable: true,
      estimatedImpact: 'low',
    })

    return recommendations
  }

  /**
   * Génère des notifications basées sur l'état du profil
   */
  generateNotifications(
    profile: any,
    documents: any[]
  ): BuildingNotification[] {
    const notifications: BuildingNotification[] = []
    const now = new Date()

    // 1. Notification DPE
    if (profile.dpeData) {
      const dpeDate = profile.dpeData.dpeDate
      if (dpeDate) {
        const date = new Date(dpeDate)
        const ageInYears = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365)
        
        if (ageInYears > 10) {
          notifications.push({
            id: 'dpe-expired-1',
            type: 'warning',
            category: 'dpe',
            title: 'DPE expiré',
            message: `Votre DPE date de ${Math.floor(ageInYears)} ans. Il est recommandé de le renouveler (validité 10 ans).`,
            createdAt: now.toISOString(),
            read: false,
          })
        } else if (ageInYears > 8) {
          notifications.push({
            id: 'dpe-expiring-1',
            type: 'info',
            category: 'dpe',
            title: 'DPE à renouveler bientôt',
            message: `Votre DPE expire dans ${Math.floor(10 - ageInYears)} ans.`,
            createdAt: now.toISOString(),
            read: false,
          })
        }
      }
    } else {
      notifications.push({
        id: 'dpe-missing-1',
        type: 'info',
        category: 'dpe',
        title: 'DPE non disponible',
        message: 'Aucun DPE n\'a été trouvé pour ce logement. Vous pouvez en ajouter un dans les documents.',
        actionUrl: '#documents',
        createdAt: now.toISOString(),
        read: false,
      })
    }

    // 2. Notifications documents expirant
    documents.forEach((doc) => {
      if (doc.expirationDate) {
        const expDate = new Date(doc.expirationDate)
        const daysUntilExpiry = (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

        if (daysUntilExpiry < 0) {
          notifications.push({
            id: `doc-expired-${doc.id}`,
            type: 'alert',
            category: 'document',
            title: `${doc.fileName} expiré`,
            message: `Le document "${doc.fileName}" a expiré le ${expDate.toLocaleDateString('fr-FR')}.`,
            actionUrl: '#documents',
            createdAt: now.toISOString(),
            read: false,
          })
        } else if (daysUntilExpiry <= 30) {
          notifications.push({
            id: `doc-expiring-${doc.id}`,
            type: 'warning',
            category: 'document',
            title: `${doc.fileName} expire bientôt`,
            message: `Le document "${doc.fileName}" expire dans ${Math.floor(daysUntilExpiry)} jours.`,
            actionUrl: '#documents',
            createdAt: now.toISOString(),
            read: false,
          })
        }
      }
    })

    // 3. Notification enrichissement
    if (profile.enrichmentStatus === 'completed') {
      notifications.push({
        id: 'enrichment-completed-1',
        type: 'success',
        category: 'enrichment',
        title: 'Enrichissement terminé',
        message: `L'enrichissement de votre logement est terminé. ${profile.enrichmentSources.length} source(s) de données ont été utilisées.`,
        createdAt: profile.lastEnrichedAt || now.toISOString(),
        read: false,
      })
    } else if (profile.enrichmentStatus === 'failed') {
      notifications.push({
        id: 'enrichment-failed-1',
        type: 'warning',
        category: 'enrichment',
        title: 'Enrichissement échoué',
        message: 'L\'enrichissement automatique a rencontré des erreurs. Vous pouvez réessayer.',
        actionUrl: '#refresh',
        createdAt: now.toISOString(),
        read: false,
      })
    } else if (profile.enrichmentStatus === 'in_progress') {
      notifications.push({
        id: 'enrichment-progress-1',
        type: 'info',
        category: 'enrichment',
        title: 'Enrichissement en cours',
        message: 'Les données de votre logement sont en cours d\'enrichissement...',
        createdAt: now.toISOString(),
        read: false,
      })
    }

    // 4. Notifications risques importants
    if (profile.enrichedData?.georisques) {
      const risks = profile.enrichedData.georisques
      if (risks.tri && risks.tri.length > 0) {
        notifications.push({
          id: 'risk-flood-notif-1',
          type: 'alert',
          category: 'risk',
          title: 'Zone à risque d\'inondation',
          message: 'Votre logement est situé dans une zone à risque d\'inondation. Consultez les recommandations pour plus d\'informations.',
          actionUrl: '#recommendations',
          createdAt: now.toISOString(),
          read: false,
        })
      }
    }

    return notifications.sort((a, b) => {
      // Trier par priorité : alert > warning > info > success
      const priority = { alert: 4, warning: 3, info: 2, success: 1 }
      return (priority[b.type] || 0) - (priority[a.type] || 0)
    })
  }
}

