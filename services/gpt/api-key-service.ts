/**
 * Service de gestion des clés API pour l'intégration GPT
 * Permet de générer, valider et gérer les clés API pour l'authentification
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Génère une clé API sécurisée
 */
function generateApiKey(): string {
  // Format: torp_gpt_<random_64_chars>
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `torp_gpt_${randomBytes}`;
}

/**
 * Crée une nouvelle clé API
 */
export async function createApiKey(params: {
  name: string;
  rateLimit?: number;
  permissions?: Record<string, boolean>;
  expiresAt?: Date;
}) {
  const apiKey = generateApiKey();

  const gptApiKey = await prisma.gPTApiKey.create({
    data: {
      name: params.name,
      apiKey,
      rateLimit: params.rateLimit || 100,
      permissions: params.permissions || {},
      expiresAt: params.expiresAt,
    },
  });

  return gptApiKey;
}

/**
 * Valide une clé API
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const key = await prisma.gPTApiKey.findUnique({
      where: { apiKey },
    });

    if (!key) {
      return false;
    }

    // Vérifier si la clé est active
    if (!key.isActive) {
      return false;
    }

    // Vérifier l'expiration
    if (key.expiresAt && key.expiresAt < new Date()) {
      return false;
    }

    // Vérifier le rate limit (simple - basé sur l'heure actuelle)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (key.lastUsedAt && key.lastUsedAt > oneHourAgo) {
      if (key.usageCount >= key.rateLimit) {
        return false;
      }
    }

    // Mettre à jour la date de dernière utilisation et le compteur
    await prisma.gPTApiKey.update({
      where: { apiKey },
      data: {
        lastUsedAt: new Date(),
        usageCount: key.lastUsedAt && key.lastUsedAt > oneHourAgo
          ? { increment: 1 }
          : 1, // Reset si plus d'une heure
      },
    });

    return true;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

/**
 * Récupère les informations d'une clé API
 */
export async function getApiKeyInfo(apiKey: string) {
  return await prisma.gPTApiKey.findUnique({
    where: { apiKey },
    select: {
      id: true,
      name: true,
      isActive: true,
      rateLimit: true,
      permissions: true,
      usageCount: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}

/**
 * Liste toutes les clés API
 */
export async function listApiKeys() {
  return await prisma.gPTApiKey.findMany({
    select: {
      id: true,
      name: true,
      apiKey: true,
      isActive: true,
      rateLimit: true,
      usageCount: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Désactive une clé API
 */
export async function deactivateApiKey(apiKey: string) {
  return await prisma.gPTApiKey.update({
    where: { apiKey },
    data: {
      isActive: false,
    },
  });
}

/**
 * Active une clé API
 */
export async function activateApiKey(apiKey: string) {
  return await prisma.gPTApiKey.update({
    where: { apiKey },
    data: {
      isActive: true,
    },
  });
}

/**
 * Supprime une clé API
 */
export async function deleteApiKey(apiKey: string) {
  return await prisma.gPTApiKey.delete({
    where: { apiKey },
  });
}
