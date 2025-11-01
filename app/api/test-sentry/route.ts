import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * API Route de test pour Sentry
 * Génère une erreur serveur pour tester la configuration
 */
export async function GET() {
  try {
    // Option 1: Erreur simple
    // throw new Error('Test Sentry Error - Server Side')

    // Option 2: Erreur avec contexte Sentry
    Sentry.setContext('test', {
      endpoint: '/api/test-sentry',
      method: 'GET',
      timestamp: new Date().toISOString(),
    })

    Sentry.captureMessage('Test Sentry Message from API', 'info')

    throw new Error('Test Sentry Error - Server Side API Route')

    // Cette ligne ne sera jamais atteinte
    return NextResponse.json({ success: true })
  } catch (error) {
    // Sentry capture automatiquement l'erreur, mais on peut aussi le faire manuellement
    Sentry.captureException(error)

    return NextResponse.json(
      {
        error: 'Test error generated',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
