/**
 * Service pour récupérer les données DVF (Demandes de Valeurs Foncières)
 * Dataset data.gouv.fr: https://www.data.gouv.fr/fr/datasets/5c4ae55a634f4117716d5656/
 * API DVF+: https://www.data.gouv.fr/dataservices/api-dvf/
 * 
 * Les données DVF permettent de :
 * - Estimer la valeur d'un bien immobilier
 * - Comparer avec les transactions récentes du secteur
 * - Analyser l'évolution des prix locaux
 * - Valoriser un bien avant travaux ou revente
 */

import type { AddressData } from './types'

export interface DVFTransaction {
  id?: string
  date_mutation: string // Date de mutation (format YYYY-MM-DD)
  nature_mutation: string // Type de mutation (Vente, Vente en l'état futur d'achèvement, etc.)
  valeur_fonciere: number // Valeur foncière en euros
  type_local?: string // Type de local (Maison, Appartement, Local industriel, etc.)
  surface_reelle_bati?: number // Surface réelle bâti en m²
  nombre_pieces_principales?: number // Nombre de pièces principales
  surface_terrain?: number // Surface terrain en m²
  latitude?: number
  longitude?: number
  code_commune?: string
  nom_commune?: string
  code_postal?: string
  code_departement?: string
}

export interface DVFStatistics {
  // Statistiques générales
  total_transactions: number
  date_min: string // Date de la transaction la plus ancienne
  date_max: string // Date de la transaction la plus récente
  
  // Prix au m²
  prix_m2_min?: number
  prix_m2_max?: number
  prix_m2_median?: number
  prix_m2_moyen?: number
  
  // Valeurs foncières
  valeur_min?: number
  valeur_max?: number
  valeur_median?: number
  valeur_moyenne?: number
  
  // Évolution temporelle (par année)
  evolution_annuelle?: Array<{
    annee: number
    nombre_transactions: number
    prix_m2_moyen: number
    valeur_moyenne: number
  }>
  
  // Répartition par type de local
  par_type_local?: Record<string, {
    count: number
    prix_m2_moyen: number
    valeur_moyenne: number
  }>
}

export interface DVFData {
  address: string
  codeInsee?: string
  coordinates?: { lat: number; lng: number }
  
  // Transactions trouvées
  transactions: DVFTransaction[]
  
  // Statistiques
  statistics?: DVFStatistics
  
  // Estimation pour le bien
  estimation?: {
    valeur_estimee?: number // Estimation en euros
    prix_m2_estime?: number // Prix au m² estimé
    fourchette_basse?: number
    fourchette_haute?: number
    confiance?: number // 0-100
    methode?: string // "moyenne_secteur" | "median_secteur" | "comparables"
  }
  
  // Comparables (biens similaires)
  comparables?: Array<{
    transaction: DVFTransaction
    similarite?: number // Score de similarité 0-100
    criteres_similaires?: string[]
  }>
  
  sources: string[]
  lastUpdated: string
}

export class DVFService {
  // Note: API DVF+ peut nécessiter une clé API selon les fonctionnalités
  // Utilisation de l'API DVF+ de cquest.org (service tiers gratuit et performant)
  private readonly dvfApiUrl = 'https://api.cquest.org/dvf'

  constructor() {
    // Le service utilise directement fetch() pour l'API DVF+
  }

  /**
   * Récupère les données DVF pour une adresse/commune
   */
  async getDVFData(address: AddressData, filters?: {
    rayon?: number // Rayon en mètres pour la recherche
    annee_min?: number // Année minimale (défaut: il y a 5 ans)
    annee_max?: number // Année maximale (défaut: année courante)
    type_local?: string // Filtrer par type de local
    surface_min?: number // Surface minimale en m²
    surface_max?: number // Surface maximale en m²
  }): Promise<DVFData | null> {
    try {
      const { coordinates, city, postalCode } = address

      if (!postalCode && !coordinates) {
        console.warn('[DVFService] Code postal ou coordonnées manquantes pour:', address.formatted)
        return null
      }

      // Récupérer le code INSEE
      let codeInsee: string | null = null
      try {
        const communeResponse = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&nom=${encodeURIComponent(city)}&format=json`,
          {
            headers: { Accept: 'application/json' },
          }
        )
        
        if (communeResponse.ok) {
          const communes = await communeResponse.json()
          if (communes && communes.length > 0) {
            codeInsee = communes[0].code
          }
        }
      } catch (error) {
        console.warn('[DVFService] ⚠️ Erreur récupération code INSEE:', error)
      }

      if (!codeInsee && !coordinates) {
        console.warn('[DVFService] ⚠️ Code INSEE et coordonnées non disponibles')
        return null
      }

      // Utiliser l'API DVF+ si disponible (plus rapide que parser les fichiers)
      let transactions: DVFTransaction[] = []
      
      if (codeInsee) {
        transactions = await this.getTransactionsByCommune(codeInsee, filters)
      }
      
      // Si coordonnées disponibles, rechercher aussi par géolocalisation
      if (coordinates && transactions.length === 0) {
        const rayon = filters?.rayon || 1000 // 1km par défaut
        transactions = await this.getTransactionsByCoordinates(coordinates, rayon, filters)
      }

      // Calculer les statistiques
      const statistics = transactions.length > 0 
        ? this.calculateStatistics(transactions)
        : undefined

      // Estimation pour le bien (si données de comparaison disponibles)
      let estimation
      if (statistics && address.coordinates) {
        estimation = this.estimateValue(statistics, address)
      }

      // Identifier les biens comparables
      const comparables = this.findComparables(transactions, filters)

      const sources = ['API DVF+ (data.gouv.fr)']
      if (codeInsee) sources.push(`Commune: ${codeInsee}`)

      return {
        address: address.formatted,
        codeInsee: codeInsee || undefined,
        coordinates: address.coordinates,
        transactions,
        statistics,
        estimation,
        comparables,
        sources,
        lastUpdated: new Date().toISOString(),
      }
    } catch (error) {
      console.error('[DVFService] ❌ Erreur récupération données DVF:', error)
      return null
    }
  }

  /**
   * Récupère les transactions par code INSEE via l'API DVF+
   */
  private async getTransactionsByCommune(
    codeInsee: string,
    filters?: {
      annee_min?: number
      annee_max?: number
      type_local?: string
      surface_min?: number
      surface_max?: number
    }
  ): Promise<DVFTransaction[]> {
    try {
      // API DVF+ de cquest.org (service tiers gratuit)
      let url = `${this.dvfApiUrl}/api/v1/dvf`
      const params: string[] = []
      
      params.push(`code_commune=${codeInsee}`)
      
      if (filters?.annee_min) {
        params.push(`annee_min=${filters.annee_min}`)
      } else {
        // Par défaut: 5 dernières années
        const currentYear = new Date().getFullYear()
        params.push(`annee_min=${currentYear - 5}`)
      }
      
      if (filters?.annee_max) {
        params.push(`annee_max=${filters.annee_max}`)
      }
      
      if (filters?.type_local) {
        params.push(`type_local=${encodeURIComponent(filters.type_local)}`)
      }

      url += `?${params.join('&')}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        console.warn(`[DVFService] ⚠️ Erreur HTTP ${response.status} pour code INSEE ${codeInsee}`)
        return []
      }

      const data = await response.json()
      
      // L'API retourne un format spécifique, à adapter selon la structure réelle
      let transactions: DVFTransaction[] = []
      
      if (Array.isArray(data)) {
        transactions = data.map((item: any) => this.mapToTransaction(item))
      } else if (data.results && Array.isArray(data.results)) {
        transactions = data.results.map((item: any) => this.mapToTransaction(item))
      } else if (data.features && Array.isArray(data.features)) {
        // Format GeoJSON
        transactions = data.features.map((feature: any) => 
          this.mapToTransaction(feature.properties)
        )
      }

      // Filtrer par surface si demandé
      if (filters?.surface_min || filters?.surface_max) {
        transactions = transactions.filter(t => {
          if (filters.surface_min && t.surface_reelle_bati && t.surface_reelle_bati < filters.surface_min) {
            return false
          }
          if (filters.surface_max && t.surface_reelle_bati && t.surface_reelle_bati > filters.surface_max) {
            return false
          }
          return true
        })
      }

      console.log(`[DVFService] ✅ ${transactions.length} transaction(s) trouvée(s) pour commune ${codeInsee}`)
      return transactions
    } catch (error) {
      console.warn('[DVFService] ⚠️ Erreur récupération transactions par commune:', error)
      return []
    }
  }

  /**
   * Récupère les transactions par coordonnées GPS (géolocalisation)
   */
  private async getTransactionsByCoordinates(
    coordinates: { lat: number; lng: number },
    rayon: number,
    filters?: {
      annee_min?: number
      annee_max?: number
      type_local?: string
    }
  ): Promise<DVFTransaction[]> {
    try {
      // API DVF+ avec géolocalisation
      let url = `${this.dvfApiUrl}/api/v1/dvf`
      const params: string[] = []
      
      params.push(`lat=${coordinates.lat}`)
      params.push(`lon=${coordinates.lng}`)
      params.push(`rayon=${rayon}`)
      
      if (filters?.annee_min) {
        params.push(`annee_min=${filters.annee_min}`)
      } else {
        const currentYear = new Date().getFullYear()
        params.push(`annee_min=${currentYear - 5}`)
      }
      
      if (filters?.annee_max) {
        params.push(`annee_max=${filters.annee_max}`)
      }
      
      if (filters?.type_local) {
        params.push(`type_local=${encodeURIComponent(filters.type_local)}`)
      }

      url += `?${params.join('&')}`

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        console.warn(`[DVFService] ⚠️ Erreur HTTP ${response.status} pour coordonnées`)
        return []
      }

      const data = await response.json()
      
      let transactions: DVFTransaction[] = []
      
      if (Array.isArray(data)) {
        transactions = data.map((item: any) => this.mapToTransaction(item))
      } else if (data.results && Array.isArray(data.results)) {
        transactions = data.results.map((item: any) => this.mapToTransaction(item))
      } else if (data.features && Array.isArray(data.features)) {
        transactions = data.features.map((feature: any) => {
          const transaction = this.mapToTransaction(feature.properties)
          // Ajouter coordonnées depuis GeoJSON
          if (feature.geometry && feature.geometry.coordinates) {
            transaction.longitude = feature.geometry.coordinates[0]
            transaction.latitude = feature.geometry.coordinates[1]
          }
          return transaction
        })
      }

      console.log(`[DVFService] ✅ ${transactions.length} transaction(s) trouvée(s) dans un rayon de ${rayon}m`)
      return transactions
    } catch (error) {
      console.warn('[DVFService] ⚠️ Erreur récupération transactions par coordonnées:', error)
      return []
    }
  }

  /**
   * Mappe les données de l'API vers notre interface DVFTransaction
   */
  private mapToTransaction(item: any): DVFTransaction {
    return {
      id: item.id || item.id_mutation || undefined,
      date_mutation: item.date_mutation || item.date || item.date_vente || '',
      nature_mutation: item.nature_mutation || item.nature || item.type_mutation || '',
      valeur_fonciere: parseFloat(item.valeur_fonciere || item.valeur || item.prix || 0),
      type_local: item.type_local || item.type_bien || item.bien || undefined,
      surface_reelle_bati: item.surface_reelle_bati 
        ? parseFloat(item.surface_reelle_bati) 
        : (item.surface_bati ? parseFloat(item.surface_bati) : undefined),
      nombre_pieces_principales: item.nombre_pieces_principales 
        ? parseInt(item.nombre_pieces_principales, 10) 
        : (item.nb_pieces ? parseInt(item.nb_pieces, 10) : undefined),
      surface_terrain: item.surface_terrain 
        ? parseFloat(item.surface_terrain) 
        : (item.surface_sol ? parseFloat(item.surface_sol) : undefined),
      latitude: item.latitude ? parseFloat(item.latitude) : undefined,
      longitude: item.longitude ? parseFloat(item.longitude) : undefined,
      code_commune: item.code_commune || item.code_insee || undefined,
      nom_commune: item.nom_commune || item.commune || undefined,
      code_postal: item.code_postal || undefined,
      code_departement: item.code_departement || undefined,
    }
  }

  /**
   * Calcule les statistiques depuis les transactions
   */
  private calculateStatistics(transactions: DVFTransaction[]): DVFStatistics {
    if (transactions.length === 0) {
      return {
        total_transactions: 0,
        date_min: '',
        date_max: '',
      }
    }

    // Extraire les dates
    const dates = transactions
      .map(t => t.date_mutation)
      .filter(d => d)
      .sort()
    
    // Calculer prix au m²
    const prixM2: number[] = []
    transactions.forEach(t => {
      if (t.valeur_fonciere && t.surface_reelle_bati && t.surface_reelle_bati > 0) {
        const prix = t.valeur_fonciere / t.surface_reelle_bati
        prixM2.push(prix)
      }
    })

    // Statistiques prix m²
    const prixM2Sorted = prixM2.sort((a, b) => a - b)
    const prixM2Median = prixM2Sorted.length > 0 
      ? prixM2Sorted[Math.floor(prixM2Sorted.length / 2)]
      : undefined
    const prixM2Moyen = prixM2.length > 0
      ? prixM2.reduce((sum, p) => sum + p, 0) / prixM2.length
      : undefined

    // Valeurs foncières
    const valeurs = transactions
      .map(t => t.valeur_fonciere)
      .filter(v => v > 0)
      .sort((a, b) => a - b)
    
    const valeurMedian = valeurs.length > 0
      ? valeurs[Math.floor(valeurs.length / 2)]
      : undefined
    const valeurMoyenne = valeurs.length > 0
      ? valeurs.reduce((sum, v) => sum + v, 0) / valeurs.length
      : undefined

    // Évolution par année
    const evolutionAnnuelle: Record<number, { count: number; total: number; prix_m2_total: number; prix_m2_count: number }> = {}
    transactions.forEach(t => {
      if (t.date_mutation) {
        const annee = new Date(t.date_mutation).getFullYear()
        if (!evolutionAnnuelle[annee]) {
          evolutionAnnuelle[annee] = { count: 0, total: 0, prix_m2_total: 0, prix_m2_count: 0 }
        }
        evolutionAnnuelle[annee].count++
        evolutionAnnuelle[annee].total += t.valeur_fonciere
        
        if (t.surface_reelle_bati && t.surface_reelle_bati > 0) {
          const prixM2 = t.valeur_fonciere / t.surface_reelle_bati
          evolutionAnnuelle[annee].prix_m2_total += prixM2
          evolutionAnnuelle[annee].prix_m2_count++
        }
      }
    })

    const evolution = Object.entries(evolutionAnnuelle).map(([annee, data]) => ({
      annee: parseInt(annee, 10),
      nombre_transactions: data.count,
      prix_m2_moyen: data.prix_m2_count > 0 ? data.prix_m2_total / data.prix_m2_count : 0,
      valeur_moyenne: data.total / data.count,
    })).sort((a, b) => a.annee - b.annee)

    // Répartition par type de local
    const parTypeLocal: Record<string, { count: number; total: number; prix_m2_total: number; prix_m2_count: number }> = {}
    transactions.forEach(t => {
      const type = t.type_local || 'Autre'
      if (!parTypeLocal[type]) {
        parTypeLocal[type] = { count: 0, total: 0, prix_m2_total: 0, prix_m2_count: 0 }
      }
      parTypeLocal[type].count++
      parTypeLocal[type].total += t.valeur_fonciere
      
      if (t.surface_reelle_bati && t.surface_reelle_bati > 0) {
        const prixM2 = t.valeur_fonciere / t.surface_reelle_bati
        parTypeLocal[type].prix_m2_total += prixM2
        parTypeLocal[type].prix_m2_count++
      }
    })

    const parType = Object.entries(parTypeLocal).reduce((acc, [type, data]) => {
      acc[type] = {
        count: data.count,
        prix_m2_moyen: data.prix_m2_count > 0 ? data.prix_m2_total / data.prix_m2_count : 0,
        valeur_moyenne: data.total / data.count,
      }
      return acc
    }, {} as Record<string, { count: number; prix_m2_moyen: number; valeur_moyenne: number }>)

    return {
      total_transactions: transactions.length,
      date_min: dates[0] || '',
      date_max: dates[dates.length - 1] || '',
      prix_m2_min: prixM2Sorted[0],
      prix_m2_max: prixM2Sorted[prixM2Sorted.length - 1],
      prix_m2_median: prixM2Median,
      prix_m2_moyen: prixM2Moyen,
      valeur_min: valeurs[0],
      valeur_max: valeurs[valeurs.length - 1],
      valeur_median: valeurMedian,
      valeur_moyenne: valeurMoyenne,
      evolution_annuelle: evolution,
      par_type_local: parType,
    }
  }

  /**
   * Estime la valeur d'un bien depuis les statistiques
   */
  private estimateValue(statistics: DVFStatistics, address: AddressData): DVFData['estimation'] {
    if (!statistics.prix_m2_median && !statistics.prix_m2_moyen) {
      return undefined
    }

    // Utiliser la médiane comme référence (moins sensible aux valeurs extrêmes)
    const prixM2Ref = statistics.prix_m2_median || statistics.prix_m2_moyen || 0

    // Estimation basée sur la surface moyenne des transactions similaires
    // Si on a des données enrichies avec surface, les utiliser
    // Sinon, utiliser une estimation par défaut (à adapter selon le contexte)
    const surfaceEstimee = 100 // Surface par défaut, à remplacer par données réelles si disponibles

    const valeurEstimee = prixM2Ref * surfaceEstimee
    
    // Fourchette basée sur min/max ou écart-type simplifié (±20%)
    const fourchetteBasse = valeurEstimee * 0.8
    const fourchetteHaute = valeurEstimee * 1.2

    // Confiance basée sur le nombre de transactions
    let confiance = 50 // Base
    if (statistics.total_transactions >= 50) confiance = 90
    else if (statistics.total_transactions >= 20) confiance = 75
    else if (statistics.total_transactions >= 10) confiance = 60

    return {
      valeur_estimee: Math.round(valeurEstimee),
      prix_m2_estime: Math.round(prixM2Ref),
      fourchette_basse: Math.round(fourchetteBasse),
      fourchette_haute: Math.round(fourchetteHaute),
      confiance,
      methode: 'median_secteur',
    }
  }

  /**
   * Trouve les biens comparables parmi les transactions
   */
  private findComparables(
    transactions: DVFTransaction[],
    filters?: {
      surface_min?: number
      surface_max?: number
      type_local?: string
    }
  ): DVFData['comparables'] {
    if (transactions.length === 0) {
      return undefined
    }

    // Filtrer par type de local si spécifié
    let filtered = transactions
    if (filters?.type_local) {
      filtered = filtered.filter(t => 
        t.type_local && t.type_local.toLowerCase().includes(filters.type_local!.toLowerCase())
      )
    }

    // Filtrer par surface si spécifiée
    if (filters?.surface_min || filters?.surface_max) {
      filtered = filtered.filter(t => {
        if (!t.surface_reelle_bati) return false
        if (filters.surface_min && t.surface_reelle_bati < filters.surface_min) return false
        if (filters.surface_max && t.surface_reelle_bati > filters.surface_max) return false
        return true
      })
    }

    // Trier par date (plus récentes en premier) et prendre les 10 meilleurs
    const sorted = filtered
      .sort((a, b) => {
        const dateA = new Date(a.date_mutation).getTime()
        const dateB = new Date(b.date_mutation).getTime()
        return dateB - dateA // Plus récentes en premier
      })
      .slice(0, 10)

    return sorted.map(t => {
      const criteres: string[] = []
      if (t.type_local) criteres.push(`Type: ${t.type_local}`)
      if (t.surface_reelle_bati) criteres.push(`Surface: ${t.surface_reelle_bati}m²`)
      if (t.nombre_pieces_principales) criteres.push(`${t.nombre_pieces_principales} pièce(s)`)
      
      // Calculer similarité basique (peut être amélioré)
      let similarite = 70 // Base
      if (t.date_mutation) {
        const dateTransaction = new Date(t.date_mutation)
        const ageAnnee = (Date.now() - dateTransaction.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        // Moins récent = moins similaire
        if (ageAnnee < 1) similarite += 20
        else if (ageAnnee < 2) similarite += 10
        else if (ageAnnee > 5) similarite -= 20
      }

      return {
        transaction: t,
        similarite: Math.min(100, Math.max(0, similarite)),
        criteres_similaires: criteres,
      }
    })
  }
}

