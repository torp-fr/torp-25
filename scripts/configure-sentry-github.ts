#!/usr/bin/env tsx

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
  console.log('🔐 Vérification du token Sentry...')
  return makeApiRequest('GET', `/organizations/${SENTRY_ORG}/`)
}

async function listIntegrations(): Promise<ApiResponse> {
  console.log('📋 Liste des intégrations disponibles...')
  return makeApiRequest('GET', `/organizations/${SENTRY_ORG}/integrations/`)
}

async function configureGitHubIntegration(): Promise<ApiResponse> {
  console.log("🔗 Configuration de l'intégration GitHub...")

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
  console.log('📦 Configuration GitHub pour le projet...')

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
  console.log('🔍 Activation des Suspect Commits...')

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
  console.log('📌 Configuration du Release Tracking...')

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
  console.log('🚀 Configuration Sentry ↔ GitHub\n')
  console.log('='.repeat(50))
  console.log(`Organisation: ${SENTRY_ORG}`)
  console.log(`Projet: ${SENTRY_PROJECT}`)
  console.log(`Repository: ${GITHUB_OWNER}/${GITHUB_REPO}`)
  console.log('='.repeat(50))
  console.log('')

  if (!SENTRY_AUTH_TOKEN) {
    console.log('❌ SENTRY_AUTH_TOKEN non configuré')
    console.log('')
    console.log('💡 Pour obtenir un token:')
    console.log(
      '1. Allez sur https://sentry.io/settings/account/api/auth-tokens/'
    )
    console.log('2. Créez un nouveau token avec les permissions:')
    console.log('   - org:read (lecture organisation)')
    console.log('   - org:write (écriture organisation)')
    console.log('   - project:read (lecture projet)')
    console.log('   - project:write (écriture projet)')
    console.log("3. Ajoutez-le comme variable d'environnement:")
    console.log('   export SENTRY_AUTH_TOKEN=your_token_here')
    console.log('')
    process.exit(1)
  }

  // Vérifier le token
  const authCheck = await checkAuthToken()
  if (!authCheck.success) {
    console.log('❌ Token invalide ou insuffisant')
    console.log(`   ${authCheck.message}`)
    if (authCheck.error) {
      console.log(`   Erreur: ${authCheck.error}`)
    }
    process.exit(1)
  }
  console.log('✅ Token valide')
  console.log('')

  // Lister les intégrations
  const integrations = await listIntegrations()
  if (integrations.success && integrations.data) {
    console.log('📋 Intégrations disponibles:')
    const githubIntegrations = integrations.data.filter(
      (i: any) => i.provider?.key === 'github'
    )
    if (githubIntegrations.length > 0) {
      console.log(`   ✅ GitHub: ${githubIntegrations.length} installation(s)`)
      githubIntegrations.forEach((i: any) => {
        console.log(`      - ${i.name} (${i.status})`)
      })
    } else {
      console.log('   ⚠️  Aucune intégration GitHub trouvée')
      console.log('')
      console.log('💡 Pour installer GitHub:')
      console.log(
        '1. Allez sur https://sentry.io/settings/o4510290746146816/integrations/github/'
      )
      console.log('2. Cliquez sur "Install" ou "Add Installation"')
      console.log('3. Autorisez Sentry à accéder à GitHub')
      console.log('4. Sélectionnez le repository: torp-fr/torp-25')
      console.log('')
    }
    console.log('')
  }

  // Configuration du repository pour le projet
  const repoConfig = await configureProjectGitHub()
  if (repoConfig.success) {
    console.log('✅ Repository GitHub configuré pour le projet')
  } else {
    console.log('⚠️  Configuration repository:')
    console.log(`   ${repoConfig.message}`)
    if (repoConfig.error) {
      console.log(`   Erreur: ${repoConfig.error}`)
    }
  }
  console.log('')

  // Configuration suspect commits
  const suspectCommits = await enableSuspectCommits()
  if (suspectCommits.success) {
    console.log('✅ Suspect Commits activé')
  } else {
    console.log('⚠️  Configuration Suspect Commits:')
    console.log(`   ${suspectCommits.message}`)
  }
  console.log('')

  // Configuration release tracking
  const releaseTracking = await configureReleaseTracking()
  if (releaseTracking.success) {
    console.log('✅ Release Tracking configuré')
  } else {
    console.log('⚠️  Configuration Release Tracking:')
    console.log(`   ${releaseTracking.message}`)
  }
  console.log('')

  console.log('='.repeat(50))
  console.log('')
  console.log('📝 Résumé:')
  console.log('')
  console.log("⚠️  IMPORTANT: L'intégration GitHub complète nécessite")
  console.log('   une autorisation OAuth via le dashboard Sentry.')
  console.log('')
  console.log('🔗 Étapes manuelles requises:')
  console.log(
    '1. https://sentry.io/settings/o4510290746146816/integrations/github/'
  )
  console.log("2. Installer l'intégration GitHub")
  console.log("3. Autoriser l'accès au repository torp-fr/torp-25")
  console.log('')
  console.log(
    '✅ Une fois installé, les configurations ci-dessus seront actives.'
  )
  console.log('')
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Erreur:', error)
    process.exit(1)
  })
}

export { main as configureSentryGitHub }
