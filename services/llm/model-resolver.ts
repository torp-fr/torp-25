/**
 * Model Resolver - Détecte et résout automatiquement les modèles Claude disponibles
 * Évite les erreurs 404 en testant les modèles avant utilisation
 */

import Anthropic from '@anthropic-ai/sdk'

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

    // Liste complète des modèles Claude à tester
    const allModels = [
      // Claude 3.5 Sonnet (support PDF)
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

      // Claude 3.5 Haiku (peut-être support PDF)
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

      // Claude 3 Opus (fallback, texte uniquement)
      {
        name: 'claude-3-opus-20240229',
        supportsPdf: false,
        version: '3 Opus Feb 2024',
      },

      // Claude 3 Sonnet (fallback, texte uniquement)
      {
        name: 'claude-3-sonnet-20240229',
        supportsPdf: false,
        version: '3 Sonnet Feb 2024',
      },

      // Claude 3 Haiku (fallback, texte uniquement)
      {
        name: 'claude-3-haiku-20240307',
        supportsPdf: false,
        version: '3 Haiku Mar 2024',
      },
    ]

    console.log('[ModelResolver] 🔍 Détection des modèles disponibles...')

    // Tester chaque modèle avec une requête minimale
    for (const model of allModels) {
      try {
        // Test avec un message texte simple (rapide et peu coûteux)
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
            supportsImages: model.supportsPdf, // Généralement les mêmes capacités
            version: model.version,
          })
          console.log(`[ModelResolver] ✅ ${model.name} est disponible`)
        }
      } catch (error: any) {
        // Erreur 404 = modèle non disponible
        // Autres erreurs = peut-être disponible mais problème de requête
        if (error.status === 404 || error.error?.type === 'not_found_error') {
          console.log(
            `[ModelResolver] ❌ ${model.name} n'est pas disponible (404)`
          )
        } else {
          // Autre erreur = le modèle existe peut-être mais la requête a échoué
          // On le considère comme disponible mais avec une note
          console.warn(
            `[ModelResolver] ⚠️ ${model.name} - erreur: ${error.message || error.error?.message || 'unknown'}`
          )
          // Ne pas l'ajouter si erreur autre que 404
        }
      }
    }

    this.cachedModels = models

    if (models.length === 0) {
      throw new Error(
        'Aucun modèle Claude disponible. ' +
          'Vérifiez que votre clé API ANTHROPIC_API_KEY est valide ' +
          'et que votre compte a accès aux modèles Claude. ' +
          'Consultez https://console.anthropic.com/ pour vérifier votre clé.'
      )
    }

    console.log(
      `[ModelResolver] ✅ ${models.length} modèle(s) disponible(s): ${models.map((m) => m.name).join(', ')}`
    )

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
      console.log(
        `[ModelResolver] ✅ Modèle sélectionné pour PDF: ${sonnet35.name}`
      )
      return sonnet35.name
    }

    // Sinon, prendre le premier disponible qui supporte PDF
    const selected = pdfModels[0]
    console.log(
      `[ModelResolver] ✅ Modèle sélectionné pour PDF: ${selected.name}`
    )
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
