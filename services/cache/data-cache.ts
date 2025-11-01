/**
 * TORP Data Cache Service
 * Amélioration des performances via mise en cache intelligente
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

export class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private readonly defaultTTL = 1000 * 60 * 30 // 30 minutes par défaut

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Vérifier expiration
    const now = Date.now()
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Stocke une valeur dans le cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }
    this.cache.set(key, entry)
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Génère une clé de cache pour une requête
   */
  static generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}=${JSON.stringify(params[k])}`)
      .join('&')
    return `${prefix}:${sortedParams}`
  }

  /**
   * Cache pour données enrichies (TTL plus long)
   */
  setEnrichment(key: string, data: any): void {
    this.set(key, data, 1000 * 60 * 60 * 24) // 24h pour données enrichies
  }

  /**
   * Cache pour prix de référence (TTL moyen)
   */
  setPriceReference(key: string, data: any): void {
    this.set(key, data, 1000 * 60 * 60 * 6) // 6h pour prix
  }

  /**
   * Cache pour données cadastrales (TTL long - changent rarement)
   */
  setCadastral(key: string, data: any): void {
    this.set(key, data, 1000 * 60 * 60 * 24 * 7) // 7 jours pour cadastre
  }

  /**
   * Récupère une référence de prix depuis le cache
   */
  getPriceReference<T>(key: string): T | null {
    return this.get<T>(key)
  }

  /**
   * Récupère des données cadastrales depuis le cache
   */
  getCadastral<T>(key: string): T | null {
    return this.get<T>(key)
  }

  /**
   * Statistiques du cache
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Singleton global
export const globalCache = new DataCache()

// Nettoyage automatique toutes les heures
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup()
  }, 1000 * 60 * 60) // 1 heure
}

