/**
 * AXE 1 : CONFORMITÉ RÉGLEMENTAIRE & TECHNIQUE (350 points - 29%)
 * 
 * 1.1 Respect Normes DTU & Standards (140 points)
 * 1.2 Qualifications & Certifications Entreprise (110 points)
 * 1.3 Sécurité & Accessibilité (100 points)
 */

import type { Devis } from '@/types'
import type { ScoringEnrichmentData, ControlPointScore, SubCriteriaScore, AxisScore } from '../types'

export class Axe1Conformite {
  /**
   * Calcule le score de l'Axe 1
   */
  async calculate(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: { projectType: string; tradeType?: string; region: string }
  ): Promise<AxisScore> {
    const subCriteriaScores: SubCriteriaScore[] = []
    const alerts: any[] = []
    const recommendations: any[] = []

    // 1.1 Respect Normes DTU & Standards (140 points)
    const dtuScore = await this.calculateDTUStandards(devis, enrichmentData, context)
    subCriteriaScores.push(dtuScore)

    // 1.2 Qualifications & Certifications (110 points)
    const qualificationsScore = await this.calculateQualifications(devis, enrichmentData, context)
    subCriteriaScores.push(qualificationsScore)

    // 1.3 Sécurité & Accessibilité (100 points)
    const securiteScore = await this.calculateSecuriteAccessibilite(devis, enrichmentData, context)
    subCriteriaScores.push(securiteScore)

    // Calculer le score total
    const totalScore = subCriteriaScores.reduce((sum, sc) => sum + sc.score, 0)
    const maxPoints = 350

    return {
      axisId: 'conformite',
      score: totalScore,
      maxPoints,
      percentage: (totalScore / maxPoints) * 100,
      subCriteriaScores,
      alerts,
      recommendations,
    }
  }

  /**
   * 1.1 Respect Normes DTU & Standards (140 points)
   */
  private async calculateDTUStandards(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // DTU Spécifiques Métier (50 points)
    const dtuSpecifiques = await this.scoreDTUSpecifiques(devis, enrichmentData, context)
    controlPointScores.push(dtuSpecifiques)
    totalScore += dtuSpecifiques.score

    // Certifications Produits & Marquages (40 points)
    const certifications = await this.scoreCertifications(devis, enrichmentData)
    controlPointScores.push(certifications)
    totalScore += certifications.score

    // Performance Énergétique RE2020 (50 points)
    const re2020 = await this.scoreRE2020(devis, enrichmentData, context)
    controlPointScores.push(re2020)
    totalScore += re2020.score

    return {
      subCriteriaId: 'dtu-standards',
      score: totalScore,
      maxPoints: 140,
      controlPointScores,
    }
  }

  /**
   * DTU Spécifiques Métier (50 points)
   */
  private async scoreDTUSpecifiques(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    // Identification automatique DTU applicables (15 pts)
    const applicableDTUs = enrichmentData.dtus?.filter((d) => d.applicable) || []
    if (applicableDTUs.length > 0) {
      score += Math.min(15, applicableDTUs.length * 3)
      justification += `${applicableDTUs.length} DTU(s) identifié(s). `
    } else {
      justification += 'Aucun DTU spécifique identifié. '
    }

    // Cohérence matériaux/techniques (20 pts)
    const extractedItems = (devis.extractedData as any)?.items || []
    const hasMaterialDetails = extractedItems.some((item: any) =>
      item.description?.match(/marque|référence|norme/i)
    )
    if (hasMaterialDetails) {
      score += 15
      justification += 'Matériaux détaillés avec références. '
    } else {
      justification += 'Matériaux insuffisamment détaillés. '
    }

    // Vérification cohérence technique
    const hasTechnicalSpecs = extractedItems.some((item: any) =>
      item.description?.match(/mise en œuvre|technique|pose/i)
    )
    if (hasTechnicalSpecs) {
      score += Math.min(5, score * 0.1)
      justification += 'Techniques de mise en œuvre mentionnées. '
    }

    // Respect clauses techniques obligatoires (15 pts)
    const hasLegalMentions = (devis.extractedData as any)?.legalMentions
    if (hasLegalMentions?.hasGuarantees || hasLegalMentions?.hasInsurance) {
      score += 10
      justification += 'Mentions légales présentes. '
    } else {
      justification += 'Mentions légales incomplètes. '
    }

    // Bonus si tous les DTU sont conformes
    const allCompliant = enrichmentData.dtus?.every((d) => (d.complianceScore || 0) >= 80)
    if (allCompliant && enrichmentData.dtus.length > 0) {
      score = Math.min(50, score + 5)
      justification += 'Conformité DTU complète. '
    }

    return {
      controlPointId: 'dtu-specifiques',
      score: Math.round(score),
      maxPoints: 50,
      justification,
      confidence: enrichmentData.dtus?.length > 0 ? 85 : 60,
    }
  }

  /**
   * Certifications Produits & Marquages (40 points)
   */
  private async scoreCertifications(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const extractedItems = (devis.extractedData as any)?.items || []
    const text = JSON.stringify(extractedItems).toLowerCase()

    // Vérification marquage CE (15 pts)
    const hasCEMarking = text.includes('ce') || text.includes('marquage ce')
    if (hasCEMarking) {
      score += 10
      justification += 'Marquage CE mentionné. '
    } else {
      justification += 'Marquage CE non vérifié. '
    }

    // Vérification normes NF/ACERMI (15 pts)
    const hasNF = text.includes('nf ') || text.includes('norme nf')
    const hasACERMI = text.includes('acermi')
    if (hasNF || hasACERMI) {
      score += 12
      justification += 'Normes NF/ACERMI mentionnées. '
    } else {
      justification += 'Certifications NF/ACERMI non vérifiées. '
    }

    // Traçabilité certifications (10 pts)
    const hasCertNumbers = text.match(/\b(cert|certif|no|n°)\s*[:.]?\s*[A-Z0-9]{5,}/i)
    if (hasCertNumbers) {
      score += 8
      justification += 'Numéros de certification présents. '
    } else {
      justification += 'Traçabilité certifications limitée. '
    }

    return {
      controlPointId: 'certifications',
      score: Math.round(score),
      maxPoints: 40,
      justification,
      confidence: 70,
    }
  }

  /**
   * Performance Énergétique RE2020 (50 points)
   */
  private async scoreRE2020(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const projectType = context.projectType

    // RE2020 principalement pour construction neuve
    if (projectType === 'construction') {
      // Seuils réglementaires Bbio/Cep/Cepnr (30 pts)
      const text = JSON.stringify(devis.extractedData).toLowerCase()
      const hasRE2020 = text.includes('re2020') || text.includes('réglementation environnementale')
      const hasBbio = text.includes('bbio') || text.includes('besoin bioclimatique')
      const hasCep = text.includes('cep') || text.includes('consommation énergétique')

      if (hasRE2020 && (hasBbio || hasCep)) {
        score += 25
        justification += 'RE2020 et seuils énergétiques mentionnés. '
      } else if (hasRE2020) {
        score += 15
        justification += 'RE2020 mentionné mais seuils incomplets. '
      } else {
        justification += 'RE2020 non vérifié pour construction neuve. '
      }

      // Impact carbone Ic (20 pts)
      const hasCarbon = text.includes('carbone') || text.includes('ic') || text.includes('fdes')
      if (hasCarbon) {
        score += 15
        justification += 'Impact carbone pris en compte. '
      } else {
        justification += 'Impact carbone non vérifié. '
      }
    } else {
      // Pour rénovation, vérifier autres critères énergétiques
      const text = JSON.stringify(devis.extractedData).toLowerCase()
      const hasEnergyMention = text.includes('performance énergétique') || 
                               text.includes('rénovation énergétique') ||
                               text.includes('rge')
      if (hasEnergyMention) {
        score += 30
        justification += 'Performance énergétique mentionnée. '
      } else {
        score += 15
        justification += 'Peu d\'éléments sur performance énergétique. '
      }
    }

    return {
      controlPointId: 're2020',
      score: Math.round(score),
      maxPoints: 50,
      justification,
      confidence: projectType === 'construction' ? 80 : 60,
    }
  }

  /**
   * 1.2 Qualifications & Certifications Entreprise (110 points)
   */
  private async calculateQualifications(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Qualifications Métier Obligatoires (45 points)
    const qualifications = await this.scoreQualificationsMetier(devis, enrichmentData, context)
    controlPointScores.push(qualifications)
    totalScore += qualifications.score

    // Statut Juridique & Conformité (35 points)
    const statut = await this.scoreStatutJuridique(devis, enrichmentData)
    controlPointScores.push(statut)
    totalScore += statut.score

    // Assurances Professionnelles (30 points)
    const assurances = await this.scoreAssurances(devis, enrichmentData)
    controlPointScores.push(assurances)
    totalScore += assurances.score

    return {
      subCriteriaId: 'qualifications',
      score: totalScore,
      maxPoints: 110,
      controlPointScores,
    }
  }

  /**
   * Qualifications Métier Obligatoires (45 points)
   */
  private async scoreQualificationsMetier(
    _devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const company = enrichmentData.company
    const tradeType = context.tradeType

    // Qualification Qualibat/Qualifelec adaptée (20 pts)
    const hasQualification = enrichmentData.certifications?.some(
      (c) => c.type === 'Qualibat' || c.type === 'Qualifelec'
    )
    if (hasQualification) {
      score += 18
      justification += 'Qualification Qualibat/Qualifelec détectée. '
    } else {
      justification += 'Qualification professionnelle non vérifiée. '
    }

    // Niveau qualification suffisant (15 pts)
    const certifications = enrichmentData.certifications || []
    const relevantCerts = certifications.filter((c) =>
      tradeType ? c.name.toLowerCase().includes(tradeType.toLowerCase()) : true
    )
    if (relevantCerts.length > 0) {
      score += 12
      justification += `${relevantCerts.length} certification(s) pertinente(s). `
    } else {
      justification += 'Certifications non spécifiques au métier. '
    }

    // Certifications RGE si applicable (10 pts)
    const hasRGE = certifications.some((c) => c.name.includes('RGE') || c.type === 'RGE')
    const isRenovation = context.projectType === 'renovation'
    if (isRenovation && hasRGE) {
      score += 10
      justification += 'Certification RGE présente (requise pour rénovation). '
    } else if (isRenovation && !hasRGE) {
      justification += 'Certification RGE manquante pour rénovation. '
    } else {
      score += 5
      justification += 'RGE non applicable. '
    }

    return {
      controlPointId: 'qualifications-metier',
      score: Math.round(score),
      maxPoints: 45,
      justification,
      confidence: company?.siret ? 85 : 50,
    }
  }

  /**
   * Statut Juridique & Conformité (35 points)
   */
  private async scoreStatutJuridique(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const company = enrichmentData.company

    // SIRET valide et activité correspondante (15 pts)
    if (company?.siret && company?.activities && company.activities.length > 0) {
      score += 15
      justification += 'SIRET valide et activité vérifiée. '

      // Vérifier cohérence activité avec le devis
      const tradeType = (devis.tradeType || '').toLowerCase()
      const activityMatch = company.activities.some((a) =>
        a.label.toLowerCase().includes(tradeType)
      )
      if (activityMatch) {
        score += 2
        justification += 'Activité cohérente avec le projet. '
      }
    } else if (company?.siret) {
      score += 10
      justification += 'SIRET valide mais activité non vérifiée. '
    } else {
      justification += 'SIRET non vérifié. '
    }

    // Situation fiscale et sociale régulière (10 pts)
    const hasLegalIssues = company?.legalStatusDetails?.hasCollectiveProcedure
    if (!hasLegalIssues) {
      score += 10
      justification += 'Aucune procédure collective détectée. '
    } else {
      justification += '⚠️ Procédure collective détectée. '
    }

    // Absence procédures collectives (10 pts - déjà inclus ci-dessus)
    // Score déjà attribué dans la vérification précédente

    return {
      controlPointId: 'statut-juridique',
      score: Math.round(score),
      maxPoints: 35,
      justification,
      confidence: company?.siret ? 90 : 40,
    }
  }

  /**
   * Assurances Professionnelles (30 points)
   */
  private async scoreAssurances(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const legalMentions = (devis.extractedData as any)?.legalMentions || {}

    // RC Décennale valide et couvrante (20 pts)
    if (legalMentions.hasInsurance) {
      score += 15
      justification += 'Assurance décennale mentionnée. '

      // Vérifier si le montant est cohérent (décennale généralement >= montant projet)
      // Cette vérification nécessiterait une attestation détaillée
      // Pour l'instant, on considère que la mention est positive
      score += 5
      justification += 'Couverture probablement adéquate. '
    } else {
      justification += '⚠️ Assurance décennale non vérifiée. '
    }

    // RC Professionnelle appropriée (10 pts)
    const hasRC = legalMentions.hasInsurance || 
                  enrichmentData.company?.insurances?.hasRC
    if (hasRC) {
      score += 8
      justification += 'RC Professionnelle mentionnée. '
    } else {
      justification += 'RC Professionnelle non vérifiée. '
    }

    return {
      controlPointId: 'assurances',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: legalMentions.hasInsurance ? 75 : 50,
    }
  }

  /**
   * 1.3 Sécurité & Accessibilité (100 points)
   */
  private async calculateSecuriteAccessibilite(
    devis: Devis,
    enrichmentData: ScoringEnrichmentData,
    context: any
  ): Promise<SubCriteriaScore> {
    const controlPointScores: ControlPointScore[] = []
    let totalScore = 0

    // Sécurité Incendie (40 points)
    const securite = await this.scoreSecuriteIncendie(devis, enrichmentData, context)
    controlPointScores.push(securite)
    totalScore += securite.score

    // Accessibilité PMR (30 points)
    const accessibilite = await this.scoreAccessibilitePMR(devis, enrichmentData, context)
    controlPointScores.push(accessibilite)
    totalScore += accessibilite.score

    // Performance Acoustique (30 points)
    const acoustique = await this.scoreAcoustique(devis, enrichmentData)
    controlPointScores.push(acoustique)
    totalScore += acoustique.score

    return {
      subCriteriaId: 'securite-accessibilite',
      score: totalScore,
      maxPoints: 100,
      controlPointScores,
    }
  }

  /**
   * Sécurité Incendie (40 points)
   */
  private async scoreSecuriteIncendie(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Classification matériaux feu (20 pts)
    const hasFireClass = text.includes('m0') || 
                         text.includes('m1') || 
                         text.includes('classement feu') ||
                         text.includes('réaction au feu')
    if (hasFireClass) {
      score += 18
      justification += 'Classement feu des matériaux mentionné. '
    } else {
      justification += 'Classement feu non vérifié. '
    }

    // Respect réglementation ERP si applicable (20 pts)
    const hasERP = text.includes('erp') || 
                   text.includes('établissement recevant du public') ||
                   text.includes('commission sécurité')
    if (hasERP) {
      score += 18
      justification += 'Réglementation ERP prise en compte. '
    } else {
      // ERP peut ne pas être applicable selon le type de projet
      score += 10
      justification += 'ERP non applicable ou non mentionné. '
    }

    return {
      controlPointId: 'securite-incendie',
      score: Math.round(score),
      maxPoints: 40,
      justification,
      confidence: 70,
    }
  }

  /**
   * Accessibilité PMR (30 points)
   */
  private async scoreAccessibilitePMR(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData,
    _context: any
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Conformité largeurs passages (15 pts)
    const hasPMR = text.includes('pmr') || 
                   text.includes('accessibilité') ||
                   text.includes('handicap') ||
                   text.includes('largeur') ||
                   text.includes('90') // Largeur minimale standard
    if (hasPMR) {
      score += 12
      justification += 'Accessibilité PMR mentionnée. '
    } else {
      justification += 'Accessibilité PMR non vérifiée. '
    }

    // Équipements adaptés PMR (15 pts)
    const hasPMREquipment = text.includes('rampe') || 
                            text.includes('monte-charge') ||
                            text.includes('sanitaire adapté') ||
                            text.includes('w.c. pmr')
    if (hasPMREquipment) {
      score += 12
      justification += 'Équipements PMR spécifiés. '
    } else {
      score += 3
      justification += 'Équipements PMR non détaillés. '
    }

    return {
      controlPointId: 'accessibilite-pmr',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: 65,
    }
  }

  /**
   * Performance Acoustique (30 points)
   */
  private async scoreAcoustique(
    devis: Devis,
    _enrichmentData: ScoringEnrichmentData
  ): Promise<ControlPointScore> {
    let score = 0
    let justification = ''

    const text = JSON.stringify(devis.extractedData).toLowerCase()

    // Isolement acoustique NRA (20 pts)
    const hasAcoustic = text.includes('acoustique') || 
                        text.includes('nra') ||
                        text.includes('isolement phonique') ||
                        text.includes('db')
    if (hasAcoustic) {
      score += 18
      justification += 'Performance acoustique mentionnée. '
    } else {
      justification += 'Performance acoustique non vérifiée. '
    }

    // Traitement points singuliers (10 pts)
    const hasSingularPoints = text.includes('pont thermique') || 
                              text.includes('pont phonique') ||
                              text.includes('rupteur') ||
                              text.includes('détail')
    if (hasSingularPoints) {
      score += 8
      justification += 'Traitement points singuliers mentionné. '
    } else {
      score += 3
      justification += 'Points singuliers non détaillés. '
    }

    return {
      controlPointId: 'acoustique',
      score: Math.round(score),
      maxPoints: 30,
      justification,
      confidence: 60,
    }
  }
}

