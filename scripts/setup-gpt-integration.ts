#!/usr/bin/env tsx
/**
 * Script de setup pour l'intégration GPT
 *
 * Ce script :
 * 1. Vérifie que les tables existent (ou les crée)
 * 2. Crée une clé API initiale si aucune n'existe
 * 3. Affiche les instructions de configuration
 */

import { PrismaClient } from '@prisma/client';
import { createApiKey, listApiKeys } from '../services/gpt/api-key-service';

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
  console.log(`\n${colors.bright}${colors.blue}╔${'═'.repeat(text.length + 4)}╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  ${text}  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚${'═'.repeat(text.length + 4)}╝${colors.reset}\n`);
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

async function checkTables() {
  try {
    printInfo('Vérification des tables GPT...');

    // Essayer de compter les clés API
    const count = await prisma.gPTApiKey.count();
    printSuccess(`Table gpt_api_keys existe (${count} clés)`);

    // Essayer de compter les analyses
    const analysisCount = await prisma.gPTAnalysis.count();
    printSuccess(`Table gpt_analyses existe (${analysisCount} analyses)`);

    return true;
  } catch (error) {
    printError('Les tables GPT n\'existent pas encore');
    console.log('\n' + colors.yellow + 'Action requise:' + colors.reset);
    console.log('Exécutez la migration Prisma :');
    console.log('  ' + colors.cyan + 'npx prisma generate' + colors.reset);
    console.log('  ' + colors.cyan + 'npx prisma db push' + colors.reset);
    console.log('  ou');
    console.log('  ' + colors.cyan + 'npx prisma migrate deploy' + colors.reset);
    return false;
  }
}

async function setupInitialKey() {
  try {
    // Vérifier si des clés existent
    const keys = await listApiKeys();

    if (keys.length > 0) {
      printInfo(`${keys.length} clé(s) API déjà configurée(s)`);

      console.log('\n' + colors.bright + 'Clés API existantes:' + colors.reset);
      keys.forEach((key, index) => {
        const statusIcon = key.isActive ? colors.green + '✓' : colors.red + '✗';
        const maskedKey = key.apiKey.substring(0, 15) + '***';
        console.log(`  ${index + 1}. ${key.name} - ${maskedKey} ${statusIcon}${colors.reset}`);
      });

      return;
    }

    // Créer une clé initiale
    printInfo('Aucune clé API trouvée. Création d\'une clé initiale...');

    const apiKey = await createApiKey({
      name: 'GPT Initial Key',
      rateLimit: 100,
      permissions: {},
    });

    printSuccess('Clé API créée avec succès !');

    console.log('\n' + colors.bright + '🔑 Votre clé API:' + colors.reset);
    console.log(colors.green + colors.bright + apiKey.apiKey + colors.reset);

    printWarning('\n⚠️  IMPORTANT: Sauvegardez cette clé maintenant !');
    printWarning('Elle ne sera plus affichée pour des raisons de sécurité.\n');

  } catch (error) {
    printError('Erreur lors de la création de la clé initiale');
    console.error(error);
  }
}

async function displayInstructions() {
  console.log('\n' + colors.bright + '📚 Prochaines étapes:' + colors.reset + '\n');

  console.log(colors.bright + '1. Configurer votre GPT dans ChatGPT' + colors.reset);
  console.log('   • Aller sur https://chat.openai.com → "My GPTs"');
  console.log('   • Sélectionner votre GPT → "Configure" → "Actions"');
  console.log('   • URL du schéma: ' + colors.cyan + process.env.NEXT_PUBLIC_APP_URL + '/api/gpt/openapi' + colors.reset);
  console.log('   • Authentification: Bearer + votre clé API\n');

  console.log(colors.bright + '2. Copier le prompt exemple' + colors.reset);
  console.log('   • Fichier: ' + colors.cyan + 'docs/GPT_PROMPT_EXAMPLE.md' + colors.reset);
  console.log('   • Coller dans les instructions du GPT\n');

  console.log(colors.bright + '3. Tester l\'intégration' + colors.reset);
  console.log('   • Dans ChatGPT: "Analyse le devis ID: xxx-xxx-xxx"\n');

  console.log(colors.bright + '📖 Documentation complète:' + colors.reset);
  console.log('   • Démarrage rapide: ' + colors.cyan + 'GPT_INTEGRATION_README.md' + colors.reset);
  console.log('   • Guide complet: ' + colors.cyan + 'docs/GPT_INTEGRATION_GUIDE.md' + colors.reset);
  console.log('   • Schéma OpenAPI: ' + colors.cyan + 'public/gpt-openapi-schema.json' + colors.reset + '\n');
}

async function main() {
  printHeader('🤖 Setup Intégration GPT - TORP Platform');

  console.log('Ce script configure l\'intégration GPT pour la plateforme TORP.\n');

  // Étape 1: Vérifier les tables
  const tablesExist = await checkTables();

  if (!tablesExist) {
    process.exit(1);
  }

  // Étape 2: Setup clé initiale
  await setupInitialKey();

  // Étape 3: Afficher les instructions
  await displayInstructions();

  printSuccess('Setup terminé avec succès ! ✨\n');
}

main()
  .catch((error) => {
    printError('Une erreur est survenue');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
