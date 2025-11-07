/**
 * Service BODACC (Bulletin Officiel des Annonces Civiles et Commerciales)
 * Source officielle pour les procédures collectives et annonces légales
 * API: OpenDataSoft - DILA
 */

import { ApiClient } from '../data-enrichment/api-client'

export interface BODACCProcedure {
  type: 'liquidation' | 'redressement' | 'sauvegarde' | 'radiation' | 'autre'
  status: 'ongoing' | 'completed' | 'cancelled'
  startDate: string
  endDate?: string
  tribunal?: string
  numeroParution?: string
  details?: string
}

export interface BODACCAnnonce {
  siret?: string
  siren: string
  denomination: string
  type: string // Type d'annonce
  dateParution: string
  numeroParution: string
  tribunal?: string
  jugement?: {
    date: string
    nature: string
  }
}

export class BODACCService {
  private client: ApiClient
  private readonly baseUrl = 'https://bodacc-datadila.opendatasoft.com/api/records/1.0'

  constructor() {
    this.client = new ApiClient({
      baseUrl: this.baseUrl,
      timeout: 10000,
      retries: 2,
    })
  }

  /**
   * Recherche les procédures collectives pour un SIREN/SIRET
   */
  async searchProceduresCollectives(identifier: string): Promise<BODACCProcedure[]> {
    try {
      const siren = identifier.length === 14 ? identifier.substring(0, 9) : identifier

      console.log(`[BODACC] 🔍 Recherche procédures collectives pour SIREN: ${siren}`)

      // Recherche dans le dataset BODACC
      const response = await this.client.get<{
        records?: Array<{
          fields: {
            numerosiren?: string
            denomination?: string
            typeavis?: string
            dateparution?: string
            numeroparution?: string
            tribunal?: string
            jugement?: string
            datejugement?: string
          }
        }>
      }>('/search/', {
        dataset: 'bodacc-c',
        q: `numerosiren:${siren}`,
        rows: '100',
        sort: 'dateparution',
      })

      console.log(`[BODACC] 📋 ${response.records?.length || 0} annonce(s) trouvée(s)`)

      if (!response.records || response.records.length === 0) {
        return []
      }

      // Filtrer et mapper les procédures collectives
      const procedures: BODACCProcedure[] = []

      for (const record of response.records) {
        const fields = record.fields
        const typeAvis = fields.typeavis?.toLowerCase() || ''

        // Identifier le type de procédure
        let type: BODACCProcedure['type'] = 'autre'
        let status: BODACCProcedure['status'] = 'ongoing'

        if (typeAvis.includes('liquidation')) {
          type = 'liquidation'
          status = 'ongoing'
        } else if (typeAvis.includes('redressement')) {
          type = 'redressement'
          status = 'ongoing'
        } else if (typeAvis.includes('sauvegarde')) {
          type = 'sauvegarde'
          status = 'ongoing'
        } else if (typeAvis.includes('radiation') || typeAvis.includes('clôture')) {
          status = 'completed'
        }

        procedures.push({
          type,
          status,
          startDate: fields.datejugement || fields.dateparution || '',
          tribunal: fields.tribunal,
          numeroParution: fields.numeroparution,
          details: fields.jugement,
        })
      }

      console.log(`[BODACC] ✅ ${procedures.length} procédure(s) identifiée(s)`)

      return procedures
    } catch (error) {
      console.error('[BODACC] ❌ Erreur recherche procédures:', error)
      return []
    }
  }

  /**
   * Vérifie s'il existe des procédures collectives en cours
   */
  async hasActiveProcedures(identifier: string): Promise<boolean> {
    const procedures = await this.searchProceduresCollectives(identifier)
    return procedures.some((proc) => proc.status === 'ongoing')
  }

  /**
   * Récupère toutes les annonces BODACC pour une entreprise
   */
  async getAllAnnonces(identifier: string): Promise<BODACCAnnonce[]> {
    try {
      const siren = identifier.length === 14 ? identifier.substring(0, 9) : identifier

      console.log(`[BODACC] 🔍 Recherche toutes annonces pour SIREN: ${siren}`)

      const response = await this.client.get<{
        records?: Array<{
          fields: {
            numerosiren?: string
            numerosiret?: string
            denomination?: string
            typeavis?: string
            dateparution?: string
            numeroparution?: string
            tribunal?: string
            datejugement?: string
            naturejugement?: string
          }
        }>
      }>('/search/', {
        dataset: 'bodacc-c',
        q: `numerosiren:${siren}`,
        rows: '50',
        sort: '-dateparution', // Plus récentes d'abord
      })

      if (!response.records || response.records.length === 0) {
        return []
      }

      return response.records.map((record) => ({
        siret: record.fields.numerosiret,
        siren: record.fields.numerosiren || siren,
        denomination: record.fields.denomination || '',
        type: record.fields.typeavis || 'Inconnu',
        dateParution: record.fields.dateparution || '',
        numeroParution: record.fields.numeroparution || '',
        tribunal: record.fields.tribunal,
        jugement: record.fields.datejugement
          ? {
              date: record.fields.datejugement,
              nature: record.fields.naturejugement || '',
            }
          : undefined,
      }))
    } catch (error) {
      console.error('[BODACC] ❌ Erreur récupération annonces:', error)
      return []
    }
  }

  /**
   * Obtient le statut juridique actuel de l'entreprise
   */
  async getLegalStatus(identifier: string): Promise<{
    hasCollectiveProcedure: boolean
    procedureType?: 'liquidation' | 'redressement' | 'sauvegarde'
    procedureDate?: string
    isActive: boolean
  }> {
    const procedures = await this.searchProceduresCollectives(identifier)

    // Trouver la procédure la plus récente en cours
    const ongoingProcedures = procedures.filter((p) => p.status === 'ongoing')

    if (ongoingProcedures.length === 0) {
      return {
        hasCollectiveProcedure: false,
        isActive: true,
      }
    }

    // Trier par date pour avoir la plus récente
    ongoingProcedures.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )

    const latestProcedure = ongoingProcedures[0]

    // Déterminer le type de procédure (filtrer 'radiation' et 'autre')
    const procedureType =
      latestProcedure.type === 'liquidation' ||
      latestProcedure.type === 'redressement' ||
      latestProcedure.type === 'sauvegarde'
        ? latestProcedure.type
        : undefined

    return {
      hasCollectiveProcedure: true,
      procedureType,
      procedureDate: latestProcedure.startDate,
      isActive: latestProcedure.type !== 'liquidation', // Liquidation = plus actif
    }
  }
}
