/**
 * Service d'enrichissement des données météorologiques
 * Pour évaluer l'impact de la météo sur les délais de construction
 */

import type { WeatherData } from './types'
import { loggers } from '@/lib/logger'

const log = loggers.enrichment

export class WeatherEnrichmentService {
  constructor() {
    // TODO: Intégrer avec OpenWeather ou Météo France pour des données météo réelles
    // API OpenWeather : https://api.openweathermap.org/data/2.5 (nécessite clé API)
    // API Météo France : https://api.meteofrance.fr/v1 (nécessite clé API)
  }

  /**
   * Récupère les données météorologiques pour une région
   */
  async getWeatherData(region: string): Promise<WeatherData | null> {
    try {
      // Pour l'instant, on retourne des données statistiques moyennes par région
      // TODO: Intégrer avec OpenWeather ou Météo France pour des données réelles
      return this.getFallbackWeatherData(region)
    } catch (error) {
      log.error({ err: error }, 'Erreur récupération données météo')
      return this.getFallbackWeatherData(region)
    }
  }

  /**
   * Données météorologiques de fallback basées sur des statistiques régionales
   */
  private getFallbackWeatherData(region: string): WeatherData {
    // Nombre moyen de jours météo défavorables par saison selon les régions
    const regionalWeatherData: Record<
      string,
      {
        averageDays: number
        seasonalDelays: { winter: number; spring: number; summer: number; autumn: number }
      }
    > = {
      ILE_DE_FRANCE: {
        averageDays: 45,
        seasonalDelays: { winter: 15, spring: 8, summer: 5, autumn: 12 },
      },
      PROVENCE_ALPES_COTE_AZUR: {
        averageDays: 30,
        seasonalDelays: { winter: 8, spring: 5, summer: 2, autumn: 8 },
      },
      AUVERGNE_RHONE_ALPES: {
        averageDays: 50,
        seasonalDelays: { winter: 20, spring: 10, summer: 8, autumn: 12 },
      },
      NOUVELLE_AQUITAINE: {
        averageDays: 40,
        seasonalDelays: { winter: 12, spring: 8, summer: 5, autumn: 10 },
      },
      OCCITANIE: {
        averageDays: 35,
        seasonalDelays: { winter: 10, spring: 6, summer: 3, autumn: 9 },
      },
      HAUTS_DE_FRANCE: {
        averageDays: 55,
        seasonalDelays: { winter: 18, spring: 12, summer: 8, autumn: 15 },
      },
      GRAND_EST: {
        averageDays: 48,
        seasonalDelays: { winter: 18, spring: 10, summer: 7, autumn: 13 },
      },
      NORMANDIE: {
        averageDays: 52,
        seasonalDelays: { winter: 17, spring: 11, summer: 7, autumn: 14 },
      },
      BRETAGNE: {
        averageDays: 60,
        seasonalDelays: { winter: 20, spring: 15, summer: 10, autumn: 18 },
      },
      PAYS_DE_LA_LOIRE: {
        averageDays: 45,
        seasonalDelays: { winter: 15, spring: 10, summer: 6, autumn: 12 },
      },
      CENTRE_VAL_DE_LOIRE: {
        averageDays: 43,
        seasonalDelays: { winter: 14, spring: 9, summer: 6, autumn: 11 },
      },
      BOURGOGNE_FRANCHE_COMTE: {
        averageDays: 46,
        seasonalDelays: { winter: 16, spring: 10, summer: 7, autumn: 12 },
      },
      CORSE: {
        averageDays: 25,
        seasonalDelays: { winter: 5, spring: 4, summer: 2, autumn: 5 },
      },
    }

    const data = regionalWeatherData[region] || regionalWeatherData.ILE_DE_FRANCE

    return {
      region,
      averageWeatherDays: data.averageDays,
      seasonalDelays: data.seasonalDelays,
      riskFactors: [
        {
          type: 'Pluie',
          impact: 'medium' as const,
          description: 'Précipitations fréquentes peuvent retarder les travaux extérieurs',
        },
        {
          type: 'Vent',
          impact: 'low' as const,
          description: 'Vents forts peuvent limiter certaines activités',
        },
        {
          type: 'Froid',
          impact: 'high' as const,
          description: 'Températures basses peuvent geler les matériaux et ralentir les travaux',
        },
      ],
    }
  }

  /**
   * Estime le retard potentiel dû à la météo selon la période
   */
  estimateWeatherDelay(region: string, startDate: Date, durationDays: number): number {
    const weatherData = this.getFallbackWeatherData(region)
    const month = startDate.getMonth()

    // Déterminer la saison
    let season: 'winter' | 'spring' | 'summer' | 'autumn'
    if (month >= 11 || month <= 1) {
      season = 'winter'
    } else if (month >= 2 && month <= 4) {
      season = 'spring'
    } else if (month >= 5 && month <= 7) {
      season = 'summer'
    } else {
      season = 'autumn'
    }

    const delayDays = weatherData.seasonalDelays[season]

    // Calculer le pourcentage de retard sur la durée totale
    return Math.round((delayDays / durationDays) * 100)
  }
}

