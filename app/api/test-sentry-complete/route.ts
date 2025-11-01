import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

/**
 * API Route de test complète pour Sentry
 * Teste toutes les fonctionnalités Sentry (client, serveur, context, etc.)
 */
export async function GET() {
  try {
    // Test 1: Message simple
    Sentry.captureMessage('Test Sentry Complete - API Route', {
      level: 'info',
      tags: {
        test: 'complete',
        source: 'api-route',
        endpoint: '/api/test-sentry-complete',
      },
    })

    // Test 2: Contexte personnalisé
    Sentry.setContext('test-info', {
      endpoint: '/api/test-sentry-complete',
      method: 'GET',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    })

    // Test 3: Tags personnalisés
    Sentry.setTag('test-type', 'complete')
    Sentry.setTag('test-version', '1.0')

    // Test 4: User context (simulation)
    Sentry.setUser({
      id: 'test-user-id',
      email: 'test@torp.fr',
      username: 'test-user',
    })

    // Test 5: Exception avec stack trace
    const testError = new Error('Test Sentry Complete - Exception with Context')
    testError.stack =
      'Error: Test Sentry Complete\n    at GET (/api/test-sentry-complete:45:12)'

    Sentry.captureException(testError, {
      level: 'error',
      tags: {
        test: 'complete',
        errorType: 'test-exception',
      },
      contexts: {
        test: {
          additional_info: 'This is a test exception with full context',
          request_id: 'test-123',
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Tests Sentry envoyés avec succès',
      tests: [
        'Message capturé',
        'Contexte personnalisé ajouté',
        'Tags personnalisés ajoutés',
        'User context défini',
        'Exception avec stack trace capturée',
      ],
      sentry: {
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN
          ? 'Configuré'
          : 'Utilise DSN par défaut',
        org: process.env.SENTRY_ORG || 'o4510290746146816',
        project: process.env.SENTRY_PROJECT || 'torp-platform',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Capturer toute erreur pendant les tests
    Sentry.captureException(error)

    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors des tests Sentry',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
