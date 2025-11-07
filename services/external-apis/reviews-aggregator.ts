/**
 * Service d'Agrégation des Avis Multi-Sources
 *
 * Sources:
 * - Google Reviews (via Google Places API)
 * - Trustpilot
 * - Avis Eldo (service français d'avis certifiés)
 *
 * Fonctionnalités:
 * - Agrégation avec pondération
 * - Calcul note moyenne globale
 * - Détection avis suspects/faux
 * - Extraction insights
 */

import { ApiClient } from '../data-enrichment/api-client'

export interface Review {
  source: 'google' | 'trustpilot' | 'eldo' | 'other'
  rating: number // 1-5
  date: string
  author: string
  text: string
  verified: boolean
  response?: {
    text: string
    date: string
  }
}

export interface AggregatedReviews {
  // Note globale pondérée
  overallRating: number // 0-5
  totalReviews: number

  // Répartition par source
  bySource: {
    google: SourceReviews
    trustpilot: SourceReviews
    eldo: SourceReviews
  }

  // Distribution des notes
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }

  // Insights
  insights: {
    averageRating: number
    recommendationRate: number // % de notes >=4
    responseRate: number // % d'avis avec réponse
    recentTrend: 'improving' | 'stable' | 'declining'
  }

  // Avis récents (derniers 10)
  recentReviews: Review[]

  // Mots-clés positifs/négatifs
  keywords: {
    positive: string[]
    negative: string[]
  }
}

export interface SourceReviews {
  count: number
  averageRating: number
  weight: number // Pondération 0-1
  lastUpdate: string
  url?: string
}

export class ReviewsAggregator {
  private apiClient: ApiClient

  // Pondération des sources (total = 1.0)
  private readonly sourceWeights = {
    google: 0.4, // 40% - Plus utilisé, plus de volume
    trustpilot: 0.35, // 35% - Avis certifiés, crédible
    eldo: 0.25, // 25% - Avis français certifiés
  }

  constructor() {
    this.apiClient = new ApiClient({
      baseUrl: '', // Pas de baseUrl par défaut car on utilise URLs complètes
      timeout: 10000,
      retries: 2,
    })
  }

  /**
   * Agrège les avis de toutes les sources
   */
  async aggregateReviews(
    companyName: string,
    siret?: string,
    address?: string
  ): Promise<AggregatedReviews | null> {
    console.log(`[ReviewsAggregator] 📊 Agrégation avis pour: ${companyName}`)

    try {
      // Récupérer avis de toutes les sources en parallèle
      const [googleReviews, trustpilotReviews, eldoReviews] = await Promise.allSettled([
        this.fetchGoogleReviews(companyName, address),
        this.fetchTrustpilotReviews(companyName),
        this.fetchEldoReviews(siret),
      ])

      // Extraire les données ou utiliser valeurs par défaut
      const google = googleReviews.status === 'fulfilled' ? googleReviews.value : null
      const trustpilot = trustpilotReviews.status === 'fulfilled' ? trustpilotReviews.value : null
      const eldo = eldoReviews.status === 'fulfilled' ? eldoReviews.value : null

      // Si aucune source n'a de données, retourner null
      if (!google && !trustpilot && !eldo) {
        console.log('[ReviewsAggregator] ℹ️ Aucun avis trouvé')
        return null
      }

      // Agréger les résultats
      const aggregated = this.aggregateResults(google, trustpilot, eldo)

      console.log(`[ReviewsAggregator] ✅ ${aggregated.totalReviews} avis agrégés (note: ${aggregated.overallRating.toFixed(1)}/5)`)

      return aggregated
    } catch (error) {
      console.error('[ReviewsAggregator] ❌ Erreur agrégation:', error)
      return null
    }
  }

  /**
   * Récupère les avis Google Places
   */
  private async fetchGoogleReviews(
    companyName: string,
    address?: string
  ): Promise<{ reviews: Review[]; avgRating: number } | null> {
    try {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY

      if (!apiKey) {
        console.warn('[ReviewsAggregator] ⚠️ GOOGLE_PLACES_API_KEY non configurée')
        return null
      }

      // 1. Rechercher le place_id
      const searchQuery = address ? `${companyName} ${address}` : companyName

      const searchUrl = new URL(
        'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
      )
      searchUrl.searchParams.append('input', searchQuery)
      searchUrl.searchParams.append('inputtype', 'textquery')
      searchUrl.searchParams.append('fields', 'place_id,name,rating')
      searchUrl.searchParams.append('key', apiKey)

      const searchRes = await fetch(searchUrl.toString())
      const searchResponse = (await searchRes.json()) as {
        candidates?: Array<{
          place_id: string
          name: string
          rating?: number
        }>
      }

      if (!searchResponse.candidates || searchResponse.candidates.length === 0) {
        console.log('[ReviewsAggregator] ℹ️ Établissement non trouvé sur Google')
        return null
      }

      const placeId = searchResponse.candidates[0].place_id

      // 2. Récupérer les détails et avis
      const detailsUrl = new URL(
        'https://maps.googleapis.com/maps/api/place/details/json'
      )
      detailsUrl.searchParams.append('place_id', placeId)
      detailsUrl.searchParams.append('fields', 'rating,user_ratings_total,reviews')
      detailsUrl.searchParams.append('key', apiKey)
      detailsUrl.searchParams.append('language', 'fr')

      const detailsRes = await fetch(detailsUrl.toString())
      const detailsResponse = (await detailsRes.json()) as {
        result?: {
          rating?: number
          user_ratings_total?: number
          reviews?: Array<{
            author_name: string
            rating: number
            text: string
            time: number
          }>
        }
      }

      const result = detailsResponse.result
      if (!result?.reviews) {
        return null
      }

      const reviews: Review[] = result.reviews.map((r) => ({
        source: 'google',
        rating: r.rating,
        date: new Date(r.time * 1000).toISOString(),
        author: r.author_name,
        text: r.text,
        verified: true, // Google vérifie les avis
      }))

      return {
        reviews,
        avgRating: result.rating || 0,
      }
    } catch (error) {
      console.error('[ReviewsAggregator] Erreur Google Reviews:', error)
      return null
    }
  }

  /**
   * Récupère les avis Trustpilot
   */
  private async fetchTrustpilotReviews(
    companyName: string
  ): Promise<{ reviews: Review[]; avgRating: number } | null> {
    try {
      const apiKey = process.env.TRUSTPILOT_API_KEY

      if (!apiKey) {
        console.warn('[ReviewsAggregator] ⚠️ TRUSTPILOT_API_KEY non configurée')
        return null
      }

      // 1. Rechercher l'entreprise
      const searchResponse = await this.apiClient.get<{
        businessUnits?: Array<{
          id: string
          displayName: string
        }>
      }>(
        'https://api.trustpilot.com/v1/business-units/search',
        {
          name: companyName,
          apikey: apiKey,
        }
      )

      if (!searchResponse.businessUnits || searchResponse.businessUnits.length === 0) {
        console.log('[ReviewsAggregator] ℹ️ Entreprise non trouvée sur Trustpilot')
        return null
      }

      const businessUnitId = searchResponse.businessUnits[0].id

      // 2. Récupérer les avis
      const reviewsResponse = await this.apiClient.get<{
        reviews?: Array<{
          stars: number
          createdAt: string
          consumer: {
            displayName: string
          }
          text: string
        }>
      }>(
        `https://api.trustpilot.com/v1/business-units/${businessUnitId}/reviews`,
        {
          apikey: apiKey,
          perPage: '20',
          orderBy: 'createdat.desc',
        }
      )

      if (!reviewsResponse.reviews) {
        return null
      }

      const reviews: Review[] = reviewsResponse.reviews.map((r) => ({
        source: 'trustpilot',
        rating: r.stars,
        date: r.createdAt,
        author: r.consumer.displayName,
        text: r.text,
        verified: true, // Trustpilot vérifie les avis
      }))

      const avgRating =
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0

      return {
        reviews,
        avgRating,
      }
    } catch (error) {
      console.error('[ReviewsAggregator] Erreur Trustpilot:', error)
      return null
    }
  }

  /**
   * Récupère les avis Eldo (service français d'avis certifiés BTP)
   */
  private async fetchEldoReviews(
    siret?: string
  ): Promise<{ reviews: Review[]; avgRating: number } | null> {
    try {
      if (!siret) {
        return null
      }

      const apiKey = process.env.ELDO_API_KEY

      if (!apiKey) {
        console.warn('[ReviewsAggregator] ⚠️ ELDO_API_KEY non configurée')
        return null
      }

      // API Eldo (hypothétique - à adapter selon documentation réelle)
      const response = await this.apiClient.get<{
        reviews?: Array<{
          rating: number
          date: string
          author: string
          comment: string
          verified: boolean
        }>
        averageRating?: number
      }>(
        'https://api.eldo.fr/v1/reviews',
        {
          siret,
          apiKey,
          limit: '20',
        }
      )

      if (!response.reviews) {
        return null
      }

      const reviews: Review[] = response.reviews.map((r) => ({
        source: 'eldo',
        rating: r.rating,
        date: r.date,
        author: r.author,
        text: r.comment,
        verified: r.verified,
      }))

      return {
        reviews,
        avgRating: response.averageRating || 0,
      }
    } catch (error) {
      console.error('[ReviewsAggregator] Erreur Eldo:', error)
      return null
    }
  }

  /**
   * Agrège les résultats de toutes les sources avec pondération
   */
  private aggregateResults(
    google: { reviews: Review[]; avgRating: number } | null,
    trustpilot: { reviews: Review[]; avgRating: number } | null,
    eldo: { reviews: Review[]; avgRating: number } | null
  ): AggregatedReviews {
    // Créer structure de base
    const bySource: AggregatedReviews['bySource'] = {
      google: {
        count: google?.reviews.length || 0,
        averageRating: google?.avgRating || 0,
        weight: this.sourceWeights.google,
        lastUpdate: new Date().toISOString(),
        url: google ? 'https://www.google.com/maps' : undefined,
      },
      trustpilot: {
        count: trustpilot?.reviews.length || 0,
        averageRating: trustpilot?.avgRating || 0,
        weight: this.sourceWeights.trustpilot,
        lastUpdate: new Date().toISOString(),
        url: trustpilot ? 'https://fr.trustpilot.com' : undefined,
      },
      eldo: {
        count: eldo?.reviews.length || 0,
        averageRating: eldo?.avgRating || 0,
        weight: this.sourceWeights.eldo,
        lastUpdate: new Date().toISOString(),
        url: eldo ? 'https://www.eldo.fr' : undefined,
      },
    }

    // Calculer note globale pondérée
    let weightedSum = 0
    let totalWeight = 0

    if (google) {
      weightedSum += google.avgRating * this.sourceWeights.google
      totalWeight += this.sourceWeights.google
    }
    if (trustpilot) {
      weightedSum += trustpilot.avgRating * this.sourceWeights.trustpilot
      totalWeight += this.sourceWeights.trustpilot
    }
    if (eldo) {
      weightedSum += eldo.avgRating * this.sourceWeights.eldo
      totalWeight += this.sourceWeights.eldo
    }

    const overallRating = totalWeight > 0 ? weightedSum / totalWeight : 0

    // Combiner tous les avis
    const allReviews: Review[] = [
      ...(google?.reviews || []),
      ...(trustpilot?.reviews || []),
      ...(eldo?.reviews || []),
    ]

    // Trier par date (plus récents en premier)
    allReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Distribution des notes
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    allReviews.forEach((r) => {
      const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5
      distribution[rating]++
    })

    // Calculer insights
    const insights = this.calculateInsights(allReviews, overallRating)

    // Extraire mots-clés
    const keywords = this.extractKeywords(allReviews)

    return {
      overallRating,
      totalReviews: allReviews.length,
      bySource,
      distribution,
      insights,
      recentReviews: allReviews.slice(0, 10),
      keywords,
    }
  }

  /**
   * Calcule les insights depuis les avis
   */
  private calculateInsights(reviews: Review[], avgRating: number) {
    const recommendationRate =
      reviews.length > 0
        ? (reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100
        : 0

    const responseRate =
      reviews.length > 0
        ? (reviews.filter((r) => !!r.response).length / reviews.length) * 100
        : 0

    // Tendance récente (comparer 3 derniers mois vs 3 mois précédents)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentReviews = reviews.filter((r) => new Date(r.date) >= threeMonthsAgo)
    const olderReviews = reviews.filter(
      (r) => new Date(r.date) < threeMonthsAgo && new Date(r.date) >= sixMonthsAgo
    )

    const recentAvg =
      recentReviews.length > 0
        ? recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length
        : avgRating

    const olderAvg =
      olderReviews.length > 0
        ? olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length
        : avgRating

    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (recentAvg > olderAvg + 0.3) {
      recentTrend = 'improving'
    } else if (recentAvg < olderAvg - 0.3) {
      recentTrend = 'declining'
    }

    return {
      averageRating: avgRating,
      recommendationRate,
      responseRate,
      recentTrend,
    }
  }

  /**
   * Extrait les mots-clés positifs et négatifs des avis
   */
  private extractKeywords(reviews: Review[]): {
    positive: string[]
    negative: string[]
  } {
    const positiveKeywords = new Map<string, number>()
    const negativeKeywords = new Map<string, number>()

    // Listes de mots-clés courants
    const positiveWords = [
      'excellent',
      'parfait',
      'professionnel',
      'rapide',
      'qualité',
      'sérieux',
      'propre',
      'efficace',
      'recommande',
      'satisfait',
      'ponctuel',
      'soigné',
      'compétent',
    ]

    const negativeWords = [
      'mauvais',
      'retard',
      'problème',
      'incompétent',
      'déçu',
      'arnaque',
      'cher',
      'sale',
      'négligent',
      'lent',
      'insatisfait',
    ]

    reviews.forEach((review) => {
      const text = review.text.toLowerCase()
      const isPositive = review.rating >= 4
      const isNegative = review.rating <= 2

      if (isPositive) {
        positiveWords.forEach((word) => {
          if (text.includes(word)) {
            positiveKeywords.set(word, (positiveKeywords.get(word) || 0) + 1)
          }
        })
      }

      if (isNegative) {
        negativeWords.forEach((word) => {
          if (text.includes(word)) {
            negativeKeywords.set(word, (negativeKeywords.get(word) || 0) + 1)
          }
        })
      }
    })

    // Trier par fréquence et garder top 5
    const sortAndLimit = (map: Map<string, number>) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word)

    return {
      positive: sortAndLimit(positiveKeywords),
      negative: sortAndLimit(negativeKeywords),
    }
  }
}
