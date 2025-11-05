#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment


/**
 * Script pour configurer l'intégration GitHub Sentry via API
 * Nécessite SENTRY_AUTH_TOKEN dans les variables d'environnement
 */

import * as https from 'https'
import * as http from 'http'

const SENTRY_ORG = process.env.SENTRY_ORG || 'o4510290746146816'
const SENTRY_PROJECT = process.env.SENTRY_PROJECT || 'torp-platform'
const GITHUB_OWNER = 'torp-fr'
const GITHUB_REPO = 'torp-25'
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN
const SENTRY_API_URL = 'https://sentry.io/api/0'

interface ApiResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

function makeApiRequest(
  method: string,
  path: string,
  body?: any
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    if (!SENTRY_AUTH_TOKEN) {
      resolve({
        success: false,
        message: 'SENTRY_AUTH_TOKEN non configuré',
        error: 'Token manquant',
      })
      return
    }

    const url = new URL(`${SENTRY_API_URL}${path}`)
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              message: 'Requête réussie',
              data: jsonData,
            })
          } else {
            resolve({
              success: false,
              message: `Erreur HTTP ${res.statusCode}`,
              error: jsonData.detail || jsonData.message || data,
              data: jsonData,
            })
          }
        } catch (error) {
          resolve({
            success: false,
            message: 'Erreur de parsing JSON',
            error: error instanceof Error ? error.message : 'Unknown',
            data: data,
          })
        }
      })
    })

    req.on('error', (error) => {
      resolve({
        success: false,
        message: 'Erreur de requête',
        error: error.message,
      })
    })

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

async function checkAuthToken(): Promise<ApiResponse> {
  log.info('🔐 Vérification du token Sentry...')
  return makeApiRequest('GET', `/organizations/${SENTRY_ORG}/`)
}

async function listIntegrations(): Promise<ApiResponse> {
  log.info('📋 Liste des intégrations disponibles...')
  return makeApiRequest('GET', `/organizations/${SENTRY_ORG}/integrations/`)
}

async function configureGitHubIntegration(): Promise<ApiResponse> {
  log.info("🔗 Configuration de l'intégration GitHub...")

  // Note: L'intégration GitHub nécessite une autorisation OAuth
  // qui ne peut être faite que via le dashboard. Ce script vérifie
  // la configuration et guide l'utilisateur.

  return {
    success: false,
    message:
      'Configuration GitHub nécessite une autorisation OAuth via dashboard',
    error: 'OAuth required',
  }
}

async function configureProjectGitHub(): Promise<ApiResponse> {
  log.info('📦 Configuration GitHub pour le projet...')

  // Configuration du repository GitHub pour le projet
  const body = {
    provider: 'github',
    externalId: `${GITHUB_OWNER}/${GITHUB_REPO}`,
    name: `${GITHUB_OWNER}/${GITHUB_REPO}`,
    config: {
      repository: `${GITHUB_OWNER}/${GITHUB_REPO}`,
    },
  }

  return makeApiRequest(
    'POST',
    `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/repos/`,
    body
  )
}

async function enableSuspectCommits(): Promise<ApiResponse> {
  log.info('🔍 Activation des Suspect Commits...')

  // Configuration via les paramètres du projet
  const body = {
    suspectCommits: true,
  }

  return makeApiRequest(
    'PUT',
    `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/`,
    body
  )
}

async function configureReleaseTracking(): Promise<ApiResponse> {
  log.info('📌 Configuration du Release Tracking...')

  const body = {
    versioningScheme: 'semver',
  }

  return makeApiRequest(
    'PUT',
    `/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/`,
    body
  )
}

async function main() {
  log.info('🚀 Configuration Sentry ↔ GitHub\n')
  log.info('='.repeat(50))
  log.info(`Organisation: ${SENTRY_ORG}`)
  log.info(`Projet: ${SENTRY_PROJECT}`)
  log.info(`Repository: ${GITHUB_OWNER}/${GITHUB_REPO}`)
  log.info('='.repeat(50))
  log.info('')

  if (!SENTRY_AUTH_TOKEN) {
    log.info('❌ SENTRY_AUTH_TOKEN non configuré')
    log.info('')
    log.info('💡 Pour obtenir un token:')
    log.info(
      '1. Allez sur https://sentry.io/settings/account/api/auth-tokens/'
    )
    log.info('2. Créez un nouveau token avec les permissions:')
    log.info('   - org:read (lecture organisation)')
    log.info('   - org:write (écriture organisation)')
    log.info('   - project:read (lecture projet)')
    log.info('   - project:write (écriture projet)')
    log.info("3. Ajoutez-le comme variable d'environnement:")
    log.info('   export SENTRY_AUTH_TOKEN=your_token_here')
    log.info('')
    process.exit(1)
  }

  // Vérifier le token
  const authCheck = await checkAuthToken()
  if (!authCheck.success) {
    log.info('❌ Token invalide ou insuffisant')
    log.info(`   ${authCheck.message}`)
    if (authCheck.error) {
      log.info(`   Erreur: ${authCheck.error}`)
    }
    process.exit(1)
  }
  log.info('✅ Token valide')
  log.info('')

  // Lister les intégrations
  const integrations = await listIntegrations()
  if (integrations.success && integrations.data) {
    log.info('📋 Intégrations disponibles:')
    const githubIntegrations = integrations.data.filter(
      (i: any) => i.provider?.key === 'github'
    )
    if (githubIntegrations.length > 0) {
      log.info(`   ✅ GitHub: ${githubIntegrations.length} installation(s)`)
      githubIntegrations.forEach((i: any) => {
        log.info(`      - ${i.name} (${i.status})`)
      })
    } else {
      log.info('   ⚠️  Aucune intégration GitHub trouvée')
      log.info('')
      log.info('💡 Pour installer GitHub:')
      log.info(
        '1. Allez sur https://sentry.io/settings/o4510290746146816/integrations/github/'
      )
      log.info('2. Cliquez sur "Install" ou "Add Installation"')
      log.info('3. Autorisez Sentry à accéder à GitHub')
      log.info('4. Sélectionnez le repository: torp-fr/torp-25')
      log.info('')
    }
    log.info('')
  }

  // Configuration du repository pour le projet
  const repoConfig = await configureProjectGitHub()
  if (repoConfig.success) {
    log.info('✅ Repository GitHub configuré pour le projet')
  } else {
    log.info('⚠️  Configuration repository:')
    log.info(`   ${repoConfig.message}`)
    if (repoConfig.error) {
      log.info(`   Erreur: ${repoConfig.error}`)
    }
  }
  log.info('')

  // Configuration suspect commits
  const suspectCommits = await enableSuspectCommits()
  if (suspectCommits.success) {
    log.info('✅ Suspect Commits activé')
  } else {
    log.info('⚠️  Configuration Suspect Commits:')
    log.info(`   ${suspectCommits.message}`)
  }
  log.info('')

  // Configuration release tracking
  const releaseTracking = await configureReleaseTracking()
  if (releaseTracking.success) {
    log.info('✅ Release Tracking configuré')
  } else {
    log.info('⚠️  Configuration Release Tracking:')
    log.info(`   ${releaseTracking.message}`)
  }
  log.info('')

  log.info('='.repeat(50))
  log.info('')
  log.info('📝 Résumé:')
  log.info('')
  log.info("⚠️  IMPORTANT: L'intégration GitHub complète nécessite")
  log.info('   une autorisation OAuth via le dashboard Sentry.')
  log.info('')
  log.info('🔗 Étapes manuelles requises:')
  log.info(
    '1. https://sentry.io/settings/o4510290746146816/integrations/github/'
  )
  log.info("2. Installer l'intégration GitHub")
  log.info("3. Autoriser l'accès au repository torp-fr/torp-25")
  log.info('')
  log.info(
    '✅ Une fois installé, les configurations ci-dessus seront actives.'
  )
  log.info('')
}

if (require.main === module) {
  main().catch((error) => {
    log.error('Erreur:', error)
    process.exit(1)
  })
}

export { main as configureSentryGitHub }
