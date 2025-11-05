/**
 * Test Seed Building Profile with Enriched Data
 * Creates a sample building with full enriched data for AI Agent testing
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { loggers } from '@/lib/logger'

const log = loggers.api
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Block in production unless explicitly enabled
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ENABLE_TEST_ROUTES !== 'true'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden in production' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'demo-user-id'

    // Create or get user first
    let user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'demo@torp.fr',
          role: 'CONSUMER',
        },
      })
    }

    // Scénario 1: Maison en zone à risque avec DPE mauvais (testing AI recommendations)
    const buildingHighRisk = await prisma.buildingProfile.create({
      data: {
        userId,
        name: 'Maison individuelle - Zone à risque',
        address: {
          formatted: '42 Rue de la Mer, 06300 Nice, France',
          street: '42 Rue de la Mer',
          city: 'Nice',
          postalCode: '06300',
          country: 'France',
          coordinates: {
            lat: 43.7034,
            lon: 7.2663,
          },
        },
        cadastralData: {
          section: 'AE',
          parcelle: '0042',
          surface: 450,
        },
        parcelleNumber: '0042',
        sectionCadastrale: 'AE',
        codeINSEE: '06088',
        dpeData: {
          dpeClass: 'F',
          gesClass: 'E',
          energyConsumption: 380,
          gesEmissions: 68,
          dpeDate: '2023-05-15',
          recommendations: [
            'Isolation de la toiture et des combles',
            'Remplacement des fenêtres simple vitrage',
            'Installation pompe à chaleur',
          ],
        },
        enrichedData: {
          // Données Géorisques - RISQUES ÉLEVÉS
          georisques: {
            tri: [
              {
                code_gaspar: 'TRI-NICE-001',
                libelle: 'Nice - Territoire à Risque Important',
                date_debut: '2014-01-01',
              },
            ],
            seisme: {
              zone: 4,
              niveau: 4, // Niveau élevé
            },
            rga: {
              potentiel: 'fort',
              alea: 'Fort',
            },
            radon: {
              classe: 3,
              potentiel: 'significatif',
            },
            mvt: [
              {
                type: 'Glissement de terrain',
                date: '2019-11-12',
                commune: 'Nice',
              },
            ],
            icpe: [
              {
                nom: 'Station-service TOTAL',
                activite: 'Distribution de carburants',
                distance: 450,
                regime: 'Autorisation',
              },
              {
                nom: 'Pressing Côte d\'Azur',
                activite: 'Nettoyage à sec',
                distance: 380,
                regime: 'Déclaration',
              },
            ],
          },
          // Données DVF - Bien sous-évalué
          dvf: {
            statistics: {
              prix_m2_median: 4800,
              prix_m2_moyen: 5100,
              prix_m2_min: 3200,
              prix_m2_max: 7500,
              nb_transactions: 18,
            },
            estimation: {
              prix_total_estime: 540000,
              prix_m2_estime: 3600, // Sous-évalué de 25%
              confiance: 72,
              rayon_recherche: 800,
            },
            transactions: [
              {
                date_mutation: '2024-11-20',
                nature_mutation: 'Vente',
                valeur_fonciere: 580000,
                adresse: '38 Rue de la Mer',
                code_postal: '06300',
                commune: 'Nice',
                type_local: 'Maison',
                surface_reelle_bati: 155,
                nombre_pieces_principales: 5,
                surface_terrain: 480,
              },
              {
                date_mutation: '2024-09-15',
                nature_mutation: 'Vente',
                valeur_fonciere: 495000,
                adresse: '50 Rue de la Colline',
                code_postal: '06300',
                commune: 'Nice',
                type_local: 'Maison',
                surface_reelle_bati: 140,
                nombre_pieces_principales: 4,
                surface_terrain: 420,
              },
            ],
          },
          // Données Cadastre
          cadastre: {
            surface: 450,
            constraints: {
              isFloodZone: true,
              hasRisk: true,
              plu_zone: 'UB',
            },
          },
        },
        enrichmentStatus: 'completed',
        enrichmentSources: ['georisques', 'dvf', 'cadastre', 'dpe'],
        lastEnrichedAt: new Date(),
        notes: 'Profil de test pour Agent IA - Scénario risques élevés + DPE mauvais + bien sous-évalué',
      },
    })

    // Scénario 2: Appartement bon état avec risques faibles (contrôle positif)
    const buildingLowRisk = await prisma.buildingProfile.create({
      data: {
        userId,
        name: 'Appartement T3 - Bon état',
        address: {
          formatted: '15 Avenue des Champs, 69006 Lyon, France',
          street: '15 Avenue des Champs',
          city: 'Lyon',
          postalCode: '69006',
          country: 'France',
          coordinates: {
            lat: 45.7714,
            lon: 4.8533,
          },
        },
        cadastralData: {
          section: 'BK',
          parcelle: '0158',
          surface: 75,
        },
        parcelleNumber: '0158',
        sectionCadastrale: 'BK',
        codeINSEE: '69386',
        dpeData: {
          dpeClass: 'C',
          gesClass: 'C',
          energyConsumption: 150,
          gesEmissions: 28,
          dpeDate: '2024-03-10',
          recommendations: [
            'Optimisation du système de chauffage',
            'Installation VMC double flux',
          ],
        },
        enrichedData: {
          // Données Géorisques - RISQUES FAIBLES
          georisques: {
            tri: [],
            seisme: {
              zone: 2,
              niveau: 2, // Niveau faible
            },
            rga: {
              potentiel: 'faible',
              alea: 'Faible',
            },
            radon: {
              classe: 1,
              potentiel: 'faible',
            },
            mvt: [],
            icpe: [],
          },
          // Données DVF - Prix correct
          dvf: {
            statistics: {
              prix_m2_median: 4200,
              prix_m2_moyen: 4350,
              prix_m2_min: 3500,
              prix_m2_max: 5200,
              nb_transactions: 24,
            },
            estimation: {
              prix_total_estime: 315000,
              prix_m2_estime: 4200,
              confiance: 85,
              rayon_recherche: 600,
            },
            transactions: [
              {
                date_mutation: '2024-10-05',
                nature_mutation: 'Vente',
                valeur_fonciere: 308000,
                adresse: '12 Avenue des Champs',
                code_postal: '69006',
                commune: 'Lyon',
                type_local: 'Appartement',
                surface_reelle_bati: 73,
                nombre_pieces_principales: 3,
              },
            ],
          },
          // Données Cadastre
          cadastre: {
            surface: 75,
            constraints: {
              isFloodZone: false,
              hasRisk: false,
              plu_zone: 'UC',
            },
          },
        },
        enrichmentStatus: 'completed',
        enrichmentSources: ['georisques', 'dvf', 'cadastre', 'dpe'],
        lastEnrichedAt: new Date(),
        notes: 'Profil de test pour Agent IA - Scénario risques faibles + DPE bon',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Building profiles with enriched data created successfully',
      data: {
        buildingHighRisk: {
          id: buildingHighRisk.id,
          name: buildingHighRisk.name,
          address: buildingHighRisk.address,
          testUrl: `/api/building-profiles/${buildingHighRisk.id}/recommendations?userId=${userId}`,
          scenario: 'RISQUES ÉLEVÉS (inondation, sismique, radon 3, DPE F, sous-évalué 25%)',
          expectedAI: [
            'Recommandations fondations renforcées',
            'Alertes assurance MRN',
            'Mesure radon urgente',
            'Rénovation énergétique prioritaire (DPE F)',
            'Potentiel valorisation 25%',
          ],
        },
        buildingLowRisk: {
          id: buildingLowRisk.id,
          name: buildingLowRisk.name,
          address: buildingLowRisk.address,
          testUrl: `/api/building-profiles/${buildingLowRisk.id}/recommendations?userId=${userId}`,
          scenario: 'RISQUES FAIBLES (DPE C, prix correct)',
          expectedAI: [
            'Maintenance préventive',
            'Optimisation énergétique légère',
            'Pas d\'urgence',
          ],
        },
      },
    })
  } catch (error) {
    log.error({ err: error }, 'Erreur seed building profile')
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la création des profils de test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
