#!/usr/bin/env tsx
/**
 * Script pour indexer progressivement les données RNB
 * Usage:
 *   npm run index-rnb -- --department 75
 *   npm run index-rnb -- --all
 *   npm run index-rnb -- --status
 */

import { RNBService } from '../services/external-apis/rnb-service'
import { RNBIndexer } from '../services/external-apis/rnb-indexer'

async function indexDepartment(department: string) {
  console.log(`🚀 Démarrage indexation département ${department}...`)
  
  const rnbService = new RNBService()
  const indexer = new RNBIndexer()

  // Vérifier si le département est disponible
  const available = await rnbService.isAvailable(department)
  if (!available) {
    console.error(`❌ Département ${department} non disponible dans RNB`)
    return
  }

  // Récupérer la ressource
  const resource = await rnbService.getDepartmentResource(department)
  if (!resource) {
    console.error(`❌ Ressource non trouvée pour le département ${department}`)
    return
  }

  console.log(`📦 Ressource trouvée: ${resource.title}`)
  console.log(`📊 Taille: ${(resource.filesize / 1024 / 1024).toFixed(2)} MB`)
  console.log(`🔗 URL: ${resource.url}`)

  // Démarrer l'indexation
  const progress = await indexer.indexDepartment(
    department,
    resource.url,
    resource.id
  )

  console.log(`✅ Indexation démarrée`)
  console.log(`   Statut: ${progress.status}`)
  console.log(`   Rows: ${progress.processedRows}/${progress.totalRows} (${progress.percentage}%)`)

  // Surveiller le progrès
  const interval = setInterval(async () => {
    const currentProgress = await indexer.getProgress(department)
    console.log(`📊 Progression: ${currentProgress.percentage}% (${currentProgress.processedRows}/${currentProgress.totalRows})`)

    if (currentProgress.status === 'completed') {
      clearInterval(interval)
      console.log(`✅ Indexation terminée pour le département ${department}`)
      process.exit(0)
    }

    if (currentProgress.status === 'failed') {
      clearInterval(interval)
      console.error(`❌ Indexation échouée pour le département ${department}`)
      process.exit(1)
    }
  }, 5000) // Vérifier toutes les 5 secondes
}

async function indexAll() {
  console.log('🚀 Indexation de tous les départements disponibles...')
  
  const rnbService = new RNBService()
  const resources = await rnbService.getAllResources()

  console.log(`📦 ${resources.length} départements trouvés`)

  for (const resource of resources) {
    if (!resource.department) continue
    
    console.log(`\n📍 Traitement département ${resource.department}...`)
    await indexDepartment(resource.department)
    
    // Attendre un peu entre chaque département pour éviter la surcharge
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}

async function showStatus() {
  console.log('📊 Statut des indexations RNB\n')
  
  const indexer = new RNBIndexer()
  const jobs = await indexer.listJobs()

  if (jobs.length === 0) {
    console.log('   Aucune indexation en cours')
    return
  }

  for (const job of jobs) {
    const statusIcon = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      failed: '❌',
      paused: '⏸️',
    }[job.status] || '❓'

    console.log(`${statusIcon} ${job.department}: ${job.percentage}% (${job.processedRows}/${job.totalRows}) [${job.status}]`)
  }
}

// Parse arguments
const args = process.argv.slice(2)

if (args.includes('--all')) {
  indexAll().catch(console.error)
} else if (args.includes('--status')) {
  showStatus().catch(console.error)
} else {
  const deptIndex = args.indexOf('--department')
  if (deptIndex !== -1 && args[deptIndex + 1]) {
    const department = args[deptIndex + 1]
    indexDepartment(department).catch(console.error)
  } else {
    console.log(`
Usage:
  npm run index-rnb -- --department 75    Indexer un département
  npm run index-rnb -- --all             Indexer tous les départements
  npm run index-rnb -- --status          Afficher le statut
    `)
    process.exit(1)
  }
}

