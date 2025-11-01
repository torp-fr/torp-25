/**
 * TORP Data Scraper Service
 * Scraping interne pour enrichir la base de données sans surcharger le flux
 */

import { prisma } from '@/lib/db'
import { globalCache } from '@/services/cache/data-cache'
import type { Devis } from '@/types'

interface ScrapingTask {
  id: string
  type: 'price' | 'cadastre' | 'georisques' | 'company' | 'compliance'
  target: string // ID, adresse, etc.
  priority: 'low' | 'medium' | 'high'
  scheduledFor: Date
  retries: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
}

export class DataScraper {
  private readonly batchSize = 10 // Nombre de tâches par batch
  private readonly minInterval = 1000 * 60 * 15 // 15 minutes minimum entre batches
  private readonly maxRetries = 3
  private scrapingQueue: ScrapingTask[] = []
  private lastScrapingTime = 0

  /**
   * Ajoute une tâche de scraping à la queue
   */
  async scheduleScraping(
    type: ScrapingTask['type'],
    target: string,
    priority: ScrapingTask['priority'] = 'medium',
    delay: number = 0 // Délai en millisecondes
  ): Promise<string> {
    const taskId = `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const scheduledFor = new Date(Date.now() + delay)

    const task: ScrapingTask = {
      id: taskId,
      type,
      target,
      priority,
      scheduledFor,
      retries: 0,
      status: 'pending',
    }

    this.scrapingQueue.push(task)
    
    // Trier par priorité et date
    this.scrapingQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return a.scheduledFor.getTime() - b.scheduledFor.getTime()
    })

    console.log(`[DataScraper] 📋 Tâche programmée: ${type} pour ${target} (priorité: ${priority})`)
    return taskId
  }

  /**
   * Exécute le scraping d'une tâche
   */
  private async executeScraping(task: ScrapingTask): Promise<boolean> {
    try {
      task.status = 'in_progress'
      console.log(`[DataScraper] 🔄 Exécution: ${task.type} - ${task.target}`)

      switch (task.type) {
        case 'price':
          return await this.scrapePriceData(task.target)
        case 'cadastre':
          return await this.scrapeCadastralData(task.target)
        case 'georisques':
          return await this.scrapeGeorisquesData(task.target)
        case 'company':
          return await this.scrapeCompanyData(task.target)
        case 'compliance':
          return await this.scrapeComplianceData(task.target)
        default:
          console.warn(`[DataScraper] Type inconnu: ${task.type}`)
          return false
      }
    } catch (error) {
      console.error(`[DataScraper] ❌ Erreur scraping ${task.type}:`, error)
      return false
    }
  }

  /**
   * Scrape les données de prix pour une catégorie/région
   */
  private async scrapePriceData(target: string): Promise<boolean> {
    try {
      // Extraire catégorie et région depuis target (format: "category:region")
      const [category, region] = target.split(':')
      
      // Utiliser le cache pour éviter les doublons
      const cacheKey = `scrape:price:${category}:${region}`
      if (globalCache.get(cacheKey)) {
        console.log(`[DataScraper] ⏭️  Prix déjà scrapés récemment pour ${target}`)
        return true
      }

      // Simuler le scraping (remplacer par vrai scraping si nécessaire)
      // Dans un vrai cas, on appellerait les APIs externes
      console.log(`[DataScraper] 💰 Scraping prix: ${category} en ${region}`)
      
      // Marquer comme scrapé
      globalCache.set(cacheKey, true, 1000 * 60 * 60 * 24) // 24h
      
      return true
    } catch (error) {
      console.error(`[DataScraper] Erreur scraping prix:`, error)
      return false
    }
  }

  /**
   * Scrape les données cadastrales pour une adresse
   */
  private async scrapeCadastralData(address: string): Promise<boolean> {
    try {
      const cacheKey = `scrape:cadastre:${address}`
      if (globalCache.getCadastral(cacheKey)) {
        console.log(`[DataScraper] ⏭️  Cadastre déjà scrapé pour ${address}`)
        return true
      }

      console.log(`[DataScraper] 🏠 Scraping cadastre: ${address}`)
      
      // TODO: Appeler l'API cadastre et stocker les résultats
      
      return true
    } catch (error) {
      console.error(`[DataScraper] Erreur scraping cadastre:`, error)
      return false
    }
  }

  /**
   * Scrape les données Géorisques pour une adresse
   */
  private async scrapeGeorisquesData(address: string): Promise<boolean> {
    try {
      const cacheKey = `scrape:georisques:${address}`
      if (globalCache.get(cacheKey)) {
        console.log(`[DataScraper] ⏭️  Géorisques déjà scrapé pour ${address}`)
        return true
      }

      console.log(`[DataScraper] ⚠️  Scraping Géorisques: ${address}`)
      
      // TODO: Appeler l'API Géorisques et stocker les résultats
      
      return true
    } catch (error) {
      console.error(`[DataScraper] Erreur scraping Géorisques:`, error)
      return false
    }
  }

  /**
   * Scrape les données d'entreprise pour un SIRET
   */
  private async scrapeCompanyData(siret: string): Promise<boolean> {
    try {
      const cacheKey = `scrape:company:${siret}`
      if (globalCache.getEnrichment(cacheKey)) {
        console.log(`[DataScraper] ⏭️  Entreprise déjà scrapée pour ${siret}`)
        return true
      }

      console.log(`[DataScraper] 🏢 Scraping entreprise: ${siret}`)
      
      // TODO: Appeler Sirene/Infogreffe et stocker les résultats
      
      return true
    } catch (error) {
      console.error(`[DataScraper] Erreur scraping entreprise:`, error)
      return false
    }
  }

  /**
   * Scrape les données de conformité
   */
  private async scrapeComplianceData(target: string): Promise<boolean> {
    try {
      console.log(`[DataScraper] 📋 Scraping conformité: ${target}`)
      
      // TODO: Scraper DTU, normes, certifications
      
      return true
    } catch (error) {
      console.error(`[DataScraper] Erreur scraping conformité:`, error)
      return false
    }
  }

  /**
   * Traite la queue de scraping par batch
   */
  async processQueue(): Promise<void> {
    const now = Date.now()
    
    // Vérifier l'intervalle minimum
    if (now - this.lastScrapingTime < this.minInterval) {
      const waitTime = Math.ceil((this.minInterval - (now - this.lastScrapingTime)) / 1000)
      console.log(`[DataScraper] ⏸️  Attente ${waitTime}s avant prochain batch...`)
      return
    }

    // Filtrer les tâches prêtes
    const readyTasks = this.scrapingQueue.filter(
      (task) => task.status === 'pending' && task.scheduledFor <= new Date()
    )

    if (readyTasks.length === 0) {
      console.log(`[DataScraper] 📋 Aucune tâche prête (${this.scrapingQueue.length} en attente)`)
      return
    }

    // Prendre un batch
    const batch = readyTasks.slice(0, this.batchSize)
    console.log(`[DataScraper] 🚀 Traitement batch de ${batch.length} tâches`)

    // Exécuter en parallèle (avec limite)
    const results = await Promise.allSettled(
      batch.map((task) => this.executeScraping(task))
    )

    // Mettre à jour les statuts
    results.forEach((result, index) => {
      const task = batch[index]
      
      if (result.status === 'fulfilled' && result.value) {
        task.status = 'completed'
        console.log(`[DataScraper] ✅ Tâche ${task.id} complétée`)
      } else {
        task.retries++
        if (task.retries >= this.maxRetries) {
          task.status = 'failed'
          console.error(`[DataScraper] ❌ Tâche ${task.id} échouée après ${task.retries} tentatives`)
        } else {
          task.status = 'pending'
          task.scheduledFor = new Date(Date.now() + 1000 * 60 * 15 * task.retries) // Retry avec backoff
          console.log(`[DataScraper] 🔄 Tâche ${task.id} reprogrammée (tentative ${task.retries}/${this.maxRetries})`)
        }
      }
    })

    // Nettoyer les tâches complétées/échouées
    this.scrapingQueue = this.scrapingQueue.filter(
      (task) => task.status === 'pending' || task.status === 'in_progress'
    )

    this.lastScrapingTime = now
    console.log(`[DataScraper] 📊 Queue: ${this.scrapingQueue.length} tâches restantes`)
  }

  /**
   * Planifie le scraping automatique pour de nouveaux devis
   */
  async scheduleDevisScraping(devisId: string): Promise<void> {
    try {
      const devis = await prisma.devis.findUnique({
        where: { id: devisId },
        include: {
          torpScores: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!devis) return

      const extractedData = devis.extractedData as any || {}
      const company = extractedData.company || {}
      const project = extractedData.project || {}

      // Scraping entreprise (priorité haute)
      if (company.siret) {
        await this.scheduleScraping('company', company.siret, 'high', 0)
      }

      // Scraping prix (priorité moyenne)
      if (project.type && project.location?.region) {
        await this.scheduleScraping(
          'price',
          `${project.type}:${project.location.region}`,
          'medium',
          1000 * 60 * 5 // 5 minutes de délai
        )
      }

      // Scraping cadastre (si adresse disponible)
      if (project.location?.address) {
        await this.scheduleScraping(
          'cadastre',
          project.location.address,
          'low',
          1000 * 60 * 10 // 10 minutes de délai
        )
        
        await this.scheduleScraping(
          'georisques',
          project.location.address,
          'low',
          1000 * 60 * 15 // 15 minutes de délai
        )
      }

      console.log(`[DataScraper] 📋 Scraping programmé pour devis ${devisId}`)
    } catch (error) {
      console.error(`[DataScraper] Erreur programmation scraping devis:`, error)
    }
  }

  /**
   * Obtient les statistiques de la queue
   */
  getQueueStats(): {
    total: number
    pending: number
    inProgress: number
    completed: number
    failed: number
  } {
    return {
      total: this.scrapingQueue.length,
      pending: this.scrapingQueue.filter((t) => t.status === 'pending').length,
      inProgress: this.scrapingQueue.filter((t) => t.status === 'in_progress').length,
      completed: this.scrapingQueue.filter((t) => t.status === 'completed').length,
      failed: this.scrapingQueue.filter((t) => t.status === 'failed').length,
    }
  }
}

// Singleton global
export const globalScraper = new DataScraper()

