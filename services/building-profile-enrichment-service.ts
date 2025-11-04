/**
 * Service d'enrichissement et de présentation des données de logement
 * Transforme les données techniques en informations lisibles pour l'utilisateur
 * Masque les sources et met en avant les résultats
 */

import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export interface BuildingCharacteristic {
  id: string
  category: 
    | 'risques' 
    | 'energie' 
    | 'cadastre' 
    | 'valorisation' 
    | 'urbanisme' 
    | 'environnement'
    | 'structure'
    | 'documentation'
  label: string // Libellé lisible (ex: "Zone inondable", "Classe DPE")
  value: string | number | boolean | null // Valeur actuelle
  valueDisplay: string // Affichage formaté de la valeur
  status: 'known' | 'unknown' | 'partial' // État de la donnée
  editable: boolean // Peut être modifié manuellement
  priority: 'high' | 'medium' | 'low' // Priorité d'affichage
  unit?: string // Unité (€, m², %, etc.)
  icon?: string // Nom de l'icône Lucide
  description?: string // Description explicative
  recommendation?: string // Recommandation associée
}

export class BuildingProfileEnrichmentService {
  /**
   * Transforme les données techniques en caractéristiques lisibles
   * @param enrichedData - Données enrichies complètes (AggregatedBuildingData)
   * @param profileDpeData - Données DPE du profil (si stockées séparément)
   * @param profileRiskData - Données de risque du profil (si stockées séparément)
   * @param profileCadastralData - Données cadastrales du profil (si stockées séparément)
   * @param profileDvfData - Données DVF du profil (si stockées séparément)
   */
  extractCharacteristics(
    enrichedData: any = {}, 
    profileDpeData: any = null, 
    profileRiskData: any = null, 
    profileCadastralData: any = null, 
    profileDvfData: any = null
  ): BuildingCharacteristic[] {
    // NORMALISATION : S'assurer qu'enrichedData est un objet
    if (!enrichedData || typeof enrichedData !== 'object' || Array.isArray(enrichedData)) {
      log.warn({
        type: typeof enrichedData,
        isArray: Array.isArray(enrichedData),
      }, 'enrichedData invalide, normalisation')
      enrichedData = enrichedData && typeof enrichedData === 'object' && !Array.isArray(enrichedData) ? enrichedData : {}
    }

    log.debug({
      hasEnrichedData: !!enrichedData && Object.keys(enrichedData).length > 0,
      enrichedDataKeys: enrichedData ? Object.keys(enrichedData) : [],
      enrichedDataAddress: enrichedData?.address?.formatted || enrichedData?.address || 'pas d\'adresse',
      enrichedDataStructure: enrichedData ? {
        hasCadastre: !!enrichedData.cadastre,
        hasPLU: !!enrichedData.plu,
        hasRNB: !!enrichedData.rnb,
        hasEnergy: !!enrichedData.energy,
        hasDpe: !!enrichedData.dpe,
        hasGeorisques: !!enrichedData.georisques,
        hasDVF: !!enrichedData.dvf,
        hasAddress: !!enrichedData.address,
      } : {},
      hasDPEData: !!profileDpeData,
      hasRiskData: !!profileRiskData,
      hasCadastralData: !!profileCadastralData,
      hasDvfData: !!profileDvfData,
    }, 'Extraction caractéristiques')
    
    // Utiliser les données du profil si disponibles, sinon celles de enrichedData
    // DPE peut être dans plusieurs endroits : profileDpeData, enrichedData.energy, enrichedData.dpe, ou enrichedData.rnb
    let dpeData = profileDpeData || enrichedData?.energy || enrichedData?.dpe
    // Si pas de DPE mais RNB disponible, utiliser RNB pour DPE
    if (!dpeData && enrichedData?.rnb) {
      const rnb = enrichedData.rnb as any
      if (rnb.dpeClass || rnb.energyConsumption) {
        dpeData = {
          dpeClass: rnb.dpeClass && rnb.dpeClass !== 'N/A' ? rnb.dpeClass : undefined,
          dpeDate: rnb.dpeDate,
          energyConsumption: rnb.energyConsumption,
          ghgEmissions: rnb.ghgEmissions,
        }
      }
    }
    
    // Risques
    const riskData = profileRiskData || enrichedData?.georisques
    
    // Cadastre
    const cadastralData = profileCadastralData || enrichedData?.cadastre
    
    // DVF
    const dvfData = profileDvfData || enrichedData?.dvf
    
    // RNB pour données structure (année, surface, type)
    const rnbData = enrichedData?.rnb
    
    log.debug({
      hasDpeData: !!dpeData,
      dpeDataKeys: dpeData ? Object.keys(dpeData) : [],
      dpeClass: dpeData?.dpeClass,
      energyConsumption: dpeData?.energyConsumption,
      hasRiskData: !!riskData,
      riskDataKeys: riskData ? Object.keys(riskData) : [],
      hasCadastralData: !!cadastralData,
      cadastralDataKeys: cadastralData ? Object.keys(cadastralData) : [],
      hasDvfData: !!dvfData,
      dvfDataKeys: dvfData ? Object.keys(dvfData) : [],
      hasRnbData: !!rnbData,
      rnbDataKeys: rnbData ? Object.keys(rnbData) : [],
    })
    
    // Surface habitable (calculée une seule fois, utilisée dans STRUCTURE et VALORISATION)
    const surface = enrichedData?.rnb?.surface || 
                    rnbData?.surface ||
                    enrichedData?.rnb?.surface_habitable ||
                    enrichedData?.building?.surface ||
                    dpeData?.surface
    
    const characteristics: BuildingCharacteristic[] = []

    // ============================================
    // CATÉGORIE : RISQUES
    // ============================================
    
    // Zone inondable
    const hasTri = riskData?.tri && Array.isArray(riskData.tri) && riskData.tri.length > 0
    const hasAzi = riskData?.azi && Array.isArray(riskData.azi) && riskData.azi.length > 0
    const hasPapi = riskData?.papi && Array.isArray(riskData.papi) && riskData.papi.length > 0
    const hasCadastralFlood = cadastralData?.constraints?.isFloodZone === true
    
    const isFloodZone = hasTri || hasAzi || hasPapi || hasCadastralFlood
    const hasFloodData = hasTri || hasAzi || hasPapi || cadastralData?.constraints?.isFloodZone !== undefined
    
    characteristics.push({
      id: 'risk-flood',
      category: 'risques',
      label: 'Zone inondable',
      value: isFloodZone,
      valueDisplay: hasFloodData ? (isFloodZone ? 'Oui' : 'Non') : 'Non renseignée',
      status: hasFloodData ? 'known' : 'unknown',
      editable: true,
      priority: 'high',
      icon: 'AlertTriangle',
      description: hasFloodData 
        ? (isFloodZone ? 'Le terrain est situé en zone à risque d\'inondation' : 'Aucun risque d\'inondation identifié')
        : 'Risque d\'inondation à renseigner',
    })

    // Exposition au radon
    const radonClass = riskData?.radon?.classe
    if (radonClass !== undefined) {
      const radonLabels: Record<number, string> = {
        1: 'Zone 1 - Faible',
        2: 'Zone 2 - Modérée',
        3: 'Zone 3 - Élevée',
      }
      characteristics.push({
        id: 'risk-radon',
        category: 'risques',
        label: 'Exposition au radon',
        value: radonClass,
        valueDisplay: radonLabels[radonClass] || `Zone ${radonClass}`,
        status: 'known',
        editable: true,
        priority: 'high',
        icon: 'AlertTriangle',
        description: `Commune classée en zone ${radonClass} pour l'exposition au radon`,
        recommendation: radonClass >= 2 ? 'Mesure de la concentration recommandée' : undefined,
      })
    } else {
      characteristics.push({
        id: 'risk-radon',
        category: 'risques',
        label: 'Exposition au radon',
        value: null,
        valueDisplay: 'Inconnue',
        status: 'unknown',
        editable: true,
        priority: 'medium',
        icon: 'AlertTriangle',
        description: 'Classification de la commune pour l\'exposition au radon',
      })
    }

    // Mouvements de terrain
    const hasMvtData = riskData?.mvt && Array.isArray(riskData.mvt)
    const hasGroundMovement = hasMvtData && riskData.mvt.length > 0
    
    characteristics.push({
      id: 'risk-ground-movement',
      category: 'risques',
      label: 'Mouvements de terrain',
      value: hasGroundMovement || null,
      valueDisplay: hasMvtData ? (hasGroundMovement ? 'Présents' : 'Aucun') : 'Non renseignés',
      status: hasMvtData ? 'known' : 'unknown',
      editable: true,
      priority: 'high',
      icon: 'AlertTriangle',
      description: hasMvtData 
        ? (hasGroundMovement ? 'Des mouvements de terrain ont été identifiés' : 'Aucun mouvement de terrain identifié')
        : 'Mouvements de terrain à renseigner',
    })

    // Retrait-gonflement des argiles
    const clayRisk = riskData?.rga?.potentiel
    const clayLabels: Record<string, string> = {
      faible: 'Faible',
      moyen: 'Moyen',
      fort: 'Fort',
      'très fort': 'Très fort',
    }
    if (clayRisk) {
      characteristics.push({
        id: 'risk-clay',
        category: 'risques',
        label: 'Retrait-gonflement des argiles',
        value: clayRisk,
        valueDisplay: clayLabels[clayRisk] || clayRisk,
        status: 'known',
        editable: true,
        priority: 'high',
        icon: 'AlertTriangle',
        description: `Potentiel ${clayLabels[clayRisk] || clayRisk} pour le retrait-gonflement des argiles`,
      })
    } else {
      characteristics.push({
        id: 'risk-clay',
        category: 'risques',
        label: 'Retrait-gonflement des argiles',
        value: null,
        valueDisplay: 'Non renseigné',
        status: 'unknown',
        editable: true,
        priority: 'high',
        icon: 'AlertTriangle',
        description: 'Potentiel de retrait-gonflement des argiles à renseigner',
      })
    }

    // Exposition aux termites
    // Note: Source de données termites à intégrer si disponible
    characteristics.push({
      id: 'risk-termites',
      category: 'risques',
      label: 'Exposition aux termites',
      value: null,
      valueDisplay: 'Non renseignée',
      status: 'unknown',
      editable: true,
      priority: 'medium',
      icon: 'Bug',
      description: 'Zone d\'exposition aux termites (faible, modérée, forte)',
    })

    // Sismicité
    const seismicZone = riskData?.zonage_sismique?.[0]?.zone
    if (seismicZone) {
      characteristics.push({
        id: 'risk-seismic',
        category: 'risques',
        label: 'Zone sismique',
        value: seismicZone,
        valueDisplay: `Zone ${seismicZone}`,
        status: 'known',
        editable: true,
        priority: 'medium',
        icon: 'AlertTriangle',
        description: `Zone sismique de niveau ${seismicZone}`,
      })
    } else {
      characteristics.push({
        id: 'risk-seismic',
        category: 'risques',
        label: 'Zone sismique',
        value: null,
        valueDisplay: 'Non renseignée',
        status: 'unknown',
        editable: true,
        priority: 'medium',
        icon: 'AlertTriangle',
        description: 'Zone sismique à renseigner',
      })
    }

    // Installations classées à proximité
    const icpeCount = riskData?.installations_classees?.length || 0
    characteristics.push({
      id: 'risk-icpe',
      category: 'risques',
      label: 'Installations classées à proximité',
      value: icpeCount > 0 ? icpeCount : null,
      valueDisplay: icpeCount > 0 ? `${icpeCount} installation(s)` : 'Aucune connue',
      status: 'known', // Toujours connu (0 ou plus)
      editable: false,
      priority: 'medium',
      icon: 'Factory',
      description: icpeCount > 0 
        ? `${icpeCount} installation(s) classée(s) pour la protection de l'environnement à proximité`
        : 'Aucune installation classée identifiée à proximité',
    })

    // ============================================
    // CATÉGORIE : ÉNERGIE
    // ============================================

    // Classe DPE (peut être dans dpeData.dpeClass, dpeData.energyClassPrimary, ou rnbData.dpeClass)
    const dpeClass = dpeData?.dpeClass || 
                     dpeData?.energyClassPrimary ||
                     (rnbData?.dpeClass && rnbData.dpeClass !== 'N/A' ? rnbData.dpeClass : undefined)
    
    if (dpeClass) {
      characteristics.push({
        id: 'energy-dpe-class',
        category: 'energie',
        label: 'Classe énergétique (DPE)',
        value: dpeClass,
        valueDisplay: dpeClass,
        status: 'known',
        editable: true,
        priority: 'high',
        icon: 'Zap',
        description: `Diagnostic de Performance Energétique : Classe ${dpeClass}`,
      })
    } else {
      characteristics.push({
        id: 'energy-dpe-class',
        category: 'energie',
        label: 'Classe énergétique (DPE)',
        value: null,
        valueDisplay: 'Inconnue',
        status: 'unknown',
        editable: true,
        priority: 'high',
        icon: 'Zap',
        description: 'Diagnostic de Performance Energétique',
      })
    }

    // Consommation énergétique (peut être dans dpeData.energyConsumption, dpeData.energyConsumptionPrimary, ou rnbData.energyConsumption)
    const energyConsumption = dpeData?.energyConsumption || 
                               dpeData?.energyConsumptionPrimary ||
                               rnbData?.energyConsumption
    
    if (energyConsumption) {
      characteristics.push({
        id: 'energy-consumption',
        category: 'energie',
        label: 'Consommation énergétique',
        value: energyConsumption,
        valueDisplay: `${energyConsumption} kWh/m²/an`,
        status: 'known',
        editable: true,
        priority: 'high',
        unit: 'kWh/m²/an',
        icon: 'Battery',
        description: 'Consommation annuelle d\'énergie par mètre carré',
      })
    } else {
      characteristics.push({
        id: 'energy-consumption',
        category: 'energie',
        label: 'Consommation énergétique',
        value: null,
        valueDisplay: 'Inconnue',
        status: 'unknown',
        editable: true,
        priority: 'high',
        unit: 'kWh/m²/an',
        icon: 'Battery',
        description: 'Consommation annuelle d\'énergie par mètre carré',
      })
    }

    // Émissions GES (peut être dans dpeData.ghgEmissions, dpeData.ghgEmissionsPrimary, ou rnbData.ghgEmissions)
    const ghgEmissions = dpeData?.ghgEmissions || 
                         dpeData?.ghgEmissionsPrimary ||
                         rnbData?.ghgEmissions
    
    if (ghgEmissions) {
      characteristics.push({
        id: 'energy-ghg',
        category: 'energie',
        label: 'Émissions de gaz à effet de serre',
        value: ghgEmissions,
        valueDisplay: `${ghgEmissions} kg CO₂/m²/an`,
        status: 'known',
        editable: true,
        priority: 'medium',
        unit: 'kg CO₂/m²/an',
        icon: 'Leaf',
        description: 'Émissions annuelles de gaz à effet de serre',
      })
    } else {
      characteristics.push({
        id: 'energy-ghg',
        category: 'energie',
        label: 'Émissions de gaz à effet de serre',
        value: null,
        valueDisplay: 'Inconnues',
        status: 'unknown',
        editable: true,
        priority: 'medium',
        unit: 'kg CO₂/m²/an',
        icon: 'Leaf',
        description: 'Émissions annuelles de gaz à effet de serre',
      })
    }

    // ============================================
    // CATÉGORIE : CADASTRE
    // ============================================

    // Surface parcelle (peut être dans cadastralData.parcelle.surface ou parcelle contenance convertie)
    const parcelleSurface = cadastralData?.parcelle?.surface || 
                            (cadastralData?.parcelle?.contenance ? cadastralData.parcelle.contenance * 10000 : undefined)
    
    if (parcelleSurface) {
      characteristics.push({
        id: 'cadastre-surface',
        category: 'cadastre',
        label: 'Surface de la parcelle',
        value: parcelleSurface,
        valueDisplay: `${parcelleSurface} m²`,
        status: 'known',
        editable: true,
        priority: 'medium',
        unit: 'm²',
        icon: 'Ruler',
        description: 'Surface totale de la parcelle cadastrale',
      })
    } else {
      characteristics.push({
        id: 'cadastre-surface',
        category: 'cadastre',
        label: 'Surface de la parcelle',
        value: null,
        valueDisplay: 'Inconnue',
        status: 'unknown',
        editable: true,
        priority: 'medium',
        unit: 'm²',
        icon: 'Ruler',
        description: 'Surface totale de la parcelle cadastrale',
      })
    }

    // Numéro de parcelle (peut être dans cadastralData.parcelle.numero ou parcelle.id)
    const parcelleNumber = cadastralData?.parcelle?.numero || 
                           cadastralData?.parcelle?.id ||
                           cadastralData?.parcelleNumber // Depuis le profil directement
    
    if (parcelleNumber) {
      characteristics.push({
        id: 'cadastre-parcelle',
        category: 'cadastre',
        label: 'Parcelle cadastrale',
        value: parcelleNumber,
        valueDisplay: parcelleNumber,
        status: 'known',
        editable: true,
        priority: 'low',
        icon: 'MapPin',
        description: 'Référence cadastrale de la parcelle',
      })
    } else {
      characteristics.push({
        id: 'cadastre-parcelle',
        category: 'cadastre',
        label: 'Parcelle cadastrale',
        value: null,
        valueDisplay: 'Non renseignée',
        status: 'unknown',
        editable: true,
        priority: 'low',
        icon: 'MapPin',
        description: 'Référence cadastrale de la parcelle',
      })
    }

    // Section cadastrale (peut être dans cadastralData.parcelle.section ou sectionCadastrale du profil)
    const sectionCadastrale = cadastralData?.parcelle?.section || 
                               cadastralData?.sectionCadastrale
    
    if (sectionCadastrale) {
      characteristics.push({
        id: 'cadastre-section',
        category: 'cadastre',
        label: 'Section cadastrale',
        value: sectionCadastrale,
        valueDisplay: sectionCadastrale,
        status: 'known',
        editable: true,
        priority: 'low',
        icon: 'MapPin',
        description: 'Section cadastrale',
      })
    } else {
      characteristics.push({
        id: 'cadastre-section',
        category: 'cadastre',
        label: 'Section cadastrale',
        value: null,
        valueDisplay: 'Non renseignée',
        status: 'unknown',
        editable: true,
        priority: 'low',
        icon: 'MapPin',
        description: 'Section cadastrale',
      })
    }

    // ============================================
    // CATÉGORIE : VALORISATION
    // ============================================

    // Estimation valeur (peut être dans dvfData.estimation.valeur_estimee ou calculée depuis prix_m2_estime × surface)
    // Note: surface est déjà déclarée au début de la fonction
    let estimationValue = dvfData?.estimation?.valeur_estimee
    // Si pas d'estimation directe mais prix/m² et surface disponibles, calculer
    if (!estimationValue && dvfData?.estimation?.prix_m2_estime && surface) {
      estimationValue = dvfData.estimation.prix_m2_estime * surface
    }
    
    if (estimationValue) {
      const confiance = dvfData?.estimation?.confiance
      characteristics.push({
        id: 'valuation-estimate',
        category: 'valorisation',
        label: 'Estimation immobilière',
        value: estimationValue,
        valueDisplay: `${Math.round(estimationValue).toLocaleString('fr-FR')} €`,
        status: confiance && confiance > 50 ? 'known' : 'partial',
        editable: true,
        priority: 'high',
        unit: '€',
        icon: 'Euro',
        description: confiance 
          ? `Estimation de la valeur du bien (confiance: ${confiance}%)`
          : 'Estimation de la valeur du bien',
      })
    } else {
      characteristics.push({
        id: 'valuation-estimate',
        category: 'valorisation',
        label: 'Estimation immobilière',
        value: null,
        valueDisplay: 'Non estimée',
        status: 'unknown',
        editable: true,
        priority: 'high',
        unit: '€',
        icon: 'Euro',
        description: 'Estimation de la valeur du bien',
      })
    }

    // Prix au m² (peut être dans dvfData.estimation.prix_m2_estime, dvfData.statistics.prix_m2_moyen, ou calculé depuis valeur_estimee ÷ surface)
    let prixM2 = dvfData?.estimation?.prix_m2_estime
    // Si pas de prix/m² direct mais estimation et surface disponibles, calculer
    if (!prixM2 && estimationValue && surface) {
      prixM2 = estimationValue / surface
    }
    // Sinon utiliser la moyenne des statistiques
    if (!prixM2 && dvfData?.statistics?.prix_m2_moyen) {
      prixM2 = dvfData.statistics.prix_m2_moyen
    }
    
    if (prixM2) {
      characteristics.push({
        id: 'valuation-price-per-m2',
        category: 'valorisation',
        label: 'Prix au m² estimé',
        value: prixM2,
        valueDisplay: `${Math.round(prixM2).toLocaleString('fr-FR')} €/m²`,
        status: 'known',
        editable: true,
        priority: 'medium',
        unit: '€/m²',
        icon: 'TrendingUp',
        description: 'Prix estimé par mètre carré',
      })
    } else {
      characteristics.push({
        id: 'valuation-price-per-m2',
        category: 'valorisation',
        label: 'Prix au m² estimé',
        value: null,
        valueDisplay: 'Non estimé',
        status: 'unknown',
        editable: true,
        priority: 'medium',
        unit: '€/m²',
        icon: 'TrendingUp',
        description: 'Prix estimé par mètre carré',
      })
    }

    // ============================================
    // CATÉGORIE : URBANISME
    // ============================================

    // Zone PLU (peut être dans enrichedData.plu.zone, enrichedData.plu.zonage.type, ou enrichedData.building.pluZone)
    const pluZone = enrichedData?.plu?.zone || 
                    enrichedData?.plu?.zonage?.type ||
                    enrichedData?.building?.pluZone
    
    if (pluZone) {
      characteristics.push({
        id: 'urbanism-plu-zone',
        category: 'urbanisme',
        label: 'Zone PLU',
        value: pluZone,
        valueDisplay: pluZone,
        status: 'known',
        editable: true,
        priority: 'high',
        icon: 'MapPin',
        description: 'Zone du Plan Local d\'Urbanisme',
      })
    } else {
      characteristics.push({
        id: 'urbanism-plu-zone',
        category: 'urbanisme',
        label: 'Zone PLU',
        value: null,
        valueDisplay: 'Non renseignée',
        status: 'unknown',
        editable: true,
        priority: 'high',
        icon: 'MapPin',
        description: 'Zone du Plan Local d\'Urbanisme',
      })
    }

    // ============================================
    // CATÉGORIE : STRUCTURE
    // ============================================

    // Année de construction (peut être dans RNB, enrichedData.rnb, ou enrichedData.building)
    const constructionYear = enrichedData?.rnb?.constructionYear || 
                            rnbData?.constructionYear ||
                            enrichedData?.building?.constructionYear ||
                            enrichedData?.rnb?.annee_construction
    
    if (constructionYear) {
      characteristics.push({
        id: 'structure-construction-year',
        category: 'structure',
        label: 'Année de construction',
        value: constructionYear,
        valueDisplay: constructionYear.toString(),
        status: 'known',
        editable: true,
        priority: 'medium',
        icon: 'Calendar',
        description: 'Année de construction du bâtiment',
      })
    } else {
      characteristics.push({
        id: 'structure-construction-year',
        category: 'structure',
        label: 'Année de construction',
        value: null,
        valueDisplay: 'Inconnue',
        status: 'unknown',
        editable: true,
        priority: 'medium',
        icon: 'Calendar',
        description: 'Année de construction du bâtiment',
      })
    }

    // Surface habitable (déjà calculée au début de la fonction)
    if (surface) {
      characteristics.push({
        id: 'structure-living-area',
        category: 'structure',
        label: 'Surface habitable',
        value: surface,
        valueDisplay: `${surface} m²`,
        status: 'known',
        editable: true,
        priority: 'high',
        unit: 'm²',
        icon: 'Home',
        description: 'Surface habitable totale',
      })
    } else {
      characteristics.push({
        id: 'structure-living-area',
        category: 'structure',
        label: 'Surface habitable',
        value: null,
        valueDisplay: 'Inconnue',
        status: 'unknown',
        editable: true,
        priority: 'high',
        unit: 'm²',
        icon: 'Home',
        description: 'Surface habitable totale',
      })
    }

    // Type de bien (peut être dans enrichedData.building.buildingType ou rnbData.buildingType)
    const buildingType = enrichedData?.building?.buildingType || 
                         rnbData?.buildingType ||
                         enrichedData?.rnb?.buildingType
    
    characteristics.push({
      id: 'structure-property-type',
      category: 'structure',
      label: 'Type de bien',
      value: buildingType || null,
      valueDisplay: buildingType || 'Non renseigné',
      status: buildingType ? 'known' : 'unknown',
      editable: true,
      priority: 'high',
      icon: 'Building2',
      description: buildingType 
        ? `Type de bien : ${buildingType}`
        : 'Type de bien (Maison, Appartement, etc.)',
    })

    // Nombre de pièces
    characteristics.push({
      id: 'structure-rooms',
      category: 'structure',
      label: 'Nombre de pièces',
      value: null,
      valueDisplay: 'Non renseigné',
      status: 'unknown',
      editable: true,
      priority: 'high',
      icon: 'DoorOpen',
      description: 'Nombre de pièces principales',
    })

    // Nombre d'étages
    characteristics.push({
      id: 'structure-floors',
      category: 'structure',
      label: 'Nombre d\'étages',
      value: null,
      valueDisplay: 'Non renseigné',
      status: 'unknown',
      editable: true,
      priority: 'medium',
      icon: 'Layers',
      description: 'Nombre d\'étages du bâtiment',
    })

    const sorted = characteristics.sort((a, b) => {
      // Trier par priorité puis par catégorie
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      if (priorityDiff !== 0) return priorityDiff
      return a.label.localeCompare(b.label)
    })
    
    log.debug({
      total: sorted.length,
      known: sorted.filter((c: BuildingCharacteristic) => c.status === 'known').length,
      unknown: sorted.filter((c: BuildingCharacteristic) => c.status === 'unknown').length,
      partial: sorted.filter((c: BuildingCharacteristic) => c.status === 'partial').length,
      categories: Array.from(new Set(sorted.map((c: BuildingCharacteristic) => c.category))),
    }, 'Caractéristiques extraites')

    // GARANTIE : Toujours retourner au moins quelques caractéristiques de base
    if (sorted.length === 0) {
      log.warn('Aucune caractéristique générée, ajout caractéristiques de base')
      const baseCharacteristics: BuildingCharacteristic[] = [
        {
          id: 'structure-property-type',
          category: 'structure' as const,
          label: 'Type de bien',
          value: null,
          valueDisplay: 'Non renseigné',
          status: 'unknown' as const,
          editable: true,
          priority: 'high' as const,
          icon: 'Home',
          description: 'Type de bien (Maison, Appartement, etc.)',
        },
        {
          id: 'structure-rooms',
          category: 'structure' as const,
          label: 'Nombre de pièces',
          value: null,
          valueDisplay: 'Non renseigné',
          status: 'unknown' as const,
          editable: true,
          priority: 'high' as const,
          icon: 'DoorOpen',
          description: 'Nombre de pièces principales',
        },
      ]
      log.info({ count: baseCharacteristics.length }, 'Retour caractéristiques de base')
      return baseCharacteristics
    }

    log.info({ count: sorted.length }, 'Retour caractéristiques')
    return sorted
  }

  /**
   * Groupe les caractéristiques par catégorie
   */
  groupByCategory(characteristics: BuildingCharacteristic[]): Record<string, BuildingCharacteristic[]> {
    return characteristics.reduce((acc, char) => {
      if (!acc[char.category]) {
        acc[char.category] = []
      }
      acc[char.category].push(char)
      return acc
    }, {} as Record<string, BuildingCharacteristic[]>)
  }

  /**
   * Traduit les catégories en libellés lisibles
   */
  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      risques: 'Risques et Sécurité',
      energie: 'Performance Énergétique',
      cadastre: 'Informations Cadastrales',
      valorisation: 'Valorisation Immobilière',
      urbanisme: 'Urbanisme',
      environnement: 'Environnement',
      structure: 'Caractéristiques du Bâti',
      documentation: 'Documents',
    }
    return labels[category] || category
  }
}

