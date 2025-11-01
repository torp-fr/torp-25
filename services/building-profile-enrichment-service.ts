/**
 * Service d'enrichissement et de présentation des données de logement
 * Transforme les données techniques en informations lisibles pour l'utilisateur
 * Masque les sources et met en avant les résultats
 */

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
    // Utiliser les données du profil si disponibles, sinon celles de enrichedData
    const dpeData = profileDpeData || enrichedData?.energy || enrichedData?.dpe
    const riskData = profileRiskData || enrichedData?.georisques
    const cadastralData = profileCadastralData || enrichedData?.cadastre
    const dvfData = profileDvfData || enrichedData?.dvf
    const characteristics: BuildingCharacteristic[] = []

    // ============================================
    // CATÉGORIE : RISQUES
    // ============================================
    
    // Zone inondable
    const isFloodZone = riskData?.tri?.length > 0 || 
                       riskData?.azi?.length > 0 || 
                       riskData?.papi?.length > 0 ||
                       cadastralData?.constraints?.isFloodZone
    
    characteristics.push({
      id: 'risk-flood',
      category: 'risques',
      label: 'Zone inondable',
      value: isFloodZone,
      valueDisplay: isFloodZone ? 'Oui' : 'Non',
      status: isFloodZone !== undefined ? 'known' : 'unknown',
      editable: true,
      priority: 'high',
      icon: 'AlertTriangle',
      description: isFloodZone ? 'Le terrain est situé en zone à risque d\'inondation' : 'Aucun risque d\'inondation identifié',
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
    const hasGroundMovement = riskData?.mvt?.length > 0
    if (hasGroundMovement !== undefined) {
      characteristics.push({
        id: 'risk-ground-movement',
        category: 'risques',
        label: 'Mouvements de terrain',
        value: hasGroundMovement,
        valueDisplay: hasGroundMovement ? 'Présents' : 'Aucun',
        status: 'known',
        editable: true,
        priority: 'high',
        icon: 'AlertTriangle',
        description: hasGroundMovement ? 'Des mouvements de terrain ont été identifiés' : 'Aucun mouvement de terrain identifié',
      })
    }

    // Retrait-gonflement des argiles
    const clayRisk = riskData?.rga?.potentiel
    if (clayRisk) {
      const clayLabels: Record<string, string> = {
        faible: 'Faible',
        moyen: 'Moyen',
        fort: 'Fort',
        'très fort': 'Très fort',
      }
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
    }

    // Installations classées à proximité
    const icpeCount = riskData?.installations_classees?.length || 0
    if (icpeCount > 0) {
      characteristics.push({
        id: 'risk-icpe',
        category: 'risques',
        label: 'Installations classées à proximité',
        value: icpeCount,
        valueDisplay: `${icpeCount} installation(s)`,
        status: 'known',
        editable: false,
        priority: 'medium',
        icon: 'Factory',
        description: `${icpeCount} installation(s) classée(s) pour la protection de l'environnement à proximité`,
      })
    }

    // ============================================
    // CATÉGORIE : ÉNERGIE
    // ============================================

    // Classe DPE
    if (dpeData?.dpeClass) {
      characteristics.push({
        id: 'energy-dpe-class',
        category: 'energie',
        label: 'Classe énergétique (DPE)',
        value: dpeData.dpeClass,
        valueDisplay: dpeData.dpeClass,
        status: 'known',
        editable: true,
        priority: 'high',
        icon: 'Zap',
        description: `Diagnostic de Performance Energétique : Classe ${dpeData.dpeClass}`,
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

    // Consommation énergétique
    if (dpeData?.energyConsumption) {
      characteristics.push({
        id: 'energy-consumption',
        category: 'energie',
        label: 'Consommation énergétique',
        value: dpeData.energyConsumption,
        valueDisplay: `${dpeData.energyConsumption} kWh/m²/an`,
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

    // Émissions GES
    if (dpeData?.ghgEmissions) {
      characteristics.push({
        id: 'energy-ghg',
        category: 'energie',
        label: 'Émissions de gaz à effet de serre',
        value: dpeData.ghgEmissions,
        valueDisplay: `${dpeData.ghgEmissions} kg CO₂/m²/an`,
        status: 'known',
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

    // Surface parcelle
    if (cadastralData?.parcelle?.surface) {
      characteristics.push({
        id: 'cadastre-surface',
        category: 'cadastre',
        label: 'Surface de la parcelle',
        value: cadastralData.parcelle.surface,
        valueDisplay: `${cadastralData.parcelle.surface} m²`,
        status: 'known',
        editable: true,
        priority: 'medium',
        unit: 'm²',
        icon: 'Ruler',
        description: 'Surface totale de la parcelle cadastrale',
      })
    }

    // Numéro de parcelle
    if (cadastralData?.parcelle?.numero) {
      characteristics.push({
        id: 'cadastre-parcelle',
        category: 'cadastre',
        label: 'Parcelle cadastrale',
        value: cadastralData.parcelle.numero,
        valueDisplay: cadastralData.parcelle.numero,
        status: 'known',
        editable: true,
        priority: 'low',
        icon: 'MapPin',
        description: 'Référence cadastrale de la parcelle',
      })
    }

    // Section cadastrale
    if (cadastralData?.parcelle?.section) {
      characteristics.push({
        id: 'cadastre-section',
        category: 'cadastre',
        label: 'Section cadastrale',
        value: cadastralData.parcelle.section,
        valueDisplay: cadastralData.parcelle.section,
        status: 'known',
        editable: true,
        priority: 'low',
        icon: 'MapPin',
        description: 'Section cadastrale',
      })
    }

    // ============================================
    // CATÉGORIE : VALORISATION
    // ============================================

    // Estimation valeur
    if (dvfData?.estimation?.valeur_estimee) {
      characteristics.push({
        id: 'valuation-estimate',
        category: 'valorisation',
        label: 'Estimation immobilière',
        value: dvfData.estimation.valeur_estimee,
        valueDisplay: `${dvfData.estimation.valeur_estimee.toLocaleString('fr-FR')} €`,
        status: dvfData.estimation.confiance && dvfData.estimation.confiance > 50 ? 'known' : 'partial',
        editable: true,
        priority: 'high',
        unit: '€',
        icon: 'Euro',
        description: 'Estimation de la valeur du bien',
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

    // Prix au m²
    if (dvfData?.estimation?.prix_m2_estime) {
      characteristics.push({
        id: 'valuation-price-per-m2',
        category: 'valorisation',
        label: 'Prix au m² estimé',
        value: dvfData.estimation.prix_m2_estime,
        valueDisplay: `${dvfData.estimation.prix_m2_estime.toLocaleString('fr-FR')} €/m²`,
        status: 'known',
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

    // Zone PLU
    if (enrichedData?.plu?.zone) {
      characteristics.push({
        id: 'urbanism-plu-zone',
        category: 'urbanisme',
        label: 'Zone PLU',
        value: enrichedData.plu.zone,
        valueDisplay: enrichedData.plu.zone,
        status: 'known',
        editable: true,
        priority: 'high',
        icon: 'Map',
        description: 'Zone du Plan Local d\'Urbanisme',
      })
    }

    // ============================================
    // CATÉGORIE : STRUCTURE
    // ============================================

    // Année de construction
    if (enrichedData?.rnb?.annee_construction) {
      characteristics.push({
        id: 'structure-construction-year',
        category: 'structure',
        label: 'Année de construction',
        value: enrichedData.rnb.annee_construction,
        valueDisplay: enrichedData.rnb.annee_construction.toString(),
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

    // Surface habitable
    if (enrichedData?.rnb?.surface_habitable) {
      characteristics.push({
        id: 'structure-living-area',
        category: 'structure',
        label: 'Surface habitable',
        value: enrichedData.rnb.surface_habitable,
        valueDisplay: `${enrichedData.rnb.surface_habitable} m²`,
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

    // Type de bien
    characteristics.push({
      id: 'structure-property-type',
      category: 'structure',
      label: 'Type de bien',
      value: null,
      valueDisplay: 'Non renseigné',
      status: 'unknown',
      editable: true,
      priority: 'high',
      icon: 'Building2',
      description: 'Type de bien (Maison, Appartement, etc.)',
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

    return characteristics.sort((a, b) => {
      // Trier par priorité puis par catégorie
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      if (priorityDiff !== 0) return priorityDiff
      return a.label.localeCompare(b.label)
    })
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

