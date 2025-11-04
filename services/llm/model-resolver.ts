/**
 * Model Resolver - Détecte et résout automatiquement les modèles Claude disponibles
 * Évite les erreurs 404 en testant les modèles avant utilisation
 */

import Anthropic from '@anthropic-ai/sdk'
import { loggers } from '@/lib/logger'

const log = loggers.llm

export interface AvailableModel {
  name: string
  supportsPdf: boolean
  supportsImages: boolean
  version: string
}

export class ModelResolver {
  private client: Anthropic
  private cachedModels: AvailableModel[] | null = null

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      throw new Error(
        'ANTHROPIC_API_KEY invalide. Les clés Anthropic commencent par "sk-ant-". ' +
          'Vérifiez votre clé sur https://console.anthropic.com/'
      )
    }
    this.client = new Anthropic({ apiKey })
  }

  /**
   * Détecte les modèles Claude disponibles via l'API
   * Teste chaque modèle avec une requête minimale
   */
  async detectAvailableModels(): Promise<AvailableModel[]> {
    if (this.cachedModels) {
      return this.cachedModels
    }

    const models: AvailableModel[] = []

    // Liste des modèles prioritaires à tester en premier (Claude 3.5 Sonnet)
    // On teste d'abord les plus importants pour éviter les tests inutiles
    const priorityModels = [
      // Claude 3.5 Sonnet (support PDF) - PRIORITÉ 1
      {
        name: 'claude-3-5-sonnet-20241022',
        supportsPdf: true,
        version: '3.5 Sonnet Oct 2024',
      },
      {
        name: 'claude-3-5-sonnet-20240620',
        supportsPdf: true,
        version: '3.5 Sonnet Jun 2024',
      },
    ]

    // Modèles de fallback (moins prioritaires)
    const fallbackModels = [
      // Claude 3.5 Haiku (peut supporter PDF)
      {
        name: 'claude-3-5-haiku-20241022',
        supportsPdf: true,
        version: '3.5 Haiku Oct 2024',
      },
      {
        name: 'claude-3-5-haiku-20240620',
        supportsPdf: true,
        version: '3.5 Haiku Jun 2024',
      },
    ]

    log.debug('Détection des modèles disponibles')

    // Tester d'abord les modèles prioritaires (Claude 3.5 Sonnet)
    for (const model of priorityModels) {
      try {
        // Test avec une requête minimale (rapide et peu coûteux)
        const testResponse = await this.client.messages.create({
          model: model.name,
          max_tokens: 10,
          messages: [
            {
              role: 'user',
              content: 'test',
            },
          ],
        })

        if (testResponse && testResponse.content) {
          models.push({
            name: model.name,
            supportsPdf: model.supportsPdf,
            supportsImages: model.supportsPdf,
            version: model.version,
          })
          log.info({ modelName: model.name, version: model.version }, 'Modèle disponible')
          // Si on trouve un modèle Claude 3.5 Sonnet, on peut arrêter ici pour gagner du temps
          // car c'est le meilleur pour notre cas d'usage
          if (models.length >= 1 && model.name.includes('3-5-sonnet')) {
            log.info({ modelName: model.name }, 'Modèle optimal trouvé, arrêt de la détection')
            this.cachedModels = models
            return models
          }
        }
      } catch (error: any) {
        // Erreur 404 = modèle non disponible pour ce compte
        if (error.status === 404 || error.error?.type === 'not_found_error') {
          log.debug({ modelName: model.name, status: 404 }, 'Modèle non disponible')
        } else {
          // Autre erreur (401, 403, etc.) = problème de clé API ou permissions
          log.warn({
            modelName: model.name,
            status: error.status || 'unknown',
            message: error.message || error.error?.message || 'unknown',
          }, 'Erreur test modèle')
        }
      }
    }

    // Si aucun modèle prioritaire n'est disponible, tester les fallbacks
    if (models.length === 0) {
      log.warn('Aucun modèle prioritaire disponible, test des fallbacks')
      for (const model of fallbackModels) {
        try {
          const testResponse = await this.client.messages.create({
            model: model.name,
            max_tokens: 10,
            messages: [
              {
                role: 'user',
                content: 'test',
              },
            ],
          })

          if (testResponse && testResponse.content) {
            models.push({
              name: model.name,
              supportsPdf: model.supportsPdf,
              supportsImages: model.supportsPdf,
              version: model.version,
            })
            log.info({ modelName: model.name, version: model.version }, 'Modèle fallback disponible')
            break // Un fallback suffit
          }
        } catch (error: any) {
          if (error.status === 404 || error.error?.type === 'not_found_error') {
            log.debug({ modelName: model.name, status: 404 }, 'Modèle fallback non disponible')
          }
        }
      }
    }

    this.cachedModels = models

    if (models.length === 0) {
      throw new Error(
        'Aucun modèle Claude 3.5 disponible pour analyser les PDFs. ' +
          'Les modèles Claude 3.5 Sonnet (claude-3-5-sonnet-*) ne sont pas accessibles avec votre clé API. ' +
          'Vérifiez que votre clé API ANTHROPIC_API_KEY est valide ' +
          'et que votre compte Anthropic a accès aux modèles Claude 3.5. ' +
          'Consultez https://console.anthropic.com/ pour vérifier votre clé et votre accès aux modèles.'
      )
    }

    log.info({
      count: models.length,
      models: models.map((m) => m.name),
    }, 'Modèles disponibles détectés')

    return models
  }

  /**
   * Trouve le meilleur modèle pour analyser des PDFs/images
   */
  async findBestModelForPdf(): Promise<string> {
    const available = await this.detectAvailableModels()

    // Priorité aux modèles qui supportent les PDFs
    const pdfModels = available.filter((m) => m.supportsPdf)

    if (pdfModels.length === 0) {
      throw new Error(
        'Aucun modèle Claude avec support PDF disponible. ' +
          'Seuls les modèles Claude 3.5 supportent les PDFs. ' +
          'Vérifiez votre clé API et votre accès aux modèles Claude 3.5.'
      )
    }

    // Prioriser Claude 3.5 Sonnet (meilleure qualité)
    const sonnet35 = pdfModels.find((m) => m.name.includes('3-5-sonnet'))
    if (sonnet35) {
      log.info({ modelName: sonnet35.name }, 'Modèle sélectionné pour PDF')
      return sonnet35.name
    }

    // Sinon, prendre le premier disponible qui supporte PDF
    const selected = pdfModels[0]
    log.info({ modelName: selected.name }, 'Modèle sélectionné pour PDF (fallback)')
    return selected.name
  }

  /**
   * Trouve le meilleur modèle pour texte uniquement (plus rapide/économique)
   */
  async findBestModelForText(): Promise<string> {
    const available = await this.detectAvailableModels()

    // Prioriser Haiku (plus rapide et économique)
    const haiku = available.find((m) => m.name.includes('haiku'))
    if (haiku) {
      return haiku.name
    }

    // Sinon, Sonnet
    const sonnet = available.find((m) => m.name.includes('sonnet'))
    if (sonnet) {
      return sonnet.name
    }

    // Dernier recours : premier disponible
    if (available.length > 0) {
      return available[0].name
    }

    throw new Error('Aucun modèle Claude disponible pour texte')
  }

  /**
   * Réinitialise le cache (utile pour forcer une nouvelle détection)
   */
  clearCache(): void {
    this.cachedModels = null
  }
}
