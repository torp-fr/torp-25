/**
 * Middleware d'authentification pour les requêtes GPT
 * Valide la clé API dans l'en-tête Authorization
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, getApiKeyInfo } from '@/services/gpt/api-key-service';

export interface GPTAuthRequest extends NextRequest {
  apiKeyId?: string;
}

/**
 * Extrait la clé API de l'en-tête Authorization
 * Format attendu: "Bearer torp_gpt_..."
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Support pour "Bearer <key>" ou juste "<key>"
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }

  return null;
}

/**
 * Middleware d'authentification GPT
 * Valide la clé API et ajoute les infos à la requête
 */
export async function authenticateGPTRequest(
  request: NextRequest
): Promise<{ authenticated: boolean; apiKeyId?: string; error?: string }> {
  try {
    // Extraire la clé API
    const apiKey = extractApiKey(request);

    if (!apiKey) {
      return {
        authenticated: false,
        error: 'Missing API key. Please provide an API key in the Authorization header.',
      };
    }

    // Valider la clé
    const isValid = await validateApiKey(apiKey);

    if (!isValid) {
      return {
        authenticated: false,
        error: 'Invalid or expired API key.',
      };
    }

    // Récupérer les infos de la clé
    const keyInfo = await getApiKeyInfo(apiKey);

    if (!keyInfo) {
      return {
        authenticated: false,
        error: 'API key not found.',
      };
    }

    return {
      authenticated: true,
      apiKeyId: keyInfo.id,
    };
  } catch (error) {
    console.error('Error authenticating GPT request:', error);
    return {
      authenticated: false,
      error: 'Authentication failed.',
    };
  }
}

/**
 * Crée une réponse d'erreur d'authentification
 */
export function createAuthErrorResponse(error: string): NextResponse {
  return NextResponse.json(
    {
      error: 'Authentication failed',
      message: error,
    },
    { status: 401 }
  );
}
