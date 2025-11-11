#!/usr/bin/env tsx
/**
 * Script CLI pour gérer les clés API GPT
 * Usage:
 *   npm run gpt:create-key "Nom de la clé"
 *   npm run gpt:list-keys
 *   npm run gpt:deactivate-key "torp_gpt_xxxxx"
 */

import { PrismaClient } from '@prisma/client';
import {
  createApiKey,
  listApiKeys,
  deactivateApiKey,
  activateApiKey,
  deleteApiKey,
} from '../services/gpt/api-key-service';

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function printHeader(text: string) {
  console.log(`\n${colors.bright}${colors.blue}=== ${text} ===${colors.reset}\n`);
}

function printSuccess(text: string) {
  console.log(`${colors.green}✓${colors.reset} ${text}`);
}

function printError(text: string) {
  console.log(`${colors.red}✗${colors.reset} ${text}`);
}

function printWarning(text: string) {
  console.log(`${colors.yellow}⚠${colors.reset} ${text}`);
}

function printInfo(text: string) {
  console.log(`${colors.cyan}ℹ${colors.reset} ${text}`);
}

async function createKey(name: string, rateLimit?: number) {
  try {
    printHeader('Création d\'une nouvelle clé API GPT');

    const apiKey = await createApiKey({
      name,
      rateLimit: rateLimit || 100,
      permissions: {},
    });

    printSuccess('Clé API créée avec succès !');
    console.log(`\n${colors.bright}Informations de la clé :${colors.reset}`);
    console.log(`  ID: ${apiKey.id}`);
    console.log(`  Nom: ${colors.bright}${apiKey.name}${colors.reset}`);
    console.log(`  Clé API: ${colors.bright}${colors.green}${apiKey.apiKey}${colors.reset}`);
    console.log(`  Rate Limit: ${apiKey.rateLimit} requêtes/heure`);
    console.log(`  Active: ${apiKey.isActive ? '✓ Oui' : '✗ Non'}`);
    console.log(`  Créée le: ${apiKey.createdAt.toISOString()}`);

    printWarning('\n⚠️  IMPORTANT : Sauvegardez cette clé maintenant !');
    printWarning('Elle ne sera plus affichée pour des raisons de sécurité.\n');

    console.log(`\n${colors.bright}Configuration pour ChatGPT :${colors.reset}`);
    console.log(`  Authentication Type: Bearer`);
    console.log(`  API Key: ${apiKey.apiKey}`);
    console.log(`  Header: Authorization\n`);
  } catch (error) {
    printError('Erreur lors de la création de la clé API');
    console.error(error);
    process.exit(1);
  }
}

async function listKeys() {
  try {
    printHeader('Liste des clés API GPT');

    const keys = await listApiKeys();

    if (keys.length === 0) {
      printInfo('Aucune clé API trouvée.');
      return;
    }

    console.log(`${colors.bright}${keys.length} clé(s) trouvée(s) :${colors.reset}\n`);

    keys.forEach((key, index) => {
      const statusColor = key.isActive ? colors.green : colors.red;
      const statusIcon = key.isActive ? '✓' : '✗';
      const maskedKey = key.apiKey.substring(0, 15) + '***';

      console.log(`${colors.bright}${index + 1}. ${key.name}${colors.reset}`);
      console.log(`   Clé: ${maskedKey}`);
      console.log(`   Status: ${statusColor}${statusIcon} ${key.isActive ? 'Active' : 'Inactive'}${colors.reset}`);
      console.log(`   Rate Limit: ${key.rateLimit}/h`);
      console.log(`   Utilisation: ${key.usageCount} requêtes`);
      console.log(`   Dernière utilisation: ${key.lastUsedAt ? key.lastUsedAt.toISOString() : 'Jamais'}`);
      console.log(`   Créée le: ${key.createdAt.toISOString()}`);
      if (key.expiresAt) {
        const isExpired = key.expiresAt < new Date();
        console.log(`   Expire le: ${key.expiresAt.toISOString()} ${isExpired ? '(Expirée)' : ''}`);
      }
      console.log('');
    });
  } catch (error) {
    printError('Erreur lors de la récupération des clés API');
    console.error(error);
    process.exit(1);
  }
}

async function deactivateKey(apiKey: string) {
  try {
    printHeader('Désactivation d\'une clé API');

    await deactivateApiKey(apiKey);

    printSuccess(`Clé API désactivée avec succès : ${apiKey.substring(0, 15)}***`);
    printInfo('La clé ne peut plus être utilisée pour authentifier les requêtes.');
  } catch (error) {
    printError('Erreur lors de la désactivation de la clé API');
    console.error(error);
    process.exit(1);
  }
}

async function activateKey(apiKey: string) {
  try {
    printHeader('Activation d\'une clé API');

    await activateApiKey(apiKey);

    printSuccess(`Clé API activée avec succès : ${apiKey.substring(0, 15)}***`);
  } catch (error) {
    printError('Erreur lors de l\'activation de la clé API');
    console.error(error);
    process.exit(1);
  }
}

async function removeKey(apiKey: string) {
  try {
    printHeader('Suppression d\'une clé API');

    printWarning('⚠️  Cette action est irréversible !');

    await deleteApiKey(apiKey);

    printSuccess(`Clé API supprimée avec succès : ${apiKey.substring(0, 15)}***`);
  } catch (error) {
    printError('Erreur lors de la suppression de la clé API');
    console.error(error);
    process.exit(1);
  }
}

function printUsage() {
  console.log(`
${colors.bright}Usage:${colors.reset}

  ${colors.cyan}npm run gpt:create-key${colors.reset} "Nom de la clé" [rate-limit]
    Crée une nouvelle clé API pour l'intégration GPT
    Exemple: npm run gpt:create-key "Production GPT" 200

  ${colors.cyan}npm run gpt:list-keys${colors.reset}
    Liste toutes les clés API existantes

  ${colors.cyan}npm run gpt:deactivate-key${colors.reset} "torp_gpt_xxxxx"
    Désactive une clé API (peut être réactivée)

  ${colors.cyan}npm run gpt:activate-key${colors.reset} "torp_gpt_xxxxx"
    Réactive une clé API désactivée

  ${colors.cyan}npm run gpt:delete-key${colors.reset} "torp_gpt_xxxxx"
    Supprime définitivement une clé API (irréversible)

${colors.bright}Exemples:${colors.reset}

  # Créer une nouvelle clé
  npm run gpt:create-key "Agent GPT Production"

  # Lister toutes les clés
  npm run gpt:list-keys

  # Désactiver une clé
  npm run gpt:deactivate-key "torp_gpt_abc123..."
  `);
}

async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  try {
    switch (command) {
      case 'create':
        if (!arg1) {
          printError('Le nom de la clé est requis');
          printUsage();
          process.exit(1);
        }
        await createKey(arg1, arg2 ? parseInt(arg2) : undefined);
        break;

      case 'list':
        await listKeys();
        break;

      case 'deactivate':
        if (!arg1) {
          printError('La clé API est requise');
          printUsage();
          process.exit(1);
        }
        await deactivateKey(arg1);
        break;

      case 'activate':
        if (!arg1) {
          printError('La clé API est requise');
          printUsage();
          process.exit(1);
        }
        await activateKey(arg1);
        break;

      case 'delete':
        if (!arg1) {
          printError('La clé API est requise');
          printUsage();
          process.exit(1);
        }
        await removeKey(arg1);
        break;

      default:
        printUsage();
        break;
    }
  } catch (error) {
    printError('Une erreur est survenue');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
