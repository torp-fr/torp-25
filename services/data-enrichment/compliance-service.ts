/**
 * Service d'enrichissement des données de conformité et normes
 * Utilise les bases de données publiques des normes BTP françaises
 */

import type { ComplianceData } from './types'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export class ComplianceEnrichmentService {
  constructor() {
    // TODO: Intégrer API data.gouv.fr pour enrichir les données de conformité
    // Pour l'instant, données statiques selon les normes BTP françaises
  }

  /**
   * Récupère les données de conformité pour un type de projet
   */
  async getComplianceData(
    projectType: string,
    tradeType?: string
  ): Promise<ComplianceData> {
    try {
      // Normes applicables selon le type de projet
      const norms = this.getApplicableNorms(projectType, tradeType)

      // Règlementations applicables
      const regulations = this.getApplicableRegulations(projectType)

      // Certifications requises
      const certifications = this.getRequiredCertifications(projectType, tradeType)

      return {
        applicableNorms: norms,
        regulations,
        certifications,
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération données conformité')
      // Retourner des données de base en cas d'erreur
      return {
        applicableNorms: this.getApplicableNorms(projectType, tradeType),
        regulations: this.getApplicableRegulations(projectType),
        certifications: this.getRequiredCertifications(projectType, tradeType),
      }
    }
  }

  /**
   * Récupère les normes applicables selon le type de projet
   */
  private getApplicableNorms(
    projectType: string,
    tradeType?: string
  ): ComplianceData['applicableNorms'] {
    const norms: ComplianceData['applicableNorms'] = []

    // Normes générales pour tous les projets
    norms.push({
      code: 'NF EN 1990',
      name: 'Eurocode - Bases de calcul des structures',
      mandatory: true,
      category: 'safety',
    })

    // Normes selon le type de projet
    if (projectType === 'construction' || projectType === 'extension') {
      norms.push({
        code: 'RE2020',
        name: 'Réglementation Environnementale 2020',
        mandatory: true,
        category: 'energy',
      })

      norms.push({
        code: 'NF P01-020',
        name: 'Accessibilité des bâtiments',
        mandatory: true,
        category: 'accessibility',
      })

      norms.push({
        code: 'NF DTU 13.11',
        name: 'Isolation thermique',
        mandatory: true,
        category: 'energy',
      })
    }

    if (projectType === 'renovation') {
      norms.push({
        code: 'RE2020',
        name: 'Réglementation Environnementale 2020',
        mandatory: false,
        category: 'energy',
      })

      norms.push({
        code: 'NF EN 15512',
        name: 'Norme isolation thermique rénovation',
        mandatory: true,
        category: 'energy',
      })
    }

    // Normes selon le corps de métier
    if (tradeType) {
      const tradeNorms: Record<string, Array<{ code: string; name: string; category: 'safety' | 'energy' }>> = {
        plomberie: [
          {
            code: 'NF EN 806',
            name: 'Installations de plomberie',
            category: 'safety',
          },
        ],
        'électricité': [
          {
            code: 'NF C 15-100',
            name: 'Installation électrique basse tension',
            category: 'safety',
          },
        ],
        maçonnerie: [
          {
            code: 'NF DTU 20.1',
            name: 'Maçonnerie',
            category: 'safety',
          },
        ],
      }

      const normsForTrade = tradeNorms[tradeType]
      if (normsForTrade) {
        norms.push(
          ...normsForTrade.map((n) => ({
            ...n,
            mandatory: true,
          }))
        )
      }
    }

    return norms
  }

  /**
   * Récupère les réglementations applicables
   */
  private getApplicableRegulations(projectType: string): ComplianceData['regulations'] {
    const regulations: ComplianceData['regulations'] = []

    // Réglementations générales
    regulations.push({
      type: 'Assurance',
      name: 'Assurance Décennale obligatoire',
      complianceRequired: true,
    })

    regulations.push({
      type: 'Assurance',
      name: 'Assurance Responsabilité Civile Professionnelle',
      complianceRequired: true,
    })

    // Réglementations selon le type de projet
    if (projectType === 'construction') {
      regulations.push({
        type: 'Énergie',
        name: 'RE2020 - Performance énergétique',
        complianceRequired: true,
      })
    }

    return regulations
  }

  /**
   * Récupère les certifications requises
   */
  private getRequiredCertifications(
    projectType: string,
    tradeType?: string
  ): ComplianceData['certifications'] {
    const certifications: ComplianceData['certifications'] = []

    // Certifications générales
    certifications.push({
      name: 'RGE (Reconnu Garant de l\'Environnement)',
      required: projectType === 'renovation',
      standard: 'NF',
    })

    // Certifications selon le corps de métier
    if (tradeType) {
      const tradeCerts: Record<string, string[]> = {
        plomberie: ['QualiPlombier', 'NF Plomberie'],
        'électricité': ['NF Électricité', 'Qualifelec'],
        maçonnerie: ['NF Maçonnerie'],
      }

      const certsForTrade = tradeCerts[tradeType]
      if (certsForTrade) {
        certifications.push(
          ...certsForTrade.map((name) => ({
            name,
            required: false,
            standard: 'NF',
          }))
        )
      }
    }

    return certifications
  }
}

