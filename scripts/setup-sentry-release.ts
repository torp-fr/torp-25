#!/usr/bin/env tsx
import { loggers } from '@/lib/logger'
const log = loggers.enrichment


/**
 * Script pour configurer le release tracking Sentry
 * Génère un release basé sur le commit Git ou la date
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

function getGitCommit(): string | null {
  try {
    const commit = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim()
    return commit
  } catch {
    return null
  }
}

function getGitBranch(): string | null {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim()
    return branch
  } catch {
    return null
  }
}

function generateRelease(): string {
  // Priorité 1: Vercel Git Commit SHA
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7)
  }

  // Priorité 2: Git commit local
  const gitCommit = getGitCommit()
  if (gitCommit) {
    return gitCommit
  }

  // Priorité 3: Date-based release
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  return `release-${dateStr}`
}

function setupSentryRelease() {
  log.info('🔧 Configuration du Release Tracking Sentry\n')

  const release = generateRelease()
  const branch = getGitBranch() || 'unknown'
  const commit = getGitCommit() || 'unknown'

  log.info('📋 Informations Release:')
  log.info(`  Release: ${release}`)
  log.info(`  Branch: ${branch}`)
  log.info(`  Commit: ${commit}`)
  log.info('')

  // Créer un fichier .sentry-release.json
  const releaseInfo = {
    release,
    branch,
    commit,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  }

  const releasePath = path.join(process.cwd(), '.sentry-release.json')
  fs.writeFileSync(releasePath, JSON.stringify(releaseInfo, null, 2))

  log.info('✅ Fichier .sentry-release.json créé')
  log.info(`  Chemin: ${releasePath}\n`)

  // Exporter pour utilisation dans les configs Sentry
  process.env.SENTRY_RELEASE = release
  process.env.SENTRY_BRANCH = branch
  process.env.SENTRY_COMMIT = commit

  log.info("💡 Variables d'environnement:")
  log.info(`  SENTRY_RELEASE=${release}`)
  log.info(`  SENTRY_BRANCH=${branch}`)
  log.info(`  SENTRY_COMMIT=${commit}\n`)

  log.info('📝 Note: Ajoutez ces variables dans Vercel:')
  log.info(`  SENTRY_RELEASE=${release}`)
  log.info('')

  return releaseInfo
}

if (require.main === module) {
  try {
    const releaseInfo = setupSentryRelease()
    log.info('✅ Configuration terminée!')
    process.exit(0)
  } catch (error) {
    log.error('❌ Erreur:', error)
    process.exit(1)
  }
}

export { setupSentryRelease, generateRelease }
