/**
 * API Endpoint: GET /api/gpt/openapi
 * Retourne le schéma OpenAPI pour l'intégration GPT
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/gpt/openapi
 * Retourne le schéma OpenAPI au format JSON
 */
export async function GET(request: NextRequest) {
  try {
    // Lire le fichier OpenAPI schema
    const schemaPath = path.join(process.cwd(), 'public', 'gpt-openapi-schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    // Remplacer l'URL du serveur par l'URL réelle
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    schema.servers = [
      {
        url: baseUrl,
        description: 'TORP Platform API',
      },
    ];

    return NextResponse.json(schema, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error serving OpenAPI schema:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to load OpenAPI schema',
      },
      { status: 500 }
    );
  }
}
